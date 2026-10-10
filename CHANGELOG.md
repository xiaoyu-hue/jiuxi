# 九溪 · 变更日志

所有重要变更均记录于此文件。遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式。

## [Unreleased]

- 暂无未发布的功能性变更；以下为本轮代码质量与安全修复的汇总。

### Changed

- 修复 `fetch-feeds.mjs` 构建期注入 JSON 未转义 `</script>` 的存储型 XSS 风险（标题含 `</script>` 会提前闭合脚本块）。
- 清理未引用的死代码 `store.ts` / `store.test.ts`，统一数据模块为 `settings.ts` / `favorites.ts` / `db.ts`。
- 安全关键路径（`escapeHtml` / `renderItems` / `parseRss` / `theme.ts` / `db.ts`）补充单元测试；引入 ESLint + Prettier 并接入 CI。
- 统一 CORS 代理清单并同步 CSP `connect-src`；缓存时长文档对齐代码（30 分钟）。
- `sanitizeUrl` 拒绝协议相对 URL（`//evil.com`）与控制字符；资讯链接不再做多余 HTML 实体解码。

### Fixed

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
