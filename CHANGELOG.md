# 九溪 · 变更日志

所有重要变更均记录于此文件。遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式。

## [Unreleased]

### Added
- 动态资讯板块（AI / 热点 / 科技 / 游戏）支持 IndexedDB 跨会话持久化缓存
- RSS 订阅源新增说明：告知用户动态内容无法预取的原因

### Changed
- 移除 `settings.astro` 对 Zod 的依赖，生产 bundle 大幅缩减
- `security.ts` 生产产物从 53KB 降至 1.5KB（下降 97%）
- 总 JS bundle 从 59KB 降至约 10KB
- 构建时间从约 15s 降至约 10s

### Fixed
- 动态资讯在代理不可用时可通过 IndexedDB 展示上次成功获取的内容

---

## [v1.1.0] — 2026-10-10

### Added
- 双站部署流水线（Cloudflare Pages 主站 + GitHub Pages 备用副站）
- SEO 增强：自动生成 sitemap / RSS / Open Graph 分享图
- 4 套可切换主题（晨曦 / 午夜 / 极光 / 樱粉）
- 液态玻璃视觉系统，含 `prefers-reduced-motion` 和 `backdrop-filter` 降级
- 收藏功能（全局 localStorage）
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
