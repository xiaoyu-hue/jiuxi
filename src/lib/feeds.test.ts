import { describe, it, expect } from 'vitest';
import { parseHn, parseRss, renderItems } from './feeds';

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
