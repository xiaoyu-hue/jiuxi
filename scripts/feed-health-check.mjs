#!/usr/bin/env node
/**
 * 九溪 · 资讯源健康检查（P2，2026-10-18）
 *
 * 背景：feeds.json 里 310 个源的失效信号原先只留在每次构建的 CI 日志里，
 * 会过期、没人看——而中文媒体官方 RSS 在集体消亡，死链只会越攒越多。
 * 本脚本独立遍历全部源做存活探测，把「源失效」变成每周可见的固定信号。
 *
 * 定位：只报告、不阻断——探测失败不影响任何构建与部署（退出码恒 0，
 * 除非 feeds.json 本身读不出来）。
 *
 * 用法：
 *   node scripts/feed-health-check.mjs
 *   - 人类可读全量报告打印到 stdout（CI 日志里可检索）；
 *   - 紧凑摘要（计数 + 失败清单 + 最慢 10 源）追加到 $GITHUB_STEP_SUMMARY。
 *
 * 判定口径（与 fetch-feeds.mjs 构建期健康摘要对齐，阈值略宽以减少误报）：
 *   OK    -L 跟随重定向后 HTTP 2xx 且响应体 ≥ 200 字节
 *   FAIL  非 2xx / 超时 / 连接失败 / 响应体 < 200 字节（疑似空壳频道或反爬挑战页）
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FEEDS = resolve(ROOT, 'src/data/feeds.json');

const TIMEOUT = 8; // 比构建期的 5s 略宽：健康检查不赶时间，减少把慢源误判为死源
const CONCURRENCY = 10; // 与 fetch-feeds.mjs 一致
const MIN_BYTES = 200; // RSS/Atom 再小也有几百字节；低于此值视为空壳或挑战页
const FAIL_WARN_RATIO = 0.2; // 与 fetch-feeds.mjs 的 20% 告警口径一致

/** 探测单个源：返回 { ok, httpCode, bytes, seconds, reason? } */
async function probe(url) {
  try {
    const { stdout } = await execFileAsync(
      'curl',
      [
        '-s',
        '--max-time',
        String(TIMEOUT),
        '-L',
        '-H',
        'User-Agent: Jiuxi/1.0',
        '--globoff',
        '-o',
        '/dev/null',
        '-w',
        '%{http_code} %{size_download} %{time_total}',
        url,
      ],
      { encoding: 'utf8', timeout: (TIMEOUT + 2) * 1000 },
    );
    const [code, size, time] = stdout.trim().split(/\s+/);
    const httpCode = Number(code) || 0;
    const bytes = Number(size) || 0;
    const seconds = Number(time) || 0;
    if (httpCode >= 200 && httpCode < 300 && bytes >= MIN_BYTES) {
      return { ok: true, httpCode, bytes, seconds };
    }
    let reason;
    if (httpCode === 0) reason = '连接失败/超时';
    else if (bytes < MIN_BYTES) reason = `响应过小（${bytes}B，疑似空壳或反爬挑战页）`;
    else reason = `HTTP ${httpCode}`;
    return { ok: false, httpCode, bytes, seconds, reason };
  } catch {
    return { ok: false, httpCode: 0, bytes: 0, seconds: 0, reason: '连接失败/超时' };
  }
}

/** 简易并发池：与 fetch-feeds.mjs 相同的「最多 N 个在飞」模式 */
async function runPool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

function main() {
  let feeds;
  try {
    feeds = JSON.parse(readFileSync(FEEDS, 'utf8'));
  } catch (err) {
    console.error(`❌ 无法读取 ${FEEDS}：${err.message}`);
    process.exit(1); // 配置文件读不出来是脚本自身故障，必须显式失败
  }

  // 展平：每个源带上所属板块，便于按板块归因
  const targets = [];
  for (const [section, sources] of Object.entries(feeds.sections || {})) {
    for (const s of sources || []) {
      if (s && s.url) targets.push({ section, label: s.label || s.url, url: s.url });
    }
  }
  console.log(
    `[九溪] 开始探测 ${targets.length} 个资讯源（并发 ${CONCURRENCY}，单源超时 ${TIMEOUT}s）…`,
  );

  return runPool(
    targets.map((t) => async () => ({ ...t, ...(await probe(t.url)) })),
    CONCURRENCY,
  ).then((results) => {
    const failed = results.filter((r) => !r.ok);
    const okCount = results.length - failed.length;
    const failRate = results.length ? failed.length / results.length : 0;
    const today = new Date().toISOString().slice(0, 10);

    // ── 全量报告 → stdout（CI 日志）────────────────────────────────
    let full = `\n## 九溪资讯源健康报告（${today}）\n\n`;
    full += `共 **${results.length}** 源：✅ 可用 **${okCount}** · ❌ 失败 **${failed.length}**（失败率 ${(failRate * 100).toFixed(1)}%）\n\n`;
    full += `| 板块 | 源 | 状态 | 耗时 |\n|---|---|---|---|\n`;
    for (const r of results.sort((a, b) => a.section.localeCompare(b.section))) {
      const status = r.ok ? `✅ ${r.httpCode}` : `❌ ${r.reason}`;
      full += `| ${r.section} | ${r.label} | ${status} | ${r.seconds.toFixed(1)}s |\n`;
    }
    process.stdout.write(full);

    // ── 紧凑摘要 → GitHub Action Summary ───────────────────────────
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath) {
      const slowest = results
        .filter((r) => r.ok)
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 10);
      let brief = `## 九溪资讯源健康检查（${today}）\n\n`;
      brief += `共 **${results.length}** 源：✅ 可用 **${okCount}** · ❌ 失败 **${failed.length}**（失败率 ${(failRate * 100).toFixed(1)}%）\n\n`;
      if (failed.length) {
        brief += `### 失败清单（需人工处理）\n\n| 板块 | 源 | 原因 |\n|---|---|---|\n`;
        for (const r of failed.sort((a, b) => a.section.localeCompare(b.section))) {
          brief += `| ${r.section} | ${r.label} | ${r.reason} |\n`;
        }
        brief += '\n';
      } else {
        brief += `🎉 全部源存活。\n\n`;
      }
      if (slowest.length) {
        brief += `### 最慢的 10 个可用源（构建超时调参参考）\n\n| 板块 | 源 | 耗时 |\n|---|---|---|\n`;
        for (const r of slowest)
          brief += `| ${r.section} | ${r.label} | ${r.seconds.toFixed(1)}s |\n`;
      }
      try {
        appendFileSync(summaryPath, brief, 'utf8');
        console.log(`[九溪] 紧凑摘要已写入 GITHUB_STEP_SUMMARY`);
      } catch (err) {
        console.warn(`[九溪] 写入 GITHUB_STEP_SUMMARY 失败（不影响探测结果）：${err.message}`);
      }
    }

    // ── 告警注解（与构建期 20% 口径一致）────────────────────────────
    if (failRate >= FAIL_WARN_RATIO) {
      console.log(
        `::warning::资讯源失败率 ${(failRate * 100).toFixed(1)}%（${failed.length}/${results.length}）超过 ${FAIL_WARN_RATIO * 100}%——请查看上方失败清单，注意沙箱/CI 网络表现不同，以线上 CI 结果为准`,
      );
    }
    console.log(`[九溪] 探测完成：可用 ${okCount} / ${results.length}`);
    // 退出码恒 0：源失效是信息，不是错误；本工作流的定位是「让失效早知道」。
  });
}

main();
