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

async function fetchSource(source) {
  try {
    if (source.type === 'hn') {
      const r = await curlGet(source.url);
      if (r.ok) return parseHn(r.body);
    } else {
      const xml = await fetchWithProxy(source.url);
      if (xml) return parseRss(xml).map((it) => ({ ...it, source: source.label }));
    }
  } catch {
    /* 跳过失败源 */
  }
  return [];
}

// 合并该板块下所有成功源的结果（而非只取第一个成功的源）：
// 更符合“综合信息聚集地”的定位，且单源失效时其余源仍能补位。
async function fetchSection(sources) {
  // 板块内多源并行：fetchSource 内部已容错（失败返回 []），此处无需再 catch
  const lists = await Promise.all(sources.map((s) => fetchSource(s)));
  return lists.flat();
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

// ── 主流程 ─────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  console.log('[九溪] 开始抓取动态资讯…');

  const result = { generatedAt: new Date().toISOString(), sections: {} };

  // 各板块并行抓取，单板块失败不影响其余（Promise.allSettled 容错，不崩全站）
  const settled = await Promise.allSettled(
    Object.entries(SOURCES).map(async ([section, sources]) => {
      const items = await fetchSection(sources);
      const seen = new Set();
      const unique = items.filter((it) => {
        if (seen.has(it.link)) return false;
        seen.add(it.link);
        return true;
      });
      unique.sort((a, b) => {
        const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return db - da;
      });
      return { section, items: unique.slice(0, 24) };
    }),
  );

  for (const s of settled) {
    if (s.status === 'fulfilled') {
      result.sections[s.value.section] = s.value.items;
      console.log(`  → ${s.value.section}: ${s.value.items.length} 条`);
    } else {
      console.warn('  ⚠️ 某板块抓取失败:', s.reason);
    }
  }

  // 保存 JSON
  mkdirSync(resolve(OUT, '..'), { recursive: true });
  writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ 已写入 ${OUT}`);

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
        stdio: ['pipe', 'inherit', 'inherit']
      });

      child.stdin.write(JSON.stringify(historyData));
      child.stdin.end();

      child.on('close', (code) => {
        if (code === 0) {
          console.log('✅ 历史快照保存完成');
          resolve();
        } else {
          console.warn('⚠️ 历史快照保存失败');
          resolve();
        }
      });

      child.on('error', () => {
        console.warn('⚠️ 历史快照保存失败');
        resolve();
      });
    });
  } catch (error) {
    console.warn('⚠️ 历史快照保存异常:', error.message);
  }

  // 注入数据到各页面 HTML
  const PAGES = [
    { section: 'ai', path: 'dist/ai/index.html' },
    { section: 'news', path: 'dist/news/index.html' },
    { section: 'tech', path: 'dist/tech/index.html' },
    { section: 'gaming', path: 'dist/gaming/index.html' },
  ];

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
