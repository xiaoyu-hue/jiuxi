#!/usr/bin/env node
/**
 * 九溪 · 候选表建表脚本（B-2 持久化）
 *
 * 幂等创建 D1 candidates 表（IF NOT EXISTS，可重复执行无副作用）。
 * 写入侧在 functions/api/feed.ts 的聚合分支（?aggregate=1）写穿完成，
 * 读取侧在 functions/api/candidates.ts。本脚本只负责一次性建表。
 *
 * 所需环境变量（与 scripts/save-history.mjs 一致，缺失则报错退出）：
 *   - CLOUDFLARE_API_TOKEN    Cloudflare API Token（需含 D1 编辑权限）
 *   - CLOUDFLARE_ACCOUNT_ID   Cloudflare 账户 ID
 *   - D1_DATABASE_ID          D1 数据库 ID（即 jiuxi-history，见 wrangler.toml）
 *
 * 用法：
 *   CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=yyy D1_DATABASE_ID=zzz \
 *     node scripts/ensure-candidates.mjs
 *
 * 注意：candidates 表复用 wrangler.toml 里已声明的 DB 绑定（jiuxi-history 库），
 * 因此**不需要**在 Cloudflare 仪表盘额外绑定——wrangler.toml 是 Pages 配置唯一来源，
 * 每次 CI 部署都会用其中的 [[d1_databases]] 覆盖云端绑定。
 */
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

function getD1Config() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.D1_DATABASE_ID;
  if (!apiToken || !accountId || !databaseId) {
    console.error('❌ 缺少环境变量：需 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / D1_DATABASE_ID');
    process.exit(1);
  }
  if (typeof fetch !== 'function') {
    console.error('❌ 当前 Node 版本无全局 fetch（需 Node 18+）');
    process.exit(1);
  }
  return { apiToken, accountId, databaseId };
}

async function d1Query(cfg, sql, params = []) {
  const url = `${CF_API_BASE}/accounts/${cfg.accountId}/d1/database/${cfg.databaseId}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.success !== true) {
    const msg = (body && body.errors && body.errors[0] && body.errors[0].message) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

async function main() {
  const cfg = getD1Config();
  const stmts = [
    `CREATE TABLE IF NOT EXISTS candidates (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       section TEXT NOT NULL,
       title TEXT NOT NULL,
       url TEXT NOT NULL,
       source TEXT,
       source_list TEXT,
       snippet TEXT,
       pub_date TEXT,
       cluster_size INTEGER DEFAULT 1,
       hash TEXT NOT NULL,
       created_at INTEGER NOT NULL,
       updated_at INTEGER NOT NULL
     )`,
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_hash ON candidates(hash)',
    'CREATE INDEX IF NOT EXISTS idx_candidates_section_time ON candidates(section, updated_at DESC)',
  ];
  for (const sql of stmts) {
    await d1Query(cfg, sql);
  }
  console.log('✅ 已确保 candidates 表与索引存在（jiuxi-history 库）');
  console.log('   下一步：部署后访问 /curate 即会自动写穿候选；无需手动灌数据。');
}

main().catch((e) => {
  console.error('❌ 建表失败:', e.message);
  process.exit(1);
});
