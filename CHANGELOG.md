# 九溪 · 变更日志

所有重要变更均记录于此文件。遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式。

## [v1.12.3] — 2026-10-19

> 安全工程瘦身：安全门禁维护成本失控后，按「纯静态站真实威胁面」重新校准——先画威胁面（九溪无后端 / 无登录 / 无 API，真实威胁仅三类：密钥泄进仓库、npm 依赖投毒、CI 工作流自身被动手脚），再按「无人消费 / 能力重叠 / 防虚构威胁」三条标准砍掉 7 个 job；CodeQL 与 Lychee 降频为每周一定时。push 触发安全门禁 467s → 约 90s，`security.yml` 29KB → 约 13KB，Dependabot 维护面约 10 → 5 个 action，**真实威胁覆盖率不变**。

### Removed（安全门禁 · 砍 7 项）

- **Nuclei（153s，最贵）**：扫本地静态产物，纯 HTML/CSS/JS 没有服务端漏洞面——防虚构威胁。
- **ZAP baseline + `dast-scan.yml`（82s + 部署后再跑一次）**：DAST 扫无攻击面的静态站——防虚构威胁。
- **Trivy（24s）**：与 osv-scanner 扫同一个 npm 依赖树，能力重叠。
- **Gitleaks（18s）**：与 TruffleHog 抢同一份钥匙（后者还扫全量提交历史）。
- **Scorecard / SBOM（47s）**：合规产物，无审计方消费；Scorecard 徽章与 `SECURITY.md` 相关表述同步移除。
- **dependency-review**：单人直推 `main` 无 PR 流程，永远 skipped 的死代码。
- 连带清理：`deploy.yml` 的 `zap-baseline` job 与头部注释；`security.yml` 触发条件去掉 `pull_request`（push main + 每周定时 + 手动）。

### Changed

- **security.yml 重写**（494 → 235 行）：保留 5 jobs——TruffleHog（强制，唯一密钥引擎）、osv-scanner（强制）、zizmor、CodeQL（仅每周定时）、Lychee（仅每周定时）；头部注释记录威胁面模型与砍减理由，注明「勿随意加回，恢复先读 v1.12.3 提交说明」。
- **README**：当前版本行 → v1.12.3；删除 Scorecard 徽章；「安全与工程」段改为威胁面描述；CI 工具链清单只留现役 6 项；可复用经验第 7 条重写为「按真实威胁面裁剪门禁」；致谢段 TruffleHog 隔离说明同步；版本沿革 prepend v1.12.3。
- **SECURITY.md**：CI 扫描列举更新为现役工具；移除 Scorecard 扣分项表述与「为满足 Scorecard 检查」说明。
- **docs/云端资源交接清单.md**：工作流分工表删除「ZAP 扫描」环节。
- **docs/九溪-实施计划.md**：「下一步」更新为 v1.12.3 现状，新增工程侧瘦身条目。
- **package.json**：version → 1.12.3。

### Verified

- `security.yml` YAML 结构断言通过（jobs = trufflehog / osv-scanner / zizmor / codeql / lychee，共 5 个；codeql / lychee 均带 `if: schedule || workflow_dispatch` 降频条件）；`deploy.yml` 无 DAST 残留（zap-baseline job 已删，`needs` 列表无悬空引用）；全仓 grep 确认 ZAP / Nuclei / Trivy / Gitleaks / Scorecard / SBOM / dependency-review 仅存于 `security.yml` 头注与 `CHANGELOG` 历史记录中；prettier / vitest / astro check / build 全绿；CI 双绿（security 5 jobs 正常、deploy 无 DAST 仍正常）。

## [v1.12.2] — 2026-10-18

> 读书推荐大扩充：用户评价 128 本书单并要求「一次性补充完整各种类型，兴趣 AI/哲学/历史/经济学/商业/政治学等，小白书为主、专业书为辅但不能没有，希望都有在线链接可直接观看，可调研 GitHub 开源项目」。逐类盘点 128 本后新增 42 本（128 → 170，覆盖 16 个类别），重点补齐经济学（6 → 11）、商业（4 → 9）等用户高关注类别；新条目中 11 本附官方免费全文直链（Project Gutenberg / MIT / Datawhale / OpenIntro / CORE Econ / 伯克希尔等），链接均经逐一直连访问实证可用；其余现代读物沿用微信读书检索页。

### Added（读书推荐 · 42 本新条目）

- **AI 入门（3）**：《我看见的世界》（李飞飞自传，ImageNet 与深度学习浪潮亲历记录）、《拐点：站在 AI 颠覆世界的前夜》（万维钢）、《智人之上》（赫拉利，信息网络视角的人类史，归入思辨）。
- **经济学（5）**：《贫穷的本质》（班纳吉/迪弗洛，诺奖实验经济学）、《小狗钱钱》《穷爸爸富爸爸》（零门槛财商启蒙）、《金融的逻辑》（陈志武）、《解读中国经济》（林毅夫）。
- **商业（5）**：《伟大的博弈》（华尔街三百五十年史）、《只有偏执狂才能生存》（格鲁夫）、《巴菲特致股东的信》（伯克希尔官网 1965 年至今免费公开）、《鞋狗》（耐克创业史）、《坏血》（Theranos 骗局调查）。
- **政治学（3）**：《联邦党人文集》（Gutenberg 免费）、《论人类不平等的起源和基础》（卢梭，Gutenberg 免费）、《中国历代政治得失》（钱穆）。
- **哲学（3）**：《知行合一王阳明》（度阴山）、《人生的智慧》（叔本华，Gutenberg 免费）、《维特根斯坦传：天才之为责任》（瑞·蒙克）。
- **历史（4）**：《人类群星闪耀时》（茨威格）、《历史的温度》（张玮）、《显微镜下的大明》（马伯庸）、《光荣与梦想》（曼彻斯特）。
- **心理学（2）**：《路西法效应》（津巴多）、《社会性动物》（阿伦森）。
- **科普（3）**：《自私的基因》（道金斯）、《万物简史》（布莱森）、《基因传》（穆克吉）。
- **成长 / 思维（3）**：《深度工作》（纽波特）、《掌控习惯》（克利尔）、《清醒思考的艺术》（多贝利）。
- **其它（9）**：文学《杀死一只知更鸟》、社会学《工作、消费主义和新穷人》（鲍曼）、传记《爱因斯坦传》（艾萨克森）、科技《芯片战争》（米勒）。
- **专业教材（7，全部免费直读）**：《统计学习导论》ISLR（statlearning.com 免费 PDF）、《机器学习公式详解》南瓜书（Datawhale 开源）、《数学与机器学习》（mml-book，作者承诺 PDF 永久免费）、《计算机程序的构造和解释》SICP（MIT 官网全文）、《神经网络与深度学习》（邱锡鹏，nndl.ai 免费 PDF）、《OpenIntro 统计学》（完全开放教材）、《经济学（The Economy）》（CORE Econ 开放获取）。

