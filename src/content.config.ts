// 九溪 · 内容集合（策展数据）
// 每篇内容是一个 Markdown 文件，手机上可直接在 GitHub 编辑、提交即上线。
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
