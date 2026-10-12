import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseHn, parseRss, renderItems, loadFeed, refreshFeedOnline, mergeFeedItems } from './feeds';

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

describe('loadFeed（刷新回流）', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  // 复现原 bug：有旧缓存时，loadFeed 必须返回在线刷新拿到的最新数据，
  // 而不是把首次加载的旧快照当返回值（否则「刷新了但页面还是旧的」）。
  it('有旧缓存时仍返回在线刷新拿到的最新数据，不返回旧快照', async () => {
    localStorage.setItem(
      'jiuxi-feed-ai',
      JSON.stringify({ t: Date.now(), items: [{ title: '旧快照', link: 'https://old.com' }] })
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: any) => {
        const url = String(u);
        if (url.includes('hn.algolia')) {
          return new Response(JSON.stringify({ hits: [] }), { status: 200 });
        }
        return new Response(
          '<?xml version="1.0"?><rss version="2.0"><channel><item><title>最新资讯</title><link>https://new.com</link></item></channel></rss>',
          { status: 200, headers: { 'Content-Type': 'application/rss+xml' } }
        );
      })
    );
    const items = await loadFeed('ai');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('最新资讯');
  });

  it('在线刷新全部失败时退到旧缓存，不返回空', async () => {
    localStorage.setItem(
      'jiuxi-feed-ai',
      JSON.stringify({ t: Date.now(), items: [{ title: '兜底旧数据', link: 'https://old.com' }] })
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      })
    );
    const items = await loadFeed('ai');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('兜底旧数据');
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
    const sources = ['ArXiv · cs.AI', '量子位 · AI', 'OpenAI 新闻', 'Google AI 博客', 'Hacker News', 'Google 新闻'];
    const base: any[] = [];
    for (const s of sources) {
      for (let i = 0; i < 15; i++) {
        base.push({ title: `${s}-${i}`, link: `https://x/${encodeURIComponent(s)}/${i}`, source: s, pubDate: '2024-05-02' });
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
      base.push({ title: `ArXiv-${i}`, link: `https://arxiv/${i}`, source: 'ArXiv · cs.AI', pubDate: '2024-05-02' });
    }
    for (let i = 0; i < 9; i++) {
      base.push({ title: `量子位-${i}`, link: `https://qbitai/${i}`, source: '量子位 · AI', pubDate: '2024-05-01' });
    }
    base.push({ title: '阮一峰周刊', link: 'https://ruanyifeng/1', source: '阮一峰的网络日志', pubDate: '2024-04-01' });
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
      []
    );
    expect(merged.map((i) => i.title)).toEqual(['新', '旧']);
  });
});

describe('refreshFeedOnline（后台刷新不回退缓存）', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('全部源失败时返回空数组，不回退旧缓存（避免覆盖内嵌内容）', async () => {
    localStorage.setItem(
      'jiuxi-feed-ai',
      JSON.stringify({ t: Date.now(), items: [{ title: '内嵌兜底', link: 'https://old.com' }] })
    );
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));
    const items = await refreshFeedOnline('ai');
    expect(items).toHaveLength(0);
  });

  it('合并多个成功源，而非只取第一个', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: any) => {
        const url = String(u);
        if (url.includes('hn.algolia')) {
          return new Response(
            JSON.stringify({ hits: [{ title: 'HN-A', url: 'https://hn.com/1', objectID: '1', created_at: '2024-05-01' }] }),
            { status: 200 }
          );
        }
        // 各 RSS 源返回不同 link，避免被并集去重合并成一条
        const tag = url.includes('qbitai')
          ? 'qbitai'
          : url.includes('arxiv')
            ? 'arxiv'
            : url.includes('openai.com')
              ? 'openai'
              : url.includes('blog.google')
                ? 'googleai'
                : 'googlenews';
        return new Response(
          `<?xml version="1.0"?><rss version="2.0"><channel><item><title>RSS-${tag}</title><link>https://rss.com/${tag}</link></item></channel></rss>`,
          { status: 200, headers: { 'Content-Type': 'application/rss+xml' } }
        );
      })
    );
    // AI 板块 6 个源（量子位/OpenAI/Google AI/HN/ArXiv/Google News）全部成功 → 合并去重后 6 条
    const items = await refreshFeedOnline('ai');
    expect(items).toHaveLength(6);
    expect(items.some((i) => i.title === 'HN-A')).toBe(true);
    expect(items.some((i) => i.title === 'RSS-qbitai')).toBe(true);
    expect(items.some((i) => i.title === 'RSS-openai')).toBe(true);
    expect(items.some((i) => i.title === 'RSS-googleai')).toBe(true);
    expect(items.some((i) => i.title === 'RSS-arxiv')).toBe(true);
    expect(items.some((i) => i.title === 'RSS-googlenews')).toBe(true);
  });
});