### Changed

- **README**：当前版本行 → v1.12.2；策展统计「读书推荐 128 → 170 本」；版本沿革段 prepend v1.12.2 描述。
- **实施计划**：「下一步」更新为 v1.12.2 现状（用户四大内容任务全部完成）。

### Verified

- 42/42 新条目 frontmatter 校验通过（title/author/rating/tag/link 齐全、link 合法）；11 个免费直链 URL 全部经 WebFetch 逐一直连实证（页面标题/免费全文声明确认）；`npm test` 105/105；`npm run build` 成功（dist/reading 渲染验证新书在页）；`npm run check` 0 errors；`npm run format:check` 通过。

## [v1.12.1] — 2026-10-18

> 工具箱大扩充：用户评价 151 个工具并要求「一次性补充完整，可调研 GitHub 开源项目与开源技术」。逐类盘点 24 个分类后新增 28 个（151 → 179），重点补齐 2025-2026 年爆红的新品类与官方框架；关键事实均经网络检索核实（官方文档 / GitHub / 主流媒体）。

### Added（AI 工具箱 · 28 个新条目）

- **桌面 Agent 新品类（2）**：Claude Cowork（Anthropic，2026-01 研究预览 / 04 GA）、OpenClaw（开源个人 Agent，原 ClawdBot/Moltbot，MIT，GitHub 30 万+ Star，住进聊天软件、模型可换）。
- **Agent 框架与基建（6）**：OpenAI Agents SDK（2025-03 官方框架）、Google ADK（2025-04 官方套件）、PydanticAI（FastAPI 团队的类型安全框架）、Composio（200+ 工具集成层）、MCP（2024-11 Anthropic 开源，2025-12 捐入 Linux 基金会 AAIF，9700 万月下载 / 1 万+ server）、MS-Swift（魔搭官方微调框架，300+ 模型）。
- **可观测性与记忆（3）**：Langfuse（开源 LLMOps）、LangSmith（LangChain 官方）、Zep（时序知识图谱 Agent 记忆）。
- **图像（4）**：Nano Banana（Gemini 2.5 Flash Image 出道即顶流；Pro = Gemini 3 Pro Image，2026-05 GA，4K）、ChatGPT Images 2.0（GPT-Image-2，2026-04 登顶 Image Arena）、Seedream 4.0（字节，2025-09，4K + 10 参考图）、Qwen-Image（阿里开源 20B，中文渲染强）。
- **视频（1）**：Seedance 1.0（字节，2025-06，原生多镜头叙事、1080p 一次成片）。
- **3D（1）**：Trellis（微软开源 3D 生成）。
- **编程（4）**：Qoder（阿里 Agentic IDE，500 万用户）、Replit（浏览器 AI 全栈）、Warp（AI 终端）、Roo Code（开源 VS Code 编码 Agent）。
- **搜索（1）**：Exa（为 AI 设计的语义搜索 API）。
- **对话（2）**：Microsoft Copilot（2026 Wave 3 多模型化）、阶跃星辰 Step（国内桌面 Agent 先行者）。
- **智能体（1）**：MiniMax Agent（2025-06，三端通用 Agent）。
- **研究（1）**：Deep Research（2025-02 开创的深度研究品类）。
- **数据（1）**：MarkItDown（微软万物转 Markdown）。
- **评测（1）**：LMArena（真人盲测竞技场）。

### Changed

- **README**：当前版本行 → v1.12.1；策展统计「工具箱 151 → 179 个（14 → 24 大类）」；工具箱导览段分类清单同步为全量 24 类；版本沿革段 prepend v1.12.1 描述。

### Verified

- frontmatter 全量校验（28/28：name/url/category/tagline 齐全、url 合法）；`npm test` 105/105；`npm run build` 成功（dist/tools 渲染验证新条目在页）；`npm run check` 0 errors；`npm run format:check` 通过。

## [v1.12.0] — 2026-10-18

> 时间线大扩充：用户评价现有 255 条时间线并要求「完整、具体、详细，国内外都要」，逐条盘点后新增 32 条（255 → 287）。所有 2026 年条目均经网络检索实证（官方公告 + 主流媒体报道交叉核实），附 source / sourceUrl 与站内交叉引用。

### Added（AI 发展时间线 · 32 条新条目）

