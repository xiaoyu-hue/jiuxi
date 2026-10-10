import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// base：站点在域名下的子路径，可由环境变量 SITE_BASE 覆盖（默认根路径，方便本地开发）。
//   - 本地开发 / Cloudflare Pages（根路径或自定义域名）：base = '/'（SITE_BASE 留空）
//   - GitHub Pages 项目站点固定为 https://<用户名>.github.io/<仓库名>/：
//     构建时注入 SITE_BASE=/jiuxi/（见 .github/workflows/deploy.yml 的 build-pages job）
//
// site：规范域名（用于 sitemap / RSS / OG 绝对地址）。双站部署时由各 CI job 通过
//   SITE_URL 注入对应「源站域名」（注意：是 origin，/jiuxi 子路径由 base 负责），
//   缺省为主站。site 仅影响构建产物里的绝对地址，本地 dev 仍用 localhost。
export default defineConfig({
  site: process.env.SITE_URL || 'https://jiuxi-bm1.pages.dev',
  base: process.env.SITE_BASE || '/',
  // 输出为静态站点（默认 'static'），无需任何服务器
  output: 'static',
  // SEO：自动生成 sitemap-index.xml（含全站页面绝对地址）
  integrations: [sitemap()],
  vite: {
    // Tailwind CSS v4：通过 Vite 插件接入，无需额外 config 文件
    plugins: [tailwindcss()],
  },
});
