import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme, getStoredTheme, THEMES, STORAGE_KEY } from './theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('THEMES 含 4 套预设主题', () => {
    expect(THEMES).toHaveLength(4);
    expect(THEMES.map((t) => t.name)).toEqual(['chenxi', 'midnight', 'aurora', 'sakura']);
  });

  it('applyTheme 写 data-theme 并持久化到 localStorage', () => {
    applyTheme('midnight');
    expect(document.documentElement.getAttribute('data-theme')).toBe('midnight');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('midnight');
  });

  it('getStoredTheme 返回已存主题，无效值回退 null', () => {
    expect(getStoredTheme()).toBeNull();
    localStorage.setItem(STORAGE_KEY, 'sakura');
    expect(getStoredTheme()).toBe('sakura');
    localStorage.setItem(STORAGE_KEY, 'not-a-theme');
    expect(getStoredTheme()).toBeNull();
  });
});
