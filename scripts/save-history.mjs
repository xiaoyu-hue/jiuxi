#!/usr/bin/env node
/**
 * 九溪 · 历史快照保存脚本
 *
 * 功能：
 *   1. 将抓取的资讯数据保存为 JSON 历史文件（src/data/history/，原行为不变）
 *   2. 若配置了 Cloudflare D1 环境变量，将快照同步 upsert 到 D1（服务端持久化）
 *
 * 存储位置：
 *   - 本地文件：src/data/history/{section}-{YYYY-MM-DD}.json
 *   - D1 表 snapshots：
 *       id TEXT PRIMARY KEY        -- {section}-{date}，天然去重（同一天重复构建即覆盖）
 *       section TEXT NOT NULL      -- 板块名（ai/news/tech/gaming）
 *       date TEXT NOT NULL         -- YYYY-MM-DD（UTC）
 *       timestamp INTEGER NOT NULL-- 写入时间（毫秒）
 *       item_count INTEGER NOT NULL
 *       payload TEXT NOT NULL      -- 完整快照 JSON
 *
 * D1 写入所需环境变量（任一缺失则自动跳过 D1，仅保存本地文件，不影响主流程）：
 *   - CLOUDFLARE_API_TOKEN    Cloudflare API Token（需含 D1 编辑权限）
 *   - CLOUDFLARE_ACCOUNT_ID   Cloudflare 账户 ID
 *   - D1_DATABASE_ID          D1 数据库 ID
 *
 * 用法：
 *   node scripts/save-history.mjs            # 默认：stddin 读取 JSON（fetch-feeds.mjs 调用方式）
 *   node scripts/save-history.mjs list       # 列出本地历史
 *   node scripts/save-history.mjs cleanup 30 # 清理 30 天前的本地文件
 */
import {
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
  unlinkSync,
  readFileSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getD1Config, d1Query, ensureSchema } from './lib/d1.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const HISTORY_DIR = resolve(ROOT, 'src/data/history');

// ── 输入校验（2026-10-15 审查 P2）─────────────────────────────────
// section/date 会直接拼进快照文件名。stdin JSON 的键来自抓取产物，
// 但损坏或恶意输入若含 "../"、"/" 即可写到 HISTORY_DIR 之外（路径穿越）。
// 两道白名单：板块名只允许小写字母开头的 [a-z0-9-]（≤32 字符），
// 日期只允许 YYYY-MM-DD（内部生成，此处为纵深防御）。
const SECTION_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidSection(section) {
  return SECTION_PATTERN.test(section);
}

/**
 * 保存历史快照
 * @param {string} section - 板块名称（须过 SECTION_PATTERN 白名单）
 * @param {Array} items - 资讯条目列表
 * @param {string} date - 日期字符串 YYYY-MM-DD（UTC）
 * @param {string} [dir] - 历史目录（默认 src/data/history；测试可传临时目录）
 */
export function saveSnapshot(section, items, date, dir = HISTORY_DIR) {
  if (!isValidSection(section)) {
    console.warn(`  ⚠️  非法板块名「${section}」，跳过保存（白名单校验，防止路径穿越）`);
    return null;
  }
  if (!DATE_PATTERN.test(date)) {
    console.warn(`  ⚠️  非法日期「${date}」，跳过保存（白名单校验）`);
    return null;
  }
  if (!items || items.length === 0) {
    console.log(`  ⚠️  ${section} 无数据，跳过保存`);
    return null;
  }

  // 确保历史目录存在
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // 构建快照数据
  const snapshot = {
    id: `${section}-${date}`,
    section,
    date,
    timestamp: Date.now(),
    itemCount: items.length,
    items,
  };

  // 保存为 JSON 文件
  const filename = `${section}-${date}.json`;
  const filepath = resolve(dir, filename);
  writeFileSync(filepath, JSON.stringify(snapshot, null, 2), 'utf8');

  console.log(`  ✅ 已保存 ${section} 历史快照 (${items.length} 条) → ${filepath}`);
  return snapshot;
}

/**
 * 清理过期数据（保留最近 N 天）
 * @param {number} retentionDays - 保留天数
 * @param {string} [dir] - 历史目录（默认 src/data/history；测试可传临时目录）
 */
export function cleanupExpired(retentionDays = 30, dir = HISTORY_DIR) {
  if (!existsSync(dir)) {
    return;
  }

  // 时区统一 UTC（2026-10-15 审查 P2）：
  // 旧实现用「本地时间 now 减 N 个日历日」算 cutoff、用 UTC 解析文件名日期，
  // 两条路径时区基准不一致。实测澄清：在 UTC+8 这类固定偏移时区两者
  // epoch 完全等价（本地减 N 天恰好 = N×24h），差异出现在有夏令时的
  // 时区（本地 N 个日历日 ≠ N×24h，cutoff 偏移 ±1h，边界文件可能
  // 该删未删/误删）。改为纯 epoch 毫秒比较后无条件免疫时区与 DST，
  // 且语义更直白：文件名日期按 UTC 午夜解析，cutoff = 现在 − N×24h。
  const cutoffTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const files = readdirSync(dir);
  let deletedCount = 0;

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    // 从文件名提取日期
    const match = file.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match) continue;

    const fileTimestamp = Date.parse(match[1]); // UTC 午夜；无效日期返回 NaN
    if (Number.isNaN(fileTimestamp)) continue;

    if (fileTimestamp < cutoffTimestamp) {
      const filepath = resolve(dir, file);
      // 同步删除（修复：旧版用动态 import 异步删除，计数日志永远不打印）
      unlinkSync(filepath);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`  🗑️  已清理 ${deletedCount} 个过期历史文件`);
  }
}

