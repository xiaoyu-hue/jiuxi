import { describe, it, expect } from 'vitest';
import {
  parseHn,
  parseRss,
  renderItems,
  mergeFeedItems,
  clusterItems,
  rankByHeat,
  cleanFeedItems,
  type FeedItem,
} from './feeds';

describe('parseHn', () => {
  it('解析 Hacker News 命中，缺失 url 时回退 item 链接', () => {
    const items = parseHn({
      hits: [
        { title: 'Alpha', url: 'https://a.com', objectID: '1', created_at: '2024-01-01' },
        { story_title: 'Beta', objectID: '2' },
      ],
    });
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Alpha');
    expect(items[0].link).toBe('https://a.com');
    expect(items[1].title).toBe('Beta');
    expect(items[1].link).toBe('https://news.ycombinator.com/item?id=2');
    expect(items[1].source).toBe('Hacker News');
  });

  it('无 hits 或非对象时返回空数组，不抛错', () => {
    expect(parseHn({})).toHaveLength(0);
    expect(parseHn(null)).toHaveLength(0);
    expect(parseHn(undefined)).toHaveLength(0);
  });
});

describe('parseRss', () => {
  it('解析标准 RSS 并还原 HTML 实体（feed-extractor 自动解码）', () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><item><title>Hello &amp; World</title><link>https://a.com/p?x=1</link><source>SRC</source><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate><description>some &lt;b&gt;desc&lt;/b&gt;</description></item></channel></rss>`;
    const items = parseRss(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Hello & World');
    expect(items[0].link).toBe('https://a.com/p?x=1');
    // feed-extractor 不提取 RSS <source> 元素；来源由调用处用源标签填充
    expect(items[0].source).toBeUndefined();
    expect(items[0].snippet).toBe('some desc');
  });

  it('无 item 时返回空数组，不抛错', () => {
    expect(parseRss('<rss><channel></channel></rss>')).toHaveLength(0);
    expect(parseRss('not xml')).toHaveLength(0);
  });
});

describe('renderItems', () => {
  it('对恶意标题不产生可执行标签（onerror 等被消除）', () => {
    const c = document.createElement('div');
    renderItems(c, [
      {
        title: '<img src=x onerror=alert(1)>',
        link: 'https://a.com',
        source: 'S',
        pubDate: '2024-01-01',
      },
    ]);
    // 安全断言：恶意输入被当作纯文本，不存在真实 <img> 元素，onerror 不成为可执行属性
    expect(c.querySelector('img')).toBeNull();
    expect(c.innerHTML).toContain('&lt;img');
    expect(c.innerHTML).not.toContain('<img ');
  });

  it('对含 < 的纯文本标题做 HTML 转义', () => {
    const c = document.createElement('div');
    renderItems(c, [{ title: 'a < b & c', link: 'https://a.com' }]);
    expect(c.innerHTML).toContain('a &lt; b &amp; c');
  });

  it('对危险协议链接降级为 #（href 与收藏 data-link 同步）', () => {
    const c = document.createElement('div');
    renderItems(c, [{ title: 'X', link: 'javascript:alert(1)' }]);
    const a = c.querySelector('a');
    const fav = c.querySelector('.fav-btn');
    expect(a?.getAttribute('href')).toBe('#');
    expect(fav?.getAttribute('data-link')).toBe('#');
  });

  it('合法链接原样保留并经转义', () => {
    const c = document.createElement('div');
    renderItems(c, [{ title: '正常', link: 'https://news.com/a?b=1' }]);
    expect(c.querySelector('a')?.getAttribute('href')).toBe('https://news.com/a?b=1');
  });
});

describe('mergeFeedItems', () => {
  it('以 link 去重并按发布时间降序，在线结果覆盖同链接', () => {
    const base = [
      { title: '旧', link: 'https://a.com', pubDate: '2024-01-01' },
      { title: '保留', link: 'https://b.com', pubDate: '2024-02-01' },
    ];
    const incoming = [
      { title: '新', link: 'https://a.com', pubDate: '2024-03-01' },
      { title: '新C', link: 'https://c.com', pubDate: '2024-03-02' },
    ];
    const merged = mergeFeedItems(base, incoming);
    expect(merged).toHaveLength(3);
    expect(merged.find((i) => i.link === 'https://a.com')?.title).toBe('新'); // 同链接被覆盖
    expect(merged.find((i) => i.link === 'https://b.com')?.title).toBe('保留'); // 保留
    expect(merged[0].link).toBe('https://c.com'); // 降序
  });
});

