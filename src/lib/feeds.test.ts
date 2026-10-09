import { describe, it, expect } from 'vitest';
import { parseHn } from './feeds';

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