/**
 * 列出所有历史快照
 */
async function listHistory() {
  if (!existsSync(HISTORY_DIR)) {
    console.log('  暂无历史记录');
    return [];
  }

  const files = readdirSync(HISTORY_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse();
  const snapshots = [];

  for (const file of files) {
    try {
      const content = readFileSync(resolve(HISTORY_DIR, file), 'utf8');
      const snapshot = JSON.parse(content);
      snapshots.push(snapshot);
    } catch {
      console.warn(`  ⚠️  解析失败: ${file}`);
    }
  }

  return snapshots;
}

// ── D1 云端同步（可选能力）───────────────────────────────────────
// 设计原则：
//   1. env 不齐全 → 静默跳过，行为与旧版完全一致（本地开发不受影响）；
//   2. 任何失败（网络/权限/超限/超时）→ 只警告不抛错，绝不阻断 fetch-feeds 主流程；
//   3. 凭证只从环境变量读取，不硬编码、不进日志。
// D1 客户端与 ensure-candidates.mjs 共用 scripts/lib/d1.mjs（2026-10-15 审查 P2：
// 原两份相同拷贝必然漂移，且旧版 fetch 无超时会让构建无限期挂起）。

/** snapshots 表幂等建表语句（每次运行执行一次，IF NOT EXISTS 无副作用） */
const SNAPSHOT_STMTS = [
  `CREATE TABLE IF NOT EXISTS snapshots (
     id TEXT PRIMARY KEY,
     section TEXT NOT NULL,
     date TEXT NOT NULL,
     timestamp INTEGER NOT NULL,
     item_count INTEGER NOT NULL,
     payload TEXT NOT NULL
   )`,
  'CREATE INDEX IF NOT EXISTS idx_snapshots_date ON snapshots(date)',
];

/**
 * 将本批次快照 upsert 到 D1（一条多行 INSERT OR REPLACE，4 个板块一次请求）
 * @param {Array<object>} snapshots - saveSnapshot 返回的快照对象数组
 */
async function syncToD1(snapshots) {
  if (!snapshots.length) return;

  const cfg = getD1Config();
  if (!cfg) {
    console.log(
      '  ℹ️  未配置 D1 环境变量（CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / D1_DATABASE_ID），跳过云端同步',
    );
    return;
  }

  try {
    await ensureSchema(cfg, SNAPSHOT_STMTS);

    const placeholders = [];
    const params = [];
    for (const s of snapshots) {
      placeholders.push('(?, ?, ?, ?, ?, ?)');
      params.push(s.id, s.section, s.date, s.timestamp, s.itemCount, JSON.stringify(s));
    }
    const sql =
      'INSERT OR REPLACE INTO snapshots (id, section, date, timestamp, item_count, payload) VALUES ' +
      placeholders.join(', ');

    await d1Query(cfg, sql, params);
    console.log(
      `  ☁️  已同步 ${snapshots.length} 个板块快照到 D1（${snapshots.map((s) => s.section).join(' / ')}）`,
    );
  } catch (e) {
    // 常见失败：token 缺 D1 权限（401/403）、超额（10000/100001 类错误）。均不阻断主流程。
    console.warn(`  ⚠️  D1 同步失败（不影响本地保存）: ${e.message}`);
  }
}

// ── 主入口 ─────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // 支持子命令
  if (command === 'list') {
    const snapshots = await listHistory();
    console.log(`\n共 ${snapshots.length} 条历史记录：\n`);
    snapshots.forEach((s) => {
      console.log(`  ${s.date} | ${s.section} | ${s.itemCount} 条`);
    });
    return;
  }

  if (command === 'cleanup') {
    const days = parseInt(args[1]) || 30;
    cleanupExpired(days);
    return;
  }

  // 默认模式：从标准输入读取 JSON 并保存
  console.log('[九溪] 等待历史数据输入...');
  console.log(
    '  提示：通过管道传入 JSON 数据，例如: cat feed.json | node scripts/save-history.mjs\n',
  );

  let inputData = '';
  process.stdin.setEncoding('utf8');

  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  if (!inputData.trim()) {
    console.error('  ❌ 未接收到数据');
    process.exit(1);
  }

  try {
    const data = JSON.parse(inputData);
    const date = data.generatedAt
      ? new Date(data.generatedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    console.log(`\n[九溪] 正在保存 ${date} 的历史快照...\n`);

    const savedSnapshots = [];
    for (const [section, items] of Object.entries(data.sections || {})) {
      if (Array.isArray(items) && items.length > 0) {
        const snapshot = saveSnapshot(section, items, date);
        if (snapshot) savedSnapshots.push(snapshot);
      }
    }

    console.log(`\n✅ 共保存 ${savedSnapshots.length} 个板块的历史快照`);

    // 云端同步（可选，失败不阻断）
    await syncToD1(savedSnapshots);

    // 自动清理过期数据
    cleanupExpired(30);
  } catch (e) {
    console.error('  ❌ 数据解析失败:', e.message);
    process.exit(1);
  }
}

// 仅在作为 CLI 入口（node scripts/save-history.mjs）执行；被测试 import 时不触发主流程
// （与 scripts/fetch-feeds.mjs 同一模式，2026-10-15 审查 P2 补齐：
//  旧版无条件执行 main().catch()，被 import 时会立即读 stdin，无法单测。）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(console.error);
}
