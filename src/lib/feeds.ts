// 九溪 · 动态资讯数据源与抓取
//
// 纯浏览器端实现，无需后端：
//   1) Google News RSS（中文）作为主源，经第一方同域代理（/api/feed）抓取；
//   2) Hacker News Algolia API（CORS 友好）作为科技/AI 冗余源；
//   3) localStorage 缓存 30 分钟，失败回退缓存或空。
//
// 安全：所有外部文本在渲染前都经 HTML 转义，避免 XSS。

import { isFavorite, toggleFavorite } from './favorites';
import { FEED_PREFIX } from './settings';
import { sanitizeUrl } from './security';
import { readIndexedDB, writeIndexedDB } from './db';
import { extractFromXml } from '@extractus/feed-extractor';
import feedsData from '../data/feeds.json';

export type Section = 'ai' | 'news' | 'tech' | 'gaming';

export interface FeedItem {
  title: string;
  link: string;
  source?: string;
  pubDate?: string;
  snippet?: string;
}

interface FeedSource {
  label: string;
  url: string;
  type: 'rss' | 'hn';
}

// 第一方 feed 代理（Cloudflare Pages Function，见 functions/api/feed.ts）。
// 与站点同域，故浏览器端 fetch 不受 CORS 限制，且 CSP 只需 'self' 即可放行；
// GitHub Pages 备站无 Functions，运行时刷新会失败，但构建期注入的数据仍可见（备站降级）。
const FEED_PROXY_PATH = '/api/feed';

const CACHE_TTL = 30 * 60 * 1000; // 30 分钟

// 数据源外置到 src/data/feeds.json（运行端与构建端共用的唯一配置）
const SOURCES = (feedsData as { sections: Record<Section, FeedSource[]> }).sections;

