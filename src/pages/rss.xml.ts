import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { withBase } from '../lib/site';

// 九溪 · RSS 订阅源
// 聚合三个策展集合（时间线 / 工具箱 / 读书），供读者订阅更新。
// 绝对地址依赖 astro.config 的 site + base（双站自动正确）。
//
// 注意：RSS 仅包含静态策展内容。动态资讯板块（AI / 热点 / 科技 / 游戏）
// 依赖浏览器端实时抓取，无法在构建时预取。如需订阅动态资讯，
// 请直接在各板块页面内收藏，或通过浏览器的 RSS 阅读器订阅 Google News。
export async function GET(context: APIContext) {
  const [timeline, tools, reading] = await Promise.all([
    getCollection('timeline'),
    getCollection('tools'),
    getCollection('reading'),
  ]);

  const timelineItems = timeline.map((p) => ({
    title: p.data.title,
    description: p.data.source ? `来源：${p.data.source}` : p.data.category,
    link: withBase('/timeline'),
    pubDate: new Date(p.data.year, (p.data.month ?? 1) - 1, 1),
  }));

  const toolItems = tools.map((p) => ({
    title: p.data.name,
    description: p.data.tagline ?? p.data.category,
    link: withBase('/tools'),
  }));

  const readingItems = reading.map((p) => ({
    title: p.data.author ? `${p.data.title} — ${p.data.author}` : p.data.title,
    description: p.data.tag,
    link: withBase('/reading'),
  }));

  return rss({
    title: '九溪',
    description: '九溪 · 综合信息聚集地（AI 为主，热点新闻为辅）',
    site: context.site ?? 'https://jiuxi-bm1.pages.dev',
    items: [...timelineItems, ...toolItems, ...readingItems],
  });
}
