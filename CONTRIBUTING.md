# 贡献指南

感谢你对九溪感兴趣！本文档说明如何参与项目维护与扩展。

> **适用对象**：开发者、协作者、想学习 Astro 静态站点的人。
> 如果你是普通用户，直接访问已部署站点即可使用。

---

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/xiaoyu-hue/jiuxi.git
cd jiuxi

# 安装依赖
npm install

# 本地开发预览
npm run dev  # http://localhost:4321

# 生产构建（输出到 dist/）
npm run build

# 单元测试
npm test
```

---

## 内容编辑（手机即可操作）

九溪的策展内容（时间线、工具箱、读书）以 Markdown 文件存放在 `src/content/` 下。

### 修改方式

1. 在 GitHub 网页端打开对应目录（如 `src/content/timeline/`）
2. 找到要编辑的文件，点击铅笔图标
3. 修改 Frontmatter（标题、年份、分类等）或正文
4. 填写提交信息 → Commit changes

### 数据格式

每个板块有对应 schema，详见 `src/content.config.ts`：

- **时间线** (`src/content/timeline/*.md`)：`year / title / category / month* / source* / sourceUrl*`
- **工具箱** (`src/content/tools/*.md`)：`name / url / category* / tagline*`
- **读书** (`src/content/reading/*.md`)：`title / author* / rating*(0–5) / tag* / cover* / link*`

> `*` 表示可选字段。

---

## 代码规范

### 命名

- 组件：PascalCase（如 `GlassCard.astro`）
- 样式：kebab-case（如 `glass.css`）
- 工具函数：camelCase（如 `withBase.ts`）

### 安全

- 所有来自外部 RSS/API 的文本必须经 `escapeHtml()` 转义后再写入 `innerHTML`
- 所有来自外部的链接必须经 `sanitizeUrl()` 校验后再写入 `href`
- 禁止使用 `eval()` / `new Function()` / `dangerouslySetInnerHTML`

### 风格

- 全文件使用 TypeScript，不使用 `var`
- 组件优先使用 Astro 组件（而非手写 HTML 字符串）
- CSS 使用语义化变量（见 `src/styles/themes.css`）

---

## 添加新板块

1. 在 `src/pages/` 下创建新页面（如 `src/pages/films.astro`）
2. 在 `src/content/` 下创建对应数据目录并添加 Markdown 条目
3. 在 `src/content.config.ts` 中注册新 Collection 和 Zod schema
4. 在 `src/components/SiteNav.astro` 中添加导航链接
5. 在首页 `src/pages/index.astro` 的 blocks 中添加卡片

---

## 添加新主题

1. 在 `src/styles/themes.css` 末尾新增 `[data-theme="xxx"]` 规则块，覆盖所有变量令牌
2. 在 `src/lib/theme.ts` 的 `THEMES` 数组中加入新条目 `{ name: 'xxx', label: 'XXX' }`
3. 在 `src/components/ThemeSwitcher.astro` 的 `.theme-dot` 样式中为新主题添加渐变色

---

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat: 新增游戏板块
fix: 修复移动端导航溢出问题
chore: 更新依赖版本
docs: 补充部署说明
```

---

## 许可证

- 代码：Apache License 2.0
- 文档与内容：CC BY-NC 4.0

---

_九溪 · 综合信息聚集地 · 由开源技术构建_