- **理论起源补全（5 条）**：1943 McCulloch-Pitts 神经元模型（神经网络理论起点）、1948 维纳《控制论》（反馈与通信统一动物与机器）、1965 扎德模糊集合与模糊逻辑、1980 福岛邦彦神经认知机（CNN 直接祖先）、2006 Netflix Prize（竞赛文化与数据科学起点）。
- **深度学习时代（5 条）**：2015-10 AlphaGo 5:0 樊麾（Nature 封面）、2017-05 乌镇 AlphaGo 3:0 柯洁后退役、2021-06 GitHub Copilot（AI 编程助手品类开创者）、2021-08 OpenAI Codex API、2022-04 Google PaLM 540B（Pathways 架构首秀）。
- **大模型时代（6 条）**：2023-01 微软约百亿美元加注 OpenAI、2023-03 Anthropic 发布 Claude 1（宪法 AI 产品化）、2023-03 Google Bard 仓促应战、2023-07 Claude 2（10 万 token 上下文）、2024-07 GPT-4o mini（小模型性价比战争）、2024-07 SearchGPT（进攻搜索腹地）。
- **2026 上半年（16 条，全部经 web 检索实证）**：Claude Cowork 桌面 Agent 发布（1/12，引爆桌面 Agent 赛道）、Claude 助力毅力号完成首次 AI 辅助地外驾驶（1/30）、斯坦福 AI 从零设计功能性病毒基因组登 Science（1 月，生物安全争议）、百度昆仑芯分拆递表港交所（1/1 申请，1/2 公告）、SpaceX 收购 xAI 合并估值 1.25 万亿美元（2/2，太空算力）、Meta 约 20 亿美元收购 Manus（2 月）、五角大楼将 Anthropic 列为供应链风险（2/27，AI 伦理 vs 国家安全）、Google Gemini 3.1 Pro（2/19，ARC-AGI-2 77.1%）、微软 M365 Copilot Wave 3 集成 Copilot Cowork（3/9，多模型策略）、OpenAI GPT-5.4（3/5，首个原生 computer-use 前沿模型）、OpenAI 完成 1220 亿美元融资创私募纪录（3/31，估值 8520 亿）、欧盟数字综合法案令高风险 AI 条款延期至 2027/2028（3 月）、Claude Managed Agents（4/8，Agent 基础设施托管化）、Claude Opus 4.7（4/16，SWE-bench Verified 87.6%）、ChatGPT Images 2.0（4/21，真假难辨引发深伪焦虑）、Claude Mythos Preview 内测（4/7，「过于强大」暂不公开发布）。

### Changed

- **README**：当前版本行 → v1.12.0；策展内容统计「时间线 255 → 287 条（1943–2026）」；「用时间线系统学 AI 史」导览段同步更新；版本沿革段 prepend v1.12.0 描述。
- 时间线条目间新增交叉引用（blockquote）以增强可读性，如 Cowork ↔ Claude Code ↔ M365 ↔ Managed Agents 的 Agent 叙事链。

### Verified

- `npm test`：105/105 通过；`npm run build`：成功（dist/timeline 渲染验证新条目在页）；`npm run check`（astro check）：0 errors；`npm run format:check` + `npm run lint`：通过（lint 5 个 warning 为存量未用变量，与本次无关）。

## [v1.11.2] — 2026-10-18

> 死链清理：依据每周健康检查实证（HTTP 404 = 源已消失）删除 40 个死源，兑现 v1.11.0 CHANGELOG 「死链清理独立成提交，不与功能混排」的承诺。触发决策：v1.11.1 健康检查 321 源中 98 个失败，其中 40 个为 HTTP 404——继续留存只拖累健康度数字、稀释真实失效信号。

### Removed

- **40 个 404 死源**（健康检查 run 39057751827 实证）：ai 2（Google DeepMind 博客、智源社区）、auto 3（42号车库、爱卡汽车、第一电动）、books 1（南方周末）、dev 1（V8 Blog）、education 1（edX 博客）、finance 4（Yahoo Finance、每日经济新闻、证券时报、中国基金报）、gaming 2（3DM游戏、indienova）、health 6（HealthDay、Medical News Today、CDC、医学界、健康界、Nature 健康）、news 4（路透中文、FT中文网、联合早报、朝日新闻中文）、science 6（NSF、ESA、中国科学院、果壳、中科院物理所、中国国家地理）、sports 5（NBA、The Athletic、新浪体育、网易体育、F1 官网）、tech 1（CSDN 头条）、travel 4（Lonely Planet、National Geographic、穷游、Trip.com 博客）。
- **源总数 321 → 281**；各板块 Google News 骨干源均保留（删除后无空槽板块）。

### Verified / Known Issues

- **预期效果**：健康检查失败源 98 → 58，失败率 30.5% → 约 20.6%（首次低于 20% 告警线，以下周一定期健康检查实证为准）。
- **403 反爬（17）与超时（13）源未动**：它们是第二批 RSSHub 接入的候选靶子（RSSHub Worker 正是为解决跨境超时与反爬而生），列入后续独立提交，不与本次清理混排。
- feedx.net 镜像系（路透/FT/联合早报/朝日新闻中文）整组 404：若后续找到可用镜像或 RSSHub 路由，可整体恢复 news 板块的国际新闻覆盖。

## [v1.11.1] — 2026-10-18

> v1.11.0 首批接入后的 CI 实测修正：构建日志显示 23 个 RSSHub 源仅 7 个成功。经两轮 GitHub Actions 诊断工作流（curl 直探测响应体与耗时）定位三类问题并修复。诊断工作流为临时设施，验证完成后已删除。

### Changed

- **路线图「阶段 C · 九溪日报 `/daily`」标记暂时放弃**（v1.11.1 用户决策）：README 路线图该行状态改为「⛔ 暂时放弃（需求保留待重启）」，README「后续可规划」段整体删除；`docs/九溪-实施计划.md`「下一步」节同步（原「下一里程碑 = 阶段 C」改写为 Phase 12 进行中）。

### Fixed

