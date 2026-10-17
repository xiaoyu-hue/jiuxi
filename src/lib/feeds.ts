import { z } from 'zod';

// 九溪 · 动态资讯数据源与渲染（纯前端，无后端）
//
// 数据在构建期由 scripts/fetch-feeds.mjs 抓取并注入各页面 HTML
// （<script type="application/json" id="jiuxi-feed-*">），本模块只负责：
//   1) 解析 RSS / HN（parseRss / parseHn）；
//   2) 跨源聚簇去重（clusterItems）；
//   3) 按热度排序（rankByHeat）；
//   4) 把条目渲染成卡片（renderItems / wireFavorites）。
// 安全：所有外部文本在渲染前都经 HTML 转义，避免 XSS。

import { isFavorite, toggleFavorite } from './favorites';
import { sanitizeUrl, escapeHtml } from './security';
import { extractFromXml } from '@extractus/feed-extractor';
import feedsData from '../data/feeds.json';
import type { Section } from './sections';

export type { Section };

export interface FeedItem {
  title: string;
  link: string;
  source?: string;
  pubDate?: string;
  snippet?: string;
  /** 聚簇后聚合的来源标签：同一事件被多源报道时累计（如 ["量子位", "Hacker News"]） */
  sources?: string[];
}

interface FeedSource {
  label: string;
  url: string;
  type: 'rss' | 'hn';
}

// 数据源外置到 src/data/feeds.json（运行端与构建端共用的唯一配置）。
// Section 联合类型由 sections.ts 从本文件的 sections 键动态派生（15 板块），
// 新增板块无需改任何 TS 代码。

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

/**
 * 合并去重：以 link 为键去重，在线结果优先（同链接取 incoming），最多 24 条。
 * 选取方式为**按源轮询（round-robin）**：每个源轮流取一条（组内按发布时间降序），
 * 直到凑满上限。纯按时间排序时，高频源（ArXiv 日更 15 条、IT之家、HN）会占满
 * 全部名额，低频源（周更的阮一峰、量少的触乐/OpenAI）永远排不进来，与「综合
 * 信息聚集地」的多元化定位相悖（2026-10-12 实测复现：21 源配置下 AI 板块
 * 24 条被 ArXiv×15 + 量子位×9 占满，新源零曝光）。无 source 字段的条目归入
 * 同一组（单组时等价于按时间降序，保持既有行为）。
 *
 * 用于「构建期内嵌 ∪ 在线最新」的并集，保证后台刷新永远不会把已展示内容
 * 「回退/冲掉」。
 */
export function mergeFeedItems(base: FeedItem[], incoming: FeedItem[]): FeedItem[] {
  const map = new Map<string, FeedItem>();
  for (const it of base) if (it.link) map.set(it.link, it);
  for (const it of incoming) if (it.link) map.set(it.link, it); // incoming 覆盖同链接

  // 按 source 分组，组内按发布时间降序
  const groups = new Map<string, FeedItem[]>();
  for (const it of map.values()) {
    const key = it.source || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });
  }

  // 轮询：每轮每个源取一条，直到凑满 24 条或所有源取尽
  const out: FeedItem[] = [];
  let round = 0;
  while (out.length < 24) {
    let added = false;
    for (const list of groups.values()) {
      if (round < list.length) {
        out.push(list[round]);
        added = true;
        if (out.length >= 24) break;
      }
    }
    if (!added) break;
    round++;
  }
  return out;
}

// ── 聚簇：跨源同事件归并（消除重复，呼应 AIHOT 的「聚合→聚簇→热度」思路）──
// 同一事件常被多个源报道（Google News 聚合 + 原站 + HN 转帖），标题相似但链接不同，
// 直接展示会产生一堆重复。这里按「标题词集合 Jaccard 相似度」归并为一个条目，
// 累计来源数（用作热度），保留最新/最完整的一条为代表。纯函数、无 DOM 依赖，
// 纯前端聚簇：构建期注入的数据与浏览器端渲染共用同一套去重逻辑。
const TITLE_STOP = new Set([
  'the',
  'a',
  'an',
  'of',
  'to',
  'in',
  'on',
  'for',
  'and',
  'with',
  'is',
  'are',
  'via',
  'how',
  'why',
  'this',
  'that',
  'what',
  '的',
  '了',
  '与',
  '和',
  '及',
  '在',
  '是',
  '等',
  '如何',
  '什么',
  '为什么',
  '怎么',
  '一款',
  '一个',
]);

