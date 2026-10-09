import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// base：站点在域名下的子路径，可由环境变量 SITE_BASE 覆盖（默认根路径，方便本地开发）。
//   - 本地开发 / Cloudflare Pages（根路径或自定义域名）：base = '/'（SITE_BASE 留空）
//   - GitHub Pages 项目站点固定为 https://<用户名>.github.io/<仓库名>/：
//     构建时注入 SITE_BASE=/jiuxi/（见 .github/workflows/deploy.yml 的 build-pages job）
export default defineConfig({
  site: 'https://xiaoyu-hue.github.io',
  base: process.env.SITE_BASE || '/',
  // 输出为静态站点（默认 'static'），无需任何服务器
  output: 'static',
  vite: {
    // Tailwind CSS v4：通过 Vite 插件接入，无需额外 config 文件
    plugins: [tailwindcss()],
  },
});