- **RSSHub 源超时 5s → 20s**（`scripts/fetch-feeds.mjs` 与 `scripts/feed-health-check.mjs` 同口径）：CI 诊断实证自托管 Worker 路由需「Worker 抓源站 → 解析 → 生成 RSS」，境外边缘抓中文站 3~8s，原 5s 必超时。仅对 `feeds.json` 带 `rsshub` 字段的源生效（`fetchSource` 按 `source.rsshub` 分档；健康检查 `probe(url, timeout)` 参数化），其余源维持 5s/8s 不变。
- **回退 4 个未注册路由**（CI 诊断返回 "Welcome to RSSHub!" 欢迎页 = 路由在部署版本不存在，尽管其在 RSSHub master 与最新 release 源码中均存在，部署版本差异原因未定）：36氪 → `https://36kr.com/feed`、3DM游戏 → `https://www.3dmgame.com/rss/news.xml`、新浪体育 → `https://sports.sina.com.cn/rss`（均移除 `rsshub` 字段，恢复 v1.11.0 前条目）；美食天下（v1.11.0 新增条目）整体移除。

### Verified / Known Issues

- **19 个 RSSHub 源 CI 构建实测 19/19 全部成功**（v1.11.0 时为 7/23）：AIbase 日报 10 条、新浪滚动新闻 15 条、游民星空 15 条、cnBeta 15 条、虎嗅 15 条、9VG 15 条、钛媒体 15 条、财联社电报 15 条、金十快讯 15 条、格隆汇 12 条、虎扑体育 15 条、懂球帝 10 条、第一财经 15 条、考研热点 10 条、考研动态 15 条、马蜂窝 10 条、下厨房 15 条、豆瓣读书 15 条、什么值得买好文 15 条；此前撞免费档 CPU 限制（`error code: 1102`）的两个路由本次也成功（20s 超时给足余量后未再触发）。构建总健康度 206/321（64%）。
- **3 个回退源维持失效**：36氪 / 3DM游戏 / 新浪体育的原官方 URL 在 CI 机房确实不可达（与 v1.11.0 前一致，属诚实复原，非假装能用）；待 RSSHub 侧路由注册恢复后可再切回。
- **源总数 322 → 321**；`feeds.json` `_comment` 同步记录 v1.11.1 修正结论。
- **沙箱仍无法实测**：沙箱网络屏蔽 `*.workers.dev`（对照组实证），本地构建中 19 个 RSSHub 源全部失败属预期；验收信号为 CI 构建日志中这 19 源的 ✓ 数量（v1.11.0 时 7/23 → v1.11.1 时 19/19）。
- 临时诊断工作流 `.github/workflows/rsshub-diag.yml` 已随本版本删除（两轮 run：39054862106、39055170623）。

## [v1.11.0] — 2026-10-18

> RSSHub 首批接入（P1 第一阶段）：23 个源改走自托管 RSSHub Cloudflare Worker，修复「中文源在构建机房不可达」问题。触发决策：P2 健康检查线上实测 310 源中 103 个不可用（失败率 33.2%），其中约七成是中文源——多数并非源本身死亡，而是 GitHub Actions 境外机房直连超时/被反爬拦截；用户已完成 RSSHub Worker 部署并实测路由可用。

### Added

- **12 个新源接入 RSSHub**：财联社电报 `/cls/telegraph`、金十快讯 `/jin10`、格隆汇 `/gelonghui/home`（finance）；AIbase 日报 `/aibase/daily`（ai）；钛媒体 `/tmtpost/new`、cnBeta `/cnbeta`（tech）；新浪滚动新闻 `/sina/rollnews`（news）；什么值得买好文 `/smzdm/haowen`（home，全站最弱板块 9 → 10 源）；考研热点 `/chsi/hotnews`、考研动态 `/chsi/kydt`（education）；9VG `/a9vg`（gaming）；美食天下 `/meishichina/recipe`（food）。
- **`feeds.json` 新增 `rsshub` 字段**：标注每个经 RSSHub 取得的源所使用的路由路径（如 `"rsshub": "/hupu"`），便于路由失效时精准定位与回滚；`_comment` 同步记录 P1 首批说明。
- **src/pages/feed-policy.astro 信源档位表新增脚注**：向读者明示部分媒体经自托管 RSSHub 路由加工后参与策展，信源档位与编辑标准不变（署名透明）。

### Changed

- **11 个线上失效源改走 RSSHub 路由**（URL 替换、label 不变、加 `rsshub` 标注）：虎扑体育 → `/hupu`、懂球帝 → `/dongqiudi/top_news`、新浪体育 → `/sina/sports`（sports）；游民星空 → `/gamersky/news`、3DM游戏 → `/3dmgame/news`（gaming）；虎嗅 → `/huxiu/article`、36氪 → `/36kr/hot-list`（tech）；第一财经 → `/yicai/headline`（finance）；马蜂窝 → `/mafengwo/note/hot`（travel）；下厨房 → `/xiachufang/popular`（food）；豆瓣读书 → `/douban/book/rank`（books）。
- **源总数 310 → 322**；README 当前版本行 / 路线图 Phase 12 / 版本沿革叙述同步至 v1.11.0。

### Verified / Known Issues

- **路由路径全部自 RSSHub master 源码逐个核实存在**（GitHub API 拉取 `lib/routes/**` 源码确认 `path` 注册值），无参或参数可选；已避开需登录态的路由（`/zhihu/hot`、`/smzdm/ranking` 等，见调研报告 4.4 节）。
- **沙箱无法实测**：沙箱网络屏蔽 `*.workers.dev`，本地构建中 23 个新源全部抓取失败属预期；真实验证以 CI 构建日志与每周健康检查为准——下次构建日志中这 23 源的 ✗/✓ 即为验收信号，失效路由单独回滚该条目即可。
- **覆盖盲区仍在**：汽车之家、好好住、穷游、机器之心、微信读书无 RSSHub 路由（调研报告 4.4 节已列），继续靠现有源 + Google News 兜底；真死链（Google DeepMind 博客、智源社区、Yahoo Finance、Trip.com 博客等约 20 个）的清理列入后续独立提交，不与本功能混排。

