# 九溪 · 变更日志

所有重要变更均记录于此文件。遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式。

## [Unreleased]

## [v1.6.1] — 2026-10-15

> 全维度代码审查修复批次（P0 止血）+ 补录 v1.5.1 后未入档变更。审查报告见仓库外交付文档。

### Added（补录：以下变更早于本文实施，此前未入档）

- **资讯源扩容 21 → 31**（AI 8 / 新闻 6 / 科技 10 / 游戏 7）：AI +The Decoder、+Hugging Face；新闻 +蓝点网、+极客公园；科技 +MIT Technology Review、+Ars Technica·AI、+The Guardian·Tech；游戏 +Eurogamer、+PC Gamer、+Rock Paper Shotgun。代理白名单同步扩容，与 `src/data/feeds.json` 的 25 个主机逐一对应。
- **候选策展台 `/curate` + 资讯策展标准 `/feed-policy` 两个页面**：候选经 `functions/api/feed.ts` 聚合端点写穿 D1 `candidates` 表（B-2 持久化），`/curate` 供作者跨会话筛选沉淀；`/feed-policy` 公开精选标准（来源可信度分档 / 重要性维度 / 聚簇规则）。两页为直链页（llms.txt 收录、导航未收录）。
- **`.github/workflows/weekly-timeline-proposal.yml`**：Issue 型时间线补充提醒（与 timeline-digest.yml 的 PR 型提案并存）。

### Fixed

- **IDB 写入 rejection 逃逸导致「立即刷新」按钮永久卡死**：`src/lib/db.ts` 的 `writeIndexedDB` / `clearIndexedDB` 原先 `return new Promise(...)` 位于 try 块内，Promise 内部 reject 不被捕获；IndexedDB 配额满等异常经 `feeds.ts` → `index.astro` 的 `Promise.all` 传播，点击处理无 finally，按钮停在「刷新中…」禁用态。改为 `await new Promise<void>(...)` 让 catch 生效，并给 `index.astro` 的 `loadHot` 调用补 try/catch/finally（失败时复位按钮 + 页面提示）。
- **历史回顾页键盘完全不可达**：`public/history-client.js` 日期分组头由 `<div>`+click 改为 `<button type="button">` + `aria-expanded` 同步；`history.astro` 补 button 样式重置与 `:focus-visible` 焦点环。顺带给云端 `date` 补 `escapeHtml`（纵深防御）。
- **构建脚本全源失败仍绿灯上线**：`scripts/fetch-feeds.mjs` 四大板块全部抓取失败时，原先仍写空 JSON 且退出码恒 0。现总条目为 0 时 `console.error` + `process.exit(1)`，CI 红、不部署；注入板块列表由硬编码改为从 `feeds.json` 派生。
- **「磨砂强度」死控件**：设置页滑杆写入 `--glass-blur`，但全站无 CSS 消费（报刊版式已去玻璃模糊），拖动无任何效果，属误导性 UI。已移除该控件，设置项仅保留「降低动效」。
- **设置页 toast 移动端被底部 TabBar 遮挡**：`position:fixed; bottom:24px` 在小屏被 TabBar（z-index:30）压住，导出/导入/清缓存的反馈不可见。toast 改为 TabBar 上方避让 + `role="status" aria-live="polite"` 播报。
- **两个 aria-modal 浮层无焦点圈定**：`SearchOverlay` 与 `MobileTabBar` sheet 声明 `aria-modal="true"` 但 Tab 可穿出。新增 `trapFocus(container)` 工具（打开时记录 lastFocus、关闭时归还）；搜索框 `outline:none` 吞掉 `:focus-visible` 焦点环的问题一并修复。
- **ThemeSwitcher 圆点违反 DESIGN.md**：蓝粉渐变圆点（明令禁用渐变）且不代表各主题真实配色，改为各主题 `--bg` 底 + `--accent` 中心点，与 JiuxiMark 母题同构；补 `aria-pressed` 选中语义；触控目标 22px → 44px。
- **about 页样式断裂**：`class="card prose"` 引用的 `.card` / `.prose` 均定义在其它组件的作用域内，不作用于 about 页。改用 `<GlassCard>` 包裹。
- **feed-policy 表格硬编码浅色**：`#ddd`/`#f5f5f5` 在暗主题下刺眼，改主题令牌。
- **历史页按钮对比度**：白字压 `--accent` 在 midnight ≈2.6:1、aurora ≈2.7:1（低于 AA 4.5:1），新增 `--on-accent` 令牌；sakura `--text-muted` 由 4.3:1 加深至达标。
- **筛选零结果无空状态**：`Filters` / timeline / tools 筛选后卡片 `display:none` 只剩留白，补空状态文案；筛选按钮补 `aria-pressed`。
- **starred 页取消收藏后 UI 不更新**：取消收藏卡片残留，仅剩一条时呈空白网格。改为取消后重渲染列表。
- **timeline-digest 周报 PR 从未生效**：`gh pr create` 前未建分支/提交，"No commits between main and main" 必然失败并被 `|| echo` 吞掉常绿。改为与 weekly-timeline-proposal 同构的 Issue 型提醒（`timeline-reminder` label 不存在时先创建，防 422）。
- **543 行死代码**：`src/lib/history-client.ts`（230 行）与 `src/lib/archive-history.ts`（313 行）零引用（实际运行为 `public/history-client.js`，功能多一倍），删除；`.gitignore` 补 `coverage/` 防覆盖率报告误提交；`public/history-client.js` 补 `eslint-disable` 说明与未用函数清理。
- **settings.importData 第三份收藏归一化**：v1.5.0「单一数据源」重构漏改此处，改为复用 `favorites.ts` 导出的 `normalize`。
- **index.astro 未定义 CSS 变量**：`--bg-soft` / `--line` / `--text-soft` 全站无定义，刷新按钮样式回退初始值，改已定义令牌；`setInterval` 时钟在 astro:transitions 换页后不清理，补 `astro:before-swap` 清理。
- **src/lib/feeds.ts / functions/api/feed.ts 正则含不可见 NBSP 字面字符**：触发 eslint `no-irregular-whitespace`，改显式 `\u00a0` + disable 注释。
- **MobileTabBar 三元表达式当语句**：触发 `no-unused-expressions`，改 if/else；`moreActive` 死路径 `/search` 移除。
- **settings.astro 未使用导入**：删除 `sanitizeUrl` / `escapeHtml` 死导入。
- **trufflehog 强制门禁首次运行即红灯（自更新器故障，非密钥泄露）**：v1.6.1 推送后「安全门禁」工作流 trufflehog job 失败，日志为 `error occurred with trufflehog updater 🐷 {"error": "cannot move binary back (exit status 1)"}`——trufflehog 自更新器在 CI 环境尝试替换 `/usr/local/bin/trufflehog` 自身二进制失败即退出 1，**扫描根本没执行**。该故障长期被 advisory 状态的 `continue-on-error` 掩盖为「假绿」，本次转强制后才现形。修复：扫描与 `--version` 留痕两处均加 `--no-update`（trufflesecurity/trufflehog#3217 同款问题），版本仍由安装步骤 pin + SHA256 校验固定，禁用运行时自更新不影响门禁语义。

