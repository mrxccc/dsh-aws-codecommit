# dsh-aws-codecommit

DeepSeek Harness（DSH）的 AWS CodeCommit 可视化面板插件。基于本机 `aws` CLI，按 profile 切换环境，浏览仓库 / 分支 / Pull Request，查看 PR 详情并审批、合并。

仓库：<https://github.com/mrxccc/dsh-aws-codecommit>

## 功能

- **多环境 profile**：读取 `~/.aws/config` 与 `~/.aws/credentials`，默认选中 `test`（没有则 `default`），可随时切换。
- **仓库**：列出全部仓库并支持搜索；「收藏 / 全部」切换，默认进入收藏，爱心按钮收藏/取消。
- **分支**：查看选中仓库的全部分支与默认分支。
- **Pull Request**：按 全部/开放/已关闭 筛选（分页，加载更多）；PR 详情包含标题、描述、活动历史、更改文件、提交历史、作者、源/目标分支、时间、状态、批准状态与批准数。
- **文件改动 diff**：GitHub 风格的可折叠文件列表，展开后逐行查看新增/删除内容（行号、+/- 统计、上下文折叠）。
- **审批**：批准 / 拒绝（撤销）审批；自己提交的 PR 不显示批准按钮。
- **合并**：Fast-forward / Three-way / Squash 三种方式；有审批规则且未满足时隐藏合并按钮，提示先满足批准条件。
- **记住上次页面**：重新打开面板恢复上次的 profile / 仓库 / PR / 视图。
- **加载反馈**：旋转加载圈 + 顶部进度条。

## 前置条件

- 本机已安装并配置好 AWS CLI（`aws --version` 可用）。
- 目标仓库的 `aws codecommit` 权限与 profile 凭据已就绪。
- 若 `~/.aws/config` 里的 profile 用的是 `[test]`（而不是 `[profile test]`），本插件会自行从配置里读 `region` 并显式传给 CLI，不会因 `NoRegion` 失败。

## 安装

在 DSH 的插件管理器中把本包添加为 bundle 并启用，或使用 `plugin_manager` 的 `install_bundle`，`target` 指向本目录 / npm 包名。

## 说明

- 纯 Host/Client 两半，无第三方运行时依赖；Host 通过 `child_process` 调 `aws`，Client 只负责渲染。
- 仓库列表、PR 摘要等做了短时内存缓存与分页，冷启动首次拉取仍受 `aws` CLI 单次调用延迟影响。

## License

MIT
