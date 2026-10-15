#!/usr/bin/env node
/**
 * 九溪 · 预抓取并注入 feed 数据到各页面 HTML
 *
 * 1. 抓取动态资讯 → src/data/feed.json
 * 2. 将各板块数据内嵌到对应页面的 HTML 中（脚本标签）
 * 3. 页面打开即有数据，无需等待网络请求
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { extractFromXml } from '@extractus/feed-extractor';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'src/data/feed.json');
const TIMEOUT = 5;

// ── HTTP 工具（execFile 异步 curl，参数与旧 spawnSync 版逐项一致）─────
// 2026-10-12：源从 14 扩到 21 后，同步版会让板块内抓取完全串行（spawnSync 阻塞
// 事件循环，Promise 并行无效），最坏耗时随源数线性增长。改用 execFile 异步版：
// 仍是同一个 curl 二进制、同一组参数（零传输层行为变化），但板块内多源可真正
// 并行，总耗时约等于最慢单源而非全部源之和。
const execFileAsync = promisify(execFile);

async function curlGet(url) {
  try {
    const { stdout } = await execFileAsync(
      'curl',
      ['-s', '--max-time', String(TIMEOUT), '-L', '-H', 'User-Agent: Jiuxi/1.0', '--globoff', url],
      { encoding: 'utf8', timeout: (TIMEOUT + 2) * 1000, maxBuffer: 16 * 1024 * 1024 },
    );
    return { ok: true, body: stdout };
  } catch {
    return { ok: false, body: '' };
  }
}

// 构建期在 Node 端运行，curl 可直接抓取 RSS（无浏览器 CORS 限制），无需第三方代理。
async function fetchWithProxy(url) {
  const r = await curlGet(url);
  if (r.ok && (r.body.includes('<?xml') || r.body.includes('<rss') || r.body.includes('<feed')))
    return r.body;
  return null;
}

// ── 解析器（用 @extractus/feed-extractor，零正则 hack）─────────────────
function parseRss(xml) {
  try {
    const feed = extractFromXml(xml);
    const entries = Array.isArray(feed?.entries) ? feed.entries : [];
    return entries.slice(0, 15).map((e) => ({
      title: String(e.title ?? '').trim(),
      link: String(e.link ?? '').trim(),
      source: undefined,
      pubDate: e.published ? String(e.published) : undefined,
      snippet: e.description ? String(e.description).slice(0, 120) : undefined,
    }));
  } catch {
    return [];
  }
}

function parseHn(body) {
  try {
    const json = JSON.parse(body);
    return (json?.hits || []).slice(0, 15).map((h) => ({
      title: h.title || h.story_title || '',
      link: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: 'Hacker News',
      pubDate: h.created_at || undefined,
      snippet: '',
    }));
  } catch {
    return [];
  }
}

// ── 数据源（外置到 src/data/feeds.json，与运行端共用唯一配置）──
const FEEDS_JSON = resolve(ROOT, 'src/data/feeds.json');
const { sections: SOURCES } = JSON.parse(readFileSync(FEEDS_JSON, 'utf8'));

// ── 有界并发池（2026-10-15 扩容至 299 源后启用）──────────────────────
// 旧结构：15 个板块彼此并行 × 板块内源无上限并行 = 最坏 299 个 curl 进程
// 同时起跑。GitHub Actions runner 只有 2 核，进程调度开销吃掉大部分时间，
// 且瞬时 299 并发请求对上游媒体不礼貌（部分源会限流反踩）。
// 改为全局任务池：抓取并发恒定 CONCURRENCY，与板块边界解耦；
// 总耗时 ≈ ceil(总源数 / CONCURRENCY) × 单源耗时（最慢源决定，非总和）。
const CONCURRENCY = 10;

async function runPool(tasks, limit, worker) {
  const results = new Array(tasks.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= tasks.length) return;
      try {
        results[i] = await worker(tasks[i], i);
      } catch {
        results[i] = null; // 单任务异常按缺失处理，不拖垮整池
      }
    }
  });
  await Promise.all(runners);
  return results;
}

async function fetchSource(section, source) {
  try {
    if (source.type === 'hn') {
      const r = await curlGet(source.url);
      if (r.ok) {
        const items = parseHn(r.body);
        console.log(`  ✓ [${section}] ${source.label}: ${items.length} 条`);
        return items;
      }
    } else {
      const xml = await fetchWithProxy(source.url);
      if (xml) {
        const items = parseRss(xml).map((it) => ({ ...it, source: source.label }));
        console.log(`  ✓ [${section}] ${source.label}: ${items.length} 条`);
        return items;
      }
    }
  } catch {
    /* 跳过失败源 */
  }
  // 单源失败不静默：打出来便于排查（板块总数不变，缺源时日志可定位是哪个源）
  console.warn(`  ✗ [${section}] ${source.label}: 抓取失败（${source.url}）`);
  return [];
}