### Security

- **第一方代理重定向跟随绕过白名单**：`functions/api/feed.ts` 白名单校验在 fetch 之前，`redirect: 'follow'` 会跟随源站 302 抓取非白名单目标。现跟随后校验 `response.url` 主机仍在白名单，否则丢弃响应。
- **refresh-feeds.yml 补 harden-runner**：该工作流是唯一持 Cloudflare D1 密钥的定时工作流，此前无出口审计，两个 job 补齐。
- **跨工作流部署竞态**：deploy.yml 与 refresh-feeds.yml 各自 concurrency group 却都 `wrangler pages deploy` 同一项目，定时重建与 push 部署可能交错上传。统一为同一 concurrency group。
- **trufflehog 密钥扫描转强制**：`--only-verified` 误报极低，泄露密钥必须阻断合并。

### Changed

- **缓存口径统一为 10 分钟**：此前 README / CHANGELOG / 四份 docs / 代码注释全写 30 分钟，而 `src/lib/feeds.ts` 实为 10 分钟（v1.2.0 的「文档对齐代码」条目没核对代码）。现全部统一为 10 分钟。
- **README 门面数字对齐代码**：页面数 13 → 15（补 curate / feed-policy）；资讯源 21 → 31 及分布；目录结构树补 JiuxiMark / motion / site / ensure-candidates 等模块。
- **质量门禁转强制**：`deploy.yml` 的 prettier / eslint 去掉 `continue-on-error`——本次已全仓清零（439 个格式问题 + 4 error + 3 warning），advisory 状态兑现清零承诺。
- **触控目标达标**：theme-dot / fav-btn / filter-chip / header-search / refresh 等 8 类交互元素由 22–36px 统一至 ≥44px（fav-btn 用 `::before` 扩展命中区兼顾版式）。
- **reduce-motion 运行中生效**：设置页勾选「降低动效」后立即停止 Lenis 平滑滚动（`src/lib/motion.ts` 新增 `stopMotion()`：销毁 Lenis 实例、停 autoAnimate 卡片流过渡——其内置守卫只认系统 media query、不认应用级 class、把未触发的 `.reveal` 元素补为可见防止停在不可见状态），不再需刷新页面；取消勾选可重新初始化。`astro:transitions` 换页淡入补 `.reduce-motion` 应用级守卫（Astro 内置守卫只认系统 media query；`::view-transition-*` 伪元素挂在文档根上，故用 `html:has(body.reduce-motion)` 选择器）。**实测澄清**：Astro 7 仅在页面使用 `transition:animate` 指令时才注入淡入 CSS，本站未使用该指令，换页过渡当前实为瞬时切换、无淡入动画——该守卫是防回归的前置防护（一旦启用 `transition:animate` 即生效）；`BaseLayout.astro` 中原「页面间淡入」的失实注释已改正。
- **构建脚本健壮性**：`save-history.mjs` 的 D1 fetch 加 15s 超时（旧版无超时，D1 挂起会卡死整条构建链）；fetch-feeds 子进程 stdin 补 EPIPE 处理（同步 write + 异步流错误双通道）+ 60s 看守超时（超时强杀子进程，历史保存失败不阻断构建）；`ensure-candidates` 与 `save-history` 的 D1 客户端抽至 `scripts/lib/d1.mjs` 共用（原两份相同拷贝必然漂移）；快照文件名 section / date 白名单校验（stdin JSON 的键直接拼文件名，含 `../` 可路径穿越写到历史目录之外）；cleanupExpired 改纯 epoch 毫秒比较。**实测澄清**：时区一项在 UTC+8 等固定偏移时区下新旧实现 epoch 完全等价（本地减 N 天恰为 N×24h），原差异仅出现在有夏令时的时区（±1h 边界漂移），改为 epoch 比较后无条件免疫。
- **「备站」残留措辞清理**：v1.5.1 已移除 GitHub Pages 备站（现为 Cloudflare Pages 单站），但代码注释 / README / 架构文档 / feed-policy 页仍描述「备站」为现存部署。12 处当前状态表述改为「无 Functions 的环境（纯静态托管/本地预览）」等准确口径；CHANGELOG 历史条目与架构文档中明确标注「仅作历史参考」的段落不动。
- **search-index.json 移出仓库**：改纯构建产物（本地忘跑构建不再发布陈旧索引）。
- **测试补齐 35 → 118 例**（7 个文件 → 13 个）：P1 补 57 例——trap-focus（焦点圈定 11）、settings（导入导出往返 12）、cluster-consistency（跨端算法一致性锁 8）、db（fake-indexeddb 往返 +7）、favorites（归一化/单数据源 +6）、feeds（clusterItems/rankByHeat +13）；P2 补 26 例——save-history（白名单与路径穿越防护/清理保留期边界 10）、D1 客户端（15s 超时与失败语义/required 双模式 9）、motion（`stopMotion` 行为锁 7）。`save-history.mjs` 补 CLI 入口守卫（与 fetch-feeds.mjs 同模式），脚本从「不可测」变为可单测。

### Removed

- 设置页「磨砂强度」滑杆（见 Fixed）。

