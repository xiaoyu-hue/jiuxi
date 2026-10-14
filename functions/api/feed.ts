// 九溪 · 第一方 feed 代理（Cloudflare Pages Function）
//
// 部署在 Cloudflare Pages 时，本文件自动挂载为 /api/feed，与站点**同域**。
// 这是取代 allorigins / corsproxy 等第三方代理的第一方方案：可信、可控、零额外成本，
// 且因同源，站点 CSP 的 connect-src 只需 'self' 即可放行（无需放行外部代理域名）。
//
// 安全措施：
//   1) 严格目标主机白名单（仅允许固定的少数资讯源）；
//   2) 禁止非 http/https 协议、禁止私有/内网/回环地址（防 SSRF）；
//   3) 仅放行本站 Origin（防被当作开放中继打其它站点）；
//   4) 边缘缓存（caches.default）降低源站压力、抗抖动。
//
// 注：functions/ 目录实际会被 astro check 检查（2026-10-12 踩坑证实），改动需过类型门禁。

// 允许代理的目标主机白名单（与 src/data/feeds.json 的 RSS 源保持一致）
const ALLOWED_HOSTS: string[] = [
  'news.google.com',
  'hn.algolia.com',
  'rss.arxiv.org',
  'www.qbitai.com',
  'openai.com',
  'blog.google',
  'www.ifanr.com',
  'www.ithome.com',
  'sspai.com',
  'techcrunch.com',
  'arstechnica.com',
  'www.theverge.com',
  'www.ruanyifeng.com',
  'www.solidot.org',
  'www.gcores.com',
  'www.chuapp.com',
];

const CACHE_TTL = 600; // 秒

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.internal') || h.endsWith('.local')) return true;
  return /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
}

// ── 聚合模式辅助（?aggregate=1）：服务端跨源聚簇，返回干净 JSON ──
// 与 src/lib/feeds.ts 的 clusterItems 同一套算法，确保主站（服务端聚簇）与
// 备站（前端逐源聚簇）行为一致。仅用 Web 标准 API，无 DOM 依赖。

const TITLE_STOP = new Set([
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'with', 'is', 'are', 'via',
  'how', 'why', 'this', 'that', 'what',
  '的', '了', '与', '和', '及', '在', '是', '等', '如何', '什么', '为什么', '怎么', '一款', '一个',
]);
function normalizeTitle(t: string): string {
  return (t || '')
    .toLowerCase()
    .replace(/[\s ]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function titleTokens(t: string): Set<string> {
  return new Set(normalizeTitle(t).split(' ').filter((w) => w.length > 1 && !TITLE_STOP.has(w)));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}
function clusterFeed(items: any[]): any[] {
  const prepared = (items || []).filter((it) => it && it.title).map((it) => ({ it, tk: titleTokens(it.title) }));
  const clusters: { rep: any; tk: Set<string>; sources: string[] }[] = [];
  for (const { it, tk } of prepared) {
    let merged = false;
    for (const c of clusters) {
      if (jaccard(tk, c.tk) >= 0.5) {
        const src = it.source || '';
        if (src && !c.sources.includes(src)) c.sources.push(src);
        const da = it.pubDate ? new Date(it.pubDate).getTime() : 0;
        const db = c.rep.pubDate ? new Date(c.rep.pubDate).getTime() : 0;
        if (da > db) c.rep = { ...c.rep, ...it, sources: c.sources };
        c.tk = new Set([...c.tk, ...tk]);
        merged = true;
        break;
      }
    }
    if (!merged) clusters.push({ rep: { ...it }, tk, sources: it.source ? [it.source] : [] });
  }
  return clusters.map((c) => ({
    ...c.rep,
    source: c.sources.length ? c.sources.join(' · ') : c.rep.source,
    sources: c.sources,
  }));
}

// ── D1 写穿（B-2 候选持久化）：聚簇结果落 candidates 表，跨会话留痕 ──
// 仅用 Web 标准 D1 API；best-effort，任何失败只告警不阻断响应。
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h + s.charCodeAt(i)) >>> 0) >>> 0;
  return h.toString(16);
}

async function persistCandidates(env: any, section: string | null, items: any[]): Promise<void> {
  const db = env && env.DB;
  if (!db || !section || !items || !items.length) return;
  const now = Date.now();
  const stmts: any[] = [];
  for (const it of items.slice(0, 30)) {
    const title = (it.title || '').trim();
    if (!title || !it.link) continue;
    const hash = djb2(normalizeTitle(title) + '|' + section);
    const sourceList = JSON.stringify(
      it.sources && it.sources.length ? it.sources : it.source ? [it.source] : [],
    );
    stmts.push(
      db
        .prepare(
          `INSERT INTO candidates (section, title, url, source, source_list, snippet, pub_date, cluster_size, hash, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(hash) DO UPDATE SET
             title=excluded.title, url=excluded.url, source=excluded.source,
             source_list=excluded.source_list, snippet=excluded.snippet, pub_date=excluded.pub_date,
             cluster_size=excluded.cluster_size, updated_at=excluded.updated_at`,
        )
        .bind(
          section,
          title,
          it.link,
          it.source || null,
          sourceList,
          (it.snippet || '').slice(0, 280) || null,
          it.pubDate || null,
          it.sources?.length || 1,
          hash,
          now,
          now,
        ),
    );
  }
  // 超出 250 条时裁剪最旧（按 updated_at），避免无限增长
  stmts.push(
    db
      .prepare(
        `DELETE FROM candidates WHERE section=? AND id NOT IN (SELECT id FROM candidates WHERE section=? ORDER BY updated_at DESC LIMIT 250)`,
      )
      .bind(section, section),
  );
  try {
    await db.batch(stmts);
  } catch (e: any) {
    console.warn('[九溪] 候选落库失败（不影响响应）:', (e && e.message) || e);
  }
}

