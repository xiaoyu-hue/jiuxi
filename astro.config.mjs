import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// 九溪站点配置
// site：部署后的正式地址。Cloudflare Pages 主站绑定自定义域名后改这里；
//       GitHub Pages 副站通常是 https://<用户名>.github.io/<仓库名>/，也在此设置。
//       未部署前保持占位即可，本地构建不受影响。
export default defineConfig({
  site: 'https://jiuxi.pages.dev',
  // 输出为静态站点（默认 'static'），无需任何服务器
  output: 'static',
  vite: {
    // Tailwind CSS v4：通过 Vite 插件接入，无需额外 config 文件
    plugins: [tailwindcss()],
  },
});