## [v1.6.0] — 2026-10-14

> 报刊版式体验升级 v2：今日热点「多源交叉信任」排序修复 + 品牌签名母题「九点汇聚」+ 导航收敛 + 流式排版与留白节奏 + 克制动效编排。承续 v1.5.1 的 Cloudflare Pages 单站部署。

### Fixed

- **今日热点「多源交叉」信任排序**：`src/lib/feeds.ts` 新增 `rankByHeat(items, maxPerSource?)`——按「独立信源数」降序、平局按时间打破、同源可选限流，取代原先「全部为单源时打平 → 高频源（如 IT 之家）量最大占满」的退化排序。首页「今日热点」（`index.astro`，`rankByHeat(items/live, 3)`）与全局热点榜（`hot.astro`，`rankByHeat(all/live, 6)`）改用 `rankByHeat`，副标题文案改为「多源交叉的同一事件置顶」。

### Added

- **品牌签名母题「九点汇聚」**：新增 `src/components/JiuxiMark.astro`——3×3 九点 SVG（外环 `currentColor`、中心 `var(--accent)`，零依赖、随主题换色），作为九溪的视觉签名（「九源汇聚成一点」）。

### Changed

- **导航收敛（4 + 更多）**：`SiteNav.astro` 由三组 13 链接（16 胶囊）改为常驻 4 项（首页 / AI / 热点 / 科技）+ 原生 `<details>`「更多 ▾」收纳其余 9 项；零 JS、可访问、面板悬浮。移动端仍走底部 TabBar（3 + 1），不动。
- **双「九溪」字标收一**：`BaseLayout.astro` 顶栏「九溪」字标 → 九点母题 + 字标；`index.astro` 报头删除大号「九溪」h1 与分隔横线，改由九点母题 + 标语 + 日期承载报头（报头大九点 + 顶栏小九点 = 报刊「头版 vs 刊头」惯例）。
- **流式排版（fluid type）**：`global.css` 新增 `clamp()` 流式字号令牌 `--fs-lead / --fs-h2 / --fs-card / --fs-feed-title`，应用于报头标语、栏目/页头 h2、资讯标题、bento 卡片标题——字号随视口呼吸，不再断点跳档。
- **留白节奏（whitespace）**：栏目/页头上边距 28 → 44px、资讯栏列距 32 → 44px、卡片内边距加大、bento 间距 14 → 18px，整体更「报刊」、更透气。
- **克制动效编排（记忆点）**：`components.css` 新增 `jiuxi-dot-in`——报头九点进视口时逐颗落定（中心「汇聚点」最后）、今日热点卡片逐条级联进入（`--d`/`--fd` 延迟）；纯 CSS、零新增依赖，`prefers-reduced-motion` 全门控（减弱 / 关闭动画时直接静态显示、不卡死）。

## [v1.5.1] — 2026-10-14

> 聚焦 Cloudflare Pages 单站（Pages Functions 轻后端 + D1 保留），移除备站与双站容灾。

### Removed

- **GitHub Pages 备用站**：删除备站 Worker `worker/`（`jiuxi-fallback-headers`，为 GH Pages 注入安全响应头）；`.github/workflows/deploy.yml` 与 `refresh-feeds.yml` 移除 `build-pages` / `deploy-github-pages` 两个 job。
- **双站容灾**：部署拓扑由「Cloudflare Pages 主 + GitHub Pages 备」收敛为 Cloudflare Pages 单站；`public/_headers`、`astro.config.mjs`、`dast-scan.yml` 等注释同步去掉双站措辞。

### Changed

- 部署、访问地址与文档（README 速览 / 特性 / 部署指南）全部更新为单站口径。
- `siteBase()`（`src/lib/site.ts`）保留为无害兼容层：单站下 base 恒为 `/`，行为不变。
- 移除双站顾虑后，Cloudflare Pages 原生支持 SSR：如需「每次访问都新鲜」，可启用 Astro hybrid + `@astrojs/cloudflare`（原先「双站」是暂不开 SSR 的主要理由，现已解除）。

## [v1.5.0] — 2026-10-14

> 体验升级版本：补齐九溪相对 AIHOT 的信息架构与移动端短板，同时把「人工策展深度沉淀」护城河做厚。Phase A（首页今日热点 + 收藏体系）与 Phase B（热点榜 + 分组导航 + 移动 TabBar + 站内搜索）合并发布。

### Added

- **阶段 A · 首页今日热点 + 收藏体系重构**：
  - **首页「今日热点」模块**：在 Bento 门户之前新增跨板块聚合条，并发读取四板块 D1 候选（`/api/candidates?section=`），按「独立信源数（cluster_size）」降序取前 10 条；D1 为空时回退浏览器端实时聚合（`refreshFeedOnline`），永不白屏。
  - **收藏单数据源重构**：原 `favorites.ts` 与 `settings.ts` 各写一套实现、共用 `jiuxi-favorites` 键易冲突；改为 `favorites.ts` 单一真相（对象化存储 `{link,title,source?,ts}`，旧版纯字符串条目自动归一化），`settings.ts` 仅 re-export 复用；`renderItems` 写入 `data-title`/`data-source`、`wireFavorites` 改为 `toggleFavorite({link,title,source})`。
  - **收藏页 `/starred`**：新增带标题的收藏列表（读 `getFavorites()` 映射为 items，复用 `renderItems`/`wireFavorites`）；设置页收藏渲染改为显示标题（`<a>` 链接）。