## [v1.10.1] — 2026-10-18

> 致谢与署名补充：RSSHub 自托管实例（P1）已部署上线，按开源礼节补全署名、许可证边界说明与基础设施致谢。触发决策：用户在 Cloudflare 完成 RSSHub Worker 一键部署后明确要求「加个说明，保持尊重与致敬致谢」。

### Added

- **README 9.1 新增「自托管数据加工服务」段**：RSSHub（AGPL-3.0）——九溪在 Cloudflare Workers 部署未修改官方实例（`jiuxi-rsshub.xyyovo520.workers.dev`），仅以标准 HTTP GET 调用公开路由；按 AGPL-3.0 §13，只有修改才触发「向网络交互用户提供对应源码」义务，未修改实例的该义务由官方仓库天然满足，九溪与 RSSHub 不构成衍生作品。经 RSSHub 路由取得的源在 `src/data/feeds.json` 中以 `rsshub` 字段标注。
- **README 9.1 新增「基础设施致谢」段**：Cloudflare Pages（站点托管）、Cloudflare Workers（RSSHub 实例运行时，免费额度 10 万 req/天，九溪日用量约 0.1%）、GitHub Actions（CI/CD 与每周源健康检查）。
- **README 9.2 新增「特别致敬 · RSSHub」**：说明 RSSHub 是 P1 中文源扩容的承重墙（P2 实测 310 源中 103 个不可用、约七成中文源的背景），致敬 DIYgod 与数百位路由贡献者。
- **README 路线图新增 Phase 12**：RSSHub 自托管 + 中文源扩容，状态「进行中（Worker 已部署，首批 12 路由接入中）」。

### Changed

- **README 当前版本行与版本沿革叙述**：v1.10.0 → v1.10.1。
- **docs/九溪-架构文档.md 数据源行**：RSSHub 补充「自托管 Cloudflare Worker」说明；顺手修正该行残留的 v1.8.0 前表述（原写「失败回退第一方同域代理 `/api/feed`」——该后端已于 v1.8.0 随纯静态化移除，实际兜底通道为构建期注入的内嵌 JSON）。

## [v1.10.0] — 2026-10-17

> 英文保底配额：修复「中文源过多导致英文源没有出现」。触发决策：v1.9.0 中文优先策略上线后，中文候选量（全站约 195 条）已远超每板块 24 条上限，「中文优先 + 纯时间序 + slice(24)」在数学上必然导致英文源零曝光——线上实测 15/15 板块 24/24 全中文、首页今日热点前 10 全中文，英文资讯（HN / arXiv / TechCrunch 等）彻底不可见。用户明确要求「中文优先保留，但英文必须有稳定曝光」。

### Changed

- **双端排序函数新增英文保底配额 `enQuota`**：构建端 `scripts/fetch-feeds.mjs` 的 `rankZhFirstByTime(items, limit, enQuota = 0)` 与前端 `src/lib/feeds.ts` 的 `rankZhFirst(items, limit?, enQuota = 0)` 同步改造（两端行为必须一致，否则构建期注入数据与浏览器端重排会打架）。配额语义：英文最多优先占 `enQuota` 个名额，中文补满其余；**英文不足时多余名额由中文顶上，中文不足时英文补满空位**——板块不会出现空槽，也不会出现「英文占位但内容陈旧」。`enQuota` 默认 0 = v1.9.0 旧行为（中文排满后英文才补位），存量调用零影响。
- **板块配额配置**：`fetch-feeds.mjs` 新增 `EN_QUOTA_BY_SECTION`（ai / science / dev = 8，这三个板块英文源是刚需：arXiv / HN / 论文预印本）与 `DEFAULT_EN_QUOTA`（6），即默认每板块 **18 中 + 6 英**、上述三板块 **16 中 + 8 英**；构建日志每条板块输出追加「（英文保底 N）」便于 CI 核查。
- **聚合视图按 3:1 口径**：`src/lib/feeds.ts` 新增导出 `enQuotaFor(limit)`（约 25%，至少 1 条）；`src/pages/index.astro`（首页今日热点）改用 `rankZhFirst(items, 10, enQuotaFor(10))`（7 中 + 3 英）、`src/pages/hot.astro`（全局热点榜）改用 `rankZhFirst(items, 60, enQuotaFor(60))`（45 中 + 15 英）。
- **文档同步**：README 项目简介 / 核心特性 / 工程经验 / 知识路径 / 路线图 / 版本沿革六处策略描述改为「中文优先 + 英文保底配额」口径，新增 Phase 11；`src/pages/feed-policy.astro` 策展标准页排序规则同步（v1.9.0 口径 → v1.10.0 口径）；`docs/云端资源交接清单.md` 最后核对时间戳更新。

### Added

- **配额测试**：`src/lib/feeds.test.ts` 与 `src/lib/fetch-feeds.test.ts` 各新增 4 个用例组（共 9 个用例）：保底配额精确切分（18+6 / 16+8）、英文不足时中文补位、中文不足时英文补满、enQuota 超 limit 全英文、默认 0 保持旧行为、`enQuotaFor` 取值。全量测试 96 → 105 全绿。

### Known Issues

