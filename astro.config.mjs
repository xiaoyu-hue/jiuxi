import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// base：站点在域名下的子路径，可由环境变量 SITE_BASE 覆盖（默认根路径，方便本地开发）。
//   - 当前仅部署到 Cloudflare Pages（根路径或自定义域名）：base = '/'（SITE_BASE 留空）。
//   - 若日后要挂到子路径，设 SITE_BASE=/xxx/ 即可（本地开发同样适用）。
//
// site：规范域名（用于 sitemap / RSS / OG 绝对地址）。由 CI 通过 SITE_URL 注入
//   「源站域名」（注意：是 origin，子路径由 base 负责），缺省为 Cloudflare 主站。
//   site 仅影响构建产物里的绝对地址，本地 dev 仍用 localhost。
export default defineConfig({
  site: process.env.SITE_URL || 'https://jiuxi-bm1.pages.dev',
  base: process.env.SITE_BASE || '/',
  // 输出为静态站点（默认 'static'），无需任何服务器。
  // —— 进阶（可选，启用前请权衡）——
  // 若要做到「每次访问都新鲜」且由服务端 sanitize，可升级为 hybrid + 第一方函数：
  //   1) 安装适配器（注意版本需与 Astro 大版本匹配，本项目当前为 Astro 7，需选用对应的 @astrojs/cloudflare 大版本）：
  //      npm i -D @astrojs/cloudflare@^12
  //      （当前 SSR 未启用，故未把它加入依赖，避免无用依赖与连带漏洞）
  //   2) 上方 import 改为：import cloudflare from '@astrojs/cloudflare';
  //   3) 设 output: 'hybrid'，并在 integrations 加 adapter: cloudflare()；
  //   4) 将 FeedSection 的资讯渲染改为 Server Island（server:defer）走 /api/feed。
  // ⚠️ 说明：已移除 GitHub Pages 备站（它原先是「暂不开 SSR」的主要理由——
  //    GH Pages 只托管静态产物、无法承载 SSR）。现在只剩 Cloudflare 单站，
  //    若日后要开 SSR 让「每次访问都新鲜」，直接走上述 hybrid 路线即可（已无站点兼容顾虑）。
  //    当前先保留静态：「第一方 Functions 代理 + 定时重建」已能兼顾新鲜度，故暂不开启。
  output: 'static',
  // SEO：自动生成 sitemap-index.xml（含全站页面绝对地址）
  integrations: [sitemap()],
  vite: {
    // Tailwind CSS v4：通过 Vite 插件接入，无需额外 config 文件
    plugins: [tailwindcss()],
  },
});
