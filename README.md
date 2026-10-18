# 九溪（JiuXi）

> **综合信息聚集地** —— 以 AI 为主，热点新闻为辅，其它为次辅。
> 本地优先的静态信息站：无需服务器、手机可维护，内容由「仓库内文件 + 浏览器端实时抓取」共同驱动。
> 视觉采用**报刊版式（editorial）：暖白纸底 + 墨色字 + 单一强调色 + 自托管中文衬线字体**，动效克制可降级。

| 项目     | 说明                                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 当前版本 | **v1.11.2**（死链清理：依据健康检查实证删除 40 个 404 死源，源总数 321 → 281，预期失败率 30.5% → 约 20.6%；403 反爬与超时源留待第二批 RSSHub 接入） |
| 技术栈   | Astro 7 · Tailwind CSS 4 · TypeScript（纯静态输出 + 构建期预渲染）                                                                                  |
| 托管目标 | [Cloudflare Pages](https://jiuxi-bm1.pages.dev/)（纯静态单站）                                                                                      |
| 许可证   | 代码 Apache-2.0 / 文档与内容 CC BY-NC 4.0                                                                                                           |

---

<div align="center">

![Deploy](https://img.shields.io/github/actions/workflow/status/xiaoyu-hue/jiuxi/deploy.yml?style=flat&label=Deploy)
![Security](https://img.shields.io/github/actions/workflow/status/xiaoyu-hue/jiuxi/security.yml?style=flat&label=Security)
![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/xiaoyu-hue/jiuxi/badge)
![Release](https://img.shields.io/github/v/release/xiaoyu-hue/jiuxi?style=flat)
![Last Commit](https://img.shields.io/github/last-commit/xiaoyu-hue/jiuxi?style=flat)
![Astro](https://img.shields.io/badge/Astro-BC52EE?style=flat&logo=astro&logoColor=white)
![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)

</div>

## 目录

- [速览（30 秒了解九溪）](#速览30-秒了解九溪)
- [本文档面向谁](#本文档面向谁)
- [一、项目简介](#一项目简介)
- [二、核心特性](#二核心特性)
- [三、技术栈](#三技术栈)
- [四、快速开始（本地运行）](#四快速开始本地运行)
- [五、项目结构](#五项目结构)
- [六、内容编辑指南（手机也能改）](#六内容编辑指南手机也能改)
- [七、部署指南（推送即上线）](#七部署指南推送即上线)
- [八、发展路线图](#八发展路线图)
- [九、致谢与致敬](#九致谢与致敬)
  - [9.1 直接依赖](#91-直接依赖)
  - [9.2 设计灵感与参考案例（致敬）](#92-设计灵感与参考案例致敬)
  - [9.3 可复用的工程经验](#93-可复用的工程经验)
  - [9.4 用九溪学知识](#94-用九溪学知识)
- [十、许可证](#十许可证)
- [十一、文档索引](#十一文档索引)

## 速览（30 秒了解九溪）

- **它是什么**：一个以 AI 为主、热点新闻为辅的**纯静态个人信息站**——零服务器、手机可维护、浏览器端实时聚合资讯。
- **你能做什么**：浏览 15 个页面的聚合资讯，翻看 AI 发展时间线 / 工具箱 / 读书推荐，收藏与导出数据；所有策展内容以仓库内 Markdown 存储，手机登录 GitHub 即可编辑上线。
- **去哪看**：[jiuxi-bm1.pages.dev](https://jiuxi-bm1.pages.dev/)（Cloudflare Pages，全球 CDN 加速）。

## 本文档面向谁

本 README 同时服务两类读者，请按需取用：

- **① 所有者 / 使用者（非技术）**：关注「怎么看效果、怎么改内容、怎么上线」。请直接看「速览」「六、内容编辑指南」「七、部署指南」。
- **② 协作开发者 / 技术伙伴**：关注「怎么本地跑、目录结构、构建与扩展」。请重点看「五、项目结构」「八、发展路线图」「九、致谢与致敬」（其中 9.3 是可复用工程经验、9.4 是把九溪当教材的学习路径）。

> 文中所有命令均在仓库根目录执行。涉及 GitHub 网页端操作的部分，手机浏览器同样可以完成。

---

## 一、项目简介

九溪是一个**个人向的综合性信息聚集地**。在「不会后端、目前只用手机、代码最终推送 GitHub」的约束下，选择「纯静态站点 + 浏览器端实时聚合」的方案，做到四点：

- **零服务器运维**：站点由 Astro 构建为纯静态文件，托管在 Cloudflare Pages。
- **手机可维护**：时间线、工具箱、读书推荐等策展内容以仓库内 Markdown 文件存储，手机登录 GitHub 即可编辑、提交后自动上线。
- **实时资讯**：15 个全行业板块（AI / 新闻 / 科技 / 游戏 / 财经 / 体育 / 健康 / 科学 / 教育 / 汽车 / 家居 / 旅行 / 美食 / 读书 / 开发）在浏览器端实时抓取公开数据源并本地缓存；每板块 24 条名额**中文优先 + 英文保底配额**——英文固定留位（默认 6 条，ai/science/dev 为 8 条），中文按发布时间补满其余名额。
- **报刊版式视觉**：暖白纸底 + 墨色字 + 单一强调色 + 自托管中文衬线字体，4 套可切换主题（晨曦 / 午夜 / 极光 / 樱粉），偏好持久化记忆。

> **架构定型 · 纯静态 + 构建期预渲染（2026-10）**：九溪自 v1.8.0 起定型为**纯静态站点**——不再依赖任何云端运行时（无 Pages Functions、无 D1）。所有资讯在 `npm run build` 时由 `scripts/fetch-feeds.mjs` 抓取并注入各页内嵌 JSON（首页 / 热点榜 / 策展页注入聚合数据 `jiuxi-feed-all`），访客打开即有内容。此前短暂的「轻后端」试水（历史回顾板块 + D1 云端快照）验证了 Serverless 路线，但因 Cloudflare 密钥依赖与维护成本，最终回归更稳的纯静态方案。

## 二、核心特性

**🎨 体验与视觉**

- **15 个页面 / 三组信息架构**：动态（首页 / AI / 热点 / 新闻 / 科技 / 游戏）· 策展（时间线 / 工具箱 / 读书）· 更多（收藏 / 设置 / 关于）。另有两个直链页（导航未收录、经 llms.txt 与站内检索可达）：`/curate` 候选策展台（作者视图：从聚簇候选里挑条目沉淀）与 `/feed-policy` 资讯策展标准（公开“什么算重要资讯”的精选规则）。
- 报刊版式 UI（实色面板 + 发丝边 + 纸纹质感，动效克制可降级，不支持的浏览器自动回退）。
- 4 套主题自由切换，防首屏闪烁，偏好写入 localStorage。
- **移动端体验**：≤768px 显示底部 TabBar（首页 / 热点 / 工具 / 我的）+「我的」sheet（收藏 / 搜索 / 设置 / 关于），小屏隐藏桌面分组导航避免重复。
- **全站站内搜索（本地优先）**：构建期生成 `search-index.json`（534 条），客户端零后端检索；`/` 与 `Cmd/Ctrl+K` 唤起、Esc 关闭，结果可深链到条目锚点。

**📚 内容策展**

- 策展数据用 **Content Collections** 管理，Zod schema 校验，改一篇 = 改一个文件。
- **收藏体系**：单一数据源（对象化存储 + 旧版格式自动归一化），带标题的收藏页 `/starred`，设置页可导入 / 导出。
- 策展内容已扩充至：AI 发展时间线 **255** 条（1950–2026）、AI 工具箱 **151** 个（14 大类）、读书推荐 **128** 本（多类别，配客观推荐语与在线可读链接）。

**📡 资讯引擎**

- **浏览器端实时资讯聚合**：构建期预渲染兜底（各板块资讯在 `npm run build` 时抓取并注入页面内嵌 JSON）+ 浏览器端直连源实时刷新；打开即有内容，无需服务器。
- **310 个资讯源 / 15 个板块**（每板块 = Google News 行业搜索骨干 + 行业官方 RSS；2026-10-17 补充中国新闻网 7 个频道 RSS（滚动/财经/体育/健康/生活/教育/汽车）与环球科学、有赞技术、开源中国、机核等官方源；沙箱实测 46 个可用，其余「待线上验证」由每小时构建自动验证），每板块 24 条名额**中文优先 + 英文保底配额**——英文固定留位（默认 6 条，ai/science/dev 为 8 条），中文资讯（标题含中文的条目）按发布时间降序补满其余名额，兼顾中文站定位、最新实时与英文视野。
- **首页「今日热点」**：读取构建期注入的聚合 JSON（`jiuxi-feed-all`），中文优先 + 英文保底（前 10 中约 7 中 + 3 英）按发布时间排序；纯静态，打开即有内容，永不白屏。
- **全局热点榜 `/hot`**：跨 15 板块中文优先、英文保底（前 60 中约 45 中 + 15 英）按发布时间聚合，顶部 `Filters` 按板块筛选。

**🔒 安全与工程**

- **单站部署**：Cloudflare Pages，push 即上线，全球 CDN 加速。
- **安全门禁分层**：SAST / DAST / 依赖 / 密钥 / 供应链 五类（详见 9.3 与 `docs/`）。
- **SEO 增强**：自动生成 sitemap / RSS / Open Graph 分享图，规范地址（canonical）。
- **系统能力**：收藏、外观设置、数据导出 / 导入（JSON）、清空缓存。

---

## 三、技术栈

| 类别   | 选型                                                                                                                                                                                                                                                                                                                                                                                                                                          | 用途                                   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 框架   | **Astro 7**                                                                                                                                                                                                                                                                                                                                                                                                                                   | 内容优先的静态站点生成，零 JS 默认输出 |
| 样式   | **Tailwind CSS 4**（含 `@tailwindcss/vite`）                                                                                                                                                                                                                                                                                                                                                                                                  | 原子化样式 + 快速开发                  |
| 语言   | **TypeScript**                                                                                                                                                                                                                                                                                                                                                                                                                                | 类型安全                               |
| 运行时 | **Node.js 22+**                                                                                                                                                                                                                                                                                                                                                                                                                               | 本地构建（部署侧由 CI 提供）           |
| 内容   | Astro Content Collections（Zod schema）                                                                                                                                                                                                                                                                                                                                                                                                       | 时间线 / 工具箱 / 读书的结构化数据     |
| 数据源 | 量子位 / OpenAI 新闻 / Google AI 博客 / Hacker News / ArXiv / The Decoder / Hugging Face / Google 新闻；Google 新闻 / IT之家 / 爱范儿 / 少数派 / 蓝点网 / 极客公园；Google 新闻 / Hacker News / TechCrunch / Ars Technica / The Verge / 阮一峰 / Solidot / MIT Technology Review / The Guardian；Google 新闻 / 机核 / 触乐 / IT之家 / Eurogamer / PC Gamer / Rock Paper Shotgun——共 310 源（15 板块），直连优先，失败回退构建期预渲染兜底数据 | 动态资讯实时抓取                       |
| 部署   | GitHub Actions + Cloudflare Pages                                                                                                                                                                                                                                                                                                                                                                                                             | 自动构建与单站发布                     |

---

## 四、快速开始（本地运行）

```bash
npm install      # 安装依赖（首次）
npm run dev      # 本地开发预览，终端会给出 http://localhost:4321
npm run build    # 生成静态站点到 dist/（部署用，含 search-index.json 生成）
npm run preview  # 本地预览构建产物
npm run check    # 类型检查（astro check）与单测门禁
```

> 手机没电脑期间想随时看效果：让技术伙伴起本地预览，或在部署上线后用手机浏览器直接访问公网地址。

---

## 五、项目结构

```
jiuxi/
├─ src/
│  ├─ components/       # 可复用组件
│  │  ├─ ThemeSwitcher.astro   # 4 主题切换器
│  │  ├─ SiteNav.astro         # 分组导航（动态/策展/更多）
│  │  ├─ MobileTabBar.astro    # 移动端底部 TabBar + 我的 sheet
│  │  ├─ GlassCard.astro       # 通用卡片（报刊实色版式）
│  │  ├─ GlassButton.astro     # 通用按钮（实色版式）
│  │  ├─ FeedSection.astro     # 动态资讯板块组件
│  │  ├─ Filters.astro         # 板块筛选条（复用）
│  │  └─ SearchOverlay.astro   # 站内搜索浮层
│  ├─ layouts/
│  │  └─ BaseLayout.astro      # 报刊版式外壳 + 防闪烁 + 导航 + 搜索按钮
│  ├─ pages/            # 15 个页面
│  │  ├─ index.astro  ai  news  tech  gaming  hot(全局热点榜)
│  │  ├─ timeline  tools  reading   # 策展三大板块
│  │  └─ starred(收藏)  settings  about
│  │  └─ curate(候选策展台·作者视图)  feed-policy(策展标准)  # 直链页，导航未收录
│  ├─ components/       # SiteNav / MobileTabBar / SearchOverlay / FeedSection / Filters / ThemeSwitcher / GlassCard / GlassButton / JiuxiMark
│  ├─ content/          # 策展数据（Markdown，手机可改）
│  │  ├─ timeline/  tools/  reading/
│  ├─ styles/           # global / themes(4套主题令牌) / glass(兼容别名) / components
│  └─ lib/              # feeds(抓取) / settings(设置) / favorites(收藏单数据源) / db(IndexedDB) / theme(主题) / motion(动效) / site(base工具) / security(转义/URL白名单)
├─ scripts/                     # 构建期脚本
│  ├─ fetch-feeds.mjs           # 预抓取注入（两段式：--write 抓写 JSON → astro build → --inject 注入内嵌资讯；全失败时退出码 1）
│  └─ build-search-index.mjs    # 生成 public/search-index.json（站内搜索用）
├─ .github/workflows/           # deploy.yml(单站) + security.yml(安全门禁) + 其它
├─ wrangler.toml                # Cloudflare Pages 配置（纯静态：pages_build_output_dir = 'dist'）
├─ astro.config.mjs             # Astro 配置
├─ package.json                 # 依赖与脚本
├─ README.md                    # 本文件
└─ docs/                        # 规划与架构文档（调研报告 / PRD / 架构 / 实施计划）
```

---

## 六、内容编辑指南（手机也能改）

九溪有两类内容：

1. **策展内容**（AI 发展时间线 / AI 工具箱 / 读书推荐）：改仓库里的数据文件，推送后自动上线。
   手机浏览器登录 GitHub → 打开 `src/content/<板块>/` 下对应文件 → 点铅笔图标编辑 → 提交即可。
2. **动态资讯**（15 个全行业板块，配置在 `src/data/feeds.json`）：由各板块公开源实时抓取，构建期预渲染兜底；**每次打开页面会显示构建期注入的最新资讯**，若想看实时更新可刷新（浏览器端直连源重新拉取），无需手动改文件。

**数据格式**（每个条目是一个 Markdown 文件，Frontmatter 写元数据，正文写简介）：

| 板块   | 文件位置                    | 关键字段（带 `*` 为可选）                                           |
| ------ | --------------------------- | ------------------------------------------------------------------- |
| 时间线 | `src/content/timeline/*.md` | `year` / `title` / `category` / `month*` / `source*` / `sourceUrl*` |
| 工具箱 | `src/content/tools/*.md`    | `name` / `url` / `category*` / `tagline*`                           |
| 读书   | `src/content/reading/*.md`  | `title` / `author*` / `rating*`(0–5) / `tag*` / `cover*` / `link*`  |

- **读书推荐**的 Markdown 正文（frontmatter 之后的内容）即「推荐语」，会在卡片上渲染；`link` 填可在线阅读地址（微信读书搜索 / 官方免费全文），页面显示为「在线阅读 →」。

> 改一处 = 改一个文件，推送后 CI 自动重建上线。

---

## 七、部署指南（推送即上线）

**🌐 线上访问地址：**

- **Cloudflare Pages**：[https://jiuxi-bm1.pages.dev/](https://jiuxi-bm1.pages.dev/)（全球 CDN 加速、无限带宽）

采用**单站部署**，由 `.github/workflows/deploy.yml`（push 即构建并发布）驱动：

- **Cloudflare Pages**：无限带宽、全球 CDN。需在仓库 `Settings → Secrets` 添加 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`（最小权限：Pages Edit）。
- 缺 Cloudflare 密钥时，部署步骤自动跳过（不阻塞流水线）。你只需 `git push` 到 `main`。
- **部署后冒烟测试**：部署完成自动校验静态站三页（`/`、`/hot`、`/curate`）返回 200 且首页含构建期注入的聚合 JSON（`#jiuxi-feed-all`）——把「静态站部署异常」转为 CI 红灯，不再静默。
- **定时重建**（`refresh-feeds.yml`，每小时）重新抓取并注入最新资讯，保持内容新鲜（纯静态，无云端写入）。

---

## 八、发展路线图

| 阶段     | 内容                                                                                                                                                                  | 状态                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Phase 0  | 工程初始化 + 报刊版式外壳骨架                                                                                                                                         | ✅ 已完成                                                                                                                 |
| Phase 1  | 视觉系统与 4 套主题（晨曦 / 午夜 / 极光 / 樱粉）                                                                                                                      | ✅ 已完成                                                                                                                 |
| Phase 2  | 导航与首页 Bento 聚合                                                                                                                                                 | ✅ 已完成                                                                                                                 |
| Phase 3  | 动态资讯板块（15 个全行业板块，feeds.json 配置驱动 + 动态路由模板）                                                                                                   | ✅ 已完成                                                                                                                 |
| Phase 4  | 策展板块（时间线 / 工具箱 / 读书）                                                                                                                                    | ✅ 已完成                                                                                                                 |
| Phase 5  | 系统板块（设置与数据 / 关于）                                                                                                                                         | ✅ 已完成                                                                                                                 |
| Phase 6  | 部署配置（Cloudflare Pages 单站）                                                                                                                                     | ✅ 已完成                                                                                                                 |
| Phase 7  | 轻后端试水：历史回顾 + Cloudflare D1 云端快照 + `/api/history` 接口                                                                                                   | ↩️ 已回退（v1.8.0 纯静态）                                                                                                |
| Phase 8  | 内容大扩充：时间线 / 工具箱 / 读书全面补全                                                                                                                            | ✅ 已完成                                                                                                                 |
| 阶段 A   | 首页「今日热点」+ 收藏体系重构（单数据源 + `/starred`）                                                                                                               | ✅ 已完成                                                                                                                 |
| 阶段 B   | 全局热点榜 `/hot` + 分组导航 + 移动 TabBar + 全站站内搜索                                                                                                             | ✅ 已完成                                                                                                                 |
| 阶段 C   | 九溪日报 `/daily`（当日候选按板块聚合，可选 LLM 摘要）+ 热度趋势 Delta/Sparkline                                                                                      | ⛔ 暂时放弃（v1.11.1 用户决策，需求保留待重启）                                                                           |
| Phase 9  | 纯静态架构定型：移除后端（Pages Functions + D1）与历史回顾板块，改为构建期预渲染                                                                                      | ✅ 已完成                                                                                                                 |
| Phase 11 | 英文保底配额：每板块为英文资讯固定留位（默认 18 中 + 6 英，ai/science/dev 为 16 中 + 8 英），修复中文候选超限导致英文源零曝光                                         | ✅ 已完成（v1.10.0）                                                                                                      |
| Phase 12 | RSSHub 自托管 + 中文源扩容：Cloudflare Workers 部署 RSSHub 实例，为无 RSS 的中文站点提供「网页 → RSS」加工，逐步替换失效中文源（衔接 P2 健康检查定位的 103 个失效源） | 🔄 进行中（首批 19 路由已接入：8 替换 + 11 新增，17 个 CI 实证可用；2 个受免费档 CPU 限制间歇失败，待 Workers Paid 决策） |
| Phase 10 | 中文优先策略：资讯选取改中文优先 + 按发布时间排序，补充中国新闻网等 12 个中文官方源                                                                                   | ✅ 已完成（v1.9.0）                                                                                                       |

> 当前 **v1.11.2** = 死链清理：每周健康检查实证 40 个源 HTTP 404（源已消失）后整体删除（DeepMind 博客、智源社区、Yahoo Finance、每日经济新闻、证券时报、中国基金报、NBA、The Athletic、新浪体育、网易体育、F1、路透中文、FT中文网、联合早报、穷游、Trip.com 等），源总数 321 → 281，预期失败率 30.5% → 约 20.6%；403 反爬与超时源留待第二批 RSSHub 接入；**v1.11.1** = RSSHub 接入修正：v1.11.0 首批 23 路由接入后 CI 实测仅 7 个成功，两轮诊断工作流（curl 直探响应体）定位三类问题——超时 5s 太短（路由需 3~8s，已改 20s 且仅对带 `rsshub` 字段的源生效）、4 个路由在部署版本未注册（36氪/3DM游戏/新浪体育回退原官方 URL、美食天下移除）、2 个路由撞 Cloudflare Workers 免费档 CPU 10ms 上限（AIbase 日报、新浪滚动新闻，`error code: 1102`，待 Workers Paid 决策）；最终保留 19 个路由（8 替换 + 11 新增），源总数 310 → 321；**v1.11.0** = RSSHub 首批接入：23 个源改走自托管 RSSHub Worker（`jiuxi-rsshub.xyyovo520.workers.dev`）——替换 11 个线上失效源（虎扑体育、懂球帝、新浪体育、游民星空、3DM游戏、虎嗅、36氪、第一财经、马蜂窝、下厨房、豆瓣读书）+ 新增 12 个（财联社电报、金十快讯、格隆汇、AIbase 日报、钛媒体、cnBeta、新浪滚动新闻、什么值得买好文、考研热点/动态、9VG、美食天下），源总数 310 → 322；路由路径均自 RSSHub master 源码逐个核实存在；**v1.10.1** = 致谢与署名补充：RSSHub 自托管实例（Cloudflare Workers）部署上线，README 补全署名与 AGPL-3.0 许可证边界说明、新增 Phase 12 路线图；**v1.10.0** = 英文保底配额：中文候选量远超 24 条上限后，「中文优先 + 纯时间序」在数学上必然导致英文源零曝光（v1.9.0 线上曾 15/15 板块 24/24 全中文）；现每板块为英文固定留位——默认 18 中 + 6 英，ai/science/dev 为 16 中 + 8 英，英文不足时多余名额由中文补上、中文不足时英文补满空位，首页今日热点（7+3）与全局热点榜（45+15）同步按 3:1 口径；**v1.9.0** = 中文优先策略：资讯选取从「每板块 24 条按源轮询」改为「中文优先 + 按发布时间」（中文条目按时间排满名额、英文补位），首页今日热点与全局热点榜同步改口径；补充中国新闻网 7 频道、环球科学、有赞技术等 12 个中文官方源 + 5 条中文 Google News 查询（总源数 299 → 310），线上 15 板块 24 条全中文；**v1.8.0** = 纯静态架构简化：移除 Cloudflare Pages Functions 后端（`/api/feed`、`/api/history`、`/api/candidates`）与 D1 数据库、删除历史回顾板块，资讯改为构建期预渲染注入；**v1.7.1** = 线上 API 失效（P0）修复批次：定时重建部署补上 functions/ 目录（直接根因）+ 部署后冒烟测试 + D1 写穿核查 + 源健康摘要；**v1.7.0** = 全行业信源扩容 31 → 299（15 个板块）+ 板块页模板化 + 构建/实时通道性能改造；承续 v1.6.1（全维度代码审查修复批次）与 v1.6.0（报刊体验升级 v2）。

详见仓库 `docs/` 内《九溪-PRD.md》《九溪-实施计划.md》《九溪-调研报告.md》《九溪-架构文档.md》。

---

## 九、致谢与致敬

九溪是一个站在开源巨人肩膀上的个人项目。本章把「用了哪些开源依赖」「在思路上参考了谁」「沉淀了哪些可复用经验」「以及怎么用九溪学习」四件事集中到一起，既方便读者查阅，也让每个被借鉴的项目都得到应有的署名。

### 9.1 直接依赖

**运行时依赖（`dependencies`）**

| 项目                                                                     | 许可       | 在九溪中的用途                                |
| ------------------------------------------------------------------------ | ---------- | --------------------------------------------- |
| [Astro](https://astro.build)                                             | MIT        | 静态站点框架，内容集合与构建（当前 v7）       |
| [Tailwind CSS](https://tailwindcss.com)                                  | MIT        | 原子化样式体系（v4）                          |
| [@tailwindcss/vite](https://tailwindcss.com)                             | MIT        | Tailwind 与 Vite/Astro 的集成插件             |
| [@astrojs/rss](https://docs.astro.build)                                 | MIT        | 自动生成 RSS（`/rss.xml`）                    |
| [@astrojs/sitemap](https://docs.astro.build)                             | MIT        | 自动生成 sitemap                              |
| [@extractus/feed-extractor](https://github.com/extractus/feed-extractor) | MIT        | 浏览器端解析 RSS/Atom（零正则 hack）          |
| [@fontsource/noto-serif-sc](https://github.com/fontsource)               | OFL-1.1    | 自托管思源宋体（标题/正文衬线，子集化无外链） |
| [@fontsource/noto-sans-sc](https://github.com/fontsource)                | OFL-1.1    | 自托管思源黑体（UI 无衬线，子集化无外链）     |
| [@formkit/auto-animate](https://auto-animate.formkit.com)                | MIT        | 资讯卡片流增删过渡动效                        |
| [lenis](https://github.com/darkroomengineering/lenis)                    | MIT        | 平滑滚动（Lenis）                             |
| [zod](https://zod.dev)                                                   | MIT        | Content Collections 的 schema 校验            |
| [TypeScript](https://www.typescriptlang.org)                             | Apache-2.0 | 源码类型系统                                  |

**开发依赖与工具链（`devDependencies`）**：ESLint（`@eslint/js` / `typescript-eslint` / `eslint-plugin-astro` / `eslint-config-prettier`）、Prettier、Vitest + `@vitest/coverage-v8` + happy-dom、`@astrojs/check`、globals、typescript。

**CI 安全工具链（仅运行于 GitHub Actions，不进入站点产物；均以独立进程 / action 形式使用，与站点代码的许可证互不影响）**：Gitleaks（MIT）、[TruffleHog](https://github.com/trufflesecurity/trufflehog)（AGPL-3.0，保留其原许可证，官方 CLI 独立运行，**历史密钥门禁已转强制**）、OWASP ZAP（Apache-2.0）、zizmor（MIT）、OpenSSF Scorecard（Apache-2.0）、harden-runner（Apache-2.0）、osv-scanner（Apache-2.0，**依赖漏洞门禁已转强制**）、Lychee（Apache-2.0）、Nuclei（MIT，本地构建产物模板扫描）、Trivy（Apache-2.0，fs 模式依赖/配置/密钥扫描）、anchore/sbom-action（Apache-2.0，生成 CycloneDX SBOM）、CodeQL（GitHub 托管，action 为 MIT）。

**自托管数据加工服务（P1 起引入）**：[RSSHub](https://github.com/DIYgod/RSSHub)（**AGPL-3.0**）——「万物皆可 RSS」的开源路由框架，把不提供 RSS 的网页加工成标准订阅源。九溪自 v1.10.1 起在 Cloudflare Workers 上部署其**未修改的官方实例**（`jiuxi-rsshub.xyyovo520.workers.dev`），为中文源扩容提供「网页 → RSS」加工能力。九溪仅以标准 HTTP GET 调用其公开路由，未修改 RSSHub 一行代码——按 AGPL-3.0 §13，只有**修改**才触发「向网络交互用户提供对应源码」的义务，未修改实例的该义务由 RSSHub 官方公开仓库天然满足；九溪与 RSSHub 是两个独立程序，不构成衍生作品。经 RSSHub 路由取得的资讯源，在 `src/data/feeds.json` 中以 `rsshub` 字段标注路由来源。

**基础设施（免费额度承载，特此致谢）**：[Cloudflare Pages](https://pages.cloudflare.com)（站点托管与全球分发）、[Cloudflare Workers](https://workers.cloudflare.com)（RSSHub 实例运行时；免费额度 10 万次请求/天，九溪日用量约为其 0.1%）、[GitHub Actions](https://github.com/features/actions)（CI/CD、定时重建与每周源健康检查）。

**数据源（公开服务，非 npm 依赖，共 31 个）**：AI——量子位、OpenAI 新闻、Google AI 博客、Hacker News（Algolia API）、ArXiv cs.AI、The Decoder、Hugging Face、Google 新闻；新闻——Google 新闻、IT之家、爱范儿、少数派、蓝点网、极客公园；科技——Google 新闻、Hacker News、TechCrunch、Ars Technica、The Verge、阮一峰的网络日志、Solidot 奇客、MIT Technology Review、Ars Technica·AI、The Guardian·Tech；游戏——Google 新闻、机核 GCores、触乐、IT之家、Eurogamer、PC Gamer、Rock Paper Shotgun。

**纯静态站点（无第一方后端）**：九溪自 v1.8.0 起不依赖任何云端运行时，无 Pages Functions、无 D1。资讯抓取与聚簇全部在构建期（`scripts/fetch-feeds.mjs`）完成并注入页面内嵌 JSON；浏览器端仅做渲染与可选的实时刷新（直连公开源）。

> 具体依赖版本见 `package.json` 与 `package-lock.json`。部署前建议运行 `npm audit` 复核依赖安全告警。

### 9.2 设计灵感与参考案例（致敬）

> **特别致敬 · [RSSHub](https://github.com/DIYgod/RSSHub)**
> RSSHub（「万物皆可 RSS」的开源路由框架，46k+ ★，近 2,000 个路由命名空间，AGPL-3.0）是九溪 **P1 中文源扩容的承重墙**。大量优质中文媒体（虎扑、懂球帝、第一财经、36氪、虎嗅、下厨房……）早已不提供 RSS，且从境外构建机房直连大量超时或被反爬拦截——P2 健康检查线上实测 310 源中 103 个不可用，其中约七成是中文源。九溪的应对不是放弃这些源，而是部署 RSSHub 官方实例代为「浏览」这些网站。致敬 [DIYgod](https://github.com/DIYgod) 与数百位路由贡献者——没有这个社区十余年的持续维护，中文信息的开放获取会困难得多。

> **特别致敬 · [AIHOT](https://github.com/KKKKhazix/AIHOT)**
> AIHOT（「自己找热点、自己写日报」的开源网站框架，7.5k★ · [aihot.news](https://aihot.news)）是九溪 **v1.5.0 体验升级的核心参照**。九溪首页「今日热点」、全局热点榜 `/hot`，以及「当下 ↔ 全局 ↔ 过往」三层对照的信息架构，都借鉴自 AIHOT 的「热点聚合 + 每日日报」范式——把「自动热点流」收敛为「三层视角对照的策展体验」，是九溪与 AIHOT 的最大分野。

其余在**架构思路、视觉语言或交互范式**上为九溪提供参考的开源项目，在此一并致敬：

| 项目                                          | 链接                                                      | 借鉴点                                                                             |
| --------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **AIHOT**                                     | https://github.com/KKKKhazix/AIHOT · https://aihot.news   | v1.5.0 体验升级参照：热点聚合 / 每日日报 / 三层视角信息架构，启发今日热点与 `/hot` |
| **Glance**                                    | https://github.com/glanceapp/glance                       | 「widget 化板块」架构范本，启发九溪首页聚合卡片的设计                              |
| **NHLOCAL/AiTimeline**                        | https://github.com/NHLOCAL/AiTimeline                     | 「单文件数据源 + 自动部署」模式，复用为九溪时间线方案                              |
| **思源宋体 / 思源黑体（Noto Serif/Sans SC）** | https://github.com/notofonts/noto-cjk                     | 中文衬线/无衬线字体，经 `@fontsource` 自托管，构成报刊版式基底                     |
| **@formkit/auto-animate**                     | https://auto-animate.formkit.com                          | 列表增删的「零配置」过渡范式，用于资讯卡片流                                       |
| **Lenis**                                     | https://github.com/darkroomengineering/lenis              | 惯性平滑滚动范式，构成克制动效层                                                   |
| **Astro Haze 主题**                           | https://astro.build/themes/details/astro-haze/            | 明/暗主题系统 + SEO/RSS 的成熟实践参考                                             |
| **部署 Skill 生态**                           | github-pages / cloudflare / publishing-astro-websites     | 以开源技能完成自动部署，省去手敲命令                                               |
| _早期玻璃方向探索（已弃用）_                  | nikdelvin/liquid-glass · GlassBlog · Daily-Dashboard-HTML | v1.0–v1.1 玻璃材质调研参考；v1.2 起改用报刊版式，仅留作思路记录                    |

> 九溪的视觉与交互为**自研实现**，未直接复制上述项目代码；参考仅限架构与思路层面。如有遗漏或需调整署名，请联系维护者补充。

### 9.3 可复用的工程经验

九溪虽是个人的小项目，但其中若干**架构与工程决策**对想自建「内容站 / 信息聚合站」的人有参考价值。以下按「做法 → 为什么」列出：

1. **静态优先，慎加后端（渐进式 Serverless 的右侧教训）**：九溪曾短暂引入 D1 + Pages Functions（历史回顾、候选整理）做「轻后端」，但最终因 Cloudflare 密钥依赖、部署复杂度与维护成本，在 v1.8.0 整体移除、回归纯静态。结论：**能用构建期 + 浏览器端解决的事，就绝不引入服务器**——后端只在确实无法用静态手段覆盖时才考虑，且要先算清密钥与运维代价。
2. **浏览器端 RSS 聚合的三级降级**：直连优先 → 第一方同域代理（含目标主机白名单 + 协议检查 + 私有地址拦截 + Origin 校验）→ 构建期注入兜底。同一份代码在弱网 / 无 Functions 环境自动降级，永不白屏。
3. **中文优先 + 英文保底配额，而非纯按时间排序**：纯按时间排序会被英文高频源（如 ArXiv 日更 15 条）占满名额，与中文站定位相悖；而纯中文优先 + 时间序同样走向另一个极端——中文候选量远超 24 条上限后，英文条目在数学上永远排不进名额（v1.9.0 线上曾 15/15 板块 24/24 全中文）。最终取「中文优先 + 组内按发布时间 + 英文保底配额」——英文固定留位（默认 6/24，ai/science/dev 为 8/24），中文按时间补满其余，既保中文主体性、时效与英文视野。
4. **收藏单数据源**：多个模块共用同一个 localStorage 键极易双写冲突。抽成 `favorites.ts` 单一真相（对象化存储、旧版格式自动归一化），`settings.ts` / `starred.astro` 只消费、不各写——UI 与数据解耦。
5. **自托管中文衬线字体**：经 `@fontsource` 子集化、零外链（思源宋体标题/正文、思源黑体 UI），既构成报刊版式基底，又规避 GDPR/隐私与加载抖动，离线也能渲染。
6. **站内搜索本地优先**：内容规模小（数百条）时，构建期把数据预处理成 `search-index.json`、客户端检索，**零后端、零额外请求、隐私友好**，远比接外部搜索引擎便宜。
7. **安全门禁分层、advisory 先行**：SAST（lint + typecheck + test）/ DAST（ZAP 扫生产）/ 依赖（osv-scanner 强制 + Trivy fs）/ 密钥（gitleaks + trufflehog 强制，扫全提交历史仅报已验证密钥）/ 供应链（OpenSSF Scorecard + SBOM + Nuclei）。新检查先 advisory 跑绿、稳定后转强制，避免一上来就阻断正常合并。
8. **双许可的内容站授权模型**：代码 Apache-2.0（可商用、可再分发），文档与原创内容 CC BY-NC 4.0（禁商用、须署名）。边界写清，避免「别人基于九溪代码搭站（合规）却搬运本站内容做商用（违规）」的灰色地带。

### 9.4 用九溪学知识

九溪不只是「看资讯」，它沉淀的策展内容本身可作为**学习材料**。以下 4 个路径示范怎么用九溪建立知识体系：

**① 用时间线系统学 AI 史**
时间线 **255 条**（1950 达特茅斯提案 → 2026），覆盖算法史（SNARC、感知机、CNN、SVM、AlphaGo/Zero）、产业主线（深蓝、Watson、ChatGPT、文心一格）、国内里程碑（1956 中科院自动化所、1986 863 计划、2013 百度 IDL、2016 百度大脑/寒武纪、2019 智谱/昇腾 910）。
**学法**：按 decade 通读，配合「国内主线」对照看中美产业差异；每条都带来源链接，可顺着溯源。

**② 用工具箱挑上手工具**
工具箱 **151 个**、分 14 类（智能体 / 编程 / 对话 / 视频 / 图像 / 开发框架 / 音乐 / 研究 / 本地 / 效率 / 搜索 / 推理 / 开发 / 3D）。
**学法**：先想「我要做啥」→ 映射到类别——写代码要助手 → 编程（Claude Code / Cursor / Trae）；做智能体 → 智能体（Coze / Manus / Dify）；出图出视频 → 图像 / 视频。避免被「新工具焦虑」裹挟，按任务选工具。

**③ 用热点三视角追动态**
九溪提供「当下 ↔ 全局」两层对照：

- **当下**：首页「今日热点」——各板块中文优先、英文保底、按发布时间排序的即时聚合。
- **全局**：`/hot` 全局热点榜——跨板块中文优先、英文保底、按发布时间排序前 60，顶部 `Filters` 按板块聚焦。
  **学法**：先用今日热点抓当下，再用全局榜看全局权重，建立「当下 ↔ 全局」的对照视野。

**④ 用读书单打知识底子**
读书 **128 本**，覆盖 AI / 技术 / 历史 / 哲学 / 经济 / 商业 / 政治 / 心理 / 社会 / 科学 / 艺术 / 文学等，每本配客观推荐语与在线可读链接。
**学法（分级）**：入门 → 《这就是 ChatGPT》《AI 未来进行式》；通识 → 《人类简史》《枪炮、病菌与钢铁》《沉思录》；打底 → 论语/道德经/理想国等公版原著（古诗文网 / ctext 免费全文）。想深读就顺着「在线阅读 →」走。

---

## 十、许可证

九溪采用**双许可**策略，代码与文档 / 内容分别授权：

| 类别           | 许可证                               | 覆盖范围                                                                                                              |
| -------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **代码**       | [Apache License 2.0](./LICENSE)      | `src/`（组件、样式、脚本、配置）、`astro.config.mjs`、`wrangler.toml`、CI 配置等所有源代码与构建配置                  |
| **文档与内容** | [CC BY-NC 4.0](./LICENSE-CONTENT.md) | `README.md`、四份规划与架构文档（`docs/` 下），以及 `src/content/` 下所有原创文字（时间线 / 工具箱 / 读书等策展内容） |
| **第三方**     | 保留各自原有许可证                   | 依赖包见 `package.json`；借鉴的开源项目见「九、致谢与致敬」                                                           |

要点：

- **代码（Apache-2.0）**：可自由使用、修改、再分发（含商用），须保留版权与许可声明、标注修改。
- **文档与内容（CC BY-NC 4.0）**：**禁止商用（NC）**，转载 / 演绎须署名（BY）并提供许可链接。
- **边界说明**：他人可基于九溪代码搭站（含商用），但不得搬运本仓库的文档与原创内容用于商业用途。
- **第三方**：九溪为自研实现，未复制第三方项目源码；若未来引入第三方代码片段，将保留其原有许可证声明。依赖包（Astro / Tailwind / TypeScript 等）按各自原有许可证，经 `package.json` 体现。

### 第三方许可证与合规说明

九溪引用的第三方组件绝大多数为**宽松许可证（MIT / Apache-2.0）**，保留其版权声明即可，无传染性。需单独说明三点：

- **自托管字体（OFL-1.1）**：`@fontsource/noto-serif-sc` / `noto-sans-sc`（思源宋体 / 黑体）遵循 **SIL Open Font License 1.1**，允许随项目自由嵌入与再分发；但字体文件本身不得作为独立商品出售、也不得施加比 OFL 更严格的限制。九溪将字体子集内嵌进产物，符合该条款。
- **TruffleHog（AGPL-3.0，已隔离）**：CI 密钥扫描工具 TruffleHog 为 AGPL-3.0（具传染性），但**仅在 GitHub Actions 中以独立 CLI 进程运行、不链接进九溪代码、不进入站点产物**，AGPL 义务不传导至九溪本身；其余 CI 工具（ZAP / Trivy / osv-scanner / Nuclei / Scorecard 等）均为 MIT / Apache-2.0。
- **完整清单**：逐包版本与许可证以 `package-lock.json` 为准；需生成人类可读的第三方许可清单，可运行 `npx license-report`（或 `license-checker`）。

版权人：xiaoyu-hue，2026。

---

## 十一、文档索引

仓库 `docs/` 目录收录完整规划与架构文档，建议按「调研报告 → PRD → 架构文档 → 实施计划」顺序阅读：

- `docs/九溪-调研报告.md`：全网技术 / UI / 数据源 / 开源项目调研结论
- `docs/九溪-PRD.md`：产品需求文档（定位、架构、功能优先级、风险）
- `docs/九溪-架构文档.md`：技术架构与运行原理（模块协作、部署与站点拓扑、安全与隐私）
- `docs/九溪-实施计划.md`：分阶段实施方案、技术选型理由、部署细节

> 文档均为 Markdown，统一存放在 `docs/` 目录，便于集中管理与移动端阅读。

---

_九溪 · 个人综合信息聚集地 · 由开源技术构建_
