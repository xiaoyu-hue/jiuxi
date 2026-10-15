# 候选持久化（B-2）部署说明

> 内部运维文档（非公开页面）。候选流聚簇去重后存入 Cloudflare D1，跨会话留痕、离线可看，是后续「自动流」的前置。

## 涉及改动

| 文件                            | 作用                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `functions/api/feed.ts`         | 聚合端点（`?aggregate=1`）新增 `section` 参数，并在返回前把聚簇结果**写穿**进 `candidates` 表（best-effort，失败不影响响应） |
| `functions/api/candidates.ts`   | 新增读端点 `/api/candidates?section=ai`，从 D1 读候选；缺绑定/为空时返回空，前端自动回退实时聚合                             |
| `src/pages/curate.astro`        | 候选策展台优先读 `/api/candidates`，无数据时回退实时聚合                                                                     |
| `src/lib/feeds.ts`              | 聚合请求带 `section` 参数                                                                                                    |
| `scripts/ensure-candidates.mjs` | 一次性建表脚本（幂等）                                                                                                       |

## 你需要做的两步（一次性）

代码已就绪、CI 也会正常构建（D1 缺失时优雅降级）。但要让候选**真正落库**，需要你在本机执行：

### 1. 建表（一次性）

```bash
CLOUDFLARE_API_TOKEN=xxxx \
CLOUDFLARE_ACCOUNT_ID=yyyy \
D1_DATABASE_ID=1df7e200-be8c-4e61-bce0-c9bd72705fc7 \
node scripts/ensure-candidates.mjs
```

- 三个环境变量与 `scripts/save-history.mjs` 完全一致（即你已有的 Cloudflare 凭证）。
- `D1_DATABASE_ID` 就是 `jiuxi-history` 库，见 `wrangler.toml` 的 `database_id`。
- 表用 `IF NOT EXISTS`，可重复执行，无副作用。

### 2. 确认部署

`functions/` 目录由 Cloudflare Pages 自动随站点部署（与现有 `feed.ts`/`history.ts` 同机制）。
**无需**在仪表盘额外绑定 D1——`wrangler.toml` 里的 `[[d1_databases]]`（binding = DB）是 Pages 配置唯一来源，CI 每次部署都会同步到 production / preview。

## 验证落库是否生效

部署后打开 `/curate`（候选策展台），再查库：

```bash
CLOUDFLARE_API_TOKEN=xxxx CLOUDFLARE_ACCOUNT_ID=yyyy D1_DATABASE_ID=1df7e200-... \
npx wrangler d1 execute jiuxi-history --remote --command "SELECT section, count(*) FROM candidates GROUP BY section"
```

能看到各板块行数即说明写穿成功。

## 设计要点

- **不依赖 Cron**：访问 `/curate` 即触发聚合端点的写穿，候选自然落库；无需额外定时任务，部署更简单。
- **优雅降级**：D1 绑定缺失 / 某板块 0 行 / 查询异常时，前端一律回退实时聚合，绝不会白屏（无 Functions 的环境中也只走实时聚簇）。
- **去重**：按「归一化标题 + section」的 djb2 哈希建唯一索引，同一事件跨次访问只 upsert 不翻倍；每板块保留最新 250 条，自动裁剪。
- **Cron 刷新（可选，未启用）**：若希望无人访问时也定时刷新候选，可后续加一个 Cloudflare Worker 定时调用聚合逻辑；当前实现不需要。
