#!/usr/bin/env node
/**
 * 九溪 · Cloudflare D1 REST 客户端（scripts/ 下共用）
 *
 * 由来（2026-10-15 审查 P2）：save-history.mjs 与 ensure-candidates.mjs
 * 原各有一份完全相同的 getD1Config/d1Query 实现——两份拷贝必然漂移；
 * 且 save-history 的 fetch 无超时，D1 接口挂起会让整条构建链无限期卡死。
 * 收敛到本模块，统一行为：
 *
 *   - getD1Config({ required })：
 *       required=true  → 缺环境变量/无 fetch 时报错退出（ensure-candidates 原行为）；
 *       required=false → 返回 null 静默跳过（save-history 原行为，本地开发不受影响）。
 *   - d1Query：默认 15s 超时（AbortSignal.timeout，Node 17.3+），
 *     超时统一映射为中文错误信息，调用方按原有 try/catch 语义处理。
 *   - ensureSchema：幂等执行建表语句（IF NOT EXISTS，可重复执行无副作用）。
 *
 * 凭证只从环境变量读取，不硬编码、不进日志。
 *
 * 用法：
 *   import { getD1Config, d1Query, ensureSchema } from './lib/d1.mjs';
 *   const cfg = getD1Config();                 // 或 getD1Config({ required: true })
 *   if (cfg) await ensureSchema(cfg, stmts);   // 再 await d1Query(cfg, sql, params)
 */
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

/** D1 请求默认超时（毫秒）：覆盖正常路径数倍余量，又不会让构建无限期挂起 */
export const D1_TIMEOUT_MS = 15000;

export function getD1Config({ required = false } = {}) {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.D1_DATABASE_ID;
  if (!apiToken || !accountId || !databaseId) {
    if (required) {
      console.error(
        '❌ 缺少环境变量：需 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / D1_DATABASE_ID',
      );
      process.exit(1);
    }
    return null;
  }
  if (typeof fetch !== 'function') {
    const msg = '当前 Node 版本无全局 fetch（需 Node 18+）';
    if (required) {
      console.error(`❌ ${msg}`);
      process.exit(1);
    }
    console.warn(`  ⚠️  ${msg}，跳过 D1 同步`);
    return null;
  }
  return { apiToken, accountId, databaseId };
}

export async function d1Query(cfg, sql, params = [], timeoutMs = D1_TIMEOUT_MS) {
  const url = `${CF_API_BASE}/accounts/${cfg.accountId}/d1/database/${cfg.databaseId}/query`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    // AbortSignal.timeout 触发时 fetch 抛出 TimeoutError；统一转为可读信息
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      throw new Error(`D1 请求超时（${timeoutMs}ms）`);
    }
    throw e;
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.success !== true) {
    const msg =
      (body && body.errors && body.errors[0] && body.errors[0].message) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

/** 幂等执行建表语句（IF NOT EXISTS，可重复执行无副作用） */
export async function ensureSchema(cfg, stmts) {
  for (const sql of stmts) {
    await d1Query(cfg, sql);
  }
}
