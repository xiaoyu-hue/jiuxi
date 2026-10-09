import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// 九溪站点配置
// base：站点在域名下的子路径。
//   - GitHub Pages 项目站点固定为 https://<用户名>.github.io/<仓库名>/，
//     所以 base 必须设为 /jiuxi/，否则 CSS/JS/图片会因路径错误而 404。
//   - 若日后改用 Cloudflare Pages 并绑定自定义域名（根路径），需把 base 改回 '/'。
export default defineConfig({
  site: 'https://xiaoyu-hue.github.io',
  base: '/jiuxi/',
  // 输出为静态站点（默认 'static'），无需任何服务器
  output: 'static',
  vite: {
    // Tailwind CSS v4：通过 Vite 插件接入，无需额外 config 文件
    plugins: [tailwindcss()],
  },
});
