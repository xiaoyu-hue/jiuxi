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
  // 输出为静态站点（默认 'static'），无需任何服务器。
  // —— 进阶（可选，启用前请权衡）——
  // 若要做到「每次访问都新鲜」且由服务端 sanitize，可升级为 hybrid + 第一方函数：
  //   1) 安装适配器（注意版本需与 Astro 大版本匹配，本项目 Astro 5 对应 ^12）：
  //      npm i -D @astrojs/cloudflare@^12
  //      （当前 SSR 未启用，故未把它加入依赖，避免无用依赖与连带漏洞）
  //   2) 上方 import 改为：import cloudflare from '@astrojs/cloudflare';
  //   3) 设 output: 'hybrid'，并在 integrations 加 adapter: cloudflare()；
  //   4) 将 FeedSection 的资讯渲染改为 Server Island（server:defer）走 /api/feed。
  // ⚠️ 代价：开启 SSR 后 GitHub Pages 备站将无法承载（GH Pages 只托管静态产物），
  //    必须二选一——放弃 GH Pages 备站，或把备站也放到 Cloudflare。当前先保留静态，
  //    用「第一方 Functions 代理 + 定时重建」已能兼顾新鲜度与双站部署，故暂不开启 SSR。
  output: 'static',
  // SEO：自动生成 sitemap-index.xml（含全站页面绝对地址）
  integrations: [sitemap()],
  vite: {
    // Tailwind CSS v4：通过 Vite 插件接入，无需额外 config 文件
    plugins: [tailwindcss()],
  },
});
