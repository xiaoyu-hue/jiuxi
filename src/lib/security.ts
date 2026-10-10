// 九溪 · 客户端安全工具
//
// 外部来源（RSS / Hacker News / 代理 / 收藏）的链接不可信，
// 若直接写进 href，javascript:/data:/file: 等协议可在某些上下文触发 XSS 或危险行为。
// 这里只放行 http/https/mailto 与相对路径，其余一律降级为 "#"。

/**
 * 校验链接协议，危险协议返回 "#"，安全协议或相对路径原样返回。
 * 采用原生 URL 解析 + 协议白名单（http/https/mailto），比手写正则更稳、零额外体积。
 */
export function sanitizeUrl(url: string): string {
  const u = String(url ?? '').trim();
  if (u === '') return '#';
  // 含控制字符（含换行/Tab）视为构造型输入，直接拦截
  // eslint-disable-next-line no-control-regex -- 故意匹配控制字符以拦截构造型 URL
  if (/[\u0000-\u001f\u007f]/.test(u)) return '#';
  // 协议相对 URL（//evil.com）在 href 中会跳转到外部域（钓鱼/开放重定向），按危险处理
  if (u.startsWith('//')) return '#';
  // 站内相对路径（/ai、./foo、../x）与锚点（#top）直接放行
  if (u.startsWith('#')) return u;
  if (/^(\/|\.\/|\.\.\/)/.test(u)) return u;
  // 用原生 URL 解析，仅放行白名单协议；非合法绝对 URL 一律按危险处理
  try {
    const parsed = new URL(u);
    if (/^(https?:|mailto:)$/i.test(parsed.protocol)) return u;
  } catch {
    /* 解析失败：不是合法绝对 URL */
  }
  return '#';
}

/**
 * HTML 转义：把 & < > " ' 转成实体，避免把不可信文本注入 innerHTML 时触发 XSS。
 * 站点内所有动态拼接 HTML 的地方统一调用本函数（feeds / settings 等）。
 */
export function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
