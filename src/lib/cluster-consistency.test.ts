import { describe, it, expect } from 'vitest';
import { clusterItems, type FeedItem } from './feeds';
// functions/api/feed.ts 无任何 import、无模块级副作用，可被 vitest 直接导入。
// clusterFeed 在该文件中专为本测试导出（生产入口仍只有 onRequest）。
import { clusterFeed } from '../../functions/api/feed';

// 算法一致性锁（2026-10-15 审查 M23）：
// clusterFeed（Cloudflare 边缘聚合端点）与 clusterItems（前端复聚，无 Functions 时生效）是
// 刻意保留的跨端同构副本——抽不出共享模块（feeds.ts 含 DOM 依赖，进不了
// Function 运行时），只能用测试锁死两份实现的漂移：任何一侧单独改动算法、
// 停用词表或合并规则，都会在这里红灯，提醒同步另一侧。

const sampleItems: FeedItem[] = [
  {
    title: 'OpenAI releases new model',
    link: 'https://a.com/1',
    source: 'OpenAI',
    pubDate: '2026-10-14T10:00:00Z',
  },
  {
    title: 'OpenAI releases new model update',
    link: 'https://b.com/2',
    source: 'TechCrunch',
    pubDate: '2026-10-15T10:00:00Z',
  },
  {
    title: 'Google announces quantum chip',
    link: 'https://c.com/3',
    source: 'Google',
    pubDate: '2026-10-15T08:00:00Z',
  },
  {
    title: 'Anthropic 发布新模型 Claude',
    link: 'https://d.com/4',
    source: '量子位',
    pubDate: '2026-10-13T10:00:00Z',
  },
  {
    title: 'Anthropic 发布新模型 Claude 4',
    link: 'https://e.com/5',
    source: '机器之心',
    pubDate: '2026-10-12T10:00:00Z',
  },
];

const preClustered: FeedItem[] = [
  {
    title: 'OpenAI releases new model',
    link: 'https://a.com/1',
    source: 'OpenAI · TechCrunch',
    sources: ['OpenAI', 'TechCrunch'],
    pubDate: '2026-10-15T10:00:00Z',
  },
  {
    title: 'Google announces quantum chip',
    link: 'https://c.com/3',
    source: 'Google',
    pubDate: '2026-10-15T08:00:00Z',
  },
];

describe('聚簇算法一致性（边缘 clusterFeed vs 前端 clusterItems）', () => {
  it('相同输入下两份实现输出完全一致', () => {
    expect(clusterFeed(sampleItems)).toEqual(clusterItems(sampleItems));
  });

  it('已聚簇产物复聚时输出一致（主站前端复聚端点产物路径）', () => {
    expect(clusterFeed(preClustered)).toEqual(clusterItems(preClustered));
  });

  it('空数组输入输出一致', () => {
    expect(clusterFeed([])).toEqual(clusterItems([]));
  });

  it('null / undefined 输入不抛错且输出一致', () => {
    // 两份实现对 nullish 都有 (items || []) 兜底
    expect(clusterFeed(null as unknown as FeedItem[])).toEqual(
      clusterItems(null as unknown as FeedItem[]),
    );
    expect(clusterFeed(undefined as unknown as FeedItem[])).toEqual(
      clusterItems(undefined as unknown as FeedItem[]),
    );
  });

  it('含空 title / 无 source 的脏数据输出一致', () => {
    const dirty = [
      ...sampleItems,
      { title: '', link: 'https://f.com/6', source: 'X' },
      { title: 'No source item', link: 'https://g.com/7' },
    ];
    expect(clusterFeed(dirty)).toEqual(clusterItems(dirty));
  });

  it('合并行为符合预期（合并计数、来源累计、代表选取）', () => {
    const out = clusterItems(sampleItems);
    // 两组相似标题各合并为一条 → 3 条
    expect(out).toHaveLength(3);
    const merged = out.find((i) => i.title.startsWith('OpenAI releases'))!;
    expect(merged.sources).toEqual(['OpenAI', 'TechCrunch']);
    expect(merged.source).toBe('OpenAI · TechCrunch');
    // 代表为较新 pubDate 的条目（b.com 10-15 晚于 a.com 10-14）
    expect(merged.link).toBe('https://b.com/2');
  });

  it('复聚不塌缩 sources 数组（2026-10-15 M23 回归）', () => {
    // 端点产物 sources:["OpenAI","TechCrunch"] 经前端复聚后必须原样保留，
    // 否则 rankByHeat 的多源优先级（hot.astro）静默失效。
    const twice = clusterItems(clusterItems(preClustered));
    expect(twice.find((i) => i.link === 'https://a.com/1')!.sources).toEqual([
      'OpenAI',
      'TechCrunch',
    ]);
  });

  it('复聚已聚簇产物不会继续误并（条数稳定）', () => {
    const once = clusterItems(sampleItems);
    const twice = clusterItems(once);
    expect(twice).toHaveLength(once.length);
    expect(twice.map((i) => i.link).sort()).toEqual(once.map((i) => i.link).sort());
  });
});
