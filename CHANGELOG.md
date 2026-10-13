# 九溪 · 变更日志

所有重要变更均记录于此文件。遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式。

## [Unreleased]

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

### Changed

- **安全门禁第一批 · zizmor 告警清理（51 → 0）**：zizmor 首跑报 51 个告警，本轮按类清理，实测清零（仅剩 1 条「ubuntu-latest 将于 2026-10-19 迁移 Ubuntu 26」的提示性 notice，非告警）——
  - **action 全部 SHA 固定（23 处 unpinned-uses）**：security.yml / deploy.yml / dast-scan.yml / refresh-feeds.yml / weekly-timeline-proposal.yml 中所有标签引用（harden-runner、gitleaks-action、codeql-action×3、lychee-action、dependency-review-action、scorecard-action、action-baseline、github-script、checkout、setup-node）改为 commit SHA + 版本注释，与项目既定策略对齐；Dependabot 依据尾部版本注释把 SHA 滚动到各 action 最新发布（dependabot.yml 并无 `pin-actions` 选项——官方选项列表无此键、GitHub schema 校验直接拒绝，已删除；SHA 固定由工作流引用本身承载，Dependabot 只负责滚动）。
  - **checkout 补 persist-credentials: false（14 处 artipacked）**：本项目所有 job 均只读仓库、无 git 推送，关闭凭据持久化零风险。
  - **权限下沉（5 处 excessive-permissions）**：deploy.yml / refresh-feeds.yml 的 `pages: write`、`id-token: write` 从工作流级移到 deploy-github-pages job；security.yml 上一轮已收紧。
  - **自引用语法（2 处 self-repository）**：两处 zap-baseline 调用方 `./` → `$/`（GitHub 2026-07 起官方支持，解析到当前运行提交，需 runner ≥ 2.336.0，GitHub 托管 runner 满足；3cbc8ee 部署链路已实证——deploy.yml 的 zap-baseline 调用方在双部署成功后自动触发并 success）。
  - **删 secrets: inherit（2 处）**：dast-scan.yml 不使用任何 secrets。
  - **Dependabot 冷却期（2 处 dependabot-cooldown）**：两个 ecosystem 均加 `cooldown: default-days: 7`。
  - **模板注入修复（2 处 template-injection）**：weekly-timeline-proposal.yml 的 github-script 不再内联 `${{ steps.*.outputs.* }}`，改 env 传参（脚本内 `process.env` 读取）。
  - **CodeQL 误报驳回（1 处）**：`js/incomplete-url-substring-sanitization` 位于 feeds.test.ts 的 fetch mock 匹配，非安全边界；生产代理 functions/api/feed.ts 已核实为精确主机名白名单（`ALLOWED_HOSTS.includes(hostname)`）+ 协议检查 + 私有地址拦截 + Origin 检查，无子串匹配。按「测试代码」理由在代码扫描后台驳回。
  - **Node 20 弃置处理（小事一桩）**：checkout / setup-node 从 v4 升到 v5（v4 基于 Node 20，GitHub 已强制迁移 Node 24 并告警；v5 原生 Node 24）。其余第三方 action 的 Node 20→24 由 GitHub 强制迁移兜底、功能不受影响，逐个升大版本另行按各 action 发布节奏处理。
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
