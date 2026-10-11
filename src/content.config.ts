// 九溪 · 内容集合（策展数据）
// 每篇内容是一个 Markdown 文件，手机上可直接在 GitHub 编辑、提交即上线。
// 注意：`z` 必须仍从 'astro:content' 导入，不可改为从 'zod' 导入。
// Astro 的 content collection 依赖 astro:content 导出的 z 来推断每篇内容 e.data 的字段类型；
// 改用 zod 的 z 会使类型推断断裂（实测 astro check 报 53 个 'e.data is of type unknown' 错误）。
// 因此保留 astro:content 导入会有 24 条非阻断的 z 弃用 hint，属无害噪音；
// 待 Astro 未来大版本提供 content collection 配套的 zod 迁移方案时再调整。
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// AI 发展时间线：年代 + 事件 + 类别 + 来源
const timeline = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/timeline' }),
  schema: z.object({
    year: z.number(),
    month: z.number().optional(),
    title: z.string(),
    category: z.string().default('其他'),
    source: z.string().optional(),
    sourceUrl: z.string().url().optional(),
  }),
});

// AI 工具箱：名称 + 链接 + 分类 + 简介
const tools = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tools' }),
  schema: z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.string().default('其他'),
    tagline: z.string().optional(),
  }),
});

// 读书推荐：书名 + 作者 + 评分 + 标签 + 链接
const reading = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reading' }),
  schema: z.object({
    title: z.string(),
    author: z.string().optional(),
    cover: z.string().optional(),
    link: z.string().url().optional(),
    rating: z.number().min(0).max(5).optional(),
    tag: z.string().default('推荐'),
  }),
});

export const collections = { timeline, tools, reading };
