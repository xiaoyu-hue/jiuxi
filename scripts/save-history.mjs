#!/usr/bin/env node
/**
 * 九溪 · 历史快照保存脚本
 *
 * 功能：将抓取的资讯数据保存为 JSON 历史文件
 * 存储位置：src/data/history/ 目录
 * 文件格式：{section}-{YYYY-MM-DD}.json
 *
 * 用法：node scripts/save-history.mjs [日期] [板块]
 */
import { writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const HISTORY_DIR = resolve(ROOT, 'src/data/history');

/**
 * 保存历史快照
 * @param {string} section - 板块名称 (ai/news/tech/gaming)
 * @param {Array} items - 资讯条目列表
 * @param {string} date - 日期字符串 YYYY-MM-DD
 */
function saveSnapshot(section, items, date) {
  if (!items || items.length === 0) {
    console.log(`  ⚠️  ${section} 无数据，跳过保存`);
    return;
  }

  // 确保历史目录存在
  if (!existsSync(HISTORY_DIR)) {
    mkdirSync(HISTORY_DIR, { recursive: true });
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
  const filepath = resolve(HISTORY_DIR, filename);
  writeFileSync(filepath, JSON.stringify(snapshot, null, 2), 'utf8');

  console.log(`  ✅ 已保存 ${section} 历史快照 (${items.length} 条) → ${filepath}`);
}

/**
 * 清理过期数据（保留最近 N 天）
 * @param {number} retentionDays - 保留天数
 */
function cleanupExpired(retentionDays = 30) {
  if (!existsSync(HISTORY_DIR)) {
    return;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffTimestamp = cutoffDate.getTime();

  const files = readdirSync(HISTORY_DIR);
  let deletedCount = 0;

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    // 从文件名提取日期
    const match = file.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match) continue;

    const fileDate = new Date(match[1]);
    if (fileDate.getTime() < cutoffTimestamp) {
      const filepath = resolve(HISTORY_DIR, file);
      // 在 Node.js 中删除文件
      import('node:fs').then(({ unlinkSync }) => {
        unlinkSync(filepath);
        deletedCount++;
      });
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

  const files = readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json')).sort().reverse();
  const snapshots = [];

  for (const file of files) {
    try {
      const content = await import('node:fs').then(m => m.readFileSync(resolve(HISTORY_DIR, file), 'utf8'));
      const snapshot = JSON.parse(content);
      snapshots.push(snapshot);
    } catch {
      console.warn(`  ⚠️  解析失败: ${file}`);
    }
  }

  return snapshots;
}

// ── 主入口 ─────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // 支持子命令
  if (command === 'list') {
    const snapshots = await listHistory();
    console.log(`\n共 ${snapshots.length} 条历史记录：\n`);
    snapshots.forEach(s => {
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
  console.log('  提示：通过管道传入 JSON 数据，例如: cat feed.json | node scripts/save-history.mjs\n');

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
    const date = data.generatedAt ? new Date(data.generatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    console.log(`\n[九溪] 正在保存 ${date} 的历史快照...\n`);

    let savedCount = 0;
    for (const [section, items] of Object.entries(data.sections || {})) {
      if (Array.isArray(items) && items.length > 0) {
        saveSnapshot(section, items, date);
        savedCount++;
      }
    }

    console.log(`\n✅ 共保存 ${savedCount} 个板块的历史快照`);

    // 自动清理过期数据
    cleanupExpired(30);

  } catch (e) {
    console.error('  ❌ 数据解析失败:', e.message);
    process.exit(1);
  }
}

main().catch(console.error);
