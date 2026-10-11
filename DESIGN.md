# 九溪 · 设计系统（DESIGN.md）

> 本文件是九溪视觉体系的**唯一上下文**。任何 UI/样式改动都必须遵守此处约定的令牌、排版、配色与动效分寸，避免回到"玻璃卡片 + 通用渐变"的 AI 模板味。
> 视觉方向：**报刊版式（editorial / newspaper）**——纸感底、墨色字、单一强调色、衬线标题、栏目编号、来源/时间标注、克制微动效。

---

## 1. 设计原则（去 AI 味五条）

1. **版式逻辑 > 组件拼贴**：用栏宽、编号、分隔线组织内容，不用玻璃拟态卡片。
2. **色彩克制**：全站「中性纸/墨 + 单一强调色」，禁用紫蓝多色渐变与大面积 `backdrop-filter` 玻璃。
3. **字体即设计**：中文衬线（标题/正文）自托管，认真处理行高/字距/避头尾；系统字体作回退。
4. **网格与留白纪律**：正文阅读宽度约 `68ch`（≈34 汉字），固定间距刻度，拒绝自动堆叠的卡片瀑布。
5. **编辑策展意图**：卡片带「编号 / 来源 / 时间」标注，动效只做必要过渡，零装饰动画。

---

## 2. 设计令牌（CSS 变量）

定义位置：`src/styles/global.css`（`:root` 共享令牌）+ `src/styles/themes.css`（按 `data-theme` 覆盖颜色）。

| 令牌            | 含义              | 取值约定                                               |
| --------------- | ----------------- | ------------------------------------------------------ |
| `--bg`          | 页面底色（纸/墨） | 明主题暖白 `#faf7f2`；暗主题深墨                       |
| `--surface`     | 面板/卡片表面     | 略亮于 `--bg` 的实色，**非玻璃**                       |
| `--text-strong` | 主文字（墨）      |                                                        |
| `--text-muted`  | 次要文字          |                                                        |
| `--rule`        | 发丝分隔线        | `color-mix(in oklch, --text-strong 12%, transparent)`  |
| `--accent`      | 唯一强调色        | 每主题一个：朱红/琥珀/玉色/茜红                        |
| `--accent-soft` | 强调色淡底        |                                                        |
| `--radius`      | 圆角              | 编辑风取小值 `12px`（非 24px 气泡）                    |
| `--shadow-1/2`  | 分层细阴影        | 替代厚重玻璃阴影                                       |
| `--font-serif`  | 衬线（标题/正文） | `'Noto Serif SC', 'Songti SC', 'STSong', serif`        |
| `--font-sans`   | 无衬线（UI）      | `'Noto Sans SC', system-ui, 'PingFang SC', sans-serif` |
| `--measure`     | 阅读宽度          | `68ch`                                                 |

> 字体经 `@fontsource/noto-serif-sc`、`@fontsource/noto-sans-sc` 的 `chinese-simplified-*` 子集**自托管**，unicode-range 懒加载，不爆首屏；`font-display: swap` + 系统字体回退。

---

## 3. 配色（4 套主题，单强调色）

| 主题                  | 底     | 墨        | 强调色         | 气质   |
| --------------------- | ------ | --------- | -------------- | ------ |
| `chenxi` 晨曦（明）   | 暖白纸 | `#211d18` | 朱红 `#b3341f` | 报纸红 |
| `midnight` 午夜（暗） | 深暖墨 | `#ece6da` | 琥珀 `#d8923c` | 夜读   |
| `aurora` 极光（暗）   | 青墨   | `#e3efea` | 玉色 `#4fae8e` | 静谧   |
| `sakura` 樱粉（明）   | 暖粉纸 | `#3a2329` | 茜红 `#b14a63` | 柔和   |

新增主题 = 复制一段 `[data-theme]` 改颜色令牌，组件零改动（见 `src/lib/theme.ts` 的 `THEMES`）。

---

## 4. 排版规范

- 正文 `line-height: 1.7`（CJK 安全值）；标题 `1.2–1.35`。
- 中文正文 `letter-spacing: 0`；仅小标签 `+0.12–0.18em`、标题 `+0.02em`。
- 标题用 `--font-serif`；UI/元信息用 `--font-sans`。
- 卡片结构：`栏目编号 / 来源`（kicker，强调色）→ 衬线标题 → 时间（meta）→ 摘要（snippet）。

---

## 5. 质感技法（零依赖）

- **纸纹噪点**：`body::before` 固定层叠 SVG `feTurbulence` 噪点，`mix-blend-mode: overlay`，`opacity: .05`，`pointer-events:none`。
- **分层细阴影**：`box-shadow: 0 1px 2px rgba(..,.05), 0 6px 20px rgba(..,.06)`（令牌 `--shadow-1`）。
- **发丝分隔线**：卡片顶部 `1px solid var(--rule)`，替代边框气泡。

---

## 6. 动效分寸（克制）

- 仅四类：滚动渐显、卡片流增删过渡、平滑滚动、页面间淡入（astro:transitions）。
- **全部**加 `prefers-reduced-motion` + 应用级 `.reduce-motion` 守卫；内容默认可见（`opacity:1`），动效只作增强。
- 禁用：`tsparticles` 粒子、AOS 预设、花哨悬浮发光、大色块渐变。
- 实现：`src/lib/motion.ts`（`initMotion()`），BaseLayout 在 `DOMContentLoaded` 与 `astro:after-swap` 调用。

---

## 7. 约束（不可破）

- 纯 vanilla JS 渲染，禁用 React/Vue 组件库。
- 双站部署（Cloudflare Pages / GitHub Pages），产物须纯静态。
- 部署站严格 CSP（`script-src 'self' 'unsafe-inline'`），第三方库须 npm 打包进 bundle，不改 `_headers`。
- 零构建 `file://` 双击版：动效层与构建解耦、内容默认可见、优雅降级。
- XSS：所有外部文本经 `textContent` 写入；链接经 `sanitizeUrl` 校验。
