import { describe, it, expect, beforeEach } from 'vitest';
import { getFavorites, isFavorite, toggleFavorite } from './favorites';

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
