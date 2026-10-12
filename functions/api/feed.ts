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
// 注：本目录（functions/）不被 Astro 的 TS 程序纳入 astro check，故用宽松类型。

// 允许代理的目标主机白名单（与 src/data/feeds.json 的 RSS 源保持一致）
const ALLOWED_HOSTS: string[] = [
  'news.google.com',
  'hn.algolia.com',
  'rss.arxiv.org',
  'www.qbitai.com',
  'www.ifanr.com',
  'www.ithome.com',
  'techcrunch.com',
  'arstechnica.com',
  'rsshub.app',
];

const CACHE_TTL = 600; // 秒

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.internal') || h.endsWith('.local')) return true;
  return /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
}

export const onRequest = async (context: any) => {
  const request: Request = context.request;
  const here: URL = new URL(request.url);
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
