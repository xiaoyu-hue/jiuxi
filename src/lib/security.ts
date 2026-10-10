// 九溪 · 客户端安全工具
//
// 外部来源（RSS / Hacker News / 代理 / 收藏）的链接不可信，
// 若直接写进 href，javascript:/data:/file: 等协议可在某些上下文触发 XSS 或危险行为。
// 这里只放行 http/https/mailto 与相对路径，其余一律降级为 "#"。

/** 校验链接协议，危险协议返回 "#"，安全协议或相对路径原样返回 */
export function sanitizeUrl(url: string): string {
  const u = String(url ?? '').trim();
  if (u === '') return '#';
  // 含控制字符（含换行/Tab）视为构造型输入，直接拦截
  // eslint-disable-next-line no-control-regex -- 故意匹配控制字符以拦截构造型 URL
  if (/[\u0000-\u001f\u007f]/.test(u)) return '#';
  // 协议相对 URL（//evil.com）在 href 中会跳转到外部域（钓鱼/开放重定向），按危险处理
  if (u.startsWith('//')) return '#';
  // 允许的安全协议
  if (/^(https?:|mailto:)/i.test(u)) return u;
  // 任何其它“带协议”的写法（javascript: / data: / vbscript: / file: 等）一律拦截
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '#';
  // 其余视为相对路径或锚点（安全）
  return u;
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
