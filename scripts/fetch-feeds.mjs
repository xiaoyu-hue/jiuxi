#!/usr/bin/env node
/**
 * 九溪 · 预抓取并注入 feed 数据到各页面 HTML
 *
 * 两段式（CI / 本地 build 均按此顺序）：
 *   1) --write  ：抓取动态资讯 → 写入 src/data/feed.json（在 astro build 之前运行）；
 *   2) astro build 生成 dist；
 *   3) --inject：读取 feed.json，把数据注入各页面 HTML（在 astro build 之后运行）。
 *
 * 注入内容：
 *   - 板块页 dist/<section>/index.html：<script id="jiuxi-feed-<section>">（供 FeedSection 渲染）；
 *   - 首页 / 热点榜 / 策展台：<script id="jiuxi-feed-all"> 聚合全板块数据（纯静态，零运行时 API）。
 *
 * 历史快照（D1）已在 2026-10-17 架构简化中移除：站点改为纯静态，内容随每次 build 刷新。
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { extractFromXml } from '@extractus/feed-extractor';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'src/data/feed.json');
const TIMEOUT = 5;

// ── 英文保底配额（2026-10-17 用户决策，v1.10.0）──────────────────────
// 背景：中文候选量已远超每板块 24 条上限，「中文优先 + 纯时间序」在数学上
// 必然导致英文源零曝光（v1.9.0 线上曾 15/15 板块 24/24 全中文）。
// 现每板块为英文资讯预留保底名额：默认 6 条（18 中 + 6 英）；
// ai / science / dev 三个板块英文源是刚需（arXiv / HN / 论文预印本），
// 提高为 8 条（16 中 + 8 英）。英文不足时多余名额由中文补上，不会空槽。
const EN_QUOTA_BY_SECTION = { ai: 8, science: 8, dev: 8 };
const DEFAULT_EN_QUOTA = 6;

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

// ── 源健康追踪（2026-10-17 深度评价 P2）─────────────────────────────
// 背景：299 源每源一行日志，失败源的 ✗ 行淹没在上百行输出里，CI 日志
// 无人能快速回答「这次多少源挂了、是哪些」。集中记录失败/空结果源，
// 抓取结束后输出健康摘要（总源数/可用/失败清单 + 失败率告警注解）。
const failedSources = []; // 抓取失败（网络/超时/非 XML）
const emptySources = []; // 抓取成功但解析出 0 条（上游格式可能已变化）

async function fetchSource(section, source) {
  try {
    if (source.type === 'hn') {
      const r = await curlGet(source.url);
      if (r.ok) {
        const items = parseHn(r.body);
        console.log(`  ✓ [${section}] ${source.label}: ${items.length} 条`);
        if (!items.length) emptySources.push({ section, ...source });
        return items;
      }
    } else {
      const xml = await fetchWithProxy(source.url);
      if (xml) {
        const items = parseRss(xml).map((it) => ({ ...it, source: source.label }));
        console.log(`  ✓ [${section}] ${source.label}: ${items.length} 条`);
        if (!items.length) emptySources.push({ section, ...source });
        return items;
      }
    }
  } catch {
    /* 跳过失败源 */
  }
  // 单源失败不静默：打出来便于排查（板块总数不变，缺源时日志可定位是哪个源）
  failedSources.push({ section, ...source });
  console.warn(`  ✗ [${section}] ${source.label}: 抓取失败（${source.url}）`);
  return [];
}

// ── 中文优先 + 发布时间降序 + 英文保底配额（2026-10-17 用户决策）─────
// 取代原「按源轮询 round-robin」策略（原意图：高频源不淹没低频源）。
// 新策略：按最新实时信息，中文条目（标题含中文）优先、英文其次，
// 各组内按发布时间降序；并为英文预留保底配额 enQuota（见文件头常量），
// 避免中文候选超限时英文源零曝光。
function isChineseText(text) {
  return /[\u4e00-\u9fff]/.test(text || '');
}

/**
 * 中文优先 + 时间降序 + 英文保底配额。
 * 配额语义：英文最多优先占 enQuota 个名额，中文补满其余；英文不足时
 * 多余名额由中文顶上，中文不足时英文补满空位（板块不会出现空槽）。
 * enQuota 默认 0 = v1.9.0 旧行为（中文排满后英文才补位）。
 */
export function rankZhFirstByTime(items, limit, enQuota = 0) {
  const t = (s) => (s ? Date.parse(s) || 0 : 0);
  const byTimeDesc = (a, b) => t(b.pubDate) - t(a.pubDate);
  const zh = items.filter((it) => isChineseText(it.title)).sort(byTimeDesc);
  const en = items.filter((it) => !isChineseText(it.title)).sort(byTimeDesc);
  const cap = typeof limit === 'number' ? limit : Infinity;
  const enReserved = Math.min(enQuota, en.length, cap);
  const zhTake = Math.min(zh.length, cap - enReserved);
  const enTake = Math.min(en.length, cap - zhTake);
  return [...zh.slice(0, zhTake), ...en.slice(0, enTake)];
}

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
 * 注入「全板块聚合数据」到首页 / 热点榜 / 策展台。
 * 纯静态：这三页不再依赖运行时 D1 取数，打开即有内容（零运行时 API 请求）。
 */
export function injectAll(html, result) {
  const json = JSON.stringify(result).replace(/</g, '\\u003c');
  const jsonScript = `<script type="application/json" id="jiuxi-feed-all">${json}</script>`;
  return html.replace('</head>', jsonScript + '\n</head>');
}

