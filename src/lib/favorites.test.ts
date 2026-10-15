import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFavorites,
  isFavorite,
  toggleFavorite,
  normalizeFavorite,
  setFavorites,
} from './favorites';

describe('favorites', () => {
  beforeEach(() => localStorage.clear());

  it('未存储时返回空数组', () => {
    expect(getFavorites()).toEqual([]);
  });

  it('切换收藏后状态正确', () => {
    const link = 'https://example.com/article';
    expect(isFavorite(link)).toBe(false);
    toggleFavorite(link);
    expect(isFavorite(link)).toBe(true);
    toggleFavorite(link);
    expect(isFavorite(link)).toBe(false);
  });

  it('损坏的 localStorage 值不抛错，回退空数组', () => {
    localStorage.setItem('jiuxi-favorites', 'not json');
    expect(getFavorites()).toEqual([]);
  });
});

// 2026-10-15 审查 M2/M23：导入路径复用导出后的归一化与批量写入，
// 与读取路径共用同一套逻辑（此前 settings.importData 里有一份会漂移的副本）。
describe('favorites（归一化与批量写入 · 导入路径）', () => {
  beforeEach(() => localStorage.clear());

  it('normalizeFavorite 把旧版纯字符串归一化为对象', () => {
    expect(normalizeFavorite('https://a.com')).toEqual({
      link: 'https://a.com',
      title: 'https://a.com',
      ts: 0,
    });
  });

  it('normalizeFavorite 补齐缺失字段（title 回退 link、ts 回退 0）', () => {
    expect(normalizeFavorite({ link: 'https://a.com' })).toEqual({
      link: 'https://a.com',
      title: 'https://a.com',
      source: undefined,
      ts: 0,
    });
    expect(normalizeFavorite({ link: 'https://a.com', title: '标题', ts: 123 })).toEqual({
      link: 'https://a.com',
      title: '标题',
      source: undefined,
      ts: 123,
    });
  });

  it('normalizeFavorite 对非法条目返回 null', () => {
    expect(normalizeFavorite(null)).toBeNull();
    expect(normalizeFavorite(123)).toBeNull();
    expect(normalizeFavorite({})).toBeNull();
    expect(normalizeFavorite({ title: 'no link' })).toBeNull();
  });

  it('setFavorites 写入后 getFavorites 原样读回（往返一致）', () => {
    const items = [
      { link: 'https://a.com', title: 'A', ts: 1 },
      'https://b.com', // 旧版字符串混排也应被归一化保留
      { junk: true }, // 脏数据被过滤
    ];
    setFavorites(items);
    const back = getFavorites();
    expect(back).toHaveLength(2);
    expect(back[0]).toEqual({ link: 'https://a.com', title: 'A', source: undefined, ts: 1 });
    expect(back[1]).toEqual({ link: 'https://b.com', title: 'https://b.com', ts: 0 });
  });

  it('setFavorites 覆写旧数据而非追加', () => {
    setFavorites([{ link: 'https://a.com', title: 'A', ts: 1 }]);
    setFavorites([{ link: 'https://b.com', title: 'B', ts: 2 }]);
    expect(getFavorites().map((f) => f.link)).toEqual(['https://b.com']);
  });

  it('setFavorites 后 toggleFavorite 可正常切换（存储键一致）', () => {
    setFavorites([{ link: 'https://a.com', title: 'A', ts: 1 }]);
    // toggleFavorite 返回「切换后是否已收藏」：已收藏 → 取消失效返回 false
    expect(toggleFavorite('https://a.com')).toBe(false);
    expect(getFavorites()).toEqual([]);
    // 再切一次：未收藏 → 添加返回 true（验证 setFavorites 写的键与 toggle 读的键一致）
    expect(toggleFavorite('https://a.com')).toBe(true);
    expect(getFavorites()).toHaveLength(1);
  });
});
