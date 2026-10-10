// 九溪 · 备站安全头注入 Worker（可选）
//
// 背景：GitHub Pages 不支持自定义 _headers，无法下发 HSTS/CSP 等专业响应头。
// 本 Worker 在 Cloudflare 侧反代 GitHub Pages 备站域名，并补上全套安全头，使备站
// 达到与主站（Cloudflare Pages + _headers）一致的安全水位。
//
// 部署方式（二选一）：
//   A) 把备站自定义域（如 jiuxi-fallback.example.com）的 DNS 接入 Cloudflare 并开启代理（橙云），
//      再把该域名的 Worker 路由指向本文件；
//   B) 用 Wrangler 部署为独立 Worker，再把备站 CNAME 到该 Worker。
//
// 注意：本 Worker 仅做「透传 + 加头」，不缓存、不修改内容；上游仍是 GitHub Pages。
// 若不想维护额外 Worker，接受「备站仅降级（基础安全头由浏览器默认与 BaseLayout meta 兜底）」亦可。

// GitHub Pages 备站源站（含 /jiuxi 子路径由上游路由处理）
const UPSTREAM = 'https://xiaoyu-hue.github.io';

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://hn.algolia.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const upstream = new URL(UPSTREAM + url.pathname + url.search);
    const resp = await fetch(upstream, { headers: request.headers, redirect: 'follow' });
    const out = new Response(resp.body, resp);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
    return out;
  },
};