- **配额值为经验设定，需线上观察微调**：6/24 与 8/24 基于英文科技资讯日更新量级的估计（HN 前端页日约 30 帖、arXiv cs.AI 日约百篇但九溪只收头部源）。上线后应观察一周各板块英文条目的「新鲜度」，若出现英文条目明显陈旧（配额大而当日英文产出少）或英文仍偶发缺席（配额小而当日英文产出多），调整代码顶部两个常量即可。
- **沙箱与 CI 抓取表现不同**：沙箱屏蔽 Google News，本次沙箱构建中 home/travel/food/books 板块中文条目为 0（全英）；线上（CI）这些板块由中文 Google News 查询供给，将是 18+6 形态。配额逻辑本身已经沙箱数据验证（news/tech/health/education/dev 精确 18+6，ai/science/finance/sports 中文不足时英文补满空位）。

## [v1.9.0] — 2026-10-17

> 资讯选取策略变更 + 中文源补充：从「每板块 24 条按源轮询」改为「中文优先 + 按发布时间」，并为中文供给不足的板块补充中国新闻网等官方 RSS 与中文 Google News 查询。触发决策：轮询保证多元化但不反映最新实时、也不区分语言权重；本站定位中文信息聚集地，应让中文资讯按时间排满名额、英文补位。

### Changed

- **资讯选取改为中文优先 + 时间排序**：构建端 `scripts/fetch-feeds.mjs` 删除 `roundRobinBySource`（按源轮询），新增导出的 `rankZhFirstByTime(items, limit)`——按标题是否含中文（`isChineseText`，正则 `/[\u4e00-\u9fff]/`）分两组，各自按发布时间降序，中文组整体排在英文组前，`concat` 后按 limit 截断（每板块仍 24 条上限）。语言判定按标题自动识别，无需给 310 个源逐一标注语言字段。
- **前端排序同步**：`src/lib/feeds.ts` 新增导出 `isChineseText` 与 `rankZhFirst(items, limit?)`（同上逻辑，无 limit 时返回全量）；`src/pages/index.astro`（首页今日热点）与 `src/pages/hot.astro`（全局热点榜）由 `rankByHeat`（独立信源数降序）改用 `rankZhFirst`，两页副标题/description/正文文案同步改为「中文资讯优先、按发布时间排序」口径。`rankByHeat` 与 `mergeFeedItems` 保留未删（`mergeFeedItems` 仍被测试引用）。
- **文档同步**：README 项目简介 / 核心特性 / 工程经验 / 知识路径四处策略描述由「按源轮询 / 独立信源数降序」改为「中文优先 + 按发布时间」口径。

### Added

- **补充中文资讯源（12 个官方源 + 5 条中文 Google News 查询）**：`src/data/feeds.json` 新增中国新闻网 7 个频道 RSS（滚动 / 财经 / 体育 / 健康 / 生活 / 教育 / 汽车）、环球科学（WordPress feed）、有赞技术，dev 板块原有的开源中国死链变体清理为可用地址，并为 AI / 游戏 / 家居 / 美食 / 汽车板块各补 1~2 条中文 Google News 行业查询。总源数 299 → 310，沙箱实测可用 34 → 46。动机：财经 / 体育 / 健康 / 科学等板块的中文供给原先只靠 Google News，而多数中文官方 RSS 配置地址已失效（实测 404 / 403 / 反爬挑战页 / 2018 年空壳频道），沙箱内这些板块中文条目为 0。补充后沙箱构建全站中文条目 121 → 195，财经 / 体育 / 健康 / 科学 / 教育板块中文 0 → 10~24。
- **策略测试**：`src/lib/feeds.test.ts` 新增 `rankZhFirst` 用例组（中文判定、中文整体在前、limit 截断、limit 小于中文数、无 limit、不修改入参、缺失字段容错）；`src/lib/fetch-feeds.test.ts` 新增 `rankZhFirstByTime` 用例组（中文优先截断、全英文退化时间降序）。

### Known Issues

- **家居 / 旅行 / 美食 / 读书板块中文仍依赖 Google News**：这四个板块未找到稳定的中文官方 RSS（好好住 / 一兜糖 / 马蜂窝 / 穷游 / 下厨房 / 豆果 / 豆瓣读书等配置地址均已失效或反爬），沙箱内中文条目为 0；线上（CI）由 Google News 中文查询供给（改版前线上实测分别有 6 / 14 / 6 / 16 条中文），配合中文优先生效后这些条目排在板块最前。汽车板块官方中文源仅中新网汽车（日更 1 条），主力仍是 Google News。
- **沙箱与 CI 抓取表现不同**：沙箱网络屏蔽 Google News 且部分国内站点连接失败（如英为财情沙箱 0B、CI 正常），「沙箱实测不可用」不等于「线上不可用」，因此本次仅清理经站点侧确证死亡的重复死链（环球科学旧 /rss、触乐旧 /rss、有赞旧 /rss/），未批量删除沙箱失败源。

## [v1.8.0] — 2026-10-17

> 纯静态架构简化：移除全部云端后端与数据库，回归并定型为纯静态站点。资讯改为构建期预渲染注入，删除历史回顾板块。触发决策：后端（Pages Functions + D1）带来 Cloudflare 密钥强依赖与部署复杂度，而静态站本就能覆盖全部需求。

### Removed

- **Cloudflare Pages Functions 后端**：`functions/api/feed.ts`（第一方 CORS 代理 + 服务端聚簇）、`functions/api/history.ts`（读 D1）、`functions/api/candidates.ts`（读 D1 候选）三个接口整体移除。
- **Cloudflare D1 数据库相关**：`scripts/save-history.mjs`、`scripts/ensure-candidates.mjs`、`scripts/lib/d1.mjs` 及对应测试（`src/lib/d1-client.test.ts`、`src/lib/save-history.test.ts`、`src/lib/cluster-consistency.test.ts`）全部移除；`wrangler.toml` 的 `[[d1_databases]]` 绑定声明删除。
- **历史回顾板块**：`src/pages/history.astro` 与 `public/history-client.js` 删除，导航与首页卡片入口移除。
- **`/api/*` 部署后冒烟测试与 D1 写穿核查**（原 v1.7.1 新增）：CI 改为校验静态站三页（`/`、`/hot`、`/curate`）返回 200 且首页含构建期注入的聚合 JSON（`#jiuxi-feed-all`）。
- **`docs/d1-candidates.md`**：候选表建表与聚合接口说明，随功能移除而删除。

