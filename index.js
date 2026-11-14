/** Host half of the AWS CodeCommit panel. It shells out to the local `aws` CLI
 *  and serves a JSON API that the Client panel consumes. No AWS SDK dependency. */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const name = 'dsh-aws-codecommit';
export const inject = ['webServer'];

const PREFIX = '/api/dsh-aws-codecommit';
const AWS_TIMEOUT_MS = 60_000;
const MAX_PAGINATE = 1_000;
const MAX_COMMITS = 12;
const MAX_PR_LIST = 100;

const json = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/* ------------------------------------------------------------------ */
/* AWS CLI runner                                                      */
/* ------------------------------------------------------------------ */

function runAws(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('aws', [...args, '--output', 'json', '--no-cli-pager'], { env: process.env });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error('aws CLI 请求超时'));
    }, AWS_TIMEOUT_MS);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`无法启动 aws CLI：${err.message}`));
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        const text = stdout.trim();
        if (text === '') return resolve(null);
        try {
          resolve(JSON.parse(text));
        } catch {
          resolve(text);
        }
      } else {
        reject(new Error(cleanAwsError(stderr) || `aws CLI 退出码 ${code}`));
      }
    });
  });
}

function cleanAwsError(stderr) {
  const text = (stderr || '').trim();
  if (!text) return '';
  // Prefer the last meaningful line of a multiline error; drop ansi escapes.
  const lines = text
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines[lines.length - 1] || text;
}

async function codecommit(profile, subcommand, args) {
  const region = profileRegion(profile);
  const regionArgs = region ? ['--region', region] : [];
  return runAws(['codecommit', subcommand, '--profile', profile, ...regionArgs, ...args]);
}

async function paginated(profile, subcommand, args, resultKey) {
  const collected = [];
  let token;
  let count = 0;
  do {
    const extra = token ? ['--starting-token', token] : [];
    const res = await codecommit(profile, subcommand, [...args, ...extra]);
    if (res && Array.isArray(res[resultKey])) collected.push(...res[resultKey]);
    token = res && (res.nextToken ?? res.NextToken);
    count += 1;
  } while (token && count < MAX_PAGINATE);
  return collected;
}

/* ------------------------------------------------------------------ */
/* Profile discovery                                                   */
/* ------------------------------------------------------------------ */

function parseIni(text) {
  const sections = {};
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const section = line.match(/^\[(.+)\]$/);
    if (section) {
      current = section[1];
      sections[current] = {};
      continue;
    }
    const kv = line.match(/^([^=\s]+)\s*=\s*(.*)$/);
    if (kv && current) sections[current][kv[1]] = kv[2];
  }
  return sections;
}

function readAwsProfiles() {
  const home = homedir();
  const configPath = join(home, '.aws', 'config');
  const credPath = join(home, '.aws', 'credentials');
  const config = existsSync(configPath) ? parseIni(readFileSync(configPath, 'utf8')) : {};
  const creds = existsSync(credPath) ? parseIni(readFileSync(credPath, 'utf8')) : {};
  const map = new Map();
  for (const [sec, val] of Object.entries(config)) {
    const profileName = sec === 'default' ? 'default' : sec.startsWith('profile ') ? sec.slice('profile '.length).trim() : sec;
    if (!map.has(profileName)) map.set(profileName, { name: profileName, region: '', hasCredentials: false });
    const entry = map.get(profileName);
    if (!entry.region && val.region) entry.region = val.region;
  }
  for (const sec of Object.keys(creds)) {
    const profileName = sec === 'default' ? 'default' : sec;
    if (!map.has(profileName)) map.set(profileName, { name: profileName, region: '', hasCredentials: true });
    else map.get(profileName).hasCredentials = true;
  }
  const profiles = [...map.values()];
  const defaultProfile = profiles.some((p) => p.name === 'test') ? 'test' : profiles.some((p) => p.name === 'default') ? 'default' : (profiles[0]?.name ?? '');
  return { profiles, defaultProfile };
}

let profilesCache = null;
let profilesCacheAt = 0;
function getProfilesCached() {
  const now = Date.now();
  if (!profilesCache || now - profilesCacheAt > 10_000) {
    profilesCache = readAwsProfiles();
    profilesCacheAt = now;
  }
  return profilesCache;
}

