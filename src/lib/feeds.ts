// 九溪 · 动态资讯数据源与抓取
//
// 纯浏览器端实现，无需后端：
//   1) Google News RSS（中文）作为主源，经公共 CORS 代理抓取；
//   2) Hacker News Algolia API（CORS 友好）作为科技/AI 冗余源；
//   3) localStorage 缓存 15 分钟，失败回退缓存或空。
//
// 安全：所有外部文本在渲染前都经 HTML 转义，避免 XSS。

import { isFavorite, toggleFavorite } from './favorites';
import { FEED_PREFIX } from './settings';
import { sanitizeUrl, escapeHtml } from './security';
import { readIndexedDB, writeIndexedDB } from './db';

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

// 公共 CORS 代理兜底链（任一可用即可）
const PROXIES: ((u: string) => string)[] = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
];

const CACHE_TTL = 15 * 60 * 1000; // 15 分钟

const SOURCES: Record<Section, FeedSource[]> = {
  ai: [
    {
      label: 'Google 新闻 · AI',
      url: 'https://news.google.com/rss/search?q=人工智能+OR+AI&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
      type: 'rss',
    },
  ],
  news: [
    {
      label: 'Google 新闻 · 热点',
      url: 'https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
      type: 'rss',
    },
  ],
  tech: [
    {
      label: 'Google 新闻 · 科技',
      url: 'https://news.google.com/rss/search?q=科技&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
      type: 'rss',
    },
    {
      label: 'Hacker News 头条',
      url: 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=20',
      type: 'hn',
    },
  ],
  gaming: [
    {
      label: 'Google 新闻 · 游戏',
      url: 'https://news.google.com/rss/search?q=游戏&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
      type: 'rss',
    },
  ],
};

function formatDate(d?: string): string {
  if (!d) return '';
  const t = new Date(d);
  if (isNaN(t.getTime())) return '';
  return t.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// ── 解析 ──
function parseRss(xml: string): FeedItem[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const items = Array.from(doc.querySelectorAll('item'));
  return items.slice(0, 24).map((it) => ({
    title: it.querySelector('title')?.textContent?.trim() ?? '',
    link: it.querySelector('link')?.textContent?.trim() ?? '',
    source: it.querySelector('source')?.textContent?.trim() || undefined,
    pubDate: it.querySelector('pubDate')?.textContent?.trim() || undefined,
    snippet: (it.querySelector('description')?.textContent ?? '').slice(0, 140),
  }));
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

// ── 抓取（带代理兜底与超时）──
async function fetchText(url: string): Promise<string> {
  let lastErr: unknown;
  for (const make of PROXIES) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(make(url), { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) return await res.text();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('所有代理均失败');
}

function cacheKey(section: Section): string {
  return `${FEED_PREFIX}${section}`;
}

/** 读取未过期的缓存（15 分钟内），过期或缺失返回 null */
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
    )
      return obj.items as FeedItem[];
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
    if (Array.isArray(obj?.items) && obj.items.length)
      return obj.items as FeedItem[];
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

/** 加载某板块资讯：优先级链
 *  1) localStorage 新鲜缓存（15分钟内）→ 直接展示，后台刷新
 *  2) localStorage 过期缓存（临时兜底）
 *  3) IndexedDB 持久化缓存（跨会话）→ 直接展示，后台刷新
 *  4) 在线抓取 → 同时写入 localStorage + IndexedDB
 *  5) 全部失败 → 返回空数组（页面提示）
 */
export async function loadFeed(section: Section): Promise<FeedItem[]> {
  // 第1步：先读 localStorage 新鲜缓存，立即展示
  const fresh = readCacheFresh(section);
  if (fresh) {
    refreshInBackground(section);
    return fresh;
  }

  // 第2步：读 localStorage 过期缓存（临时兜底）
  const staleLs = readCacheAny(section);
  if (staleLs && staleLs.length) return staleLs;

  // 第3步：读 IndexedDB 持久化缓存（跨会话保留）
  const dbItems = await readIndexedDB(section);
  if (dbItems && dbItems.length) {
    refreshInBackground(section);
    return dbItems as FeedItem[];
  }

  // 第4步：在线抓取
  return await refreshInBackground(section);
}

async function refreshInBackground(section: Section): Promise<FeedItem[]> {
  const sources = SOURCES[section];
  for (const s of sources) {
    try {
      let items: FeedItem[] = [];
      if (s.type === 'hn') {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 9000);
        const res = await fetch(s.url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        items = parseHn(await res.json());
      } else {
        const xml = await fetchText(s.url);
        items = parseRss(xml);
      }
      if (items.length) {
        // 同时写入 localStorage 和 IndexedDB
        writeCache(section, items);
        writeIndexedDB(section, items);
        return items;
      }
    } catch {
      /* 试下一个源 */
    }
  }
  // 全部失败：仍回退 IndexedDB（比 localStorage 更持久）
  const dbItems = await readIndexedDB(section);
  if (dbItems && dbItems.length) return dbItems as FeedItem[];
  return [];
}

/** 将资讯渲染进容器（客户端注入，须全局样式配合） */
export function renderItems(container: HTMLElement, items: FeedItem[]): void {
  container.innerHTML = items
    .map(
      (it) => `
    <article class="glass feed-card">
      <a class="feed-link" href="${escapeHtml(sanitizeUrl(it.link))}" target="_blank" rel="noopener noreferrer">
        <h3>${escapeHtml(it.title)}</h3>
        <p class="feed-meta">${escapeHtml(it.source || '未知来源')} · ${escapeHtml(formatDate(it.pubDate))}</p>
        ${it.snippet ? `<p class="feed-snippet">${escapeHtml(it.snippet)}</p>` : ''}
      </a>
      <button class="fav-btn${isFavorite(it.link) ? ' active' : ''}" data-link="${escapeHtml(sanitizeUrl(it.link))}" type="button" aria-label="收藏">♥</button>
    </article>`,
    )
    .join('');
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