// 合并该板块下所有成功源的结果（而非只取第一个成功的源）：
// 更符合“综合信息聚集地”的定位，且单源失效时其余源仍能补位。
// （fetchSection 原为板块内 Promise.all；2026-10-15 起并入全局任务池 runPool，
//  板块只作为归组维度，不再作为并发单位——见下方主流程。）

// ── 注入数据到 HTML ────────────────────────────────────────────────
// 导出以便单元测试；注入前把 < 转义为 \u003c，阻止外部 RSS 标题里的
// </script> 提前闭合脚本块（否则可造成全站存储型 XSS）。
export function injectData(html, section, items) {
  const json = JSON.stringify(items).replace(/</g, '\\u003c');
  const jsonScript = `<script type="application/json" id="jiuxi-feed-${section}">${json}</script>`;
  html = html.replace('</head>', jsonScript + '\n</head>');
  // 更新状态文本
  html = html.replace(
    new RegExp(`id="status-${section}">[^<]*`, 'g'),
    `id="status-${section}">已加载最新资讯`,
  );
  return html;
}

/**
 * 按源轮询合并（round-robin）：每个源轮流取一条（组内按发布时间降序），
 * 直到凑满 limit。保证每个有数据的源都获得曝光位——
 * 纯按时间排序时，高频源（ArXiv 日更 15 条、IT之家、HN）会占满全部名额，
 * 低频源（周更的阮一峰、量少的触乐/OpenAI）永远排不进来，
 * 与「综合信息聚集地」的多元化定位相悖（2026-10-12 实测复现：
 * 21 源配置下 AI 板块 24 条被 ArXiv×15 + 量子位×9 占满，新源零曝光）。
 * 无 source 字段的条目归入同一组，保持既有行为。
 */
function roundRobinBySource(items, limit) {
  const groups = new Map();
  for (const it of items) {
    const key = it.source || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });
  }
  const out = [];
  let round = 0;
  while (out.length < limit) {
    let added = false;
    for (const list of groups.values()) {
      if (round < list.length) {
        out.push(list[round]);
        added = true;
        if (out.length >= limit) break;
      }
    }
    if (!added) break; // 所有源都已取尽
    round++;
  }
  return out;
}