- **阶段 B · 信息架构与移动端（全局热点榜 + 分组导航 + 移动 TabBar + 站内搜索）**：补齐九溪相对 AIHOT 的短板，同时保留「人工策展深度沉淀」护城河。
  - **全局热点榜 `/hot`**：跨 AI / 新闻 / 科技 / 游戏 四板块，按「独立信源数（cluster_size）」降序聚合，顶部 `Filters` 可按板块筛选；复用首页「今日热点」逻辑，D1 为空时回退实时聚合，永不白屏。
  - **主导航分组**：改为「动态 / 策展 / 更多」三组胶囊（动态含首页/AI/热点/新闻/科技/游戏/历史回顾；策展含时间线/工具箱/读书；更多含收藏/设置/关于）。
  - **移动端底部 TabBar**：仅小屏显示（≤768px），首页 / 热点 / 工具 / 我的；「我的」展开底部 sheet，含 收藏 / 搜索 / 设置 / 关于。小屏隐藏分组主导航避免重复，纯 CSS 媒体查询隔离、不破坏桌面。
  - **站内搜索浮层（本地优先）**：新增 `scripts/build-search-index.mjs` 构建期扫描 `src/content/{timeline,tools,reading}`（共 534 条）生成 `public/search-index.json`；`SearchOverlay` 客户端本地检索，零额外后端、零额外请求；快捷键 `/` 与 `Cmd/Ctrl+K` 唤起，Esc 关闭，未命中给出 Google News 兜底链接（新标签页打开，不直连写入 CSP）。
  - **搜索深链**：时间线 / 工具箱 / 读书 列表项增加 `id` 锚点，搜索结果可直达对应条目。

### Fixed

- **`renderItems` XSS 卫生**：原本将原始标题/来源写入 `data-title` / `data-source` 属性，序列化后的 HTML 含裸 `<`（触发 XSS 卫生测试失败且不符合最小暴露原则）；现经 `escapeHtml` 转义后写入，浏览器读取 `dataset` 时自动解码回原值，收藏功能不受影响。

## [v1.4.2] — 2026-10-14

### Added

- **策展内容大扩充（时间线 213 → 255 条 / 工具箱 74 → 151 个 / 读书 58 → 128 本）**：补全 AI 发展时间线空缺年份国际经典事件（SNARC 1951、达特茅斯提案 1955、Unimate 1961、Sketchpad 1963、SHRDLU 1970、MYCIN 1976、深蓝 1996、AIBO 1999、ASIMO 2000、Stanley 2005 等 33 条）与国内早期里程碑（1956 中科院自动化所、1986 863 计划、2013 百度 IDL、2016 百度大脑/寒武纪、2019 智谱/昇腾 910、2022 文心一格等）；工具箱补齐语音（Whisper / CosyVoice / GPT-SoVITS / ChatTTS / F5-TTS）、数字人（HeyGen / SadTalker）、3D（Meshy / 混元 3D）、设计（v0 / Motiff）、办公（AiPPT）、编程（Devin / OpenHands / Bolt.new）、RAG（FastGPT / GraphRAG）、浏览器（Skyvern）、数据（Firecrawl / MinerU）、评测（OpenCompass）、具身（LeRobot）等大类；阅读推荐新增经济学 / 商业 / 政治 / 心理 / 社会 / 科学 / 传记 / 艺术 / 文学 / 哲学 / 历史 / AI / 思维等类别，优先公版在线直读（Gutenberg / ctext / marxists / OpenStax / feynmanlectures），无直读链接者附微信读书搜索兜底。全部外链经批量核验，唯一死链（Nature 404）已替换为维基 DeepSeek 条目。

### Fixed

- **AI 板块实时刷新不覆盖内嵌旧数据**：`src/components/FeedSection.astro` 后台刷新（`refreshFeedOnline`）成功后直接整屏渲染在线最新结果，不再用 `mergeFeedItems` 把构建期内嵌的陈旧快照与在线最新做 round-robin 混合，解决「AI 板块显示的内容不是最新」的问题。主站 `/api/feed` 第一方代理已实测可用且能拉到更新数据（如 ArXiv 经代理返回当天条目）；备站（GitHub Pages 无 Functions 代理）的 RSS 源仍依赖构建期内嵌，需另做「自动重抓」层才能彻底新鲜。

## [v1.4.1] — 2026-10-13

### Added

- **安全门禁第二批上线（3 项新增，均为 advisory 不阻断；依赖漏洞门禁 osv-scanner 转强制）**：
  - **漏洞模板扫描（Nuclei）**：`security.yml` 新增 `nuclei` job（`projectdiscovery/nuclei` v3.11.1，官方 CLI + pin 版本 + SHA256 校验）。每次推送/PR 临时 `npm ci && npm run build` 起本地静态服务，扫 `http://127.0.0.1:8080` 的 critical/high 级模板，与 ZAP（每周扫生产主站）互补、不依赖外网攻击流量。
  - **依赖/配置/密钥扫描（Trivy fs）**：`security.yml` 新增 `trivy` job（`aquasecurity/trivy` v0.75.0，官方 CLI + pin 版本 + SHA256 校验）。一套 `fs` 扫描同时覆盖依赖漏洞 + 文件系统配置错误(misconfig) + 密钥(secret)，与 osv-scanner（OSV 数据库）交叉验证；先 advisory，误报率可接受后转强制。
  - **SBOM 供应链清单（anchore/sbom-action）**：`security.yml` 新增 `sbom` job（`anchore/sbom-action@v0.24.3`，SHA pin），生成 CycloneDX JSON 格式的软件物料清单并作为 workflow artifact 留存 90 天；某依赖爆 0day 时可按 SBOM 秒级定位受影响版本。
  - **osv-scanner 依赖漏洞门禁转强制**：去掉 job 级 `continue-on-error`，发现依赖漏洞即红灯、需先升级依赖再合并（此前为 advisory）。前置条件：eslint 工具链 5 个 high 已修复（见下 Changed）。
- **SECURITY.md（漏洞披露策略）**：新增 `SECURITY.md`，声明负责任的漏洞报告渠道与处理流程；修复 OpenSSF Scorecard `Security-Policy` 检查 0 分项（该检查要求仓库根存在 SECURITY.md）。
- **首次全仓 AI 安全审计（cloudflare/security-audit-skill）**：安装并运行该 MIT 许可审计 skill（源码优先、不连外网、不探活、不改目标源码），产出 `findings.json`（经 `validate-findings.cjs` 校验）与报告。发现 **1 个 high 确凿漏洞**——历史回顾页 `public/history-client.js` 的 `renderSectionGroup` 未转义拼接 `innerHTML` 导致的存储型 DOM-XSS（外部 RSS 标题经 `/api/history` 回流浏览器执行），修复建议见审计报告。**该 XSS 已随本次推送一并修复**（见下 Fixed）。

### Changed