function formatDate(d?: string): string {
  if (!d) return '';
  const t = new Date(d);
  if (isNaN(t.getTime())) return '';
  return t.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// ── 解析 ──
// 用 @extractus/feed-extractor 解析 RSS/Atom（浏览器与 Node 双端、零正则 hack）。
// 返回结构：{ entries: [{ title, link, published, description }] }，title 已自动解码实体。
export function parseRss(xml: string): FeedItem[] {
  try {
    const feed = extractFromXml(xml);
    const entries = Array.isArray((feed as { entries?: unknown[] })?.entries)
      ? (feed as { entries: Record<string, unknown>[] }).entries
      : [];
    return entries.slice(0, 24).map((e) => ({
      title: String(e.title ?? '').trim(),
      link: String(e.link ?? '').trim(),
      pubDate: e.published ? String(e.published) : undefined,
      snippet: e.description ? String(e.description).slice(0, 140) : undefined,
    }));
  } catch {
    return [];
  }
}

export function parseHn(json: any): FeedItem[] {
  const hits = Array.isArray(json?.hits) ? json.hits : [];
  return hits.slice(0, 24).map((h: any) => ({
    title: h.title || h.story_title || '',
    link: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    source: 'Hacker News',
    pubDate: h.created_at || undefined,
    snippet: '',
  }));
}

// ── 抓取（直连优先，失败回退第一方同域代理）──
async function fetchText(url: string): Promise<string> {
  const errors: unknown[] = [];

  // 1) 先试直连（HN 等 CORS 友好源可用）
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const text = await res.text();
      if (text.includes('<?xml') || text.includes('<rss') || text.includes('<feed')) return text;
    }
  } catch (e) {
    errors.push(e);
  }

  // 2) 回退第一方同域代理 /api/feed（Cloudflare Pages Function，同源无 CORS 问题）
  try {
    const proxyUrl = `${FEED_PROXY_PATH}?url=${encodeURIComponent(url)}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(proxyUrl, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const text = await res.text();
      if (text.includes('<?xml') || text.includes('<rss') || text.includes('<feed')) return text;
    }
    errors.push(new Error(`第一方代理返回非 XML: ${res.status}`));
  } catch (e) {
    errors.push(e);
  }

  throw new Error(`抓取失败: ${errors.length} 次尝试均失败`);
}

function cacheKey(section: Section): string {
  return `${FEED_PREFIX}${section}`;
}

/** 读取未过期的缓存（30 分钟内），过期或缺失返回 null */
function readCacheFresh(section: Section): FeedItem[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(section));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (
      typeof obj?.t === 'number' &&
      Date.now() - obj.t < CACHE_TTL &&
      Array.isArray(obj.items) &&
      obj.items.length
    ) {
      return obj.items as FeedItem[];
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** 读取任意缓存（含过期），仅在刷新全部失败时兜底 */
function readCacheAny(section: Section): FeedItem[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(section));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Array.isArray(obj?.items) && obj.items.length) return obj.items as FeedItem[];
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(section: Section, items: FeedItem[]): void {
  try {
    localStorage.setItem(cacheKey(section), JSON.stringify({ t: Date.now(), items }));
  } catch {
    /* 容量满/隐私模式忽略 */
  }
}

/**
 * 加载某板块资讯：在线刷新优先，失败再退持久缓存。
 *  1) 在线抓取（直连优先，失败回退第一方同域代理）→ 成功即返回最新并写缓存；
 *  2) 全部源失败 → IndexedDB 持久缓存（跨会话）；
 *  3) localStorage 新鲜缓存（30 分钟内）；
 *  4) localStorage 过期缓存（临时兜底）；
 *  5) 仍无 → 返回空数组（页面提示）。
 *
 * 关键修复（v 修复「刷新了但页面还是旧的」）：
 *   旧逻辑在「有缓存」时立即把旧快照当返回值、后台刷新结果被丢弃，
 *   导致手动刷新永远显示首次加载的快照。现改为「在线刷新优先」，
 *   拿到最新即返回；首屏仍由构建期内嵌 JSON 秒开（FeedSection.astro），
 *   本函数只负责刷新拿到最新数据。
 */
export async function loadFeed(section: Section): Promise<FeedItem[]> {
  // 1) 在线刷新优先：拿到最新即返回（并写缓存），不再把旧快照当返回值
  const fresh = await refreshInBackground(section);
  if (fresh.length) return fresh;

  // 2) 刷新全部失败（离线/源不可用）→ 退到持久缓存，保证仍有内容
  const dbItems = await readIndexedDB(section);
  if (dbItems?.length) return dbItems as FeedItem[];

  // 3) localStorage 新鲜缓存（30 分钟内）
  const lsFresh = readCacheFresh(section);
  if (lsFresh) return lsFresh;

  // 4) localStorage 过期缓存（临时兜底）
  const lsAny = readCacheAny(section);
  if (lsAny?.length) return lsAny;

  // 5) 真的什么都没有
  return [];
}

async function refreshInBackground(section: Section): Promise<FeedItem[]> {
  const sources = SOURCES[section];
  let lastError: string | null = null;

  for (const s of sources) {
    try {
      let items: FeedItem[] = [];
      if (s.type === 'hn') {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(s.url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        items = parseHn(await res.json());
      } else {
        const xml = await fetchText(s.url);
        items = parseRss(xml).map((it) => ({ ...it, source: it.source || s.label }));
      }
      if (items.length) {
        writeCache(section, items);
        await writeIndexedDB(section, items);
        return items;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.debug(`[九溪] ${section} 板块获取失败 (${s.label}):`, lastError);
    }
  }

  const dbItems = await readIndexedDB(section);
  if (dbItems && dbItems.length) return dbItems as FeedItem[];

  console.warn(`[九溪] ${section} 板块所有源均失败:`, lastError);
  return [];
}

/**
 * 将资讯渲染进容器（客户端注入，须全局样式配合）。
 * 标题/来源/摘要一律用 textContent 写入（天然免疫 XSS，无需 HTML 转义）；
 * 链接用 sanitizeUrl 校验后写 href / data-link。
 */
export function renderItems(container: HTMLElement, items: FeedItem[]): void {
  const frag = document.createDocumentFragment();
  items.forEach((it, i) => {
    const card = document.createElement('article');
    card.className = 'feed-card';

    const a = document.createElement('a');
    a.className = 'feed-link';
    a.href = sanitizeUrl(it.link);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    // 栏目编号 / 来源：编辑策展意图（编号居前，来源次之）
    const kicker = document.createElement('span');
    kicker.className = 'feed-kicker';
    kicker.textContent = `${String(i + 1).padStart(2, '0')} / ${it.source || '资讯'}`;
    a.appendChild(kicker);

    const h3 = document.createElement('h3');
    h3.className = 'feed-title';
    h3.textContent = it.title || '';
    a.appendChild(h3);

    const meta = document.createElement('p');
    meta.className = 'feed-meta';
    meta.textContent = formatDate(it.pubDate);
    a.appendChild(meta);

    if (it.snippet) {
      const snip = document.createElement('p');
      snip.className = 'feed-snippet';
      snip.textContent = it.snippet;
      a.appendChild(snip);
    }
    card.appendChild(a);

    const fav = document.createElement('button');
    fav.className = `fav-btn${isFavorite(it.link) ? ' active' : ''}`;
    fav.type = 'button';
    fav.dataset.link = sanitizeUrl(it.link);
    fav.setAttribute('aria-label', '收藏');
    fav.textContent = '♥';
    card.appendChild(fav);

    frag.appendChild(card);
  });
  container.replaceChildren(frag);
}

/** 为已渲染的资讯卡绑定收藏按钮（按钮为 <a> 的兄弟节点，点击不会触发导航） */
export function wireFavorites(container: HTMLElement): void {
  container.querySelectorAll<HTMLButtonElement>('.fav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const link = btn.dataset.link || '';
      const nowFav = toggleFavorite(link);
      btn.classList.toggle('active', nowFav);
    });
  });
}
