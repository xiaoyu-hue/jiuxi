import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSettings,
  saveSettings,
  applySettings,
  exportData,
  importData,
  clearCaches,
  DEFAULTS,
  FEED_PREFIX,
} from './settings';

// 2026-10-15 审查 M23 补齐：设置与数据导入/导出路径此前无任何单测，
// 而这是用户数据（收藏夹 + 偏好）的进出口，回归代价高。

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--glass-blur');
    document.body.classList.remove('reduce-motion');
  });

  describe('getSettings / saveSettings', () => {
    it('无存储时返回默认值', () => {
      expect(getSettings()).toEqual(DEFAULTS);
    });

    it('保存后可读回', () => {
      saveSettings({ reduceMotion: true, glassBlur: 24 });
      expect(getSettings()).toEqual({ reduceMotion: true, glassBlur: 24 });
    });

    it('损坏的 JSON 回退默认值，不抛错', () => {
      localStorage.setItem('jiuxi-settings', '{broken');
      expect(getSettings()).toEqual(DEFAULTS);
    });

    it('字段缺失或越界的值整体回退默认（简单结构校验）', () => {
      localStorage.setItem('jiuxi-settings', JSON.stringify({ reduceMotion: true }));
      expect(getSettings()).toEqual(DEFAULTS);
      localStorage.setItem(
        'jiuxi-settings',
        JSON.stringify({ reduceMotion: true, glassBlur: 999 }),
      );
      expect(getSettings()).toEqual(DEFAULTS);
    });
  });

  describe('applySettings', () => {
    it('写入 CSS 变量与 body 类', () => {
      applySettings({ reduceMotion: true, glassBlur: 8 });
      expect(document.documentElement.style.getPropertyValue('--glass-blur')).toBe('8px');
      expect(document.body.classList.contains('reduce-motion')).toBe(true);
      applySettings({ reduceMotion: false, glassBlur: 0 });
      expect(document.body.classList.contains('reduce-motion')).toBe(false);
    });
  });

  describe('exportData / importData 往返', () => {
    it('导出→导入→再导出结果一致（含收藏与设置）', () => {
      saveSettings({ reduceMotion: true, glassBlur: 20 });
      localStorage.setItem(
        'jiuxi-favorites',
        JSON.stringify([{ link: 'https://a.com', title: 'A', ts: 1 }]),
      );
      const snapshot = exportData();
      expect(JSON.parse(snapshot)).toEqual({
        settings: { reduceMotion: true, glassBlur: 20 },
        favorites: [{ link: 'https://a.com', title: 'A', ts: 1 }],
      });

      // 清空后导入，应完整还原
      localStorage.clear();
      expect(importData(snapshot)).toBe(true);
      expect(getSettings()).toEqual({ reduceMotion: true, glassBlur: 20 });
      expect(exportData()).toBe(snapshot);
    });

    it('导入兼容旧版纯字符串收藏格式（归一化不丢数据）', () => {
      const legacy = JSON.stringify({
        settings: { reduceMotion: false, glassBlur: 16 },
        favorites: ['https://old.com/1', 'https://old.com/2'],
      });
      expect(importData(legacy)).toBe(true);
      const favs = JSON.parse(localStorage.getItem('jiuxi-favorites') || '[]');
      expect(favs).toHaveLength(2);
      expect(favs[0]).toEqual({
        link: 'https://old.com/1',
        title: 'https://old.com/1',
        ts: 0,
      });
    });

    it('导入的 glassBlur 越界时被夹紧到 [0,40]', () => {
      importData(JSON.stringify({ settings: { reduceMotion: false, glassBlur: 999 } }));
      expect(getSettings().glassBlur).toBe(40);
      importData(JSON.stringify({ settings: { reduceMotion: false, glassBlur: -5 } }));
      expect(getSettings().glassBlur).toBe(0);
    });

    it('非法 JSON / 非对象返回 false，不写坏数据', () => {
      expect(importData('not json')).toBe(false);
      expect(importData('null')).toBe(false);
      expect(importData('[1,2,3]')).toBe(false);
      expect(importData('"str"')).toBe(false);
    });

    it('只有 settings 或只有 favorites 的部分导入也可用', () => {
      expect(importData(JSON.stringify({ favorites: [{ link: 'https://a.com' }] }))).toBe(true);
      expect(importData(JSON.stringify({ settings: { reduceMotion: true, glassBlur: 4 } }))).toBe(
        true,
      );
      expect(getSettings()).toEqual({ reduceMotion: true, glassBlur: 4 });
    });

    it('导入脏 favorites 时静默过滤非法条目', () => {
      importData(
        JSON.stringify({
          favorites: [{ link: 'https://a.com', title: 'A' }, null, 42, { title: 'no link' }],
        }),
      );
      const favs = JSON.parse(localStorage.getItem('jiuxi-favorites') || '[]');
      expect(favs).toHaveLength(1);
      expect(favs[0].link).toBe('https://a.com');
    });
  });

  describe('clearCaches', () => {
    it('只清 feed 缓存键，不动设置与收藏', () => {
      localStorage.setItem(FEED_PREFIX + 'ai', '[]');
      localStorage.setItem(FEED_PREFIX + 'news', '[]');
      localStorage.setItem('jiuxi-settings', '{}');
      localStorage.setItem('jiuxi-favorites', '[]');
      clearCaches();
      expect(localStorage.getItem(FEED_PREFIX + 'ai')).toBeNull();
      expect(localStorage.getItem(FEED_PREFIX + 'news')).toBeNull();
      expect(localStorage.getItem('jiuxi-settings')).toBe('{}');
      expect(localStorage.getItem('jiuxi-favorites')).toBe('[]');
    });
  });
});