function profileRegion(profileName) {
  const p = getProfilesCached().profiles.find((x) => x.name === profileName);
  return p && p.region ? p.region : undefined;
}

/* Current CLI identity per profile (cached briefly). Used to detect a
 * self-authored pull request, which CodeCommit forbids approving. */
const callerCache = new Map();
async function getCallerArn(profile) {
  const now = Date.now();
  const hit = callerCache.get(profile);
  if (hit && now - hit.at < 5 * 60_000) return hit.arn;
  try {
    const region = profileRegion(profile);
    const regionArgs = region ? ['--region', region] : [];
    const out = await runAws(['sts', 'get-caller-identity', '--profile', profile, ...regionArgs]);
    const arn = out && typeof out.Arn === 'string' ? out.Arn : null;
    callerCache.set(profile, { arn, at: now });
    return arn;
  } catch {
    callerCache.set(profile, { arn: null, at: now });
    return null;
  }
}

function sameIdentity(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a === b) return true;
  return shortArn(a) === shortArn(b);
}

/* Short-lived in-memory caches so switching status / re-entering the panel does
 * not re-run the (slow) one-shot `aws` CLI for every pull request again. */
function makeCache(ttlMs) {
  const map = new Map();
  return {
    get(key) {
      const entry = map.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.at > ttlMs) {
        map.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      map.set(key, { value, at: Date.now() });
    },
    delete(key) {
      map.delete(key);
    },
  };
}
const repoCache = makeCache(120_000);
const prIdCache = makeCache(60_000);
const prSummaryCache = makeCache(60_000);

async function listRepositories(profile) {
  const cached = repoCache.get(profile);
  if (cached) return cached;
  const repositories = await paginated(profile, 'list-repositories', [], 'repositories');
  const view = repositories.map((r) => ({ id: r.repositoryId, name: r.repositoryName }));
  repoCache.set(profile, view);
  return view;
}

async function pullRequestIds(profile, repoName, status) {
  const key = `${profile}|${repoName}|${status || 'ALL'}`;
  const cached = prIdCache.get(key);
  if (cached) return cached;
  const args = ['--repository-name', repoName];
  if (status === 'OPEN' || status === 'CLOSED') args.push('--pull-request-status', status);
  const ids = await paginated(profile, 'list-pull-requests', args, 'pullRequestIds');
  prIdCache.set(key, ids);
  return ids;
}

async function pullRequestSummary(profile, id) {
  const key = `${profile}|${id}`;
  const cached = prSummaryCache.get(key);
  if (cached) return cached;
  const summary = await fetchPullRequestSummary(profile, id);
  prSummaryCache.set(key, summary);
  return summary;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  const workers = Math.min(Math.max(1, limit), Math.max(1, items.length));
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}

/* ------------------------------------------------------------------ */
/* Domain helpers                                                      */
/* ------------------------------------------------------------------ */

function shortArn(arn) {
  if (typeof arn !== 'string') return arn;
  const parts = arn.split('/');
  return parts[parts.length - 1] || arn;
}