- **修复 eslint 工具链 5 个 high 依赖漏洞**：`braces` 漏洞链全版本无修复，必须升级链主。方案：升级 `eslint-plugin-astro` ^1.3.1 → 3.2.1 + `eslint` ^9.17.0 → 10.12.0 + `typescript-eslint` ^8.18.0 → 8.71.1，新增 `eslint-plugin-jsx-a11y-x@0.2.0`（其 peer 兼容 eslint 10）；不安装 `eslint-plugin-jsx-a11y`（v3 将其声明为 peerOptional，避免死锁）。本地验证：lint 0 错误、astro check 0 错误、35/35 测试通过、11 页构建成功、`npm audit` 0 漏洞。此为 osv-scanner 转强制的前置条件。

### Fixed

- **修复历史回顾页存储型 DOM-XSS（high，审计 confirmed 发现 `jiuxi/dom-xss/history-client-renderSectionGroup`）**：`public/history-client.js` 顶部补充 `escapeHtml` / `sanitizeUrl`（行为对齐 `src/lib/security.ts`），`renderSectionGroup` 渲染时对 `item.title`、`item.source` 做 HTML 转义、对 `item.link` 做 URL 协议白名单（仅放行 http/https/mailto 与站内相对路径，其余降级为 `#`），阻断外部 RSS 标题注入 `innerHTML` 与 `javascript:` 协议链接。修复前该注入在全站 `unsafe-inline` 的 CSP 下可被执行为 XSS。

## [v1.4.0] — 2026-10-13

### Added

- **安全门禁第一批上线（4 项新增，全部 advisory 不阻断）**：
  - **DAST 动态扫描（ZAP Baseline）**：新增可复用工作流 `.github/workflows/dast-scan.yml`，对生产主站 `https://jiuxi-bm1.pages.dev/` 做基线扫描——此前 `/api/feed`、`/api/history` 两个 Pages Functions 端点只有 SAST/依赖扫描覆盖，无任何运行时验证，形成盲区。双触发：`security.yml` 每周一定时 + `deploy.yml` 双站部署成功后立即调用，单文件承载避免配置漂移。
  - **CI 工作流自身审计（zizmor）**：新增 `zizmor` job（`zizmorcore/zizmor-action@v0.6.4`，SHA pin）。注意该仓库已从 `woodruffw/zizmor` 迁移至 `zizmorcore/zizmor`（旧路径 404）；官方建议对此 action 用完整 SHA pin，已照办。checkout 时 `persist-credentials: false`，避免凭据留在工作区被扫。
  - **供应链健康分（OpenSSF Scorecard）**：新增 `scorecard` job（`ossf/scorecard-action@v2.5.0`），公开库免费；`publish_results: true` 发布到 scorecard.dev，徽章已入库 README 徽章行（`https://api.scorecard.dev/projects/github.com/xiaoyu-hue/jiuxi/badge`）。首跑总分 **5.4/10**：SAST / Token-Permissions / Dangerous-Workflow / Dependency-Update-Tool / Binary-Artifacts / License 六项满分，Pinned-Dependencies 4 分（对应 zizmor 报的 23 处未 SHA 固定 action，待清理批次处理），Code-Review / Branch-Protection / Contributors / Security-Policy 等 0 分属单人项目结构性问题，见安全报告。
  - **出口流量审计（harden-runner）**：`security.yml` 与 `deploy.yml` 共 10 个 job 的第一步均装 `step-security/harden-runner@v2.22.1`，`egress-policy: audit`（只记录不阻断；block 模式会断掉扫描类 job 的必要出站连接）。注意 audit 模式下其自带 telemetry 强制开启且无法单独关闭，唯一移除方式是删掉各 job 的 harden-runner 步骤。
  - 三个新 job 均延续本项目 advisory 约定：`continue-on-error` 写在 **job 级别**（step 级覆盖不了 action 引用解析失败，失败发生在 "Set up job" 阶段）。待连续转绿后可逐个转强制。
- **首页补「历史回顾」入口**：此前仅导航栏有「历史回顾」、首页 Bento 卡片遗漏，新板块对首页访客不可见。现首页 Bento 卡片由 9 张补齐为 10 张（与导航顺序一致，插在「读书推荐」与「设置与数据」之间）。
- **AI 发展时间线 +21 条（192 → 213）**：补齐此前的三类缺口——① 算法史（1952 Arthur Samuel 跳棋程序、1959「机器学习」命名、1972 PROLOG、1973 莱特希尔报告、1989 LeCun CNN、1992 TD-Gammon、1995 SVM、2017 AlphaZero）；② 国内主线（1981 中国人工智能学会成立、2017 国务院《新一代人工智能发展规划》、2018 智源研究院成立、2019 八项治理原则、2021 悟道 1.0）；③ 早期里程碑（1979 斯坦福 Cart、1982 日本第五代机、2004 DARPA 沙漠挑战赛、2010 ILSVRC、2011 Siri、2016 OpenAI Gym、2018 AlphaFold 1 夺 CASP13、2019 魔方机器人手）。新条目均配来源链接。
- **AI 工具箱 +34 个（40 → 74）**：补齐全品类——视频（Sora / 可灵 / Veo / 海螺 / Vidu / Pika，此前仅 Runway）、图像（FLUX / Ideogram / 即梦 / 通义万相）、音乐（Udio / Stable Audio，此前仅 Suno）、编程（Claude Code / Windsurf / OpenAI Codex / 通义灵码 / Trae）、对话（Grok / 豆包 / Qwen Chat / 腾讯元宝）、搜索（秘塔）、研究（Elicit / Consensus）、本地（LM Studio / llama.cpp）、开发框架（LLaMA-Factory / Unsloth / OpenWebUI）、智能体（Coze / Manus）、效率（Gamma / 沉浸式翻译）、3D（Tripo3D）。所有产品 URL 经实测可达（少数 openai.com / gamma.app 等对数据中心 IP 返回 403/超时，属反爬策略，真实浏览器可达）。
- **读书推荐 +21 本（37 → 58）**：**首次补齐文学类**（此前为 0）——《红楼梦 / 三国演义 / 西游记 / 水浒传》（古诗文网免费全文，实测可读）、《活着 / 百年孤独 / 围城 / 三体 / 局外人 / 小王子》（微信读书）；历史 +3（全球通史 / 中国大历史 / 天朝的崩溃）；哲学原著 +5（论语 / 道德经 / 孟子 免费全文，理想国 / 西方哲学史）；官方免费教材 +1（Jurafsky & Martin《语音与语言处理》第 3 版）；其他 +2（时间简史 / 穷查理宝典）。每本配客观推荐语与在线链接。
- **历史回顾 · 云端存储（阶段 1）**：定时重建时将各板块资讯快照同步写入 Cloudflare D1（表 `snapshots`，按 `板块+日期` 主键 upsert，重复构建自动覆盖）；凭证经 GitHub Secrets 注入，未配置时自动跳过、不影响原有本地 JSON 保存。
- **TruffleHog 第二密钥扫描引擎（advisory）**：`security.yml` 新增 `trufflehog` job，与 gitleaks 形成双引擎互补——① gitleaks 扫当前文件与近期提交，TruffleHog 的 `git file://` 模式遍历**全部提交历史**，可发现「早已删除但仍在历史里」的密钥（checkout 配 `fetch-depth: 0`）；② `--only-verified` 拿密钥去各云厂商 API 实测有效性，报出的必为「真的能用」的密钥，弥补 gitleaks 模式匹配的误报。形态与 osv-scanner job 同构：官方 CLI 二进制 + pin 版本（v3.99.2）+ SHA256 校验（`trufflehog_3.99.2_checksums.txt`，实测文件名并非惯常的 SHA256SUMS，勿凭印象写），不用第三方 action。job 级 `continue-on-error` advisory 约定一致：发现项经 `--fail` 非零退出转 `::warning::` 呈现在运行摘要，不阻断流水线。**许可证处理**：TruffleHog 为 AGPL-3.0、本项目代码为 Apache-2.0，CI 中以独立进程运行官方二进制、不链接不分发其源码，AGPL 网络交互条款不触发，两许可证互不影响；README「致谢与开源声明」已注明（保留其原许可证）。扫描路径用 `$GITHUB_WORKSPACE` 环境变量而非 `${{ }}` 插值，避免 zizmor 模板注入检查误报。

