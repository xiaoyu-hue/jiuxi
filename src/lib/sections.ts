import feedsData from '../data/feeds.json';

// 九溪 · 板块注册表（唯一事实来源）
//
// Section 类型与板块顺序/元数据全部从 src/data/feeds.json 派生：
//   - 新增板块只需在 feeds.json 的 sections 里加一段，本文件补一条 SECTION_META，
//     动态路由 [section].astro、导航 SiteNav、首页 index、热点 hot/curate 全部自动生效；
//   - 曾硬编码 'ai'|'news'|'tech'|'gaming' 四板块联合类型（2026-10-15 扩容至
//     15 板块时改为派生），漏同步会静默少页面——同类回归不再可能。

export type Section = keyof typeof feedsData.sections;

/** 展示顺序（对象键序即 JSON 书写序，新增板块加在 feeds.json 末尾即可） */
export const SECTION_ORDER = Object.keys(feedsData.sections) as Section[];

/** 每板块的导航短标签与页面描述（title 由路由层拼「XX 板块」） */
export const SECTION_META: Record<Section, { label: string; desc: string }> = {
  ai: { label: 'AI', desc: 'AI 前沿资讯与动态，实时聚合。' },
  news: { label: '新闻', desc: '实时热点，全球视角。' },
  tech: { label: '科技', desc: '科技圈新进展。' },
  gaming: { label: '游戏', desc: '游戏与泛娱乐资讯。' },
  finance: { label: '财经', desc: '市场、公司与宏观财经动态。' },
  sports: { label: '体育', desc: '赛事、球队与体育产业资讯。' },
  health: { label: '健康', desc: '医疗、公共卫生与健康生活。' },
  science: { label: '科学', desc: '前沿科研与科学探索。' },
  education: { label: '教育', desc: '政策、校园与教育科技。' },
  auto: { label: '汽车', desc: '新车、出行与汽车产业。' },
  home: { label: '家居', desc: '家居设计与房产资讯。' },
  travel: { label: '旅行', desc: '目的地、航空与旅行体验。' },
  food: { label: '美食', desc: '餐饮、食谱与饮食文化。' },
  // 注意：资讯板块 key 为 books（路由 /books）；/reading 是读书推荐内容页
  // （astro:content 集合，非资讯板块），两者刻意并存、互不冲突。
  books: { label: '读书', desc: '书讯、出版与阅读资讯。' },
  dev: { label: '开发', desc: '编程、开源与开发者工具。' },
};

/** 每个板块的 RSS 源数量（导航/首页展示「N 源」用，避免各页面重复计算） */
export const SECTION_SOURCE_COUNT: Record<Section, number> = Object.fromEntries(
  SECTION_ORDER.map((s) => [s, feedsData.sections[s].length]),
) as Record<Section, number>;
