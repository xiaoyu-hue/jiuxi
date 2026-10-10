// 九溪 · 第一方 CORS 代理（Cloudflare Pages Functions）
//
// 用途：浏览器端实时抓取公开 RSS / 公开 API 时，由本站自己的服务端函数转发，
//       根除对 allorigins / corsproxy 等第三方代理的依赖，提升成功率与隐私。
// 仅主站（Cloudflare Pages，*.pages.dev 或自定义域名）会部署此函数；
// 副站（GitHub Pages，*.github.io）没有函数，浏览器端自动回退到公共代理链。
//
// 安全：仅允许 GET；目标协议仅限 http/https；响应带宽松 CORS 头；不做任何鉴权转发。

interface ProxyContext {
  request: Request;
}

export const onRequest = async (context: ProxyContext): Promise<Response> => {
  const reqUrl = new URL(context.request.url);
  const target = reqUrl.searchParams.get('url');

  if (!target) {
    return new Response('missing "url" parameter', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response('invalid url', { status: 400 });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new Response('unsupported protocol (only http/https allowed)', { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'JiuXi-FirstPartyProxy/1.0 (+https://github.com/xiaoyu-hue/jiuxi)',
      },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': upstream.headers.get('Content-Type') || 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return new Response('upstream fetch failed', { status: 502 });
  }
};