function normalizeTitle(t: string): string {
  return (t || '')
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleTokens(t: string): Set<string> {
  return new Set(
    normalizeTitle(t)
      .split(' ')
      .filter((w) => w.length > 1 && !TITLE_STOP.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * 跨源聚簇：把标题相似（词集合 Jaccard ≥ 0.5）的条目合并为一条。
 * 合并后保留最新发布时间/最长标题作代表，sources 累计去重来源标签。
 */
export function clusterItems(items: FeedItem[]): FeedItem[] {
  const prepared = (items || [])
    .filter((it) => it && it.title)
    .map((it) => ({ it, tk: titleTokens(it.title) }));
  const clusters: { rep: FeedItem; tk: Set<string>; sources: string[] }[] = [];

  for (const { it, tk } of prepared) {
    let merged = false;
    for (const c of clusters) {
      if (jaccard(tk, c.tk) >= 0.5) {
        // 入参条目自身可能已带 sources（聚合端点产物经前端复聚的路径）：
        // 优先累加其来源数组，只认 it.source 会把 ["量子位","HN"] 漏成
        // 单个 " · " 连接字符串，多源计数在 rankByHeat 里静默失效
        // （2026-10-15 审查 M23 写测试时发现并修复）。
        const incoming = it.sources?.length ? it.sources : it.source ? [it.source] : [];
        for (const s of incoming) {
          if (s && !c.sources.includes(s)) c.sources.push(s);
        }
        const da = it.pubDate ? new Date(it.pubDate).getTime() : 0;
        const db = c.rep.pubDate ? new Date(c.rep.pubDate).getTime() : 0;
        if (da > db) {
          c.rep = { ...c.rep, ...it, sources: c.sources };
        }
        c.tk = new Set([...c.tk, ...tk]);
        merged = true;
        break;
      }
    }
    if (!merged) {
      // 新簇保留入参已有的 sources 数组（端点已聚簇产物复聚时不塌缩），
      // 否则 sources 从 ["量子位","HN"] 变成 ["量子位 · HN"]，长度恒为 1。
      clusters.push({
        rep: { ...it },
        tk,
        sources: it.sources?.length ? [...it.sources] : it.source ? [it.source] : [],
      });
    }
  }

  return clusters.map((c) => ({
    ...c.rep,
    source: c.sources.length ? c.sources.join(' · ') : c.rep.source,
    sources: c.sources,
  }));
}

/**
 * 将资讯渲染进容器（客户端注入，须全局样式配合）。
 * 标题/来源/摘要一律用 textContent 写入（天然免疫 XSS，无需 HTML 转义）；
 * 链接用 sanitizeUrl 校验后写 href / data-link。
 */
/**
 * 「今日热点」排序 + 同源限流：先按独立信源数降序，平局再按时间降序打破；
 * 同一来源 label 在结果里最多 maxPerSource 条，避免单一媒体刷屏。
 * @maxPerSource 传 0/undefined 表示不限流。
 */
export function rankByHeat<T extends { sources?: string[]; source?: string; pubDate?: string }>(
  items: T[],
  maxPerSource?: number,
): T[] {
  const timeDesc = (a: T, b: T) =>
    (b.pubDate ? Date.parse(b.pubDate) : 0) - (a.pubDate ? Date.parse(a.pubDate) : 0);
  const sorted = [...items].sort(
    (a, b) => (b.sources?.length || 1) - (a.sources?.length || 1) || timeDesc(a, b),
  );
  if (!maxPerSource || maxPerSource <= 0) return sorted;
  const counts = new Map<string, number>();
  const out: T[] = [];
  for (const it of sorted) {
    const key = it.source || it.sources?.[0] || 'unknown';
    const n = counts.get(key) || 0;
    if (n >= maxPerSource) continue;
    counts.set(key, n + 1);
    out.push(it);
  }
  return out;
}

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

    // 栏目编号 / 来源：编辑策展意图（编号居前，来源次之）。
    // 聚簇后若同一事件被多源报道，显示主要来源 +「+N」来源数徽标。
    const srcCount = it.sources?.length ?? (it.source ? 1 : 0);
    const srcLabel =
      srcCount > 1
        ? `${it.sources!.slice(0, 2).join('·')}${srcCount > 2 ? ` +${srcCount - 2}` : ''}`
        : it.source || '资讯';
    const kicker = document.createElement('span');
    kicker.className = 'feed-kicker';
    kicker.textContent = `${String(i + 1).padStart(2, '0')} / ${srcLabel}`;
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
    // 经 escapeHtml 转义后写入 data-* 属性：序列化后的 HTML 不再含裸 < >，
    // 杜绝属性值被误判为可执行标签；浏览器读取 dataset 时会自动解码回原值，
    // 故 wireFavorites 取到的 title/source 仍是原始文本，收藏功能不受影响。
    fav.dataset.title = escapeHtml(it.title || '');
    fav.dataset.source = escapeHtml(it.source || '');
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
      const nowFav = toggleFavorite({
        link,
        title: btn.dataset.title || link,
        source: btn.dataset.source || undefined,
      });
      btn.classList.toggle('active', nowFav);
    });
  });
}

// P1-5 type-safety + P2-4 bad-data guard: runtime zod check for FeedItem
export const FeedItemSchema = z.object({
  title: z.string().min(1),
  link: z.string().min(1),
  source: z.string().optional(),
  pubDate: z.string().optional(),
  snippet: z.string().optional(),
  sources: z.array(z.string()).optional(),
});
export type FeedItemClean = z.infer<typeof FeedItemSchema>;
export function cleanFeedItems(raw: unknown): FeedItemClean[] {
  if (!Array.isArray(raw)) return [];
  const out: FeedItemClean[] = [];
  for (const it of raw) {
    const r = FeedItemSchema.safeParse(it);
    if (r.success) out.push(r.data);
  }
  return out;
}