### Changed

- **`src/lib/feeds.ts` 改造为纯前端**：移除在线刷新（`refreshFeedOnline` / `loadFeed`）、D1 回退、IndexedDB 缓存层与 SSRF/白名单代理逻辑；保留 `parseRss` / `parseHn` / `mergeFeedItems` / `clusterItems` / `rankByHeat` / `renderItems` / `wireFavorites` / `cleanFeedItems` 等纯函数。
- **`scripts/fetch-feeds.mjs` 改为两段式**：`--write`（build 前抓写 `src/data/feed.json`）→ `astro build` → `--inject`（build 后注入各页内嵌 JSON）；新增聚合数据 `jiuxi-feed-all` 注入首页 / 热点榜 / 策展页，实现纯静态闭环。
- **板块页去掉「立即刷新」按钮与后台自动刷新**（原依赖 `/api/feed` 代理），改为打开即读构建期内嵌 JSON。
- **构建脚本**：`package.json` 的 `build` 串联 `fetch-feeds --write` → `build-search-index` → `astro build` → `fetch-feeds --inject`。
- **文档同步**：README 技术栈 / 部署 / 路线图 / 工程经验改为纯静态口径；SECURITY.md 受影响文件示例去掉已删除的 `functions/api/feed.ts`、`history-client.js`；`docs/云端资源交接清单.md` 重写为纯静态接管指南；三份规划文档顶部加 v1.8.0 架构变更提示。

### Added

- **构建期聚合注入**：首页「今日热点」、`/hot` 全局榜、`/curate` 策展页均读取 `#jiuxi-feed-all` 聚合 JSON，纯静态打开即有内容，永不白屏。

## [v1.7.1] — 2026-10-17

> 线上 API 全失效（P0）修复批次：补上定时重建部署缺失的 functions/ 目录（直接根因），并建立两道「静默失败 → CI 可见」机制（部署后冒烟测试 + D1 写穿核查）。触发事件：2026-10-17 深度评价发现 `/api/feed`、`/api/history`、`/api/candidates` 线上全部返回 index.html。

### Fixed

- **定时重建部署缺失 functions/ 目录（P0 直接根因）**：`refresh-feeds.yml` 的 `deploy-cloudflare` job 漏了 `actions/checkout`——`deploy.yml` 有而此处无。`wrangler pages deploy` 只自动编译 **cwd 下**的 `functions/`（不存在则整个 Pages Functions 层缺失，只上传静态 dist）。定时重建每小时把「无 functions」的 dist 覆盖上线，导致线上三个 `/api` 端点全部返回 index.html：浏览器端靠前端逐源降级勉强可用（掩盖了故障），服务端聚簇与 D1 持久化全部静默失效。本版本补上 checkout，与 `deploy.yml` 对齐。

### Added

- **部署后冒烟测试（deploy.yml 新 job）**：部署完成立即请求 `/api/history?days=7`、`/api/feed?aggregate=1`、`/api/candidates?section=ai` 三端点，断言 `content-type: application/json` 且 body 可解析——把「Functions 静默失效」转为 CI 红灯。三级判定：非 JSON → 红灯（退出码 1）；JSON 带 `d1_binding_missing`/`query_failed` → 黄灯 warning（链路通、D1 配置问题，附控制台排查路径）；规范 JSON → 绿灯。每端点 3 次重试（应对 CDN 传播延迟）。仅当本次运行真的发生部署时执行（未配 CF 密钥则跳过，不对线上旧版本误报）。
- **D1 写穿核查（refresh-feeds.yml 新步骤）**：fetch-feeds 写入后经 Cloudflare REST API（与 `scripts/lib/d1.mjs` 同一端点）查 `snapshots` 表：0 行 / 超过 2 小时未更新 / 查询失败 → `::warning::`。save-history 的设计是「失败不阻断构建」（云端故障不拖垮定时重建），本步骤补上日志淹没后的可见性。密钥缺失自动跳过。
- **`docs/云端资源交接清单.md`**：Cloudflare 资源（Pages 项目 / D1 / Secrets）、双工作流分工、控制台操作路径、本地接管 checklist、应急操作一表收齐——换人换账号不靠记忆。

### Changed

- **fetch-feeds.mjs 源健康摘要**：299 源每源一行日志，失败源的 ✗ 行淹没在上百行输出里。现抓取结束集中输出健康摘要（可用数/健康度/失败数/空结果数）+ 失败源与空结果源清单；失败率 ≥ 20% 时追加 `::warning::` 注解（Actions 通知可见）。不改变既有容错语义（单源失败不阻断，全部失败仍 exit 1）。
- **`public/search-index.json` 移出 git 跟踪**（`git rm --cached`，`.gitignore` 早已包含）：150KB 构建期生成物入库会让每次内容变更产生巨大 diff，工作区文件保留不受影响。
- **`package-lock.json` 同步 v1.6.0 → v1.7.0**：v1.7.0 发布时漏跟进的 lock 版本字段，`npm ci` 以 lock 为准，两者应一致。
- **CONTRIBUTING.md 新增「依赖更新策略」章节**：lock 同步纪律、季度盘点节奏、门禁兜底、大版本单独 PR、action SHA pin 更新方式。

## [v1.7.0] — 2026-10-16