// 轻量 RSS/Atom 解析（Worker 端不引 feed-extractor，正则提取覆盖九溪全部源）
function decodeEntities(s: string): string {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}
function tagText(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? decodeEntities(m[1]) : null;
}
function linkOf(block: string): string | null {
  const rss = block.match(/<link>([\s\S]*?)<\/link>/i);
  if (rss && rss[1].trim()) return rss[1].trim();
  const atom = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
  if (atom) return atom[1].trim();
  return null;
}
function parseFeedXml(xml: string): any[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];
  const out: any[] = [];
  for (const b of blocks) {
    const title = tagText(b, 'title');
    const link = linkOf(b);
    if (!title || !link) continue;
    out.push({
      title,
      link,
      pubDate: tagText(b, 'pubDate') || tagText(b, 'updated') || tagText(b, 'published') || undefined,
      snippet: (tagText(b, 'description') || tagText(b, 'summary') || '').slice(0, 140) || undefined,
    });
  }
  return out.slice(0, 30);
}

async function handleAggregate(here: URL, env: any): Promise<Response> {
  const section = here.searchParams.get('section');
  const specs = here.searchParams.getAll('s').filter(Boolean);
  if (!specs.length) return new Response('missing s', { status: 400 });
  const collected: any[] = [];
  for (const spec of specs) {
    const idx = spec.indexOf('@');
    if (idx < 0) continue;
    const label = spec.slice(0, idx);
    let parsed: URL;
    try {
      parsed = new URL(spec.slice(idx + 1));
    } catch {
      continue;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
    if (!ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase()) || isPrivateHost(parsed.hostname)) continue;
    try {
      const upstream = await fetch(parsed.toString(), {
        headers: { 'User-Agent': 'Jiuxi/1.0 (+https://jiuxi-bm1.pages.dev)' },
        redirect: 'follow',
      });
      const text = await upstream.text();
      const items = parseFeedXml(text).map((it) => ({ ...it, source: it.source || label }));
      collected.push(...items);
    } catch {
      /* 单源失败跳过，不阻断其它源 */
    }
  }
  const clustered = clusterFeed(collected);
  // 按独立信源数（热度）降序：被越多不同源报道的事件越重要
  clustered.sort((a: any, b: any) => (b.sources?.length || 1) - (a.sources?.length || 1));
  const items = clustered.slice(0, 30);
  // 写穿：聚簇结果落 D1（best-effort，失败不阻断）；缺 DB 或 section 时静默跳过
  await persistCandidates(env, section, items);
  return new Response(JSON.stringify({ items, persisted: !!env?.DB }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
      'Access-Control-Allow-Origin': here.origin,
    },
  });
}

export const onRequest = async (context: any) => {
  const request: Request = context.request;
  const here: URL = new URL(request.url);
  // 聚合模式：?aggregate=1&s=<label>@<enc_url>&s=... ——跨源拉取→聚簇→按独立信源数排热度。
  // 主站（有 Functions）走此分支，前端一次请求拿到理好的候选；备站无 Functions 时
  // 该请求失败，前端自动降级为逐源拉取 + 前端聚簇（效果一致）。仅放行同源调用。
  if (here.searchParams.get('aggregate') === '1') {
    const origin = request.headers.get('origin');
    if (origin && origin !== here.origin) return new Response('origin not allowed', { status: 403 });
    return handleAggregate(here, context.env);
  }

  const target = here.searchParams.get('url');
  if (!target) return new Response('missing url', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response('invalid url', { status: 400 });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new Response('protocol not allowed', { status: 403 });
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase()) || isPrivateHost(parsed.hostname)) {
    return new Response('host not allowed', { status: 403 });
  }

  // 仅放行本站 Origin，避免被当作开放中继
  const origin = request.headers.get('origin');
  if (origin && origin !== here.origin) {
    return new Response('origin not allowed', { status: 403 });
  }

  // 直连上游并返回。注意：不要使用 caches.default（Cache API）——wrangler 打包
  // Pages Function 时会为 Cache API 引入 node:stream 垫片，而默认运行时没有它，
  // 会导致「发布失败: No such module node:stream」。RSS 体积小，直连即可，
  // 边缘缓存交由 Cloudflare 默认行为/Cache-Control 头处理。
  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Jiuxi/1.0 (+https://jiuxi-bm1.pages.dev)' },
      redirect: 'follow',
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/xml; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
        'Access-Control-Allow-Origin': here.origin,
      },
    });
  } catch {
    return new Response('upstream error', { status: 502 });
  }
};