### Changed

- **Dependabot PR 批量合并（6/7，每个合并后均等 main CI 双工作流全绿再合下一个）**：
  - **actions/checkout v5.1.0 → v7.0.1**（#11）、**actions/setup-node v5.0.0 → v7.0.0**（#9）、**actions/github-script v7.1.0 → v9.0.0**（#10）、**actions/upload-artifact v4.6.2 → v7.0.1**（#13）、**gitleaks/gitleaks-action v2.3.9 → v3.0.0**（#12）：均为 CI action 滚动升级，SHA pin 由 Dependabot 按尾部版本注释同步更新。gitleaks-action v3 的 PR 兼容性已在合并前由其 PR CI（基于安全改造后的 main）实证通过，合并后 main 复跑仍全绿。
  - **zod 3.25.76 → 4.6.5**（#15）：大版本升级，PR CI 的质量门禁（lint / typecheck / test）全绿后合并。
  - **typescript 5.9.3 → 7.0.2（#14）未合并，留言后关闭**：CI 实测 `npm ci` 阶段即 ERESOLVE 失败——`@astrojs/check@0.9.10` 的 peer 依赖只声明支持 `typescript@^5 || ^6`，Astro 官方类型检查工具尚未支持 TS 7。属上游生态问题而非本项目代码问题；强行合并（或 `--legacy-peer-deps`）会令 main 质量门禁变红。待 @astrojs/check 发布支持 TS 7 的版本后，Dependabot 重开的升级 PR 可自然转绿再合。**教训：Dependabot 不预检 peer 依赖，「大版本 PR 全绿才合、不绿就查生态」应作为固定纪律。**
- - **安全门禁第一批 · zizmor 告警清理（51 → 0）**：zizmor 首跑报 51 个告警，本轮按类清理，实测清零（仅剩 1 条「ubuntu-latest 将于 2026-10-19 迁移 Ubuntu 26」的提示性 notice，非告警）——
  - **action 全部 SHA 固定（23 处 unpinned-uses）**：security.yml / deploy.yml / dast-scan.yml / refresh-feeds.yml / weekly-timeline-proposal.yml 中所有标签引用（harden-runner、gitleaks-action、codeql-action×3、lychee-action、dependency-review-action、scorecard-action、action-baseline、github-script、checkout、setup-node）改为 commit SHA + 版本注释，与项目既定策略对齐；Dependabot 依据尾部版本注释把 SHA 滚动到各 action 最新发布（dependabot.yml 并无 `pin-actions` 选项——官方选项列表无此键、GitHub schema 校验直接拒绝，已删除；SHA 固定由工作流引用本身承载，Dependabot 只负责滚动）。
  - **checkout 补 persist-credentials: false（14 处 artipacked）**：本项目所有 job 均只读仓库、无 git 推送，关闭凭据持久化零风险。
  - **权限下沉（5 处 excessive-permissions）**：deploy.yml / refresh-feeds.yml 的 `pages: write`、`id-token: write` 从工作流级移到 deploy-github-pages job；security.yml 上一轮已收紧。
  - **自引用语法（2 处 self-repository）**：两处 zap-baseline 调用方 `./` → `$/`（GitHub 2026-07 起官方支持，解析到当前运行提交，需 runner ≥ 2.336.0，GitHub 托管 runner 满足；3cbc8ee 部署链路已实证——deploy.yml 的 zap-baseline 调用方在双部署成功后自动触发并 success）。
  - **删 secrets: inherit（2 处）**：dast-scan.yml 不使用任何 secrets。
  - **Dependabot 冷却期（2 处 dependabot-cooldown）**：两个 ecosystem 均加 `cooldown: default-days: 7`。
  - **模板注入修复（2 处 template-injection）**：weekly-timeline-proposal.yml 的 github-script 不再内联 `${{ steps.*.outputs.* }}`，改 env 传参（脚本内 `process.env` 读取）。
  - **CodeQL 误报驳回（1 处）**：`js/incomplete-url-substring-sanitization` 位于 feeds.test.ts 的 fetch mock 匹配，非安全边界；生产代理 functions/api/feed.ts 已核实为精确主机名白名单（`ALLOWED_HOSTS.includes(hostname)`）+ 协议检查 + 私有地址拦截 + Origin 检查，无子串匹配。按「测试代码」理由在代码扫描后台驳回。
  - **Node 20 弃置处理（小事一桩）**：checkout / setup-node 从 v4 升到 v5（v4 基于 Node 20，GitHub 已强制迁移 Node 24 并告警；v5 原生 Node 24）。其余第三方 action 的 Node 20→24 由 GitHub 强制迁移兜底、功能不受影响，逐个升大版本另行按各 action 发布节奏处理。
