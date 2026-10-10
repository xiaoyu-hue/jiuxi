#!/usr/bin/env node
/**
 * 九溪 · 预抓取并注入 feed 数据到各页面 HTML
 *
 * 1. 抓取动态资讯 → src/data/feed.json
 * 2. 将各板块数据内嵌到对应页面的 HTML 中（脚本标签）
 * 3. 页面打开即有数据，无需等待网络请求
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'src/data/feed.json');
const TIMEOUT = 5;

// ── HTTP 工具（spawnSync 同步方式，更稳定）─────────────────────────
function curlGet(url) {
  const r = spawnSync('curl', [
    '-s', '--max-time', String(TIMEOUT), '-L',
    '-H', 'User-Agent: Jiuxi/1.0', '--globoff',
    url,
  ], { encoding: 'utf8', timeout: (TIMEOUT + 2) * 1000 });
  if (r.status === 0) return { ok: true, body: r.stdout };
  return { ok: false, body: '' };
}

function fetchWithProxy(url) {
  const direct = curlGet(url);
  if (direct.ok && (direct.body.includes('<?xml') || direct.body.includes('<rss'))) return direct.body;
  for (const make of [
    (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ]) {
    const r = curlGet(make(url));
    if (r.ok && (r.body.includes('<?xml') || r.body.includes('<rss'))) return r.body;
  }
  return null;
}

// ── 解析器 ─────────────────────────────────────────────────────────
function parseRss(xml) {
  const items = [];
  const MAX = 15;
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null && items.length < MAX) {
    const block = m[1];
    const title = match(block, 'title');
    const link = match(block, 'link');
    if (!title || !link) continue;
    const desc = (match(block, 'description') || match(block, 'summary') || '').replace(/<[^>]+>/g, '').trim();
    const pubDate = match(block, 'pubDate') || match(block, 'updated') || undefined;
    const source = match(block, 'source');
    items.push({ title, link, source: source || undefined, pubDate, snippet: desc.slice(0, 120) });
  }
  return items;
}

function match(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
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
  } catch { return []; }
}

// ── 数据源 ─────────────────────────────────────────────────────────
const SOURCES = {
  ai: [
    { label: 'Hacker News · AI', url: 'https://hn.algolia.com/api/v1/search?tags=story&query=artificial+intelligence+OR+LLM&hitsPerPage=15', type: 'hn' },
    { label: 'ArXiv · cs.AI', url: 'https://rss.arxiv.org/rss/cs.AI', type: 'rss' },
    { label: '爱范儿', url: 'https://www.ifanr.com/feed', type: 'rss' },
  ],
  news: [
    { label: 'IT之家', url: 'https://www.ithome.com/rss/', type: 'rss' },
    { label: '爱范儿', url: 'https://www.ifanr.com/feed', type: 'rss' },
  ],
  tech: [
    { label: 'Hacker News · 头条', url: 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=15', type: 'hn' },
    { label: 'TechCrunch', url: 'https://techcrunch.com/feed/', type: 'rss' },
    { label: 'Ars Technica', url: 'https://arstechnica.com/feed/', type: 'rss' },
  ],
  gaming: [
    { label: 'IT之家', url: 'https://www.ithome.com/rss/', type: 'rss' },
  ],
};

function fetchSource(source) {
  try {
    if (source.type === 'hn') {
      const r = curlGet(source.url);
      if (r.ok) return parseHn(r.body);
    } else {
      const xml = fetchWithProxy(source.url);
      if (xml) return parseRss(xml);
    }
  } catch { /* 跳过失败源 */ }
  return [];
}

function fetchSection(section, sources) {
  // 串行执行各源，第一个有结果的立即返回
  for (const s of sources) {
    const items = fetchSource(s);
    if (items.length) return items;
  }
  // 全部失败则收集所有结果
  const all = [];
  for (const s of sources) {
    const items = fetchSource(s);
    if (items.length) all.push(...items);
  }
  return all;
}

// ── 注入数据到 HTML ────────────────────────────────────────────────
function injectData(html, section, items) {
  const jsonScript = `<script type="application/json" id="jiuxi-feed-${section}">${JSON.stringify(items)}</script>`;
  html = html.replace('</head>', jsonScript + '\n</head>');
  // 更新状态文本
  html = html.replace(
    new RegExp(`id="status-${section}">[^<]*`, 'g'),
    `id="status-${section}">已加载最新资讯`
  );
  return html;
}

// ── 主流程 ─────────────────────────────────────────────────────────
function main() {
  const t0 = Date.now();
  console.log('[九溪] 开始抓取动态资讯…');

  const result = { generatedAt: new Date().toISOString(), sections: {} };

  for (const [section, sources] of Object.entries(SOURCES)) {
    const items = fetchSection(section, sources);
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
    result.sections[section] = unique.slice(0, 24);
    console.log(`  → ${section}: ${unique.length} 条`);
  }

  // 保存 JSON
  mkdirSync(resolve(OUT, '..'), { recursive: true });
  writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ 已写入 ${OUT}`);

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

main();