function shortRef(ref) {
  if (typeof ref !== 'string') return ref;
  return ref.replace(/^refs\/heads\//, '');
}

function friendlyMergeOption(option) {
  if (option === 'FAST_FORWARD_MERGE') return 'fast-forward';
  if (option === 'SQUASH_MERGE') return 'squash';
  if (option === 'THREE_WAY_MERGE') return 'three-way';
  return option;
}

function shortSha(commitId) {
  return typeof commitId === 'string' && commitId.length > 7 ? commitId.slice(0, 7) : commitId;
}

function toTimestamp(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value * 1000;
  if (typeof value === 'string') {
    const git = value.match(/^(\d{9,})\s*([+-]\d{4})?$/);
    if (git) return Number(git[1]) * 1000;
  }
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/* ------------------------------------------------------------------ */
/* Line diff (GitHub-style unified hunks)                              */
/* ------------------------------------------------------------------ */

const MAX_DIFF_LINES = 5000;
const MAX_DIFF_CELLS = 2_000_000;

function splitLines(text) {
  return String(text).replace(/\r\n/g, '\n').split('\n');
}

function computeLineOps(a, b) {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA -= 1;
    endB -= 1;
  }
  const ops = [];
  for (let i = 0; i < start; i += 1) ops.push({ type: 'ctx', text: a[i] });
  const midA = a.slice(start, endA + 1);
  const midB = b.slice(start, endB + 1);
  const n = midA.length;
  const m = midB.length;
  if (n === 0) {
    for (const line of midB) ops.push({ type: 'add', text: line });
  } else if (m === 0) {
    for (const line of midA) ops.push({ type: 'del', text: line });
  } else if (n * m > MAX_DIFF_CELLS) {
    for (const line of midA) ops.push({ type: 'del', text: line });
    for (const line of midB) ops.push({ type: 'add', text: line });
  } else {
    const width = m + 1;
    const dp = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i -= 1) {
      const row = i * width;
      const next = (i + 1) * width;
      for (let j = m - 1; j >= 0; j -= 1) {
        dp[row + j] = midA[i] === midB[j] ? dp[next + j + 1] + 1 : Math.max(dp[next + j], dp[row + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        ops.push({ type: 'ctx', text: midA[i] });
        i += 1;
        j += 1;
      } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
        ops.push({ type: 'del', text: midA[i] });
        i += 1;
      } else {
        ops.push({ type: 'add', text: midB[j] });
        j += 1;
      }
    }
    while (i < n) { ops.push({ type: 'del', text: midA[i] }); i += 1; }
    while (j < m) { ops.push({ type: 'add', text: midB[j] }); j += 1; }
  }
  for (let i = endA + 1; i < a.length; i += 1) ops.push({ type: 'ctx', text: a[i] });
  return ops;
}

function buildHunks(ops, context) {
  let oldNo = 1;
  let newNo = 1;
  const rows = ops.map((op) => {
    if (op.type === 'ctx') {
      const row = { type: 'ctx', text: op.text, oldNo, newNo };
      oldNo += 1;
      newNo += 1;
      return row;
    }
    if (op.type === 'del') {
      const row = { type: 'del', text: op.text, oldNo, newNo: null };
      oldNo += 1;
      return row;
    }
    const row = { type: 'add', text: op.text, oldNo: null, newNo };
    newNo += 1;
    return row;
  });
  let add = 0;
  let del = 0;
  const changeIdx = [];
  rows.forEach((row, i) => {
    if (row.type === 'add') add += 1;
    if (row.type === 'del') del += 1;
    if (row.type !== 'ctx') changeIdx.push(i);
  });
  if (changeIdx.length === 0) return { rows: [], stats: { add, del } };
  const ranges = [];
  for (const idx of changeIdx) {
    const from = Math.max(0, idx - context);
    const to = Math.min(rows.length - 1, idx + context);
    const last = ranges[ranges.length - 1];
    if (last && from <= last.to + 1) last.to = Math.max(last.to, to);
    else ranges.push({ from, to });
  }
  const out = [];
  let prevTo = -1;
  for (const range of ranges) {
    if (range.from > prevTo + 1) out.push({ type: 'gap', count: range.from - prevTo - 1 });
    for (let i = range.from; i <= range.to; i += 1) out.push(rows[i]);
    prevTo = range.to;
  }
  if (prevTo < rows.length - 1) out.push({ type: 'gap', count: rows.length - 1 - prevTo });
  return { rows: out, stats: { add, del } };
}

function buildFileDiff(beforeText, afterText) {
  const before = beforeText === undefined || beforeText === null ? '' : beforeText;
  const after = afterText === undefined || afterText === null ? '' : afterText;
  if (before.includes('\u0000') || after.includes('\u0000')) return { binary: true, stats: { add: 0, del: 0 } };
  const a = before === '' ? [] : splitLines(before);
  const b = after === '' ? [] : splitLines(after);
  if (a.length + b.length > MAX_DIFF_LINES) return { tooLarge: true, stats: { add: b.length, del: a.length } };
  const ops = computeLineOps(a, b);
  return buildHunks(ops, 3);
}

async function getBlobText(profile, repositoryName, blobId) {
  if (!blobId) return '';
  const out = await codecommit(profile, 'get-blob', ['--repository-name', repositoryName, '--blob-id', blobId]);
  const encoded = out && typeof out.content === 'string' ? out.content : '';
  if (encoded === '') return '';
  return Buffer.from(encoded, 'base64').toString('utf8');
}

async function fetchPullRequestSummary(profile, pullRequestId) {
  const { pullRequest } = await codecommit(profile, 'get-pull-request', ['--pull-request-id', pullRequestId]);
  const target = pullRequest?.pullRequestTargets?.[0] ?? {};
  const meta = target.mergeMetadata ?? {};
  return {
    pullRequestId: pullRequest.pullRequestId,
    title: pullRequest.title || '',
    status: pullRequest.pullRequestStatus || 'OPEN',
    author: shortArn(pullRequest.authorArn),
    authorArn: pullRequest.authorArn,
    creationDate: pullRequest.creationDate,
    lastActivityDate: pullRequest.lastActivityDate,
    sourceBranch: shortRef(target.sourceReference),
    destinationBranch: shortRef(target.destinationReference),
    repositoryName: target.repositoryName,
    isMerged: meta.isMerged === true,
    mergeOption: friendlyMergeOption(meta.mergeOption),
    mergeCommitId: meta.mergeCommitId,
    mergedBy: meta.mergedBy ? shortArn(meta.mergedBy) : undefined,
    revisionId: pullRequest.revisionId,
  };
}

async function walkCommits(profile, repositoryName, sourceCommit, mergeBase) {
  const commits = [];
  const seen = new Set();
  let current = sourceCommit;
  let guard = 0;
  const deadline = Date.now() + 12_000;
  while (current && !seen.has(current) && guard < MAX_COMMITS && Date.now() < deadline) {
    if (current === mergeBase) break; // exclude the merge base itself
    seen.add(current);
    const { commit } = await codecommit(profile, 'get-commit', ['--repository-name', repositoryName, '--commit-id', current]);
    if (!commit) break;
    commits.push({
      commitId: commit.commitId,
      shortId: shortSha(commit.commitId),
      message: commit.message || '',
      author: commit.author ? { name: commit.author.name, email: commit.author.email, date: commit.author.date } : undefined,
      committer: commit.committer ? { name: commit.committer.name, email: commit.committer.email, date: commit.committer.date } : undefined,
    });
    const parents = commit.parents ?? [];
    // Follow the first parent chain; the top-of-loop merge-base check ends the walk.
    current = parents[0];
    guard += 1;
  }
  return commits;
}

async function fetchPullRequestDetail(profile, repositoryName, pullRequestId) {
  const { pullRequest } = await codecommit(profile, 'get-pull-request', ['--pull-request-id', pullRequestId]);
  const target = pullRequest?.pullRequestTargets?.[0] ?? {};
  const repo = target.repositoryName || repositoryName;
  const revisionId = pullRequest.revisionId;
  const meta = target.mergeMetadata ?? {};

  const [evaluation, approvalStates, differences, commentsForPr, commits, callerArn] = await Promise.all([
    codecommit(profile, 'evaluate-pull-request-approval-rules', ['--pull-request-id', pullRequestId, '--revision-id', revisionId]).catch(() => null),
    codecommit(profile, 'get-pull-request-approval-states', ['--pull-request-id', pullRequestId, '--revision-id', revisionId]).catch(() => null),
    paginated(profile, 'get-differences', ['--repository-name', repo, '--after-commit-specifier', target.sourceCommit, '--before-commit-specifier', target.mergeBase || target.destinationCommit], 'differences').catch(() => []),
    codecommit(profile, 'get-comments-for-pull-request', ['--pull-request-id', pullRequestId]).catch(() => null),
    walkCommits(profile, repo, target.sourceCommit, target.mergeBase).catch(() => []),
    getCallerArn(profile).catch(() => null),
  ]);

  const isAuthor = sameIdentity(callerArn, pullRequest.authorArn);

  const approvals = (approvalStates?.approvals ?? [])
    .filter((a) => a.approvalState === 'APPROVE')
    .map((a) => ({ userArn: a.userArn, user: shortArn(a.userArn) }));

  const rules = (pullRequest.approvalRules ?? []).map((rule) => {
    let needed;
    try {
      const parsed = JSON.parse(rule.approvalRuleContent || '{}');
      needed = parsed?.Statements?.reduce((sum, s) => sum + (Number(s.NumberOfApprovalsNeeded) || 0), 0);
    } catch {
      needed = undefined;
    }
    return { id: rule.approvalRuleId, name: rule.approvalRuleName, needed };
  });

  const differencesView = (differences ?? []).map((d) => ({
    changeType: d.changeType,
    path: d.afterBlob?.path ?? d.beforeBlob?.path,
    beforeBlobId: d.beforeBlob?.blobId,
    afterBlobId: d.afterBlob?.blobId,
    beforeMode: d.beforeBlob?.mode,
    afterMode: d.afterBlob?.mode,
  }));

  const activity = (commentsForPr?.commentsForPullRequestData ?? []).flatMap((entry) =>
    (entry.comments ?? []).map((c) => ({
      kind: 'comment',
      author: shortArn(c.authorArn),
      authorArn: c.authorArn,
      content: c.content,
      createdAt: c.creationDate,
      updatedAt: c.lastModifiedDate,
      deleted: c.deleted === true,
      filePath: entry.location?.filePath,
    })),
  ).sort((a, b) => toTimestamp(a.createdAt) - toTimestamp(b.createdAt));

  return {
    pullRequestId: pullRequest.pullRequestId,
    title: pullRequest.title || '',
    description: pullRequest.description || '',
    status: pullRequest.pullRequestStatus || 'OPEN',
    author: shortArn(pullRequest.authorArn),
    authorArn: pullRequest.authorArn,
    creationDate: pullRequest.creationDate,
    lastActivityDate: pullRequest.lastActivityDate,
    revisionId,
    sourceBranch: shortRef(target.sourceReference),
    destinationBranch: shortRef(target.destinationReference),
    repositoryName: repo,
    sourceCommit: shortSha(target.sourceCommit),
    sourceCommitFull: target.sourceCommit,
    destinationCommit: shortSha(target.destinationCommit),
    destinationCommitFull: target.destinationCommit,
    mergeBase: shortSha(target.mergeBase),
    mergeBaseFull: target.mergeBase,
    isMerged: meta.isMerged === true,
    mergedBy: meta.mergedBy ? shortArn(meta.mergedBy) : undefined,
    mergeCommitId: meta.mergeCommitId ? shortSha(meta.mergeCommitId) : undefined,
    mergeOption: friendlyMergeOption(meta.mergeOption),
    isAuthor,
    approved: evaluation?.evaluation?.approved === true,
    overridden: evaluation?.evaluation?.overridden === true,
    satisfiedRules: evaluation?.evaluation?.approvalRulesSatisfied ?? [],
    unsatisfiedRules: evaluation?.evaluation?.approvalRulesNotSatisfied ?? [],
    approvals,
    rules,
    files: differencesView,
    commits,
    activity,
  };
}

/* ------------------------------------------------------------------ */
/* Route handler                                                       */
/* ------------------------------------------------------------------ */

async function handle(request) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const pathname = url.pathname.startsWith(PREFIX) ? url.pathname.slice(PREFIX.length) || '/' : url.pathname;
  const q = url.searchParams;

  try {
    if (method === 'GET' && pathname === '/profiles') {
      return json({ ok: true, ...getProfilesCached() });
    }

    const profile = q.get('profile') || '';
    if (!profile) return json({ ok: false, code: 'NO_PROFILE', message: '缺少 profile 参数' }, 400);

    if (method === 'GET' && pathname === '/repositories') {
      const repositories = await listRepositories(profile);
      return json({ ok: true, repositories });
    }

    const repoName = q.get('name') || '';
    if (!repoName) return json({ ok: false, code: 'NO_REPO', message: '缺少仓库名称' }, 400);

    if (method === 'GET' && pathname === '/repository') {
      const { repository } = await codecommit(profile, 'get-repository', ['--repository-name', repoName]);
      const meta = repository?.metadata ?? {};
      return json({
        ok: true,
        repository: {
          id: meta.repositoryId,
          name: meta.repositoryName,
          description: meta.repositoryDescription,
          defaultBranch: meta.defaultBranch,
          cloneUrlHttp: meta.cloneUrlHttp,
          cloneUrlSsh: meta.cloneUrlSsh,
          arn: meta.arn,
          creationDate: meta.creationDate,
          lastModifiedDate: meta.lastModifiedDate,
        },
      });
    }

    if (method === 'GET' && pathname === '/branches') {
      const [branches, repoResult] = await Promise.all([
        paginated(profile, 'list-branches', ['--repository-name', repoName], 'branches'),
        codecommit(profile, 'get-repository', ['--repository-name', repoName]),
      ]);
      return json({
        ok: true,
        defaultBranch: repoResult?.repository?.metadata?.defaultBranch,
        branches: branches.map((name) => ({ name })),
      });
    }

    if (method === 'GET' && pathname === '/pull-requests') {
      const status = q.get('status');
      const offset = Math.max(0, Number(q.get('offset')) || 0);
      const limit = Math.min(MAX_PR_LIST, Math.max(1, Number(q.get('limit')) || 20));
      const ids = await pullRequestIds(profile, repoName, status);
      const slice = ids.slice(offset, offset + limit);
      const summaries = await mapLimit(slice, 10, (id) => pullRequestSummary(profile, id).catch(() => null));
      return json({
        ok: true,
        pullRequests: summaries.filter(Boolean),
        offset,
        limit,
        total: ids.length,
        hasMore: offset + limit < ids.length,
      });
    }

    if (method === 'GET' && pathname === '/file-diff') {
      const path = q.get('path') || '';
      const beforeBlobId = q.get('beforeBlobId') || '';
      const afterBlobId = q.get('afterBlobId') || '';
      const [beforeText, afterText] = await Promise.all([
        beforeBlobId ? getBlobText(profile, repoName, beforeBlobId).catch(() => '') : Promise.resolve(''),
        afterBlobId ? getBlobText(profile, repoName, afterBlobId).catch(() => '') : Promise.resolve(''),
      ]);
      return json({ ok: true, path, diff: buildFileDiff(beforeText, afterText) });
    }

    if (method === 'GET' && pathname === '/pull-request') {
      const id = q.get('id') || '';
      if (!id) return json({ ok: false, code: 'NO_PR', message: '缺少 pull request id' }, 400);
      const detail = await fetchPullRequestDetail(profile, repoName, id);
      return json({ ok: true, pullRequest: detail });
    }

    if (method === 'POST' && pathname === '/approve') {
      const body = await request.json().catch(() => ({}));
      const { pullRequestId, revisionId, action } = body;
      if (!pullRequestId || !revisionId) return json({ ok: false, code: 'NO_PR', message: '缺少 pull request id / revision id' }, 400);
      if (action !== 'APPROVE' && action !== 'REVOKE') return json({ ok: false, code: 'BAD_ACTION', message: 'approval-state 必须是 APPROVE 或 REVOKE' }, 400);
      await codecommit(profile, 'update-pull-request-approval-state', [
        '--pull-request-id', pullRequestId,
        '--revision-id', revisionId,
        '--approval-state', action,
      ]);
      prSummaryCache.delete(`${profile}|${pullRequestId}`);
      return json({ ok: true });
    }

    if (method === 'POST' && pathname === '/merge') {
      const body = await request.json().catch(() => ({}));
      const { pullRequestId, mergeType } = body;
      if (!pullRequestId) return json({ ok: false, code: 'NO_PR', message: '缺少 pull request id' }, 400);
      const subcommand = {
        'fast-forward': 'merge-pull-request-by-fast-forward',
        'three-way': 'merge-pull-request-by-three-way',
        squash: 'merge-pull-request-by-squash',
      }[mergeType];
      if (!subcommand) return json({ ok: false, code: 'BAD_MERGE', message: '未知的合并方式' }, 400);
      const out = await codecommit(profile, subcommand, ['--pull-request-id', pullRequestId, '--repository-name', repoName]);
      prSummaryCache.delete(`${profile}|${pullRequestId}`);
      ['OPEN', 'CLOSED', 'ALL'].forEach((s) => prIdCache.delete(`${profile}|${repoName}|${s}`));
      return json({ ok: true, mergedCommitId: out?.mergedCommitId });
    }

    return json({ ok: false, code: 'NOT_FOUND', message: '未知接口' }, 404);
  } catch (error) {
    return json({ ok: false, code: 'INTERNAL', message: error instanceof Error ? error.message : String(error) }, 500);
  }
}

/* ------------------------------------------------------------------ */
/* Plugin entry                                                        */
/* ------------------------------------------------------------------ */

export function apply(ctx) {
  const webServer = typeof ctx.get === 'function' ? ctx.get('webServer') : ctx.webServer;
  if (!webServer || typeof webServer.register !== 'function') {
    throw new Error('aws-codecommit 需要 webServer 服务');
  }
  const dispose = webServer.register({ kind: 'prefix', path: PREFIX, resource: handle });
  if (typeof ctx.effect === 'function') ctx.effect(() => dispose, 'aws-codecommit:routes');
  else dispose;
}

export default { name, inject, apply };