- **runner 固定为 ubuntu-24.04（19 处）**：zizmor 的 notice 提示 `ubuntu-latest` 将于 2026-10-19 迁移到 Ubuntu 26。全部 6 个工作流（security / deploy / dast-scan / refresh-feeds / timeline-digest / weekly-timeline-proposal）的 `runs-on` 固定到 ubuntu-24.04——即 ubuntu-latest 当前指向的版本，行为零变化，但避免 10-19 自动迁移到一个未经我们验证的环境。代价：放弃跟随 runner 镜像的后续更新（24.04 镜像仍由 GitHub 维护）。
- **dependency-review-action 手动补升 v4.9.0 → v5.0.0**：Dependabot 的 github-actions 更新任务部分失败，漏开了这一个正式版升级（v5.0.0 发布于 5 个月前、已过 cooldown，本应收到 PR）。已核实 v5.0.0 的 action.yml 输入与本 job 用法（无 `with` 参数）兼容后手动补上，同时消除其 Node 20 弃用告警。
- **README 全面更新**：反映 D1 轻后端里程碑（新增「第一次有了轻后端」说明段：静态站 + Serverless 路线验证、为后续真正后端铺路）、历史回顾板块与十一板块架构、21 个资讯源与按源轮询、Phase 7/8 路线图、策展内容新计数（时间线 213 / 工具箱 74 / 读书 58）、`functions/` 与 `scripts/` 目录结构、D1 绑定必须写入 wrangler.toml 的部署注意事项。
- **历史回顾 · 云端读取（阶段 2）**：新增 Pages Function `/api/history`（读 D1，30 分钟缓存头，未配 D1 绑定时返回 503 由页面降级）；历史页数据源改为三源合并——云端接口 → IndexedDB 本地缓存 → 静态索引，同 id 以云端为准，云端数据首次加载即写入本地缓存，离线或无 Functions 的环境（GitHub Pages 备用站）自动降级。顺带修复两处既有问题：按日期分组逻辑失效（`grouped` 临时数组未赋值回写）、清除按钮文案与新数据模型不符。
- **资讯源扩容 14 → 21（信息多元化）**：全部源经抓取实测后上线。AI 板块 +OpenAI 新闻、+Google AI 博客（两个官方一手源）；科技板块 +The Verge、+阮一峰的网络日志、+Solidot 奇客；游戏板块 +机核 GCORES、+触乐（该板块此前仅 2 源，为最弱板块）；新闻板块的少数派由公共 RSSHub 路线（实例不稳定）切换为官方源。每板块 24 条上限不变。
- **资讯选取改为按源轮询（round-robin-by-source）**：构建端 `scripts/fetch-feeds.mjs` 与运行端 `src/lib/feeds.ts`（`mergeFeedItems`，一处改动覆盖后台刷新、内嵌∪在线并集、本地加载三个调用点）同步改为「每个源轮流取一条（组内按发布时间降序），凑满 24 条为止」，取代纯按时间排序。动机：纯时间排序下高频源会占满名额——2026-10-12 实测 21 源配置的 AI 板块 24 条被 ArXiv×15 + 量子位×9 占满，OpenAI / Google AI / HN / Google News 零曝光，与「综合信息聚集地」的多元化定位相悖。轮询后实测四板块分布均衡（沙箱内可用源：ai 4 源各 6 条、news 3 源各 8 条、tech 6 源各 3~5 条、gaming 3 源各 8 条；CI 全源可用时约为 6/4/7/4 源均分）。无 source 字段的条目归入同一组，退化为原时间降序行为；每板块 24 条上限不变。
- **构建期抓取并行化**：`scripts/fetch-feeds.mjs` 的 HTTP 层从 `spawnSync`（阻塞事件循环，板块内多源实际串行）改为 `execFile` 异步版——仍是同一个 curl 二进制、同一组参数，零传输层行为变化，但板块内多源可真正并行；源扩容后总耗时约等于最慢单源（实测 21 源全量约 5 秒）而非全部源之和（旧版最坏约 50 秒）。
- **构建期抓取增加单源日志**：`fetch-feeds.mjs` 原先单源失败静默跳过，板块总数不变时无法定位是哪个源缺席（2026-10-12 排查 tech/gaming 缺源时被迫逐源直连测试）。现每个源抓取后打印 `✓ 源名: N 条` / `✗ 源名: 抓取失败`，构建日志可直接定位问题源。
- `wrangler.toml`：清理 nodejs_compat 的过时注释（旧注释声称"启用 nodejs_compat 做双保险"，与早已移除该标志的实际配置矛盾，会误导后续维护者重新加上它再踩一次 `node:stream` 发布失败）。
- 资讯刷新策略：运行时在线多源合并优先，全部失败再退 IndexedDB / localStorage（不再用内嵌缓存做回退覆盖）。
- `functions/api/feed.ts`：移除 Cache API（`caches.default`）改直连上游返回文本，规避 `node:stream` 打包陷阱、降低体积。
- README 工具箱分类计数修正：扩充后实测分类为 14 类（智能体 18 / 编程 10 / 对话 10 / 视频 7 / 图像 7 / 开发框架 6 / 音乐 3 / 研究 3 / 本地 3 / 效率 2 / 搜索 2 / 推理 1 / 开发 1 / 3D 1，合计 74），原文「等 20 类」为按引号格式重复计数所致的笔误，改为 14 类；顺带将 chatgpt / claude / copilot 三个早期条目缺失引号的 `category` 字段补全为带引号格式（纯格式统一，YAML 解析结果不变）。
- README 补 CI 徽章：标题区新增 flat 风格 shields.io 徽章行（Deploy 双站部署 / Security 安全门禁 / Release / Last Commit / Astro / License Apache-2.0），与 sonder520、时念两个项目的排版对齐——此前九溪仓库主页无任何状态徽章。

