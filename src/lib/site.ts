// 九溪 · 站点链接工具
//
// Astro 的 `base` 配置只会重写 import 的资源与框架注入的路径，
// 不会重写模板里手写的 <a href="/...">。本项目在 GitHub Pages 下以
// /jiuxi/ 为 base，手写绝对路径会指向根域名而 404。
// 统一用 withBase() 拼接，构建期会被 import.meta.env.BASE_URL 静态替换。

/** 给内部路径拼接站点 base，确保 GitHub Pages 子路径下链接正确 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  if (!path || path === '/') return base;
  const clean = path.startsWith('/') ? path : `/${path}`;
  const stripped = base.endsWith('/') ? base.slice(0, -1) : base;
  return stripped + clean;
}