> 全行业信源扩容 31 → 299（15 个板块）+ 板块页模板化（动态路由）+ 构建/实时通道两处性能改造 + 「立即刷新」显式按钮试点（AI/科技）。交付说明见仓库外交付文档《变更清单-v1.7.0》。

### Added

- **资讯源全行业扩容 31 → 299（15 个板块）**：AI 24 / 新闻 28 / 科技 25 / 游戏 19 / 财经 25 / 体育 22 / 健康 16 / 科学 22 / 教育 14 / 汽车 14 / 家居 8 / 旅行 12 / 美食 8 / 读书 12（key `books`，路由 `/books`；`/reading` 为读书推荐内容页，两者并存）/ 开发 16。策略：每板块 = Google News 行业搜索（骨干源，线上实证可用）+ 行业官方 RSS（质量锚点，国内走 feedx.net 全文驱动）。沙箱实测 34 个源可用（`verified: true`），其余知名稳定源标注「待线上验证」，由每小时定时构建自动验证（fetch-feeds 容错跳过、不阻断）。代理白名单 25 → 228 个主机，与 feeds.json 逐一对应。
- **板块页模板化（动态路由 `[section].astro`）**：取代 ai/news/tech/gaming 四个手写页。`getStaticPaths` 从 `feeds.json` 派生全部板块页（输出 `dist/<section>/index.html`，构建端注入路径自动匹配）；`src/lib/sections.ts` 成为板块唯一事实来源（`Section` 联合类型 + 顺序 + 元数据），导航「更多」面板（板块组 15 + 功能组）、首页 Bento 卡片（15 + 6）、今日热点、`/hot`、`/curate` 全部改为派生——新增板块只需改 feeds.json 一处。
- **「立即刷新」显式按钮（渐进试点）**：板块页在后台实时抓取之外新增显式按钮（先开 AI / 科技两板块），点击绕过缓存实时抓取、成功整屏替换、失败保留已展示内容并明示状态；容错形态与首页「立即刷新」一致（disabled + finally 复位，防 P0-1 卡死回归）。试点验证无超时/限流后全量开放。

### Changed

- **首页「今日热点」与「全局热点榜」覆盖范围 4 → 15 板块**：聚合口径随 feeds.json 联动；文案同步（「聚合 15 个板块热讯」）。

### Performance

- **构建抓取改全局有界并发（池并发 10）**：旧结构「15 板块并行 × 板块内无上限并行」最坏同时起 299 个 curl 进程，2 核 runner 被进程调度开销压垮且对上游媒体不礼貌。改为板块 × 源拍平为全局任务池，总耗时 ≈ ceil(299/10) × 最慢单源；日志按 `[板块] 源` 前缀输出便于定位。
- **聚合端点 `?aggregate=1` 并行化 + 限量**：旧为 specs 串行 for-await，32 源大板块必然超过前端 8s 超时、白白走逐源降级。改为每源 **2.5s 独立超时**（覆盖 headers + body 全阶段）+ 全源并行（软限量 20 源，20 < Workers 免费版 50 subrequest 上限）+ 无任何批次/队列屏障。演进实录（线上 20 源实测，五版全记录）：串行（大板块必超时）→ 分批屏障 6.1s（批 2 等批 1 慢源）→ 10 worker 池化 5-6s（慢源排队，总时间 ≈ 2×最慢源）→ 全并行 4.2s（并发已最优：总时间 = 最慢单源、与源数无关；剩余是 CF 边缘→慢源（多为国内站）的网络延迟）→ 超时 3.5s→2.5s 后**实测 3.6–4.3s**（三次：3.67 / 3.63 / 4.33；推送该版时 commit message 所写「约 3s」为预期值，差值是 CF 边缘往返 + D1 写穿约 1s）。砍激进超时的代价（2.5-3.5s 才响应的源被放弃）由前端逐源回退通道补回（单源 5s 预算），信源覆盖不降级。单源重定向越权由「403 连坐整批」改为「跳过该源」（越权内容仍不会进响应）。

### Fixed

- **`transition:animate={fade}` 类型错误**（承接 v1.6.1 推送后 CI 红灯）：`astro:transitions` 的 `fade` 是工厂函数，须 `fade()` 调用后传入指令；本地 `.astro` 类型缓存陈旧曾致假绿，已清缓存复验。

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
- **reduce-motion 运行中生效**：设置页勾选「降低动效」后立即停止 Lenis 平滑滚动（`src/lib/motion.ts` 新增 `stopMotion()`：销毁 Lenis 实例、停 autoAnimate 卡片流过渡——其内置守卫只认系统 media query、不认应用级 class、把未触发的 `.reveal` 元素补为可见防止停在不可见状态），不再需刷新页面；取消勾选可重新初始化。`astro:transitions` 换页淡入补 `.reduce-motion` 应用级守卫（Astro 内置守卫只认系统 media query；`::view-transition-*` 伪元素挂在文档根上，故用 `html:has(body.reduce-motion)` 选择器）。**实测澄清**：Astro 7 仅在页面使用 `transition:animate` 指令时才注入淡入 CSS——本条目初版实施时该指令尚未启用，守卫当时是防回归的前置防护；淡入已于同日启用（见下条），守卫随之真正生效。
- **恢复页面淡入动画**（经确认后实施）：`BaseLayout.astro` 的 `<html>` 加 `transition:animate={fade()}`（`fade` 是工厂函数，须调用后传入——直接传函数本身会触发 ts(2322) 类型错误），Astro 7 由此注入 `astro/components/viewtransitions.css`（`astroFadeIn/Out` keyframes，默认 250ms 淡入淡出），换页不再瞬时切换。守卫两路齐备：系统级 `prefers-reduced-motion` 由 Astro 内置守卫处理；应用级「降低动效」由同批添加的 `html:has(body.reduce-motion)::view-transition-*` 规则处理——覆盖系统与应用两个层级的降动态。
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
