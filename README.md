# 九溪（JiuXi）

> **综合信息聚集地** —— 以 AI 为主，热点新闻为辅，其它为次辅。
> 本地优先的静态信息站：无需服务器、无需后端，内容由「仓库内文件 + 浏览器端实时抓取」共同驱动。
> 视觉采用**液态玻璃风格（Glassmorphism）+ 多主题**。

| 项目 | 说明 |
|---|---|
| 当前版本 | **v1.0.0**（全站基础版，十板块 + 4 套主题已落地） |
| 技术栈 | Astro 5 · Tailwind CSS 4 · TypeScript（纯静态输出） |
| 托管目标 | [Cloudflare Pages](https://jiuxi-bm1.pages.dev/)（主站）+ [GitHub Pages](https://xiaoyu-hue.github.io/jiuxi/)（备用副站，双站容灾） |
| 许可证 | 代码 Apache-2.0 / 文档与内容 CC BY-NC 4.0 |

---

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
- **实时资讯**：AI / 新闻 / 科技 / 游戏板块在浏览器端实时抓取公开数据源并本地缓存，无需后端。
- **液态玻璃视觉**：统一玻璃材质 + 4 套可切换主题（晨曦 / 午夜 / 极光 / 樱粉），偏好持久化记忆。

---

## 二、特性

- ✅ 十板块信息架构：首页聚合 / AI / 热点新闻 / 科技 / AI 发展时间线 / AI 工具箱 / 游戏娱乐 / 读书推荐 / 设置与数据 / 关于九溪
- ✅ 液态玻璃 UI（毛玻璃材质 + 渐变背景，不支持的浏览器自动降级）
- ✅ 4 套主题自由切换，防首屏闪烁，偏好写入 localStorage
- ✅ 浏览器端实时资讯聚合（Google News RSS + Hacker News），带 CORS 代理兜底与 15 分钟缓存
- ✅ 策展数据用 Content Collections 管理，schema 校验，改一篇 = 改一个文件
- ✅ 系统能力：收藏、外观设置、数据导出 / 导入（JSON）、清空缓存
- ✅ 双站部署：Cloudflare Pages 主 + GitHub Pages 备，push 即上线

---

## 三、技术栈

| 类别 | 选型 | 用途 |
|---|---|---|
| 框架 | **Astro 5** | 内容优先的静态站点生成，零 JS 默认输出 |
| 样式 | **Tailwind CSS 4**（含 `@tailwindcss/vite`） | 原子化样式 + 快速开发 |
| 语言 | **TypeScript** | 类型安全 |
| 运行时 | **Node.js 22+** | 本地构建（部署侧由 CI 提供） |
| 内容 | Astro Content Collections（Zod schema） | 时间线 / 工具箱 / 读书的结构化数据 |
| 数据源 | Google News RSS、Hacker News（Algolia）、allorigins / corsproxy（CORS 兜底） | 动态资讯实时抓取 |
| 部署 | GitHub Actions + Cloudflare Pages / GitHub Pages | 自动构建与双站发布 |

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
│  │  ├─ SiteNav.astro         # 移动优先导航（10 板块）
│  │  ├─ GlassCard.astro       # 玻璃卡片
│  │  ├─ GlassButton.astro     # 玻璃按钮
│  │  └─ FeedSection.astro     # 动态资讯板块组件
│  ├─ layouts/
│  │  └─ BaseLayout.astro      # 液态玻璃外壳 + 防闪烁 + 导航
│  ├─ pages/            # 10 个页面（见下）
│  ├─ content/          # 策展数据（Markdown，手机可改）
│  │  ├─ timeline/  tools/  reading/
│  ├─ styles/           # global / themes(4套) / glass / components
│  └─ lib/              # feeds(抓取) / store(本地数据) / theme(主题)
├─ .github/workflows/deploy.yml   # 双站部署 CI
├─ wrangler.toml                 # Cloudflare Pages 配置
├─ astro.config.mjs              # Astro 配置
├─ package.json                  # 依赖与脚本
├─ README.md                     # 本文件
└─ docs/                         # 规划与架构文档（调研报告 / PRD / 架构文档 / 实施计划）
```

页面清单：`index`(首页) · `ai` · `news` · `tech` · `gaming` · `timeline` · `tools` · `reading` · `settings` · `about`

---

## 七、内容编辑指南（手机也能做）

九溪有两类内容：

1. **策展内容**（AI 发展时间线 / AI 工具箱 / 读书推荐）：改仓库里的数据文件，推送后自动上线。
   手机浏览器登录 GitHub → 打开 `src/content/<板块>/` 下对应文件 → 点铅笔图标编辑 → 提交即可。
2. **动态资讯**（AI / 新闻 / 科技 / 游戏）：由站点在浏览器端实时抓取公开源，无需你维护。

**数据格式**（每个条目是一个 Markdown 文件，Frontmatter 写元数据，正文写简介）：

| 板块 | 文件位置 | 关键字段 |
|---|---|---|
| 时间线 | `src/content/timeline/*.md` | `year` / `title` / `category` / `source` |
| 工具箱 | `src/content/tools/*.md` | `name` / `url` / `category` |
| 读书 | `src/content/reading/*.md` | `title` / `author` / `rating` |

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

> ⚠️ **GitHub Pages 路径提示**：若用「项目站点」（`https://<用户>.github.io/<仓库>/`，无自定义域名），静态资源根路径会偏移。最省心做法是两个站点都绑**自定义域名**（Cloudflare 主站绑域名后，把 `astro.config.mjs` 的 `site` 改为该域名）。若只用 GitHub 项目站点、不绑域名，需把 `astro.config.mjs` 的 `base` 设为 `/<仓库名>/` 再构建。

---

## 九、开发路线图

| 阶段 | 内容 | 状态 |
|---|---|---|
| Phase 0 | 工程初始化 + 玻璃外壳骨架 | ✅ 已完成 |
| Phase 1 | 视觉系统与 4 套主题（晨曦/午夜/极光/樱粉） | ✅ 已完成 |
| Phase 2 | 导航与首页 Bento 聚合 | ✅ 已完成 |
| Phase 3 | 动态资讯板块（AI/新闻/科技/游戏） | ✅ 已完成 |
| Phase 4 | 策展板块（时间线/工具箱/读书） | ✅ 已完成 |
| Phase 5 | 系统板块（设置与数据/关于） | ✅ 已完成 |
| Phase 6 | 双站部署配置 | ✅ 已完成 |

后续可规划（未开工）：更多彩色主题、第一方 Cloudflare 函数 CORS 代理、定时自动追加时间线里程碑、更多策展板块。
详见仓库 `docs/` 内《九溪-PRD.md》《九溪-实施计划.md》《九溪-调研报告.md》《九溪-架构文档.md》。

---

## 十、致谢与开源声明

九溪是一个站在开源巨人肩膀上的个人项目。以下为本项目**实际使用的开源依赖**与**设计 / 架构上借鉴的开源案例**，在此一并致谢。

### 10.1 直接使用的开源依赖

| 项目 | 许可（常见） | 在九溪中的用途 |
|---|---|---|
| [Astro](https://astro.build) | MIT | 静态站点框架，内容集合与构建 |
| [Tailwind CSS](https://tailwindcss.com) | MIT | 原子化样式体系 |
| [@tailwindcss/vite](https://tailwindcss.com) | MIT | Tailwind 与 Vite/Astro 的集成插件 |
| [TypeScript](https://www.typescriptlang.org) | Apache-2.0 | 源码类型系统 |
| Google News RSS | 公开数据服务 | AI / 新闻 / 科技 / 游戏的实时资讯源 |
| [Hacker News (Algolia API)](https://hn.algolia.com/api) | 公开 API | 科技 / AI 实时帖 |
| [allorigins](https://github.com/iamadamdev/allorigins) / corsproxy | MIT / 公开 | CORS 代理兜底，保证跨域抓取可用 |

> 具体依赖版本见 `package.json` 与 `package-lock.json`。部署前建议运行 `npm audit` 复核依赖安全告警。

### 10.2 设计灵感与参考案例（致敬）

以下开源项目在**架构思路、视觉语言或交互范式**上为本项目提供了重要参考，特此致敬：

| 项目 | 链接 | 借鉴点 |
|---|---|---|
| **Glance** | https://github.com/glanceapp/glance | 「widget 化板块」架构范本，启发九溪首页聚合卡片的设计 |
| **NHLOCAL/AiTimeline** | https://github.com/NHLOCAL/AiTimeline | 「单文件数据源 + 自动部署」模式，直接复用为九溪时间线方案 |
| **nikdelvin/liquid-glass** | https://github.com/nikdelvin/liquid-glass | iOS 液态玻璃的 SVG 位移滤镜思路，作为玻璃材质进阶参考 |
| **GlassBlog** | https://github.com/XIYUEKONGLING/GlassBlog | Astro 5 + Tailwind 4 毛玻璃主题，印证技术选型可行性 |
| **Daily-Dashboard-HTML** | https://github.com/aaravriyer193/Daily-Dashboard-HTML | 纯前端玻璃拟态仪表盘，验证「无后端也能做漂亮聚合页」 |
| **Astro Haze 主题** | https://astro.build/themes/details/astro-haze/ | 玻璃 UI 系统 + 明/暗主题 + SEO/RSS 的成熟实践 |
| 部署 Skill 生态 | github-pages / cloudflare / publishing-astro-websites | 让技术伙伴以开源技能完成自动部署，省去手敲命令 |

> 九溪的视觉与交互为**自研实现**，未直接复制上述项目代码；参考仅限架构与思路层面。如有遗漏或需调整署名，请联系维护者补充。

---

## 十一、许可证

九溪采用**双许可**策略，代码与文档 / 内容分别授权：

| 类别 | 许可证 | 覆盖范围 |
|---|---|---|
| **代码** | [Apache License 2.0](./LICENSE) | `src/`（组件、样式、脚本、配置）、`astro.config.mjs`、`wrangler.toml`、CI 配置等所有源代码与构建配置 |
| **文档与内容** | [CC BY-NC 4.0](./LICENSE-CONTENT.md) | `README.md`、四份规划与架构文档（`docs/` 下），以及 `src/content/` 下所有原创文字（时间线 / 工具箱 / 读书等策展内容） |
| **第三方** | 保留各自原有许可证 | 依赖包见 `package.json`；借鉴的开源项目见「十、致谢与开源声明」 |

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

*九溪 · 个人综合信息聚集地 · 由开源技术构建*
