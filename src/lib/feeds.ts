// 九溪 · 动态资讯数据源与抓取
//
// 纯浏览器端实现，无需后端：
//   1) Google News RSS（中文）作为主源，经公共 CORS 代理抓取；
//   2) Hacker News Algolia API（CORS 友好）作为科技/AI 冗余源；
//   3) localStorage 缓存 30 分钟，失败回退缓存或空。
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
  (u) => `https://cors.proxy.run?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
];

const CACHE_TTL = 30 * 60 * 1000; // 30 分钟

const SOURCES: Record<Section, FeedSource[]> = {
  ai: [
    {
      label: 'Google 新闻 · AI',
      url: 'https://news.google.com/rss/search?q=人工智能+OR+AI&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
      type: 'rss',
    },
    {
      label: 'Hacker News · AI',
      url: 'https://hn.algolia.com/api/v1/search?tags=story&query=AI&hitsPerPage=20',
      type: 'hn',
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
export function parseRss(xml: string): FeedItem[] {
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

// ── 抓取（带代理兜底与快速失败）──
async function fetchText(url: string): Promise<string> {
  const errors: unknown[] = [];

  // 先试直连
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok && res.headers.get('content-type')?.includes('xml')) {
      return await res.text();
    }
  } catch (e) {
    errors.push(e);
  }

  // 再试代理链（每个代理给 5 秒超时）
  for (const make of PROXIES) {
    try {
      const proxyUrl = make(url);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(proxyUrl, { signal: ctrl.signal });
      clearTimeout(timer);
      const text = await res.text();
      if (res.ok && (text.includes('<?xml') || text.includes('<rss') || text.includes('<feed'))) {
        return text;
      }
      errors.push(new Error(`代理返回非XML: ${res.status}`));
    } catch (e) {
      errors.push(e);
    }
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

/** 加载某板块资讯：优先级链
 *  1) IndexedDB 持久化缓存（跨会话，立即展示）
 *  2) localStorage 新鲜缓存（30分钟内）→ 后台刷新
 *  3) localStorage 过期缓存（临时兜底）
 *  4) 在线抓取 → 同时写入 localStorage + IndexedDB
 *  5) 全部失败 → 返回空数组（页面提示）
 */
export async function loadFeed(section: Section): Promise<FeedItem[]> {
  const dbItems = await readIndexedDB(section);
  if (dbItems && dbItems.length) {
    refreshInBackground(section);
    return dbItems as FeedItem[];
  }

  const fresh = readCacheFresh(section);
  if (fresh) {
    refreshInBackground(section);
    return fresh;
  }

  const staleLs = readCacheAny(section);
  if (staleLs && staleLs.length) {
    // 仍有兜底数据：先展示，同时后台静默刷新（不阻塞首屏）
    void refreshInBackground(section);
    return staleLs;
  }

  return await refreshInBackground(section);
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
        items = parseRss(xml);
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

/** 将资讯渲染进容器（客户端注入，须全局样式配合） */
export function renderItems(container: HTMLElement, items: FeedItem[]): void {
  container.innerHTML = items
    .map(
      (it) => `
    <article class="glass feed-card">
      <a class="feed-link" href="${escapeHtml(sanitizeUrl(it.link))}" target="_blank" rel="noopener noreferrer">
        <h3>${escapeHtml(decodeHtmlEntities(it.title))}</h3>
        <p class="feed-meta">${escapeHtml(decodeHtmlEntities(it.source || '未知来源'))} · ${escapeHtml(formatDate(it.pubDate))}</p>
        ${it.snippet ? `<p class="feed-snippet">${escapeHtml(decodeHtmlEntities(it.snippet))}</p>` : ''}
      </a>
      <button class="fav-btn${isFavorite(it.link) ? ' active' : ''}" data-link="${escapeHtml(sanitizeUrl(it.link))}" type="button" aria-label="收藏">♥</button>
    </article>`,
    )
    .join('');
}

/** 将 HTML 实体（如 &amp; &quot; &#39;）解码为普通字符 */
function decodeHtmlEntities(text: string): string {
  const el = document.createElement('textarea');
  el.innerHTML = text;
  return el.value;
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