### Fixed

- **gitleaks 在所有 PR 上失败（GITHUB_TOKEN 缺失）**：gitleaks-action v2.3 起的破坏性变更——PR 事件扫描强制要求 `GITHUB_TOKEN`（经 GitHub API 列 PR 提交、在 PR 上评论发现项），缺失即 job 报 "🛑 GITHUB_TOKEN is now required to scan pull requests"。本仓库此前没有任何 PR，该隐患一直未暴露，直至 Dependabot 首次开出 7 个 PR 才显现（7 个 PR 分支上 gitleaks 全红）。修复：gitleaks step 补 `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`，job 权限补 `pull-requests: read`。
- **dependency-review 在所有 PR 上失败（依赖图未启用，待仓库设置操作）**：仓库的 Dependency graph 开关未打开（SBOM 接口 404 实证），dependency-review-action 直接报 "Dependency review is not supported on this repository"。REST API 无此开关，需在仓库设置页手动开启：Settings → Code security → Dependency graph → Enable。开启后该 job 即恢复，无需改代码。
- **Scorecard 发布结果失败（job 红，advisory 兜住）**：首跑实测 `publish_results: true` 报 `expired_token`。根因：scorecard-action v2 发布结果需用 GitHub OIDC 令牌做密钥less 签名，要求 job 级 `id-token: write`；缺失时退化为交互式设备流（日志出现 "Enter the verification code ... in your browser"），CI 无人完成验证，300 秒后令牌过期即失败。同时官方约束「所在工作流不得有工作流级写权限、仅 scorecard job 可用 id-token: write」与原顶层 `security-events: write` 冲突。修复：顶层权限收紧为 `contents: read`，`security-events: write` 下沉到 gitleaks/codeql/zizmor/scorecard 四个 job 各自声明，scorecard job 补 `id-token: write`（顺带消除 zizmor 报的 security.yml 工作流级宽权限告警）。
- **D1 绑定被部署覆盖（历史回顾接口 503）**：`wrangler.toml` 含 `pages_build_output_dir` 时即成为 Pages 项目配置的唯一来源（source of truth），CI 每次 `wrangler pages deploy` 都会用它覆盖云端设置——此前仅在仪表盘/API 里绑定的 D1，在一次部署后即被抹掉（production 实测复现，preview 因未部署而幸存）。已将 D1 绑定（`binding = "DB"`，库 `jiuxi-history`）声明进 `wrangler.toml` 的 `[[d1_databases]]`，随每次部署自动同步到 production 与 preview，不再依赖仪表盘手动操作。顺带修正 `functions/api/history.ts` 两处过时注释（functions/ 实际会被 astro check 检查；前置条件改为 wrangler.toml 声明）。
- **资讯刷新被冲掉**：后台刷新从「只返回第一个成功的源」改为 `mergeFeedItems` 合并多源（link 去重并集、按时间降序、最多 24 条）；`FeedSection.astro` 改为与内嵌内容做**并集刷新**——只补进成功源、绝不回退覆盖；`refreshFeedOnline` 全失败返回空，由 `loadFeed` 退 IndexedDB / localStorage 兜底。
- **第一方代理 `/api/feed` 发布失败（`No such module "node:stream"`）**：根因为 `wrangler.toml` 的 `compatibility_flags = ["nodejs_compat"]` 让打包器用 Node 的 undici 去 polyfill `fetch`/`Response`/`Headers` 等 Web API，向产物注入 `import ... from "node:stream"`，而 Pages Functions 默认运行时不提供该模块。已移除 `nodejs_compat`（feed.ts 纯 Web 标准 API，无需它），代理正常发布。
- **第一方代理未上线**：`deploy.yml` 的 `deploy-cloudflare` job 此前只 `download-artifact` 了 `dist`、未 `checkout`，致 `functions/` 不被上传、`/api/feed` 落到站点自身 `index.html`（静态 `cache-control: max-age=0`），浏览器端所有经代理的 RSS 源（量子位 / ArXiv / Google News）刷新失败。已补 `actions/checkout@v4`，代理随部署上线。

## [v1.3.0] — 2026-10-11

### Added（内容策展补充）

- **AI 工具箱**：新增 23 个 GitHub 高星项目，补齐「智能体 / Agent」主线与开源框架类。
  - 智能体（16）：AutoGPT、Dify、LangChain、LangGraph、CrewAI、MetaGPT、AutoGen、OpenManus、n8n、Flowise、Langflow、LobeHub、Gemini CLI、Browser-use、Mem0、Agno。
  - 开发框架（3）：vLLM、LlamaIndex、RAGFlow。
  - 图像（1）：ComfyUI；编程 Agent（3）：Cline、Aider、Continue。
  - 星数均为公开数据约值（截至 2026 年），已在页头标注会随时间变动。
- **读书推荐**：13 本原有书目重写「推荐语」并改为可在线阅读链接（微信读书 / 官方免费全文）；新增 9 本（动手学深度学习、神经网络与深度学习、强化学习：导论、深度学习入门、哥德尔/艾舍尔/巴赫、失控、为什么、奇点临近、代码大全），共 22 本。
  - 读书页新增「推荐语」正文渲染（沿用时间线页 `render()` 渲染 Markdown 的做法），链接标签改为「在线阅读 →」。
  - 读书再补 15 本，覆盖用户指定的三类：**历史**（未来简史、枪炮/病菌与钢铁、万历十五年、明朝那些事儿、丝绸之路）、**哲学**（苏菲的世界、哲学家们都干了些什么、沉思录、中国哲学简史、公正、活出生命的意义）、**非技术小白可读的 AI / AI Agent 入门**（AI 未来进行式、这就是ChatGPT、浪潮将至、如何创造可信的AI）。读书总数 22 → 37。

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
