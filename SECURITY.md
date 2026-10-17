# 安全策略（Security Policy）

九溪（jiuxi）是一个个人向的纯静态信息站（Cloudflare Pages 托管，无云端后端）。
如果你发现了安全漏洞，请按下面的方式**负责任地**报告——我们会优先修复，并尽量不在修复前公开细节。

## 支持的版本

| 版本                       | 状态                              |
| -------------------------- | --------------------------------- |
| 最新 `main` / 最新 Release | ✅ 安全修复目标                   |
| 更早的版本                 | ⚠️ 不再单独打补丁，建议升级到最新 |

## 如何报告漏洞

**首选渠道：GitHub 私有漏洞报告（Private Vulnerability Reporting）**

1. 打开仓库 `https://github.com/xiaoyu-hue/jiuxi` 的 **Security → Report a vulnerability**（需在仓库
   Settings → Security 中开启「Private vulnerability reporting」）。
2. 直接在 GitHub 内提交，信息仅维护者可见，**不要开公开 Issue**。

**备选渠道：邮件**

- 若私有漏洞报告未开启，可发邮件给维护者（邮箱见仓库 Maintainers/About 最新说明）。
- 邮件标题请加前缀 `[SECURITY]`。

## 报告时请包含

- 漏洞类型与受影响文件/组件（如 `src/lib/feeds.ts`、`src/components/FeedSection.astro` 等前端聚簇/渲染逻辑，或 `scripts/fetch-feeds.mjs` 构建期抓取脚本）；
- 触发条件与复现步骤（最好附最小 PoC）；
- 影响范围与严重程度判断；
- 你的联系方式（便于回执与致谢）。

## 我们的处理流程

| 阶段                   | 目标时效                                |
| ---------------------- | --------------------------------------- |
| 确认收到报告           | 7 天内                                  |
| 初步评估严重度与可行性 | 收到后 14 天内                          |
| 修复并发布             | 按严重度排期；高危（high/critical）优先 |

- 修复发布后，经你同意我们会在致谢中署名（匿名亦可）。
- 我们不鼓励、也不参与任何针对线上站点的未授权扫描或拒绝服务测试；
  本项目的 CI 已内置 ZAP / Nuclei / Trivy / osv-scanner 等扫描，欢迎在合规前提下协助复核。

## 范围说明

以下行为**不在**本策略承诺的修复范围内（属设计取舍或个人项目结构性限制）：

- 仅影响「单人维护」属性的 Scorecard 扣分项（如 Branch-Protection / Contributors 等需多人协作的项）；
- 依赖上游服务（RSS 源、Cloudflare 平台）自身的安全问题，我们会跟进升级但无法单方面控制。

---

> 本文件用于满足 OpenSSF Scorecard 的 `Security-Policy` 检查。安全门禁详情见
> `README.md`「致谢与开源声明」及 `.github/workflows/security.yml`。
