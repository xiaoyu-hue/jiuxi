# 九溪（JiuXi）

> **综合信息聚集地** —— 以 AI 为主，热点新闻为辅，其它为次辅。
> 本地优先的静态信息站：无需服务器、无需后端，内容由「仓库内文件 + 浏览器端实时抓取」共同驱动。
> 视觉采用**报刊版式（editorial）：暖白纸底 + 墨色字 + 单一强调色 + 自托管中文衬线字体**，动效克制可降级。

| 项目     | 说明                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 当前版本 | **v1.3.0**（另有一批未发版改进已上线：Cloudflare D1 云端历史存储、资讯源扩至 21 个、按源轮询多元化选取、策展内容大扩充——时间线 213 条 / 工具箱 74 个 / 读书 58 本） |
| 技术栈   | Astro 7 · Tailwind CSS 4 · TypeScript（纯静态输出 + Cloudflare Pages Functions 轻后端）                                             |
| 托管目标 | [Cloudflare Pages](https://jiuxi-bm1.pages.dev/)（主站）+ [GitHub Pages](https://xiaoyu-hue.github.io/jiuxi/)（备用副站，双站容灾） |
| 许可证   | 代码 Apache-2.0 / 文档与内容 CC BY-NC 4.0                                                                                           |

---

<div align="center">

![Deploy](https://img.shields.io/github/actions/workflow/status/xiaoyu-hue/jiuxi/deploy.yml?style=flat&label=Deploy)
![Security](https://img.shields.io/github/actions/workflow/status/xiaoyu-hue/jiuxi/security.yml?style=flat&label=Security)
![Release](https://img.shields.io/github/v/release/xiaoyu-hue/jiuxi?style=flat)
![Last Commit](https://img.shields.io/github/last-commit/xiaoyu-hue/jiuxi?style=flat)
![Astro](https://img.shields.io/badge/Astro-BC52EE?style=flat&logo=astro&logoColor=white)
![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)

</div>

## 文档说明（本文档面向谁）

本 README 同时服务两类读者，请按需取用：

- **① 所有者 / 使用者（非技术）**：关注「怎么看效果、怎么改内容、怎么上线」。请直接看「快速开始」「内容编辑指南」「部署指南」。
- **② 协作开发者 / 技术伙伴**：关注「怎么本地跑、目录结构、构建与扩展」。请重点看「环境要求」「项目结构」「开发路线图」「致谢与开源声明」。

> 文中所有命令均在仓库根目录执行。涉及 GitHub 网页端操作的部分，手机浏览器同样可以完成。

---

## 一、项目简介

九溪是一个**个人向的综合性信息聚集地**。在「不会后端、目前只用手机、代码最终推送 GitHub」的约束下，选择「纯静态站点 + 浏览器端实时聚合」的方案，做到：

- **零服务器运维**：站点由 Astro 构建为纯静态文件，托管在 Cloudflare Pages / GitHub Pages。
- **手机可维护**：时间线、工具箱、读书推荐等策展内容以仓库内 Markdown 文件存储，手机登录 GitHub 即可编辑、提交后自动上线。
- **实时资讯**：AI / 新闻 / 科技 / 游戏板块在浏览器端实时抓取公开数据源并本地缓存；每板块 24 条名额**按源轮询**分配，高频源不会淹没低频源。
- **报刊版式视觉**：暖白纸底 + 墨色字 + 单一强调色 + 自托管中文衬线字体，4 套可切换主题（晨曦 / 午夜 / 极光 / 樱粉），偏好持久化记忆。

> **里程碑 · 第一次有了「轻后端」（2026-10）**：九溪此前是彻底的纯静态站。本次上线**历史回顾**板块——定时构建时把各板块每日资讯快照写入 **Cloudflare D1**（云端 SQLite 数据库），页面经 Pages Functions 接口 `/api/history` 读取，形成「云端 → IndexedDB 本地缓存 → 静态索引」三级降级链路。虽然数据库目前只用于存储历史快照、功能很轻，但这是项目**第一次拥有数据库与在线接口**，验证了「静态站 + Serverless 轻后端」的路线，为后续做真正的后端（用户系统、评论、同步等）铺平了道路。

---

## 二、特性

- ✅ 十一板块信息架构：首页聚合 / AI / 热点新闻 / 科技 / 游戏娱乐 / AI 发展时间线 / AI 工具箱 / 读书推荐 / 历史回顾 / 设置与数据 / 关于九溪
- ✅ 报刊版式 UI（实色面板 + 发丝边 + 纸纹质感，动效克制可降级，不支持的浏览器自动回退）
- ✅ 4 套主题自由切换，防首屏闪烁，偏好写入 localStorage
- ✅ 浏览器端实时资讯聚合：直连优先 + 第一方同域代理（Cloudflare Pages Functions `/api/feed`，同源免 CORS，含 SSRF 防护与目标白名单），GitHub Pages 备站降级为构建期注入数据；30 分钟缓存
- ✅ **21 个资讯源**（AI 6 / 热点 4 / 科技 7 / 游戏 4），每板块 24 条名额**按源轮询**分配——每个有数据的源都有曝光位，高频源（如 ArXiv 日更 15 条）不再淹没低频源
- ✅ **历史回顾 · 云端存储**：定时构建将每日资讯快照写入 Cloudflare D1（SQLite），`/api/history` 接口读取，页面三级降级（云端 → IndexedDB → 静态索引），离线可用
- ✅ SEO 增强：自动生成 sitemap / RSS / Open Graph 分享图，双站规范地址（canonical）
- ✅ 策展数据用 Content Collections 管理，schema 校验，改一篇 = 改一个文件
- ✅ 系统能力：收藏、外观设置、数据导出 / 导入（JSON）、清空缓存
- ✅ 双站部署：Cloudflare Pages 主 + GitHub Pages 备，push 即上线
- ✅ 策展内容持续扩充：AI 发展时间线 213 条（1950–2026，国内外算法史与产业主线）、AI 工具箱 74 个（智能体 / 编程 / 对话 / 图像 / 视频 / 音乐 / 开发框架等 14 类）、读书推荐 58 本（AI / 技术 / 历史 / 哲学 / 文学等，每本配客观推荐语与在线可读链接）

---

## 三、技术栈

| 类别   | 选型                                                                                                                                     | 用途                                   |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 框架   | **Astro 7**                                                                                                                              | 内容优先的静态站点生成，零 JS 默认输出 |
| 样式   | **Tailwind CSS 4**（含 `@tailwindcss/vite`）                                                                                             | 原子化样式 + 快速开发                  |
| 语言   | **TypeScript**                                                                                                                           | 类型安全                               |
| 运行时 | **Node.js 22+**                                                                                                                          | 本地构建（部署侧由 CI 提供）           |
| 内容   | Astro Content Collections（Zod schema）                                                                                                  | 时间线 / 工具箱 / 读书的结构化数据     |
| 轻后端 | **Cloudflare Pages Functions**（`/api/feed` 代理 + `/api/history` 读取）+ **Cloudflare D1**（SQLite，存每日资讯快照）                     | 第一方 CORS 代理与云端历史存储         |
| 数据源 | 量子位 / OpenAI 新闻 / Google AI 博客 / Hacker News / ArXiv / Google 新闻；IT之家 / 爱范儿 / 少数派；TechCrunch / Ars Technica / The Verge / 阮一峰 / Solidot；机核 / 触乐——共 21 源，直连优先，失败回退第一方同域代理 `/api/feed` | 动态资讯实时抓取                       |
| 部署   | GitHub Actions + Cloudflare Pages / GitHub Pages                                                                                         | 自动构建与双站发布                     |

---

## 四、环境要求

- **Node.js ≥ 22.19.0**（官方推荐 22 LTS 以上；低于此版本会有引擎告警，当前构建仍可运行）
- 包管理器：npm（随 Node 附带）
- 部署侧无需本地环境，由 GitHub Actions 在云端完成

---

## 五、快速开始（本地运行）

```bash
npm install      # 安装依赖（首次）
npm run dev      # 本地开发预览，终端会给出 http://localhost:4321
npm run build    # 生成静态站点到 dist/（部署用）
npm run preview  # 本地预览构建产物
```

> 手机没电脑期间想随时看效果：让技术伙伴起本地预览，或在部署上线后用手机浏览器直接访问公网地址。

---

## 六、项目结构

```
jiuxi/
├─ src/
│  ├─ components/       # 可复用组件
│  │  ├─ ThemeSwitcher.astro   # 4 主题切换器
│  │  ├─ SiteNav.astro         # 移动优先导航（11 板块）
│  │  ├─ GlassCard.astro       # 通用卡片组件（已改为报刊实色版式）
│  │  ├─ GlassButton.astro     # 通用按钮组件（已改为实色版式）
│  │  └─ FeedSection.astro     # 动态资讯板块组件
│  ├─ layouts/
│  │  └─ BaseLayout.astro      # 报刊版式外壳 + 防闪烁 + 导航
│  ├─ pages/            # 11 个页面（见下）
│  ├─ content/          # 策展数据（Markdown，手机可改）
│  │  ├─ timeline/  tools/  reading/
│  ├─ styles/           # global / themes(4套主题令牌) / glass(兼容别名) / components
│  └─ lib/              # feeds(抓取) / settings(设置) / favorites(收藏) / db(IndexedDB) / theme(主题) / history-client(云端历史)
├─ functions/                   # Cloudflare Pages Functions（轻后端）
│  └─ api/  feed.ts(第一方代理)  history.ts(读 D1)
├─ scripts/                     # 构建期脚本（fetch-feeds 预抓取注入 / save-history 写 D1）
├─ .github/workflows/deploy.yml # 双站部署 CI
├─ wrangler.toml                # Cloudflare Pages 配置（含 D1 绑定声明）
├─ astro.config.mjs             # Astro 配置
├─ package.json                 # 依赖与脚本
├─ README.md                    # 本文件
└─ docs/                        # 规划与架构文档（调研报告 / PRD / 架构文档 / 实施计划）
```

页面清单：`index`(首页) · `ai` · `news` · `tech` · `gaming` · `timeline` · `tools` · `reading` · `history`(历史回顾) · `settings` · `about`

---

## 七、内容编辑指南（手机也能做）

九溪有两类内容：

1. **策展内容**（AI 发展时间线 / AI 工具箱 / 读书推荐）：改仓库里的数据文件，推送后自动上线。
   手机浏览器登录 GitHub → 打开 `src/content/<板块>/` 下对应文件 → 点铅笔图标编辑 → 提交即可。
2. **动态资讯**（AI / 新闻 / 科技 / 游戏）：由站点在浏览器端实时抓取公开源，无需你维护。

**数据格式**（每个条目是一个 Markdown 文件，Frontmatter 写元数据，正文写简介）：

| 板块   | 文件位置                    | 关键字段（带 `*` 为可选）                                           |
| ------ | --------------------------- | ------------------------------------------------------------------- |
| 时间线 | `src/content/timeline/*.md` | `year` / `title` / `category` / `month*` / `source*` / `sourceUrl*` |
| 工具箱 | `src/content/tools/*.md`    | `name` / `url` / `category*` / `tagline*`                           |
| 读书   | `src/content/reading/*.md`  | `title` / `author*` / `rating*`(0–5) / `tag*` / `cover*` / `link*`  |

- **读书推荐**的 Markdown 正文（frontmatter 之后的内容）即「推荐语」，会在卡片上渲染；`link` 填可在线阅读地址（微信读书搜索 / 官方免费全文），页面显示为「在线阅读 →」。

> 改一处 = 改一个文件，推送后 CI 自动重建上线。

---

## 八、部署指南（推送到 GitHub 后自动上线）

**🌐 线上访问地址（均已上线）：**

- **主站 · Cloudflare Pages**：[https://jiuxi-bm1.pages.dev/](https://jiuxi-bm1.pages.dev/)
- **备用副站 · GitHub Pages**：[https://xiaoyu-hue.github.io/jiuxi/](https://xiaoyu-hue.github.io/jiuxi/)

> 主站由全球 CDN 加速、无限带宽，优先访问；副站为 GitHub 原生托管，作容灾备份。两者内容完全一致，任一不可用可切到另一个。

采用**双站部署**，由 `.github/workflows/deploy.yml`（push 即构建并双发）驱动，两步在 CI 中相互独立，任一失败不影响另一：

- **主站 · Cloudflare Pages**：无限带宽、全球 CDN。需在仓库 `Settings → Secrets` 添加 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`（最小权限：仅 Pages Edit）。
- **备用副站 · GitHub Pages**：仓库 `Settings → Pages → Source` 选择 **GitHub Actions** 即可，无需密钥。
- 缺 Cloudflare 密钥时，主站步骤自动跳过，不阻塞副站。你只需 `git push` 到 `main`。

> ⚠️ **D1 绑定必须写在 `wrangler.toml`**：该文件一旦包含 `pages_build_output_dir`，就成为 Pages 项目配置的唯一来源（source of truth），每次 `wrangler pages deploy` 都会用它覆盖云端设置——只在仪表盘里绑定的 D1，一次部署后就会被抹掉（2026-10 实测复现）。当前绑定（库 `jiuxi-history`）已声明在 `wrangler.toml` 的 `[[d1_databases]]`，随每次部署自动同步，无需手动操作。

> ⚠️ **GitHub Pages 路径提示**：若用「项目站点」（`https://<用户>.github.io/<仓库>/`，无自定义域名），静态资源根路径会偏移。最省心做法是两个站点都绑**自定义域名**（Cloudflare 主站绑域名后，把 `astro.config.mjs` 的 `site` 改为该域名）。若只用 GitHub 项目站点、不绑域名，需把 `astro.config.mjs` 的 `base` 设为 `/<仓库名>/` 再构建。

---

## 九、开发路线图

| 阶段    | 内容                                       | 状态      |
| ------- | ------------------------------------------ | --------- |
| Phase 0 | 工程初始化 + 报刊版式外壳骨架              | ✅ 已完成 |
| Phase 1 | 视觉系统与 4 套主题（晨曦/午夜/极光/樱粉） | ✅ 已完成 |
| Phase 2 | 导航与首页 Bento 聚合                      | ✅ 已完成 |
| Phase 3 | 动态资讯板块（AI/新闻/科技/游戏）          | ✅ 已完成 |
| Phase 4 | 策展板块（时间线/工具箱/读书）             | ✅ 已完成 |
| Phase 5 | 系统板块（设置与数据/关于）                | ✅ 已完成 |
| Phase 6 | 双站部署配置                               | ✅ 已完成 |
| Phase 7 | 轻后端试水：历史回顾 + Cloudflare D1 云端快照 + `/api/history` 接口 | ✅ 已完成 |
| Phase 8 | 内容大扩充：时间线 / 工具箱 / 读书全面补全  | ✅ 已完成 |

已完成（v1.1.0）：定时提案周报（每周自动开 PR 提醒补充时间线里程碑，人工审核后合并）、SEO 增强（sitemap / RSS / OG 分享图）。

后续可规划：真正的后端（用户系统 / 收藏云同步 / 评论）、更多策展板块（影视 / 财经 / 学习等）、无障碍与多语言。
详见仓库 `docs/` 内《九溪-PRD.md》《九溪-实施计划.md》《九溪-调研报告.md》《九溪-架构文档.md》。

---

## 十、致谢与开源声明

九溪是一个站在开源巨人肩膀上的个人项目。以下为本项目**实际使用的开源依赖**与**设计 / 架构上借鉴的开源案例**，在此一并致谢。

### 10.1 直接使用的开源依赖

**运行时依赖（`dependencies`）**

| 项目                                                          | 许可       | 在九溪中的用途                                              |
| ------------------------------------------------------------- | ---------- | ----------------------------------------------------------- |
| [Astro](https://astro.build)                                  | MIT        | 静态站点框架，内容集合与构建（当前 v7）                     |
| [Tailwind CSS](https://tailwindcss.com)                       | MIT        | 原子化样式体系（v4）                                        |
| [@tailwindcss/vite](https://tailwindcss.com)                  | MIT        | Tailwind 与 Vite/Astro 的集成插件                           |
| [@astrojs/rss](https://docs.astro.build)                      | MIT        | 自动生成 RSS（`/rss.xml`）                                  |
| [@astrojs/sitemap](https://docs.astro.build)                  | MIT        | 自动生成 sitemap                                            |
| [@extractus/feed-extractor](https://github.com/extractus/feed-extractor) | MIT | 浏览器端解析 RSS/Atom（零正则 hack）                |
| [@fontsource/noto-serif-sc](https://github.com/fontsource)    | MIT        | 自托管思源宋体（标题/正文衬线，子集化无外链）               |
| [@fontsource/noto-sans-sc](https://github.com/fontsource)     | MIT        | 自托管思源黑体（UI 无衬线，子集化无外链）                   |
| [@formkit/auto-animate](https://auto-animate.formkit.com)     | MIT        | 资讯卡片流增删过渡动效                                      |
| [lenis](https://github.com/darkroomengineering/lenis)         | MIT        | 平滑滚动（Lenis）                                           |
| [zod](https://zod.dev)                                        | MIT        | Content Collections 的 schema 校验                          |
| [TypeScript](https://www.typescriptlang.org)                  | Apache-2.0 | 源码类型系统                                                |

**开发依赖与工具链（`devDependencies`）**：ESLint（`@eslint/js` / `typescript-eslint` / `eslint-plugin-astro` / `eslint-config-prettier`）、Prettier、Vitest + `@vitest/coverage-v8` + happy-dom、`@astrojs/check`、globals、typescript。

**数据源（公开服务，非 npm 依赖，共 21 个）**：AI——量子位、OpenAI 新闻、Google AI 博客、Hacker News（Algolia API）、ArXiv cs.AI、Google 新闻；热点——Google 新闻、IT之家、爱范儿、少数派；科技——Hacker News、TechCrunch、Ars Technica、The Verge、阮一峰的网络日志、Solidot 奇客、Google 新闻；游戏——机核 GCores、触乐、IT之家、Google 新闻。

**第一方轻后端（Cloudflare Pages Functions，自研，非第三方依赖）**：`functions/api/feed.ts`（第一方 CORS 代理，与站点同域、含目标主机白名单与 SSRF 防护，**已取代 allorigins / corsproxy 等公共代理**）+ `functions/api/history.ts`（读取 Cloudflare D1 中的每日资讯快照）。

> 具体依赖版本见 `package.json` 与 `package-lock.json`。部署前建议运行 `npm audit` 复核依赖安全告警。

### 10.2 设计灵感与参考案例（致敬）

以下开源项目在**架构思路、视觉语言或交互范式**上为本项目提供了重要参考，特此致敬：

| 项目                                    | 链接                                            | 借鉴点                                                          |
| --------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| **Glance**                              | https://github.com/glanceapp/glance             | 「widget 化板块」架构范本，启发九溪首页聚合卡片的设计          |
| **NHLOCAL/AiTimeline**                  | https://github.com/NHLOCAL/AiTimeline           | 「单文件数据源 + 自动部署」模式，复用为九溪时间线方案          |
| **思源宋体 / 思源黑体（Noto Serif/Sans SC）** | https://github.com/notofonts/noto-cjk | 中文衬线/无衬线字体，经 `@fontsource` 自托管，构成报刊版式基底 |
| **@formkit/auto-animate**               | https://auto-animate.formkit.com                | 列表增删的「零配置」过渡范式，用于资讯卡片流                    |
| **Lenis**                               | https://github.com/darkroomengineering/lenis    | 惯性平滑滚动范式，构成克制动效层                                |
| **Astro Haze 主题**                     | https://astro.build/themes/details/astro-haze/  | 明/暗主题系统 + SEO/RSS 的成熟实践参考                          |
| **部署 Skill 生态**                     | github-pages / cloudflare / publishing-astro-websites | 以开源技能完成自动部署，省去手敲命令                     |
| *早期玻璃方向探索（已弃用）*            | nikdelvin/liquid-glass · GlassBlog · Daily-Dashboard-HTML | v1.0–v1.1 玻璃材质调研参考；v1.2 起改用报刊版式，仅留作思路记录 |

> 九溪的视觉与交互为**自研实现**，未直接复制上述项目代码；参考仅限架构与思路层面。如有遗漏或需调整署名，请联系维护者补充。

---

## 十一、许可证

九溪采用**双许可**策略，代码与文档 / 内容分别授权：

| 类别           | 许可证                               | 覆盖范围                                                                                                              |
| -------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **代码**       | [Apache License 2.0](./LICENSE)      | `src/`（组件、样式、脚本、配置）、`astro.config.mjs`、`wrangler.toml`、CI 配置等所有源代码与构建配置                  |
| **文档与内容** | [CC BY-NC 4.0](./LICENSE-CONTENT.md) | `README.md`、四份规划与架构文档（`docs/` 下），以及 `src/content/` 下所有原创文字（时间线 / 工具箱 / 读书等策展内容） |
| **第三方**     | 保留各自原有许可证                   | 依赖包见 `package.json`；借鉴的开源项目见「十、致谢与开源声明」                                                       |

要点：

- **代码（Apache-2.0）**：可自由使用、修改、再分发（含商用），须保留版权与许可声明、标注修改。
- **文档与内容（CC BY-NC 4.0）**：**禁止商用（NC）**，转载 / 演绎须署名（BY）并提供许可链接。
- **边界说明**：他人可基于九溪代码搭站（含商用），但不得搬运本仓库的文档与原创内容用于商业用途。
- **第三方**：九溪为自研实现，未复制第三方项目源码；若未来引入第三方代码片段，将保留其原有许可证声明。依赖包（Astro / Tailwind / TypeScript 等）按各自原有许可证，经 `package.json` 体现。

版权人：xiaoyu-hue，2026。

---

## 十二、文档索引

仓库 `docs/` 目录收录完整规划与架构文档，建议按「调研报告 → PRD → 架构文档 → 实施计划」顺序阅读：

- `docs/九溪-调研报告.md`：全网技术 / UI / 数据源 / 开源项目调研结论
- `docs/九溪-PRD.md`：产品需求文档（定位、架构、功能优先级、风险）
- `docs/九溪-架构文档.md`：技术架构与运行原理（模块协作、双站部署、安全与隐私）
- `docs/九溪-实施计划.md`：分阶段实施方案、技术选型理由、部署细节

> 四份文档均为 Markdown，统一存放在 `docs/` 目录，便于集中管理与移动端阅读。

---

_九溪 · 个人综合信息聚集地 · 由开源技术构建_
