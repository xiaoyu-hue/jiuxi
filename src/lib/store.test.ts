import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSettings,
  saveSettings,
  importData,
  getFavorites,
  DEFAULTS,
} from './store';

describe('store', () => {
  beforeEach(() => localStorage.clear());

  it('未存储时返回默认设置', () => {
    expect(getSettings()).toEqual(DEFAULTS);
  });

  it('保存后读取一致', () => {
    saveSettings({ reduceMotion: true, glassBlur: 8 });
    expect(getSettings()).toEqual({ reduceMotion: true, glassBlur: 8 });
  });

  it('损坏的 localStorage 值回退默认，不污染外观', () => {
    localStorage.setItem('jiuxi-settings', '{bad json');
    expect(getSettings()).toEqual(DEFAULTS);
    localStorage.setItem('jiuxi-settings', JSON.stringify({ reduceMotion: 'yes' }));
    expect(getSettings()).toEqual(DEFAULTS);
  });

  it('importData：合法结构写入成功', () => {
    expect(
      importData('{"settings":{"reduceMotion":true,"glassBlur":10},"favorites":["a","b"]}'),
    ).toBe(true);
    expect(getSettings()).toEqual({ reduceMotion: true, glassBlur: 10 });
    expect(getFavorites()).toEqual(['a', 'b']);
  });

  it('importData：畸形结构被拒绝，不影响现有数据', () => {
    saveSettings({ reduceMotion: false, glassBlur: 16 });
    expect(importData('{"settings":{"reduceMotion":"yes"}}')).toBe(false);
    expect(importData('not json')).toBe(false);
    expect(importData('[1,2,3]')).toBe(false);
    expect(getSettings()).toEqual({ reduceMotion: false, glassBlur: 16 });
  });
});