/**
 * 抓取全部板块资讯：有界并发池抓取 → 源健康摘要 → 归组去重 → 中文优先后按时间限 24 条。
 * 单源失败不阻断其它（fetchSource 内部容错返回 []）。
 */
export async function fetchAll() {
  failedSources.length = 0;
  emptySources.length = 0;
  const t0 = Date.now();
  console.log('[九溪] 开始抓取动态资讯…');

  const result = { generatedAt: new Date().toISOString(), sections: {} };

  // 全局任务池抓取：板块 × 源拍平为任务队列，有界并发（见 runPool 注释）。
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

  // ── 源健康摘要（2026-10-17 深度评价 P2）────────────────────────────
  // 集中复盘失败/空结果源——失败率 ≥ 20% 时追加 ::warning:: 注解，
  // 在 Actions 通知与摘要页可见（不打断构建：单源失败本就有前端降级兜底，
  // 全部失败另有下方 totalItems === 0 的 exit 1 强阻断）。
  const failCount = failedSources.length;
  const healthPct = tasks.length
    ? Math.round(((tasks.length - failCount) / tasks.length) * 100)
    : 0;
  console.log(
    `[九溪] 源健康摘要：${tasks.length - failCount}/${tasks.length} 源抓取成功（健康度 ${healthPct}%），${failCount} 个失败，${emptySources.length} 个空结果`,
  );
  if (failCount > 0) {
    console.log('[九溪] 失败源清单：');
    for (const f of failedSources) console.log(`  ✗ [${f.section}] ${f.label} — ${f.url}`);
    if (failCount / tasks.length >= 0.2) {
      console.warn(
        `::warning::源抓取失败率 ${100 - healthPct}%（${failCount}/${tasks.length}）超过 20%——请检查上方失败源清单、runner 网络与上游媒体状态`,
      );
    }
  }
  if (emptySources.length > 0) {
    console.log('[九溪] 空结果源清单（抓取成功但 0 条，上游格式可能已变化）：');
    for (const f of emptySources) console.log(`  ○ [${f.section}] ${f.label} — ${f.url}`);
  }

  // 按板块归组 → 去重 → 中文优先后按发布时间限 24 条，并为英文预留保底配额
  // （2026-10-17 起：默认 18 中 + 6 英；ai/science/dev 为 16 中 + 8 英）
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
    const enQuota = EN_QUOTA_BY_SECTION[section] ?? DEFAULT_EN_QUOTA;
    result.sections[section] = rankZhFirstByTime(unique, 24, enQuota);
    console.log(`  → ${section}: ${result.sections[section].length} 条（英文保底 ${enQuota}）`);
  }

  return result;
}

/** 把抓取结果写入 src/data/feed.json；全部板块为空时退出码 1 强阻断，避免空内容上线。 */
export function writeFeedJson(result) {
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
  return result;
}

/** 把数据注入所有页面 HTML：板块页（按 section）+ 首页/热点榜/策展台（聚合）。 */
export function injectAllPages(result) {
  // 板块列表从 feeds.json 的 SOURCES 派生（原先硬编码四板块，新增板块忘同步会静默不注入）
  const PAGES = Object.keys(SOURCES).map((section) => ({
    section,
    path: `dist/${section}/index.html`,
  }));

  for (const { section, path } of PAGES) {
    const filePath = resolve(ROOT, path);
    if (!existsSync(filePath)) {
      console.log(`  ⚠️  ${path} 不存在（跳过注入）`);
      continue;
    }
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

  // 首页 / 全局热点榜 / 策展台：注入「全板块聚合数据」（id=jiuxi-feed-all），
  // 供这三个页面在构建期拿到数据（纯静态，不再依赖运行时 D1 取数）。
  for (const p of ['index.html', 'hot/index.html', 'curate/index.html']) {
    const f = resolve(ROOT, 'dist', p);
    if (!existsSync(f)) {
      console.log(`  ⚠️  ${p} 不存在（跳过聚合注入）`);
      continue;
    }
    let h = readFileSync(f, 'utf8');
    h = injectAll(h, result);
    writeFileSync(f, h, 'utf8');
    console.log(`  ✅ 已注入聚合数据 → ${p}`);
  }
}

async function main() {
  // 两段式：--write 只抓写 JSON（build 前）；--inject 只读 JSON 注入（build 后）；
  // 无参数则抓写+注入一气呵成（兼容旧单步调用）。
  const INJECT_ONLY = process.argv.includes('--inject');
  const WRITE_ONLY = process.argv.includes('--write');

  if (INJECT_ONLY) {
    let result;
    try {
      result = JSON.parse(readFileSync(OUT, 'utf8'));
    } catch {
      console.error(`❌ 未找到 ${OUT}，请先运行 node scripts/fetch-feeds.mjs --write`);
      process.exit(1);
    }
    const t0 = Date.now();
    injectAllPages(result);
    console.log(`\n注入耗时: ${Date.now() - t0}ms`);
    return;
  }

  const t0 = Date.now();
  const result = await fetchAll();
  writeFeedJson(result);
  if (!WRITE_ONLY) injectAllPages(result);
  console.log(`\n总耗时: ${Date.now() - t0}ms`);
}

// 仅在作为 CLI 入口（node scripts/fetch-feeds.mjs）执行；被测试 import 时不触发抓取
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