describe('mergeFeedItems（按源轮询，多元化成份）', () => {
  // 2026-10-12 实测复现：AI 板块 6 源 24 条被 ArXiv×15 + 量子位×9 占满，
  // OpenAI / Google AI / HN / Google News 零曝光。轮询保证每源都有曝光位。
  it('均衡场景：名额在源间均分（6 源各 15 条取 24 → 每源 4 条）', () => {
    const sources = [
      'ArXiv · cs.AI',
      '量子位 · AI',
      'OpenAI 新闻',
      'Google AI 博客',
      'Hacker News',
      'Google 新闻',
    ];
    const base: any[] = [];
    for (const s of sources) {
      for (let i = 0; i < 15; i++) {
        base.push({
          title: `${s}-${i}`,
          link: `https://x/${encodeURIComponent(s)}/${i}`,
          source: s,
          pubDate: '2024-05-02',
        });
      }
    }
    const merged = mergeFeedItems(base, []);
    expect(merged).toHaveLength(24);
    for (const s of sources) {
      expect(merged.filter((i) => i.source === s)).toHaveLength(4); // 24 / 6 = 4，无源被埋没
    }
  });

  it('倾斜场景：低频源不被埋没，高频源被稀释', () => {
    // 模拟 ArXiv 日更 15 条 + 量子位 9 条 + 周更源 1 条（纯时间排序下阮一峰零曝光）
    const base: any[] = [];
    for (let i = 0; i < 15; i++) {
      base.push({
        title: `ArXiv-${i}`,
        link: `https://arxiv/${i}`,
        source: 'ArXiv · cs.AI',
        pubDate: '2024-05-02',
      });
    }
    for (let i = 0; i < 9; i++) {
      base.push({
        title: `量子位-${i}`,
        link: `https://qbitai/${i}`,
        source: '量子位 · AI',
        pubDate: '2024-05-01',
      });
    }
    base.push({
      title: '阮一峰周刊',
      link: 'https://ruanyifeng/1',
      source: '阮一峰的网络日志',
      pubDate: '2024-04-01',
    });
    const merged = mergeFeedItems(base, []);
    expect(merged).toHaveLength(24);
    const from = (s: string) => merged.filter((i) => i.source === s).length;
    expect(from('阮一峰的网络日志')).toBe(1); // 低频源必须露面（纯时间排序下为 0）
    expect(from('ArXiv · cs.AI')).toBeLessThan(15); // 高频源被稀释，让出至少 1 个名额
    expect(from('量子位 · AI')).toBe(9); // 量子位总量不足 24，全数保留
  });

  it('无 source 字段时退化为按时间降序（既有行为不变）', () => {
    const merged = mergeFeedItems(
      [
        { title: '旧', link: 'https://a.com', pubDate: '2024-01-01' },
        { title: '新', link: 'https://b.com', pubDate: '2024-03-01' },
      ],
      [],
    );
    expect(merged.map((i) => i.title)).toEqual(['新', '旧']);
  });
});

// ── 以下为 2026-10-15 审查 M23 补齐的算法单测 ──

