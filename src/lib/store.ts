// 九溪 · 本地数据与偏好（localStorage）
// 全部读写都在浏览器端，无需后端。

import { z } from 'zod';

export interface JiuxiSettings {
  reduceMotion: boolean; // 降低动效
  glassBlur: number; // 磨砂强度（px）
}

// 用 zod 约束结构与类型，避免被破坏/伪造的 localStorage 污染外观
const SettingsSchema = z.object({
  reduceMotion: z.boolean(),
  glassBlur: z.number().min(0).max(40),
});
const ImportSchema = z.object({
  settings: SettingsSchema.optional(),
  favorites: z.array(z.string()).optional(),
});

const SETTINGS_KEY = 'jiuxi-settings';
const FAV_KEY = 'jiuxi-favorites';
export const FEED_PREFIX = 'jiuxi-feed-';

export const DEFAULTS: JiuxiSettings = { reduceMotion: false, glassBlur: 16 };

export function getSettings(): JiuxiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = SettingsSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    }
  } catch {
    /* 损坏值回退默认 */
  }
  return { ...DEFAULTS };
}

export function saveSettings(s: JiuxiSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** 把设置应用到页面（磨砂强度 + 降低动效） */
export function applySettings(s: JiuxiSettings): void {
  document.documentElement.style.setProperty('--glass-blur', `${s.glassBlur}px`);
  document.body.classList.toggle('reduce-motion', s.reduceMotion);
}

export function getFavorites(): string[] {
  try {
    const a = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export function isFavorite(link: string): boolean {
  return getFavorites().includes(link);
}

/** 切换收藏，返回切换后是否已收藏 */
export function toggleFavorite(link: string): boolean {
  const f = getFavorites();
  const i = f.indexOf(link);
  if (i >= 0) f.splice(i, 1);
  else f.push(link);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(f));
  } catch {
    /* ignore */
  }
  return i < 0;
}

/** 导出设置 + 收藏为 JSON 字符串 */
export function exportData(): string {
  return JSON.stringify({ settings: getSettings(), favorites: getFavorites() }, null, 2);
}

/** 从 JSON 字符串导入（合并到现有），结构与类型校验通过才写入，成功返回 true */
export function importData(json: string): boolean {
  try {
    const o = JSON.parse(json);
    const parsed = ImportSchema.safeParse(o);
    if (!parsed.success) return false;
    if (parsed.data.settings)
      saveSettings({ ...getSettings(), ...parsed.data.settings });
    if (parsed.data.favorites)
      localStorage.setItem(FAV_KEY, JSON.stringify(parsed.data.favorites));
    return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** 清除动态资讯缓存（保留设置与收藏） */
export function clearCaches(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(FEED_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}
