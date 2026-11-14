/* Client half of the AWS CodeCommit panel: a GitHub-style React UI rendered in a
 * dedicated `main` panel with a matching `sidebar.panellist` entry. */
window.__ModuleLoader__.load({
  id: 'dsh-aws-codecommit',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback, useMemo, useRef } = React;

    const PANEL_ID = 'dsh-aws-codecommit';
    const API = '/api/dsh-aws-codecommit';
    const LS_PREFIX = 'dsh-aws-codecommit';
    const LEGACY_LS_PREFIX = 'ds-aws-codecommit';
    const PR_PAGE = 20;

    /* ---------------- i18n ---------------- */
    const DICT = {
      zh: {
        "section.title": "CodeCommit",
        "profile.label": "环境",
        "repo.search.placeholder": "搜索仓库…",
        "refresh": "刷新",
        "loading": "加载中…",
        "error.prefix": "错误",
        "repos.title": "仓库",
        "repos.empty": "没有找到仓库",
        "repos.count": "{count} 个仓库",
        "repoList.favorites": "收藏",
        "repoList.all": "全部",
        "favorites.empty": "还没有收藏的仓库",
        "favorite.add": "收藏仓库",
        "favorite.remove": "取消收藏",
        "repo.defaultBranch": "默认分支",
        "tab.pr": "Pull Requests",
        "tab.branches": "分支",
        "tab.conversation": "对话",
        "tab.commits": "提交",
        "tab.files": "文件改动",
        "pr.empty": "没有 Pull Request",
        "pr.filter.all": "全部",
        "pr.filter.open": "开放",
        "pr.filter.closed": "已关闭",
        "pr.open": "开放",
        "pr.closed": "已关闭",
        "pr.merged": "已合并",
        "pr.by": "{author} 创建于 {date}",
        "pr.id": "PR #{id}",
        "pr.approved": "已批准",
        "pr.notApproved": "未批准",
        "pr.approvalCount": "{count} 个批准",
        "pr.approvers": "批准人",
        "pr.noApprovers": "暂无批准",
        "pr.author": "作者",
        "pr.created": "创建时间",
        "pr.lastActivity": "最近活动",
        "pr.source": "源分支",
        "pr.target": "目标分支",
        "pr.status": "状态",
        "pr.mergeOption": "合并方式",
        "pr.description": "描述",
        "pr.noDescription": "没有描述",
        "pr.commits": "提交历史",
        "pr.files": "更改的文件",
        "pr.activity": "活动历史",
        "pr.noActivity": "暂无活动",
        "pr.noCommits": "暂无提交",
        "pr.noFiles": "没有文件改动",
        "pr.overridden": "审批规则已被覆盖",
        "pr.loadMore": "加载更多",
        "pr.needApproval": "需要满足批准条件后才能合并",
        "approve": "批准",
        "revoke": "拒绝 / 撤销审批",
        "merge": "合并",
        "merge.fast-forward": "Fast-forward",
        "merge.three-way": "Three-way",
        "merge.squash": "Squash",
        "merging": "合并中…",
        "approving": "提交中…",
        "merged.ok": "已合并",
        "approved.ok": "已批准",
        "revoked.ok": "已撤销",
        "action.failed": "操作失败",
        "confirm.merge": "确认合并",
        "cancel": "取消",
        "diff.added": "新增",
        "diff.modified": "修改",
        "diff.deleted": "删除",
        "back": "返回",
        "selectRepoHint": "选择左侧仓库以查看分支与 Pull Request",
        "no.profile": "未找到 AWS profile，请先配置 ~/.aws/config 与 ~/.aws/credentials",
        "branches.empty": "该仓库没有分支",
        "branches.default": "默认"
      },
      en: {
        "section.title": "CodeCommit",
        "profile.label": "Profile",
        "repo.search.placeholder": "Search repositories…",
        "refresh": "Refresh",
        "loading": "Loading…",
        "error.prefix": "Error",
        "repos.title": "Repositories",
        "repos.empty": "No repositories found",
        "repos.count": "{count} repositories",
        "repoList.favorites": "Favorites",
        "repoList.all": "All",
        "favorites.empty": "No favorite repositories yet",
        "favorite.add": "Favorite repository",
        "favorite.remove": "Remove from favorites",
        "repo.defaultBranch": "Default branch",
        "tab.pr": "Pull requests",
        "tab.branches": "Branches",
        "tab.conversation": "Conversation",
        "tab.commits": "Commits",
        "tab.files": "Files changed",
        "pr.empty": "No pull requests",
        "pr.filter.all": "All",
        "pr.filter.open": "Open",
        "pr.filter.closed": "Closed",
        "pr.open": "Open",
        "pr.closed": "Closed",
        "pr.merged": "Merged",
        "pr.by": "opened by {author} on {date}",
        "pr.id": "PR #{id}",
        "pr.approved": "Approved",
        "pr.notApproved": "Not approved",
        "pr.approvalCount": "{count} approvals",
        "pr.approvers": "Approvers",
        "pr.noApprovers": "No approvals yet",
        "pr.author": "Author",
        "pr.created": "Created",
        "pr.lastActivity": "Last activity",
        "pr.source": "Source",
        "pr.target": "Target",
        "pr.status": "Status",
        "pr.mergeOption": "Merge option",
        "pr.description": "Description",
        "pr.noDescription": "No description",
        "pr.commits": "Commit history",
        "pr.files": "Files changed",
        "pr.activity": "Activity",
        "pr.noActivity": "No activity yet",
        "pr.noCommits": "No commits",
        "pr.noFiles": "No files changed",
        "pr.overridden": "Approval rules overridden",
        "pr.loadMore": "Load more",
        "pr.needApproval": "Approval rules must be satisfied before merging",
        "approve": "Approve",
        "revoke": "Revoke approval",
        "merge": "Merge",
        "merge.fast-forward": "Fast-forward",
        "merge.three-way": "Three-way",
        "merge.squash": "Squash",
        "merging": "Merging…",
        "approving": "Submitting…",
        "merged.ok": "Merged",
        "approved.ok": "Approved",
        "revoked.ok": "Revoked",
        "action.failed": "Action failed",
        "confirm.merge": "Confirm merge",
        "cancel": "Cancel",
        "diff.added": "Added",
        "diff.modified": "Modified",
        "diff.deleted": "Deleted",
        "back": "Back",
        "selectRepoHint": "Select a repository on the left to view branches and pull requests",
        "no.profile": "No AWS profiles found; configure ~/.aws/config and ~/.aws/credentials first",
        "branches.empty": "This repository has no branches",
        "branches.default": "default"
      }
    };

    function activeLang(locale) {
      try {
        const code = locale && locale.getLocale ? (locale.getLocale().active ?? locale.lang) : undefined;
        if (!code) return 'zh';
        return code === 'zh' || code.startsWith('zh-') ? 'zh' : 'en';
      } catch {
        return 'zh';
      }
    }
    function buildTranslate(locale) {
      const lang = activeLang(locale);
      return (key, params) => {
        const template = DICT[lang][key] ?? DICT.zh[key] ?? key;
        if (params === undefined) return template;
        return String(template).replace(/\{(\w+)\}/g, (m, n) => (n in params ? String(params[n]) : m));
      };
    }

    /* ---------------- local persistence ---------------- */
    function lsGet(key, fallback) {
      try {
        const v = window.localStorage.getItem(key);
        if (v != null) return JSON.parse(v);
        // Carry favourites / last page over from the previous plugin name once.
        if (key.startsWith(`${LS_PREFIX}:`)) {
          const legacyKey = LEGACY_LS_PREFIX + key.slice(LS_PREFIX.length);
          const legacy = window.localStorage.getItem(legacyKey);
          if (legacy != null) {
            window.localStorage.setItem(key, legacy);
            return JSON.parse(legacy);
          }
        }
        return fallback;
      } catch {
        return fallback;
      }
    }
    function lsSet(key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    }
    function readFavorites(profile) {
      const list = lsGet(`${LS_PREFIX}:favorites:${profile}`, []);
      return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
    }
    function writeFavorites(profile, list) {
      lsSet(`${LS_PREFIX}:favorites:${profile}`, list);
    }
    function readLastState() {
      const s = lsGet(`${LS_PREFIX}:last`, {});
      return s && typeof s === 'object' ? s : {};
    }
    function writeLastState(state) {
      lsSet(`${LS_PREFIX}:last`, state);
    }

    /* ---------------- styles ---------------- */
    const STYLE_ID = 'dsh-aws-codecommit-style';
    const CSS = `
.acc-root{--acc-fg:var(--dsw-alias-label-primary,#1f2328);--acc-muted:var(--dsw-alias-label-secondary,#6b7280);--acc-faint:var(--dsw-alias-label-tertiary,#9aa1a9);--acc-bg:var(--dsw-alias-bg-base,#fff);--acc-panel:var(--dsw-alias-bg-layer-1,#f8fafc);--acc-panel2:var(--dsw-alias-bg-layer-2,#f1f3f5);--acc-border:var(--dsw-alias-border-l2,#e5e7eb);--acc-border2:var(--dsw-alias-border-l1,#eef0f2);--acc-brand:var(--dsw-alias-brand-primary,#2563eb);--acc-ok:var(--dsw-alias-state-success-primary,#16a34a);--acc-warn:var(--dsw-alias-state-warn-primary,#d97706);--acc-err:var(--dsw-alias-state-error-primary,#dc2626);
color:var(--acc-fg);font-size:14px;line-height:1.5;height:100%;min-height:0;display:flex;overflow:hidden;background:var(--acc-bg);}
.acc-root *{box-sizing:border-box;}
.acc-sidebar{width:272px;flex:none;border-right:1px solid var(--acc-border);display:flex;flex-direction:column;background:var(--acc-panel);min-height:0;}
.acc-side-head{display:flex;flex-direction:column;gap:8px;padding:12px;border-bottom:1px solid var(--acc-border);}
.acc-side-title{font-size:12px;font-weight:600;color:var(--acc-muted);text-transform:uppercase;letter-spacing:.04em;}
.acc-select{font:inherit;color:inherit;background:var(--acc-bg);border:1px solid var(--acc-border);border-radius:7px;padding:6px 8px;width:100%;}
.acc-input{font:inherit;color:inherit;background:var(--acc-bg);border:1px solid var(--acc-border);border-radius:7px;padding:6px 9px;width:100%;}
.acc-input:focus,.acc-select:focus{outline:2px solid color-mix(in srgb,var(--acc-brand) 35%,transparent);outline-offset:1px;}
.acc-side-toggle{display:flex;border:1px solid var(--acc-border);border-radius:7px;overflow:hidden;flex:none;}
.acc-side-toggle button{flex:1;appearance:none;border:none;background:none;padding:5px 0;font:inherit;font-size:12px;color:var(--acc-muted);cursor:pointer;}
.acc-side-toggle button.on{background:color-mix(in srgb,var(--acc-brand) 14%,transparent);color:var(--acc-fg);font-weight:600;}
.acc-side-list{flex:1;min-height:0;overflow-y:auto;padding:6px;}
.acc-repo-item{display:flex;align-items:center;gap:6px;width:100%;text-align:left;border:none;background:none;padding:8px 10px;border-radius:7px;cursor:pointer;font:inherit;color:inherit;}
.acc-repo-item:hover{background:color-mix(in srgb,var(--acc-brand) 8%,transparent);}
.acc-repo-item.on{background:color-mix(in srgb,var(--acc-brand) 14%,transparent);}
.acc-repo-heart{appearance:none;border:none;background:none;cursor:pointer;font-size:15px;line-height:1;padding:0 6px 0 0;color:var(--acc-faint);flex:none;}
.acc-repo-heart.on{color:#ec4899;}
.acc-repo-body{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;}
.acc-repo-name{font-weight:600;font-size:13px;overflow-wrap:anywhere;}
.acc-repo-meta{font-size:11px;color:var(--acc-muted);overflow-wrap:anywhere;}
.acc-heart-btn{appearance:none;border:none;background:none;cursor:pointer;font-size:18px;line-height:1;color:var(--acc-faint);padding:0;flex:none;}
.acc-heart-btn.on{color:#ec4899;}
.acc-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;}
.acc-topbar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--acc-border);}
.acc-topbar .acc-grow{flex:1;min-width:0;}
.acc-btn{appearance:none;font:inherit;cursor:pointer;border-radius:7px;border:1px solid var(--acc-border);background:var(--acc-bg);padding:5px 11px;color:inherit;white-space:nowrap;}
.acc-btn:hover:not(:disabled){border-color:color-mix(in srgb,var(--acc-brand) 45%,var(--acc-border));}
.acc-btn:disabled{opacity:.55;cursor:not-allowed;}
.acc-btn-success{background:#1f883d;border-color:#1f883d;color:#fff;}
.acc-btn-success:hover:not(:disabled){background:#187733;border-color:#187733;}
.acc-btn-on{border-color:var(--acc-brand);color:var(--acc-brand);background:color-mix(in srgb,var(--acc-brand) 14%,transparent);font-weight:600;}
.acc-btn-danger{background:transparent;border-color:var(--acc-err);color:var(--acc-err);}
.acc-btn-sm{padding:3px 9px;font-size:12px;}
.acc-body{flex:1;min-height:0;overflow-y:auto;padding:16px;}
.acc-muted{color:var(--acc-muted);}
.acc-faint{color:var(--acc-faint);}
.acc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:100%;color:var(--acc-muted);text-align:center;padding:24px;}
@keyframes acc-spin{to{transform:rotate(360deg);}}
.acc-spinner{width:28px;height:28px;border-radius:50%;border:3px solid var(--acc-border);border-top-color:var(--acc-brand);animation:acc-spin .75s linear infinite;flex:none;}
.acc-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:140px;color:var(--acc-muted);font-size:13px;text-align:center;padding:28px;}
.acc-loading .acc-spinner{width:34px;height:34px;border-width:4px;}
.acc-loading-label{color:var(--acc-muted);letter-spacing:.02em;}
@keyframes acc-progress{0%{left:-45%;}100%{left:100%;}}
.acc-progress{position:relative;height:3px;overflow:hidden;background:transparent;flex:none;}
.acc-progress::before{content:"";position:absolute;top:0;left:-45%;height:100%;width:45%;background:var(--acc-brand);animation:acc-progress 1.1s ease-in-out infinite;}
.acc-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;}
.acc-badge{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--acc-border);border-radius:999px;padding:1px 9px;font-size:12px;font-weight:600;}
.acc-badge.open{color:var(--acc-ok);border-color:color-mix(in srgb,var(--acc-ok) 45%,var(--acc-border));background:color-mix(in srgb,var(--acc-ok) 10%,transparent);}
.acc-badge.closed{color:#8b5cf6;border-color:color-mix(in srgb,#8b5cf6 45%,var(--acc-border));background:color-mix(in srgb,#8b5cf6 10%,transparent);}
.acc-badge.merged{color:var(--acc-brand);border-color:color-mix(in srgb,var(--acc-brand) 45%,var(--acc-border));background:color-mix(in srgb,var(--acc-brand) 10%,transparent);}
.acc-dot{width:7px;height:7px;border-radius:50%;background:var(--acc-faint);flex:none;}
.acc-dot.ok{background:var(--acc-ok);}.acc-dot.warn{background:var(--acc-warn);}.acc-dot.err{background:var(--acc-err);}
.acc-tabs{display:flex;gap:4px;border-bottom:1px solid var(--acc-border);padding:0 14px;}
.acc-tab{appearance:none;border:none;background:none;padding:9px 12px;font:inherit;color:var(--acc-muted);cursor:pointer;border-bottom:2px solid transparent;display:inline-flex;align-items:center;gap:6px;}
.acc-tab[aria-selected="true"]{color:var(--acc-fg);border-bottom-color:var(--acc-brand);font-weight:600;}
.acc-list{display:flex;flex-direction:column;}
.acc-pr-row{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-bottom:1px solid var(--acc-border2);cursor:pointer;}
.acc-pr-row:hover{background:color-mix(in srgb,var(--acc-brand) 5%,transparent);}
.acc-pr-row-title{font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.acc-pr-row-meta{font-size:12px;color:var(--acc-muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.acc-branch-row{display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--acc-border2);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;}
.acc-head{display:flex;flex-direction:column;gap:10px;padding:16px 14px;border-bottom:1px solid var(--acc-border);}
.acc-pr-title-row{display:flex;align-items:flex-start;gap:10px;}
.acc-pr-title{font-size:19px;font-weight:600;line-height:1.3;margin:0;}
.acc-pr-sub{color:var(--acc-muted);font-size:13px;}
.acc-columns{display:flex;gap:18px;align-items:flex-start;}
.acc-col-main{flex:1;min-width:0;}
.acc-col-side{width:280px;flex:none;display:flex;flex-direction:column;gap:12px;}
.acc-card{border:1px solid var(--acc-border);border-radius:9px;background:var(--acc-panel);padding:12px 14px;display:flex;flex-direction:column;gap:8px;}
.acc-card h3{margin:0;font-size:12px;font-weight:600;color:var(--acc-muted);text-transform:uppercase;letter-spacing:.04em;}
.acc-kv{display:grid;grid-template-columns:88px minmax(0,1fr);gap:4px 8px;font-size:12px;}
.acc-kv dt{color:var(--acc-muted);}
.acc-kv dd{margin:0;overflow-wrap:anywhere;}
.acc-desc{border:1px solid var(--acc-border2);border-radius:8px;padding:10px 12px;font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;}
.acc-activity{display:flex;flex-direction:column;gap:2px;padding:6px 0;}
.acc-activity-item{display:flex;gap:10px;padding:8px 0;border-bottom:1px dashed var(--acc-border2);}
.acc-activity-item:last-child{border-bottom:none;}
.acc-avatar{width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--acc-fg) 14%,transparent);color:var(--acc-fg);font-weight:700;font-size:12px;}
.acc-commit-item{display:flex;flex-direction:column;gap:3px;padding:10px 2px;border-bottom:1px solid var(--acc-border2);}
.acc-file-row{display:flex;align-items:center;gap:9px;padding:8px 2px;border-bottom:1px solid var(--acc-border2);}
.acc-file-tag{font-size:11px;font-weight:700;width:16px;height:16px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;color:#fff;flex:none;}
.acc-file-tag.A{background:#1a7f37;}
.acc-file-tag.M{background:#9a6700;}
.acc-file-tag.D{background:#cf222e;}
.acc-approver{display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0;}
.acc-notice{border:1px solid var(--acc-border);border-left:3px solid var(--acc-ok);border-radius:8px;padding:8px 11px;font-size:12px;background:color-mix(in srgb,var(--acc-ok) 8%,var(--acc-bg));}
.acc-notice.err{border-left-color:var(--acc-err);background:color-mix(in srgb,var(--acc-err) 8%,var(--acc-bg));}
.acc-merge-options{display:flex;flex-direction:column;gap:6px;}
.acc-merge-opt{appearance:none;text-align:left;border:1px solid var(--acc-border);border-radius:7px;background:var(--acc-bg);padding:7px 9px;font:inherit;font-size:12px;cursor:pointer;color:inherit;}
.acc-merge-opt[aria-selected="true"]{border-color:var(--acc-brand);background:color-mix(in srgb,var(--acc-brand) 12%,transparent);font-weight:600;}
.acc-confirm{display:flex;gap:8px;align-items:center;}
.acc-rule-name{font-size:12px;color:var(--acc-muted);display:flex;justify-content:space-between;gap:8px;}
`;

    function injectStyles() {
      if (typeof document === 'undefined') return () => {};
      const existing = document.getElementById(STYLE_ID);
      if (existing) return () => {};
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
      return () => style.remove();
    }

    /* ---------------- api ---------------- */
    async function apiCall(method, path, body) {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
      });
      let json = {};
      try { json = await res.json(); } catch { json = {}; }
      if (!res.ok || json.ok === false) {
        const err = new Error(typeof json.message === 'string' ? json.message : `HTTP ${res.status}`);
        err.code = json.code;
        throw err;
      }
      return json;
    }

    function fmtDate(v) {
      if (v === undefined || v === null || v === '') return '—';
      let d;
      if (typeof v === 'number') {
        d = new Date(v * 1000);
      } else if (typeof v === 'string') {
        const git = v.match(/^(\d{9,})\s*([+-]\d{4})?$/);
        d = git ? new Date(Number(git[1]) * 1000) : new Date(v);
      } else {
        d = new Date(v);
      }
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    /* ---------------- small components ---------------- */
    function Badge(props) {
      return h('span', { className: `acc-badge ${props.kind}` }, props.dot ? h('span', { className: `acc-dot ${props.dot}` }) : null, props.label);
    }

    function Avatar(props) {
      const name = props.name || '?';
      return h('span', { className: 'acc-avatar', title: props.title }, name.slice(0, 1).toUpperCase());
    }

    function Spinner(props) {
      const label = props && props.label ? props.label : '…';
      return h('div', { className: 'acc-loading', role: 'status', 'aria-live': 'polite' },
        h('div', { className: 'acc-spinner' }),
        h('span', { className: 'acc-loading-label' }, label),
      );
    }

    function ErrorBox(props) {
      return h('div', { className: 'acc-empty' }, h('div', null, props.t('error.prefix') + ': ' + props.message));
    }

    /* ---------------- sidebar panel icon ---------------- */
    function PanelIcon(props) {
      const size = props.size || 20;
      return h('svg', {
        viewBox: '0 0 64 64', width: size, height: size, fill: 'none', 'aria-hidden': true, focusable: 'false',
      },
        h('path', { d: 'M16 16a5 5 0 1 1 0 10 5 5 0 0 1 0-10z', fill: 'currentColor', opacity: 0.9 }),
        h('path', { d: 'M16 38a5 5 0 1 1 0 10 5 5 0 0 1 0-10z', fill: 'currentColor', opacity: 0.55 }),
        h('path', { d: 'M16 21v7M21 28c8 0 8 10 16 10M34 34l5 4-5 4', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M16 43h10', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' }),
      );
    }

    /* ---------------- main app ---------------- */
    function Root(props) {
      const t = props.t;

      const [profiles, setProfiles] = useState([]);
      const [profile, setProfile] = useState('');
      const [profileError, setProfileError] = useState(null);

      const [repos, setRepos] = useState([]);
      const [reposLoading, setReposLoading] = useState(false);
      const [reposError, setReposError] = useState(null);
      const [search, setSearch] = useState('');

      const [favorites, setFavorites] = useState([]);
      const [repoListMode, setRepoListMode] = useState('favorites');

      const [selectedRepo, setSelectedRepo] = useState(null);
      const [repoDetail, setRepoDetail] = useState(null);
      const [view, setView] = useState('pr');
      const [prStatus, setPrStatus] = useState('OPEN');
      const [prs, setPrs] = useState([]);
      const [prsLoading, setPrsLoading] = useState(false);
      const [prsError, setPrsError] = useState(null);
      const [prsHasMore, setPrsHasMore] = useState(false);
      const [prsLoadingMore, setPrsLoadingMore] = useState(false);
      const [branches, setBranches] = useState([]);
      const [branchesLoading, setBranchesLoading] = useState(false);

      const [selectedPr, setSelectedPr] = useState(null);
      const [prDetail, setPrDetail] = useState(null);
      const [prDetailLoading, setPrDetailLoading] = useState(false);
      const [prDetailError, setPrDetailError] = useState(null);
      const [prTab, setPrTab] = useState('conversation');

      const [busy, setBusy] = useState(false);
      const [mergeConfirm, setMergeConfirm] = useState(false);
      const [mergeType, setMergeType] = useState('fast-forward');
      const [notice, setNotice] = useState(null);
      const [refreshTick, setRefreshTick] = useState(0);
      const [hydrated, setHydrated] = useState(false);

      const mountedRef = useRef(true);
      useEffect(() => () => { mountedRef.current = false; }, []);
      const flashNotice = useCallback((msg, isErr) => {
        setNotice({ msg, err: !!isErr });
        setTimeout(() => { if (mountedRef.current) setNotice(null); }, 4000);
      }, []);

      /* load profiles + restore last page on mount */
      useEffect(() => {
        let alive = true;
        apiCall('GET', '/profiles')
          .then((data) => {
            if (!alive) return;
            const profs = data.profiles || [];
            setProfiles(profs);
            const saved = readLastState();
            const profileToUse = profs.some((p) => p.name === saved.profile) ? saved.profile : (data.defaultProfile || profs[0]?.name || '');
            setProfile(profileToUse);
            if (saved.selectedRepo) setSelectedRepo(saved.selectedRepo);
            if (saved.view === 'branches' || saved.view === 'pr') setView(saved.view);
            if (saved.prStatus) setPrStatus(saved.prStatus);
            if (saved.selectedPr) setSelectedPr(saved.selectedPr);
            if (saved.prTab) setPrTab(saved.prTab);
            if (saved.repoListMode === 'all' || saved.repoListMode === 'favorites') setRepoListMode(saved.repoListMode);
            setHydrated(true);
          })
          .catch((e) => { if (alive) setProfileError(e.message); });
        return () => { alive = false; };
      }, []);

      /* load favorites for current profile */
      useEffect(() => {
        if (!profile) return;
        setFavorites(readFavorites(profile));
      }, [profile]);

      /* persist last page */
      useEffect(() => {
        if (!hydrated) return;
        writeLastState({ profile, selectedRepo, view, prStatus, selectedPr, prTab, repoListMode });
      }, [hydrated, profile, selectedRepo, view, prStatus, selectedPr, prTab, repoListMode]);

      /* load repositories when profile changes */
      useEffect(() => {
        if (!profile) return;
        let alive = true;
        setReposLoading(true); setReposError(null);
        apiCall('GET', `/repositories?profile=${encodeURIComponent(profile)}`)
          .then((data) => { if (alive) setRepos(data.repositories || []); })
          .catch((e) => { if (alive) { setReposError(e.message); setRepos([]); } })
          .finally(() => { if (alive) setReposLoading(false); });
        return () => { alive = false; };
      }, [profile, refreshTick]);

      /* load repo detail + branches when a repo is selected */
      useEffect(() => {
        if (!profile || !selectedRepo) return;
        let alive = true;
        setSelectedPr(null); setPrDetail(null); setRepoDetail(null);
        apiCall('GET', `/repository?profile=${encodeURIComponent(profile)}&name=${encodeURIComponent(selectedRepo)}`)
          .then((data) => { if (alive) setRepoDetail(data.repository || null); })
          .catch(() => {});
        setBranchesLoading(true);
        apiCall('GET', `/branches?profile=${encodeURIComponent(profile)}&name=${encodeURIComponent(selectedRepo)}`)
          .then((data) => { if (alive) setBranches(data.branches || []); })
          .catch(() => { if (alive) setBranches([]); })
          .finally(() => { if (alive) setBranchesLoading(false); });
        return () => { alive = false; };
      }, [profile, selectedRepo, refreshTick]);

      /* load PRs when repo or status changes (first page; "load more" appends) */
      useEffect(() => {
        if (!profile || !selectedRepo) return;
        let alive = true;
        setPrsLoading(true); setPrsError(null); setPrsHasMore(false); setPrsLoadingMore(false);
        apiCall('GET', `/pull-requests?profile=${encodeURIComponent(profile)}&name=${encodeURIComponent(selectedRepo)}&status=${prStatus}&offset=0&limit=${PR_PAGE}`)
          .then((data) => { if (alive) { setPrs(data.pullRequests || []); setPrsHasMore(data.hasMore === true); } })
          .catch((e) => { if (alive) { setPrsError(e.message); setPrs([]); } })
          .finally(() => { if (alive) setPrsLoading(false); });
        return () => { alive = false; };
      }, [profile, selectedRepo, prStatus, refreshTick]);

      /* load PR detail when a PR is selected */
      useEffect(() => {
        if (!profile || !selectedRepo || !selectedPr) return;
        let alive = true;
        setPrDetailLoading(true); setPrDetailError(null); setPrDetail(null);
        apiCall('GET', `/pull-request?profile=${encodeURIComponent(profile)}&name=${encodeURIComponent(selectedRepo)}&id=${encodeURIComponent(selectedPr)}`)
          .then((data) => { if (alive) { setPrDetail(data.pullRequest || null); setPrTab('conversation'); setMergeConfirm(false); } })
          .catch((e) => { if (alive) setPrDetailError(e.message); })
          .finally(() => { if (alive) setPrDetailLoading(false); });
        return () => { alive = false; };
      }, [profile, selectedRepo, selectedPr, refreshTick]);

      const filteredRepos = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list;
        if (repoListMode === 'favorites') {
          // Render favorites straight from localStorage so the list appears
          // before the (slower) full repository listing returns.
          list = favorites.map((name) => {
            const match = repos.find((r) => r.name === name);
            return { name, id: match ? match.id : undefined };
          });
        } else {
          list = repos;
        }
        if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
        return list;
      }, [repos, search, favorites, repoListMode]);

      const openRepo = useCallback((name) => {
        setSelectedRepo(name); setView('pr'); setPrStatus('OPEN'); setPrs([]);
      }, []);

      const changeProfile = useCallback((name) => {
        setProfile(name);
        setSelectedRepo(null); setSelectedPr(null); setPrDetail(null); setRepoDetail(null);
        setPrs([]); setBranches([]);
      }, []);

      const toggleFavorite = useCallback((repoName) => {
        setFavorites((prev) => {
          const next = prev.includes(repoName) ? prev.filter((r) => r !== repoName) : [...prev, repoName];
          writeFavorites(profile, next);
          return next;
        });
      }, [profile]);

      const loadMorePrs = useCallback(async () => {
        if (!profile || !selectedRepo || prsLoadingMore) return;
        setPrsLoadingMore(true);
        try {
          const offset = prs.length;
          const data = await apiCall('GET', `/pull-requests?profile=${encodeURIComponent(profile)}&name=${encodeURIComponent(selectedRepo)}&status=${prStatus}&offset=${offset}&limit=${PR_PAGE}`);
          setPrs((prev) => [...prev, ...(data.pullRequests || [])]);
          setPrsHasMore(data.hasMore === true);
        } catch (e) {
          flashNotice(t('action.failed') + ': ' + e.message, true);
        } finally {
          setPrsLoadingMore(false);
        }
      }, [profile, selectedRepo, prStatus, prs.length, prsLoadingMore, flashNotice, t]);

      const doApprove = useCallback(async (action) => {
        if (!prDetail) return;
        setBusy(true);
        try {
          await apiCall('POST', `/approve?profile=${encodeURIComponent(profile)}&name=${encodeURIComponent(selectedRepo)}`, {
            pullRequestId: prDetail.pullRequestId,
            revisionId: prDetail.revisionId,
            action,
          });
          flashNotice(t(action === 'APPROVE' ? 'approved.ok' : 'revoked.ok'));
          const data = await apiCall('GET', `/pull-request?profile=${encodeURIComponent(profile)}&name=${encodeURIComponent(selectedRepo)}&id=${encodeURIComponent(prDetail.pullRequestId)}`);
          setPrDetail(data.pullRequest || prDetail);
        } catch (e) {
          flashNotice(t('action.failed') + ': ' + e.message, true);
        } finally {
          setBusy(false);
        }
      }, [profile, selectedRepo, prDetail, flashNotice, t]);

      const doMerge = useCallback(async () => {
        if (!prDetail) return;
        setBusy(true); setMergeConfirm(false);
        try {
          await apiCall('POST', `/merge?profile=${encodeURIComponent(profile)}&name=${encodeURIComponent(selectedRepo)}`, {
            pullRequestId: prDetail.pullRequestId,
            mergeType,
          });
          flashNotice(t('merged.ok'));
          const data = await apiCall('GET', `/pull-request?profile=${encodeURIComponent(profile)}&name=${encodeURIComponent(selectedRepo)}&id=${encodeURIComponent(prDetail.pullRequestId)}`);
          setPrDetail(data.pullRequest || prDetail);
        } catch (e) {
          flashNotice(t('action.failed') + ': ' + e.message, true);
        } finally {
          setBusy(false);
        }
      }, [profile, selectedRepo, prDetail, mergeType, flashNotice, t]);

      /* ---------------- render ---------------- */
      const repoItems = filteredRepos.map((r) => {
        const isFav = favorites.includes(r.name);
        return h('div', {
          key: r.name,
          className: `acc-repo-item${selectedRepo === r.name ? ' on' : ''}`,
          onClick: () => openRepo(r.name),
        },
          h('button', {
            type: 'button',
            className: `acc-repo-heart${isFav ? ' on' : ''}`,
            title: t(isFav ? 'favorite.remove' : 'favorite.add'),
            'aria-pressed': isFav,
            onClick: (e) => { e.stopPropagation(); toggleFavorite(r.name); },
          }, isFav ? '♥' : '♡'),
          h('div', { className: 'acc-repo-body' },
            h('span', { className: 'acc-repo-name' }, r.name),
            h('span', { className: 'acc-repo-meta' }, r.id),
          ),
        );
      });

      const sidebar = h('aside', { className: 'acc-sidebar' },
        h('div', { className: 'acc-side-head' },
          h('div', { className: 'acc-side-title' }, t('profile.label')),
          profileError
            ? h('div', { className: 'acc-notice err' }, profileError)
            : h('select', {
                className: 'acc-select', value: profile,
                onChange: (e) => changeProfile(e.target.value),
                'aria-label': t('profile.label'),
              },
                profiles.map((p) => h('option', { key: p.name, value: p.name }, p.name)),
              ),
          h('input', {
            className: 'acc-input', type: 'search',
            placeholder: t('repo.search.placeholder'), value: search,
            onChange: (e) => setSearch(e.target.value),
          }),
          h('div', { className: 'acc-side-toggle' },
            ['favorites', 'all'].map((mode) =>
              h('button', {
                key: mode, type: 'button',
                className: repoListMode === mode ? 'on' : '',
                onClick: () => setRepoListMode(mode),
              }, t(mode === 'favorites' ? 'repoList.favorites' : 'repoList.all')),
            ),
          ),
          h('div', { className: 'acc-faint', style: { fontSize: 12 } }, t('repos.count', { count: repoListMode === 'favorites' ? favorites.length : repos.length })),
        ),
        h('div', { className: 'acc-side-list' },
          reposLoading && repoListMode === 'all' ? Spinner({ label: t('loading') }) :
          reposError && repoListMode === 'all' ? ErrorBox({ t, message: reposError }) :
          repoItems.length === 0 ? h('div', { className: 'acc-empty' }, repoListMode === 'favorites' ? t('favorites.empty') : t('repos.empty')) :
          repoItems,
        ),
      );

      const body = !selectedRepo
        ? h('div', { className: 'acc-empty' }, h('div', null, t('selectRepoHint')))
        : selectedPr
          ? renderPRDetail()
          : renderRepoView();

      const topbar = h('div', { className: 'acc-topbar' },
        h('span', { className: 'acc-grow' }),
        notice ? h('div', { className: `acc-notice${notice.err ? ' err' : ''}` }, notice.msg) : null,
        h('button', { className: 'acc-btn', type: 'button', onClick: () => setRefreshTick((x) => x + 1) }, t('refresh')),
      );

      const busyLoading = reposLoading || branchesLoading || prsLoading || prDetailLoading || prsLoadingMore;

      function renderRepoView() {
        const defaultBranch = repoDetail?.defaultBranch;
        const isFavRepo = favorites.includes(selectedRepo);
        const tabs = h('div', { className: 'acc-tabs' },
          h('button', { type: 'button', className: 'acc-tab', 'aria-selected': view === 'pr', onClick: () => setView('pr') }, t('tab.pr')),
          h('button', { type: 'button', className: 'acc-tab', 'aria-selected': view === 'branches', onClick: () => setView('branches') }, t('tab.branches')),
        );
        const head = h('div', { className: 'acc-head' },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' } },
            h('h2', { style: { margin: 0, fontSize: 20, overflowWrap: 'anywhere' } }, selectedRepo),
            h('button', {
              type: 'button',
              className: `acc-heart-btn${isFavRepo ? ' on' : ''}`,
              title: t(isFavRepo ? 'favorite.remove' : 'favorite.add'),
              'aria-pressed': isFavRepo,
              onClick: () => toggleFavorite(selectedRepo),
            }, isFavRepo ? '♥' : '♡'),
            defaultBranch ? h('span', { className: 'acc-mono acc-faint' }, t('repo.defaultBranch') + ': ' + defaultBranch) : null,
          ),
        );
        let content;
        if (view === 'branches') {
          content = branchesLoading ? Spinner({ label: t('loading') })
            : branches.length === 0 ? h('div', { className: 'acc-empty' }, t('branches.empty'))
            : h('div', { className: 'acc-list' }, branches.map((b) =>
                h('div', { key: b.name, className: 'acc-branch-row' },
                  b.name,
                  b.name === defaultBranch ? h('span', { className: 'acc-badge' }, t('branches.default')) : null,
                ),
              ));
        } else {
          const filters = h('div', { style: { display: 'flex', gap: 6, padding: '10px 14px' } },
            ['ALL', 'OPEN', 'CLOSED'].map((s) =>
              h('button', {
                key: s, type: 'button', className: `acc-btn acc-btn-sm${prStatus === s ? ' acc-btn-on' : ''}`,
                onClick: () => setPrStatus(s),
              }, t(s === 'ALL' ? 'pr.filter.all' : s === 'OPEN' ? 'pr.filter.open' : 'pr.filter.closed')),
            ),
          );
          content = h('div', null, filters,
            prsLoading ? Spinner({ label: t('loading') }) :
            prsError ? ErrorBox({ t, message: prsError }) :
            prs.length === 0 ? h('div', { className: 'acc-empty' }, t('pr.empty')) :
            h('div', null,
              h('div', { className: 'acc-list' }, prs.map((pr) =>
                h('div', {
                  key: pr.pullRequestId, className: 'acc-pr-row',
                  onClick: () => setSelectedPr(pr.pullRequestId),
                },
                  h('div', { className: 'acc-pr-row-title' },
                    pr.isMerged ? Badge({ kind: 'merged', label: t('pr.merged') }) : Badge({ kind: pr.status === 'OPEN' ? 'open' : 'closed', dot: pr.status === 'OPEN' ? 'ok' : 'warn', label: pr.status === 'OPEN' ? t('pr.open') : t('pr.closed') }),
                    h('span', null, pr.title || h('span', { className: 'acc-faint' }, t('pr.id', { id: pr.pullRequestId }))),
                  ),
                  h('div', { className: 'acc-pr-row-meta' },
                    h('span', null, t('pr.id', { id: pr.pullRequestId })),
                    h('span', null, pr.sourceBranch + ' → ' + pr.destinationBranch),
                    h('span', null, t('pr.by', { author: pr.author, date: fmtDate(pr.creationDate) })),
                  ),
                ),
              )),
              prsHasMore ? h('div', { style: { padding: '10px 14px' } },
                h('button', { type: 'button', className: 'acc-btn acc-btn-sm', disabled: prsLoadingMore, onClick: loadMorePrs },
                  prsLoadingMore ? t('loading') : t('pr.loadMore')),
              ) : null,
            ),
          );
        }
        return h('div', { style: { flex: 1, minHeight: 0, overflowY: 'auto' } }, head, tabs, content);
      }

      function renderPRDetail() {
        if (prDetailLoading) return Spinner({ label: t('loading') });
        if (prDetailError) return ErrorBox({ t, message: prDetailError });
        if (!prDetail) return Spinner({ label: t('loading') });
        const d = prDetail;
        const statusBadge = d.isMerged
          ? Badge({ kind: 'merged', label: t('pr.merged') })
          : Badge({ kind: d.status === 'OPEN' ? 'open' : 'closed', dot: d.status === 'OPEN' ? 'ok' : 'warn', label: d.status === 'OPEN' ? t('pr.open') : t('pr.closed') });

        // A PR that carries approval rules must be approved before it may merge;
        // hide the merge actions until the conditions are actually satisfied.
        const approvalRequired = !d.approved && !d.overridden && (d.rules.length > 0 || d.unsatisfiedRules.length > 0);

        const head = h('div', { className: 'acc-head' },
          h('div', { className: 'acc-pr-title-row' },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h2', { className: 'acc-pr-title' }, d.title || t('pr.id', { id: d.pullRequestId })),
              h('div', { className: 'acc-pr-sub' }, statusBadge, ' ', t('pr.id', { id: d.pullRequestId }), ' · ', t('pr.by', { author: d.author, date: fmtDate(d.creationDate) })),
            ),
            h('button', { type: 'button', className: 'acc-btn acc-btn-sm', onClick: () => setSelectedPr(null) }, '← ' + t('back')),
          ),
        );

        const tabs = h('div', { className: 'acc-tabs' },
          ['conversation', 'commits', 'files'].map((tab) =>
            h('button', {
              key: tab, type: 'button', className: 'acc-tab', 'aria-selected': prTab === tab,
              onClick: () => setPrTab(tab),
            }, t('tab.' + tab)),
          ),
        );

        let mainContent;
        if (prTab === 'commits') {
          mainContent = d.commits.length === 0
            ? h('div', { className: 'acc-empty' }, t('pr.noCommits'))
            : h('div', { className: 'acc-list' }, d.commits.map((c) =>
                h('div', { key: c.commitId, className: 'acc-commit-item' },
                  h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                    Avatar({ name: c.author?.name || c.committer?.name }),
                    h('strong', null, (c.author?.name || c.committer?.name || '—')),
                    h('span', { className: 'acc-faint acc-mono' }, c.shortId),
                    h('span', { className: 'acc-faint' }, fmtDate((c.committer?.date || c.author?.date))),
                  ),
                  h('div', { style: { whiteSpace: 'pre-wrap', fontSize: 13 } }, c.message),
                ),
              ));
        } else if (prTab === 'files') {
          mainContent = d.files.length === 0
            ? h('div', { className: 'acc-empty' }, t('pr.noFiles'))
            : h('div', { className: 'acc-list' }, d.files.map((f, i) =>
                h('div', { key: f.path + i, className: 'acc-file-row' },
                  h('span', { className: `acc-file-tag ${f.changeType}` }, f.changeType),
                  h('span', { className: 'acc-mono', style: { overflowWrap: 'anywhere' } }, f.path),
                  h('span', { className: 'acc-faint' }, f.changeType === 'A' ? t('diff.added') : f.changeType === 'D' ? t('diff.deleted') : t('diff.modified')),
                ),
              ));
        } else {
          mainContent = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            h('div', null,
              h('h3', { style: { fontSize: 13, fontWeight: 600, margin: '0 0 6px' } }, t('pr.description')),
              h('div', { className: 'acc-desc' }, d.description || t('pr.noDescription')),
            ),
            h('div', null,
              h('h3', { style: { fontSize: 13, fontWeight: 600, margin: '0 0 6px' } }, t('pr.activity')),
              d.activity.length === 0
                ? h('div', { className: 'acc-empty', style: { height: 'auto', padding: 12 } }, t('pr.noActivity'))
                : h('div', { className: 'acc-activity' }, d.activity.map((a, i) =>
                    h('div', { key: i, className: 'acc-activity-item' },
                      Avatar({ name: a.author }),
                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', null, h('strong', null, a.author), ' ', h('span', { className: 'acc-faint' }, fmtDate(a.createdAt)), a.deleted ? ' ' + h('span', { className: 'acc-faint' }, '(deleted)') : null),
                        a.filePath ? h('div', { className: 'acc-faint acc-mono' }, a.filePath) : null,
                        h('div', { style: { whiteSpace: 'pre-wrap', fontSize: 13 } }, a.content),
                      ),
                    ),
                  )),
            ),
          );
        }

        const approverList = d.approvals.length === 0
          ? h('div', { className: 'acc-faint', style: { fontSize: 13 } }, t('pr.noApprovers'))
          : h('div', null, d.approvals.map((a) =>
              h('div', { key: a.userArn, className: 'acc-approver' },
                Avatar({ name: a.user }),
                h('span', { style: { overflowWrap: 'anywhere' } }, a.user),
              ),
            ));

        const ruleList = d.rules.length === 0 ? null : h('div', null,
          d.rules.map((r) => h('div', { key: r.id, className: 'acc-rule-name' },
            h('span', { style: { overflowWrap: 'anywhere' } }, r.name),
            r.needed !== undefined ? h('span', { className: 'acc-faint' }, '≥ ' + r.needed) : null,
          )),
        );

        const mergeOptions = ['fast-forward', 'three-way', 'squash'].map((mt) =>
          h('button', {
            key: mt, type: 'button', className: 'acc-merge-opt', 'aria-selected': mergeType === mt,
            onClick: () => setMergeType(mt),
          }, t('merge.' + mt)),
        );

        const side = h('div', { className: 'acc-col-side' },
          h('div', { className: 'acc-card' },
            h('h3', null, t('pr.approvers')),
            h('div', null,
              d.approved
                ? Badge({ kind: 'open', dot: 'ok', label: t('pr.approved') })
                : Badge({ kind: 'closed', dot: 'warn', label: t('pr.notApproved') }),
              ' ',
              h('span', { className: 'acc-faint', style: { fontSize: 12 } }, t('pr.approvalCount', { count: d.approvals.length })),
            ),
            d.overridden ? h('div', { className: 'acc-faint', style: { fontSize: 12 } }, t('pr.overridden')) : null,
            ruleList,
            approverList,
            !d.isMerged && d.status === 'OPEN' && !d.isAuthor
              ? h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  h('button', { type: 'button', className: 'acc-btn acc-btn-success acc-btn-sm', disabled: busy || d.approved, onClick: () => doApprove('APPROVE') }, t('approve')),
                  h('button', { type: 'button', className: 'acc-btn acc-btn-danger acc-btn-sm', disabled: busy, onClick: () => doApprove('REVOKE') }, t('revoke')),
                )
              : null,
          ),
          h('div', { className: 'acc-card' },
            h('h3', null, t('merge')),
            d.isMerged
              ? h('div', { className: 'acc-muted', style: { fontSize: 13 } }, t('pr.merged') + (d.mergeCommitId ? ' · ' + d.mergeCommitId : ''))
              : d.status !== 'OPEN'
                ? h('div', { className: 'acc-muted', style: { fontSize: 13 } }, t('pr.closed'))
                : approvalRequired
                  ? h('div', null,
                      h('div', { className: 'acc-faint', style: { fontSize: 12 } }, t('pr.needApproval')),
                      d.unsatisfiedRules.length > 0
                        ? h('div', { style: { marginTop: 6 } }, d.unsatisfiedRules.map((name) => h('div', { key: name, className: 'acc-rule-name' }, h('span', null, name))))
                        : null,
                    )
                  : h('div', { className: 'acc-merge-options' },
                      mergeOptions,
                      mergeConfirm
                        ? h('div', { className: 'acc-confirm' },
                            h('button', { type: 'button', className: 'acc-btn acc-btn-success acc-btn-sm', disabled: busy, onClick: doMerge }, t('confirm.merge')),
                            h('button', { type: 'button', className: 'acc-btn acc-btn-sm', disabled: busy, onClick: () => setMergeConfirm(false) }, t('cancel')),
                          )
                        : h('button', { type: 'button', className: 'acc-btn acc-btn-success', disabled: busy, onClick: () => setMergeConfirm(true) }, busy ? t('merging') : t('merge')),
                    ),
          ),
          h('div', { className: 'acc-card' },
            h('h3', null, t('pr.status')),
            h('dl', { className: 'acc-kv' },
              h('dt', null, t('pr.author')), h('dd', null, d.author),
              h('dt', null, t('pr.source')), h('dd', null, d.sourceBranch),
              h('dt', null, t('pr.target')), h('dd', null, d.destinationBranch),
              h('dt', null, t('pr.created')), h('dd', null, fmtDate(d.creationDate)),
              h('dt', null, t('pr.lastActivity')), h('dd', null, fmtDate(d.lastActivityDate)),
              d.mergeOption ? h('dt', null, t('pr.mergeOption')) : null,
              d.mergeOption ? h('dd', null, d.mergeOption) : null,
            ),
          ),
        );

        return h('div', { style: { flex: 1, minHeight: 0, overflowY: 'auto' } },
          head, tabs,
          h('div', { className: 'acc-columns', style: { padding: 16 } },
            h('div', { className: 'acc-col-main' }, mainContent),
            side,
          ),
        );
      }

      return h('div', { className: 'acc-root' }, sidebar, h('div', { className: 'acc-main' }, busyLoading ? h('div', { className: 'acc-progress', 'aria-hidden': true }) : null, topbar, body));
    }

    /* ---------------- apply ---------------- */
    function apply(ctx) {
      const slots = typeof ctx.get === 'function' ? ctx.get('slots') : undefined;
      if (!slots || typeof slots.register !== 'function') return;
      const locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined;
      const t = buildTranslate(locale);
      const disposeStyles = injectStyles();

      const RootBound = function () { return h(Root, { t }); };

      const disposer = slots.inject('main', () => {
        const disposeMain = slots.register({ name: 'main', key: PANEL_ID }, RootBound);
        const disposeEntry = slots.inject('sidebar.panellist', () =>
          slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 50, label: () => t('section.title') }, PanelIcon),
        );
        return [disposeMain, disposeEntry];
      });

      if (typeof ctx.effect === 'function') {
        ctx.effect(() => () => { disposer(); disposeStyles(); }, 'dsh-aws-codecommit:client');
      }
    }

    return { inject: ['slots', 'locale'], apply };
  },
});