describe('clusterItems（跨源聚簇边界）', () => {
  it('过滤空 title 条目，其余不受影响', () => {
    const items: FeedItem[] = [
      { title: '', link: 'https://a.com/0', source: 'X' },
      { title: 'Unique title alpha', link: 'https://a.com/1', source: 'X' },
    ];
    const out = clusterItems(items);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Unique title alpha');
  });

  it('无 source 条目：sources 为空数组，source 保持 undefined', () => {
    const out = clusterItems([{ title: 'No source here', link: 'https://a.com/1' }]);
    expect(out[0].sources).toEqual([]);
    expect(out[0].source).toBeUndefined();
  });

  it('null / undefined 输入不抛错，返回空数组', () => {
    expect(clusterItems(null as unknown as FeedItem[])).toEqual([]);
    expect(clusterItems(undefined as unknown as FeedItem[])).toEqual([]);
  });

  it('不同来源的相同事件合并后，代表条目取较新 pubDate', () => {
    const out = clusterItems([
      {
        title: 'Apple launches M5 chip',
        link: 'https://a.com/1',
        source: 'A',
        pubDate: '2026-10-10T00:00:00Z',
      },
      {
        title: 'Apple launches M5 chip today',
        link: 'https://b.com/2',
        source: 'B',
        pubDate: '2026-10-15T00:00:00Z',
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].link).toBe('https://b.com/2');
    expect(out[0].sources).toEqual(['A', 'B']);
    expect(out[0].source).toBe('A · B');
  });
});

describe('rankByHeat（多源优先 + 同源限流）', () => {
  const base = { pubDate: '2026-10-15T00:00:00Z' };

  it('按独立信源数降序，多源报道排前', () => {
    const out = rankByHeat([
      { ...base, link: '1', source: 'A' },
      { ...base, link: '2', sources: ['A', 'B', 'C'] },
      { ...base, link: '3', sources: ['A', 'B'] },
    ]);
    expect(out.map((i) => i.link)).toEqual(['2', '3', '1']);
  });

  it('信源数平局时按发布时间降序打破', () => {
    const out = rankByHeat([
      { link: 'old', sources: ['A'], pubDate: '2026-10-01T00:00:00Z' },
      { link: 'new', sources: ['B'], pubDate: '2026-10-14T00:00:00Z' },
    ]);
    expect(out.map((i) => i.link)).toEqual(['new', 'old']);
  });

  it('maxPerSource 限流：同一来源最多保留 N 条', () => {
    const out = rankByHeat(
      [
        { ...base, link: '1', source: 'A' },
        { ...base, link: '2', source: 'A' },
        { ...base, link: '3', source: 'A' },
        { ...base, link: '4', source: 'B' },
      ],
      2,
    );
    expect(out.map((i) => i.link)).toEqual(['1', '2', '4']);
  });

  it('限流键取 source，缺失时回退 sources[0]，再缺失为 unknown', () => {
    const out = rankByHeat(
      [
        { ...base, link: '1', sources: ['A', 'B'] },
        { ...base, link: '2', sources: ['A'] },
        { ...base, link: '3' },
        { ...base, link: '4' },
      ],
      1,
    );
    // 1 与 2 同键 A（sources[0]）只保留 1 条；3 与 4 同键 unknown 只保留 1 条
    expect(out.map((i) => i.link)).toEqual(['1', '3']);
  });

  it('maxPerSource 传 0 表示不限流', () => {
    const items = [
      { ...base, link: '1', source: 'A' },
      { ...base, link: '2', source: 'A' },
    ];
    expect(rankByHeat(items, 0)).toHaveLength(2);
  });

  it('不修改入参数组（内部拷贝后排序）', () => {
    const items = [
      { ...base, link: '1', source: 'A' },
      { ...base, link: '2', sources: ['A', 'B'] },
    ];
    const snapshot = items.map((i) => i.link);
    rankByHeat(items);
    expect(items.map((i) => i.link)).toEqual(snapshot);
  });
});

describe('cleanFeedItems（Zod 运行时校验）', () => {
  it('非数组输入返回空数组', () => {
    expect(cleanFeedItems(null)).toEqual([]);
    expect(cleanFeedItems(undefined)).toEqual([]);
    expect(cleanFeedItems('nope')).toEqual([]);
    expect(cleanFeedItems({})).toEqual([]);
  });

  it('过滤缺 title / link 或类型非法的条目', () => {
    const raw = [
      { title: 'ok', link: 'https://a.com' },
      { link: 'https://b.com' }, // 缺 title
      { title: 'no link' }, // 缺 link
      { title: 123, link: 'https://c.com' }, // title 类型错
      { title: 'bad sources', link: 'https://d.com', sources: 'A' }, // sources 类型错
      null,
      'string item',
    ];
    const out = cleanFeedItems(raw);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('ok');
  });

  it('合法条目连可选字段一并通过', () => {
    const item = {
      title: '完整条目',
      link: 'https://a.com',
      source: '量子位',
      pubDate: '2026-10-15T00:00:00Z',
      snippet: '摘要',
      sources: ['量子位', 'HN'],
    };
    expect(cleanFeedItems([item])).toEqual([item]);
  });
});
