# 九溪 · 变更日志

所有重要变更均记录于此文件。遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式。

## [Unreleased]

### Added（内容策展补充）

- **AI 工具箱**：新增 23 个 GitHub 高星项目，补齐「智能体 / Agent」主线与开源框架类。
  - 智能体（16）：AutoGPT、Dify、LangChain、LangGraph、CrewAI、MetaGPT、AutoGen、OpenManus、n8n、Flowise、Langflow、LobeHub、Gemini CLI、Browser-use、Mem0、Agno。
  - 开发框架（3）：vLLM、LlamaIndex、RAGFlow。
  - 图像（1）：ComfyUI；编程 Agent（3）：Cline、Aider、Continue。
  - 星数均为公开数据约值（截至 2026 年），已在页头标注会随时间变动。
- **读书推荐**：13 本原有书目重写「推荐语」并改为可在线阅读链接（微信读书 / 官方免费全文）；新增 9 本（动手学深度学习、神经网络与深度学习、强化学习：导论、深度学习入门、哥德尔/艾舍尔/巴赫、失控、为什么、奇点临近、代码大全），共 22 本。
  - 读书页新增「推荐语」正文渲染（沿用时间线页 `render()` 渲染 Markdown 的做法），链接标签改为「在线阅读 →」。

### Changed

- 工具箱页头注明星数为约值；读书页链接文案「了解更多 →」改为「在线阅读 →」。

## [v1.2.0] — 2026-10-11

### Added

- 报刊版式（editorial）视觉系统：暖白纸底 + 墨色字 + 单一强调色，去 AI 模板味（渐变 / 玻璃拟态）。
- 自托管中文衬线字体（思源宋体标题/正文、思源黑体 UI，经 `@fontsource` 子集化，无外链字体）。
- 克制动效层（`src/lib/motion.ts`）：滚动渐显 + `@formkit/auto-animate` 卡片流 + `Lenis` 平滑滚动，全部带降级守卫与 `prefers-reduced-motion` 支持。
- 视图过渡：页面间经 `astro:transitions`（`ClientRouter`）淡入。
- 报头（masthead）版式与首页栏目「编号 / 来源」kicker。
- 视觉系统唯一上下文文档 `DESIGN.md`（设计令牌 / 配色 / 排版 / 动效分寸的来源）。

### Changed

- 4 套主题重做为「纸感底 + 墨色字 + 单一强调色」（朱红 / 琥珀 / 玉色 / 茜红），去除紫蓝渐变（保留 `--glass-*` 别名兼容）。
- 面板去 `backdrop-filter` 玻璃模糊，改实色 + 1px 发丝边 + 分层细阴影。
- 资讯卡改报刊条目：顶部发丝线 + 编号/来源 + 衬线标题 + 克制悬停。
- `body::before` 纸纹噪点、共享设计令牌收敛到 `global.css` / `themes.css`，`--accent` 收敛为唯一强调色。

### Changed（本轮代码质量与安全修复）

- 升级 **Astro 5.18.2 → 7.3.8**（修复 CRITICAL 级依赖漏洞；提交 `bbfae05`，此前未入档，本次补全）。
- 修复 `fetch-feeds.mjs` 构建期注入 JSON 未转义 `</script>` 的存储型 XSS 风险（标题含 `</script>` 会提前闭合脚本块）。
- 清理未引用的死代码 `store.ts` / `store.test.ts`，统一数据模块为 `settings.ts` / `favorites.ts` / `db.ts`。
- 安全关键路径（`escapeHtml` / `renderItems` / `parseRss` / `theme.ts` / `db.ts`）补充单元测试；引入 ESLint + Prettier 并接入 CI。
- 资讯抓取改为**直连优先 + 第一方同域代理 `/api/feed`**（Cloudflare Pages Functions，含目标白名单与 SSRF 防护），**取代 allorigins / corsproxy 等公共 CORS 代理**，并同步 CSP `connect-src`；缓存时长文档对齐代码（30 分钟）。
- `sanitizeUrl` 拒绝协议相对 URL（`//evil.com`）与控制字符；资讯链接不再做多余 HTML 实体解码。

### Fixed（本轮代码质量与安全修复）

- 主题切换器在空白 localStorage 时高亮错误（现回退到真实生效的 `data-theme`）。
- `loadFeed` 过期缓存兜底分支不触发后台刷新（现先展示兜底再静默刷新）。

---

## [v1.1.0] — 2026-10-10

### Added

- 双站部署流水线（Cloudflare Pages 主站 + GitHub Pages 备用副站）
- SEO 增强：自动生成 sitemap / RSS / Open Graph 分享图
- 4 套可切换主题（晨曦 / 午夜 / 极光 / 樱粉）
- 液态玻璃视觉系统，含 `prefers-reduced-motion` 和 `backdrop-filter` 降级
- 收藏功能（全局 localStorage）
- 动态资讯 IndexedDB 跨会话持久化缓存（代理不可用时展示上次成功内容）
- 数据导入/导出（JSON 格式）
- 时间线页面搜索与分类筛选
- 工具箱页面分类筛选
- GitHub Actions CI：合并前执行类型检查 + 单元测试门禁
- 定时提案周报：每周自动开 PR 提醒补充时间线里程碑

### Changed

- 采用 Astro 5 + Tailwind CSS 4 重构全站
- 内容数据迁移至 Astro Content Collections（Zod schema 校验）
- README 补充完整部署指南与编辑说明

---

## [v1.0.0] — 初始正式版

- 基础骨架、玻璃外壳、导航、首页 Bento 聚合
- AI / 新闻 / 科技 / 游戏动态板块
- 时间线、工具箱、读书三个策展板块
- 设置与数据页面、关于页面
- 双站部署配置