// ── 主流程 ─────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  console.log('[九溪] 开始抓取动态资讯…');

  const result = { generatedAt: new Date().toISOString(), sections: {} };

  // 全局任务池抓取：板块 × 源拍平为任务队列，有界并发（见 runPool 注释）。
  // 单源失败不阻断其它（fetchSource 内部容错返回 []），与旧 Promise.allSettled 语义一致。
  const tasks = [];
  for (const [section, sources] of Object.entries(SOURCES)) {
    for (const source of sources) tasks.push({ section, source });
  }
  const t1 = Date.now();
  const fetched = await runPool(tasks, CONCURRENCY, (t) => fetchSource(t.section, t.source));
  const okCount = fetched.filter((r) => Array.isArray(r) && r.length > 0).length;
  console.log(
    `[九溪] 抓取完成：${okCount}/${tasks.length} 源有数据，池并发 ${CONCURRENCY}，耗时 ${Date.now() - t1}ms`,
  );

  // 按板块归组 → 去重 → 按源轮询限 24 条（round-robin，保低频源曝光）
  for (const [i, task] of tasks.entries()) {
    const items = fetched[i] || [];
    if (!result.sections[task.section]) result.sections[task.section] = [];
    result.sections[task.section].push(...items);
  }
  for (const [section, items] of Object.entries(result.sections)) {
    const seen = new Set();
    const unique = items.filter((it) => {
      if (seen.has(it.link)) return false;
      seen.add(it.link);
      return true;
    });
    result.sections[section] = roundRobinBySource(unique, 24);
    console.log(`  → ${section}: ${result.sections[section].length} 条`);
  }

  // 保存 JSON
  mkdirSync(resolve(OUT, '..'), { recursive: true });
  writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ 已写入 ${OUT}`);

  // 失败信号：所有板块均为空时终止构建（2026-10-15 审查修复 H1）。
  // 原先全源失败也写空 JSON + 退出码 0，CI 绿灯把空内容部署上线。
  const totalItems = Object.values(result.sections).reduce(
    (n, list) => n + (Array.isArray(list) ? list.length : 0),
    0,
  );
  if (totalItems === 0) {
    console.error('❌ 全部板块抓取失败，产物为空——终止构建（退出码 1），避免空内容上线');
    process.exit(1);
  }

  // 保存历史快照（通过子进程调用 save-history.mjs）
  try {
    const { spawn } = await import('node:child_process');
    const date = new Date().toISOString().split('T')[0];
    console.log(`\n[九溪] 正在保存 ${date} 的历史快照...`);

    // 构建历史数据
    const historyData = {
      generatedAt: new Date().toISOString(),
      sections: result.sections,
    };

    // 使用 spawn 调用 save-history.mjs
    await new Promise((resolve) => {
      const child = spawn('node', ['scripts/save-history.mjs'], {
        cwd: ROOT,
        stdio: ['pipe', 'inherit', 'inherit'],
      });

      // 2026-10-15 审查 P2 加固：
      // 1) 看守超时——save-history 正常秒级完成；若其 D1 同步挂起
      //    （旧版 fetch 无超时），整条构建链会无限期卡死。60s 足够
      //    覆盖正常路径（含 15s D1 超时），超时强杀子进程；
      //    历史保存失败不阻断构建（feed.json 与注入均已在此之前完成）。
      // 2) stdin EPIPE——子进程若在读取前退出（启动即崩等），
      //    write 会抛 EPIPE。属预期内的失败信号，按"保存失败"处理，
      //    显式捕获避免语义含糊的异常路径。
      let settled = false;
      const finish = (warn) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        if (warn) console.warn(warn);
        resolve();
      };
      const watchdog = setTimeout(() => {
        child.kill('SIGKILL');
        finish('⚠️ 历史快照保存超时（60s），已终止子进程（不影响构建）');
      }, 60000);

      // 同步 write 失败（管道已断开）+ 异步流错误都要接住
      try {
        child.stdin.write(JSON.stringify(historyData));
        child.stdin.end();
      } catch (e) {
        if (e.code === 'EPIPE') {
          child.kill('SIGKILL');
          finish('⚠️ 历史快照保存失败（子进程提前退出）');
          return;
        }
        throw e;
      }
      child.stdin.on('error', (e) => {
        if (e.code === 'EPIPE') {
          child.kill('SIGKILL');
          finish('⚠️ 历史快照保存失败（子进程提前退出）');
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('✅ 历史快照保存完成');
          finish();
        } else {
          finish('⚠️ 历史快照保存失败');
        }
      });

      child.on('error', (e) => {
        finish(`⚠️ 历史快照保存失败: ${e.message}`);
      });
    });
  } catch (error) {
    console.warn('⚠️ 历史快照保存异常:', error.message);
  }

  // 注入数据到各页面 HTML。
  // 板块列表从 feeds.json 的 SOURCES 派生（原先硬编码四板块，新增板块忘同步会静默不注入）
  const PAGES = Object.keys(SOURCES).map((section) => ({
    section,
    path: `dist/${section}/index.html`,
  }));

  for (const { section, path } of PAGES) {
    const filePath = resolve(ROOT, path);
    let html = readFileSync(filePath, 'utf8');
    const items = result.sections[section] || [];
    if (items.length) {
      html = injectData(html, section, items);
      writeFileSync(filePath, html, 'utf8');
      console.log(`  ✅ 已注入 ${section} (${items.length} 条) → ${path}`);
    } else {
      console.log(`  ⚠️  ${section} 无数据，跳过注入`);
    }
  }

  console.log(`\n总耗时: ${Date.now() - t0}ms`);
}

// 仅在作为 CLI 入口（node scripts/fetch-feeds.mjs）执行；被测试 import 时不触发抓取
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
