# 九溪（JiuXi）

> 综合信息聚集地 —— **AI 为主，热点新闻为辅，其它为次辅**。
> 本地优先的静态信息站：无需服务器、无需后端，内容由仓库内文件 + 浏览器端实时抓取共同驱动。

- 当前版本：**Phase 0 · 工程初始化（玻璃外壳骨架）**
- 技术栈：**Astro 5** + **Tailwind CSS 4**（纯静态输出）
- 托管目标：**Cloudflare Pages（主站）** + **GitHub Pages（备用副站）**

---

## 一、本地运行（看效果）

需要本机有 Node.js 22+（你新年买电脑后装即可；当前由技术伙伴在沙箱构建）。

```bash
npm install      # 安装依赖（首次）
npm run dev      # 本地开发预览，终端会给出 http://localhost:4321
npm run build    # 生成静态站点到 dist/（部署用）
npm run preview  # 本地预览构建产物
```

> 手机没电脑期间，想随时看效果：让技术伙伴起本地预览，或在部署上线后用手机浏览器直接访问公网地址。

---

## 二、项目结构

```
jiuxi/
├─ src/
│  ├─ components/                # 可复用组件
│  │  ├─ BaseLayout 相关：ThemeSwitcher / SiteNav / GlassCard / GlassButton / FeedSection
│  ├─ layouts/BaseLayout.astro   # 液态玻璃外壳 + 防闪烁 + 导航
│  ├─ pages/                     # 10 个页面：首页/AI/新闻/科技/游戏/时间线/工具箱/读书/设置/关于
│  ├─ content/                   # 策展数据（Markdown，手机可改）
│  │  ├─ timeline/  tools/  reading/
│  ├─ styles/                    # global / themes(4套) / glass / components
│  └─ lib/                       # feeds（抓取）/ store（本地数据）/ theme（主题）
├─ .github/workflows/deploy.yml  # 双站部署 CI
├─ wrangler.toml                 # Cloudflare Pages 配置
├─ astro.config.mjs              # Astro 配置
├─ package.json                  # 依赖与脚本
└─ README.md
```

---

## 三、如何编辑内容（手机也能做）

九溪有两类内容：

1. **策展内容**（AI 发展时间线 / AI 工具箱 / 读书推荐）：改仓库里的数据文件，推送后自动上线。手机浏览器登录 GitHub → 打开文件 → 点铅笔图标编辑 → 提交即可。
2. **动态资讯**（AI / 新闻 / 科技 / 游戏）：由站点在浏览器端实时抓取公开源，无需你维护。

> 数据格式：每个条目是一个 Markdown 文件，Frontmatter 写元数据（如时间线 `year`/`title`/`category`/`source`，工具 `name`/`url`/`category`，读书 `title`/`author`/`rating`），正文写简介。改一处 = 改一个文件，推送后自动上线。

---

## 四、部署（推送到 GitHub 后自动上线）

已确认采用**双站部署**，由 `.github/workflows/deploy.yml`（push 即构建并双发）驱动：

- **主站 · Cloudflare Pages**：无限带宽、全球 CDN。需在仓库 `Settings → Secrets` 添加 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`（最小权限：仅 Pages Edit）。
- **备用副站 · GitHub Pages**：仓库 `Settings → Pages → Source` 选择 **GitHub Actions** 即可，无需密钥。

两步在 CI 中相互独立，任一失败不影响另一（缺 Cloudflare 密钥时主站步骤自动跳过，不阻塞副站）。你只需 `git push` 到 `main`，无需敲命令。

> ⚠️ **GitHub Pages 路径提示**：若用「项目站点」（`https://<用户>.github.io/<仓库>/`，无自定义域名），静态资源的根路径会偏移。最省心的做法是两个站点都绑**自定义域名**（Cloudflare 主站绑域名后 `astro.config.mjs` 的 `site` 改为该域名即可）。若只用 GitHub 项目站点、不绑域名，需把 `astro.config.mjs` 的 `base` 设为 `/<仓库名>/` 再构建。

---

## 五、开发路线图（逐阶段交付）

| 阶段 | 内容 | 状态 |
|---|---|---|
| Phase 0 | 工程初始化 + 玻璃外壳骨架 | ✅ 已完成 |
| Phase 1 | 视觉系统与 4 套主题（晨曦/午夜/极光/樱粉） | ✅ 已完成 |
| Phase 2 | 导航与首页 Bento 聚合 | ✅ 已完成 |
| Phase 3 | 动态资讯板块（AI/新闻/科技/游戏） | ✅ 已完成 |
| Phase 4 | 策展板块（时间线/工具箱/读书） | ✅ 已完成 |
| Phase 5 | 系统板块（设置与数据/关于） | ✅ 已完成 |
| Phase 6 | 部署上线（双站配置） | ✅ 已完成 |

详见仓库内《九溪-实施计划.md》《九溪-PRD.md》《九溪-调研报告.md》。
