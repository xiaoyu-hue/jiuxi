// 九溪 · 本地数据与偏好（localStorage）
// 全部读写都在浏览器端，无需后端。

export interface JiuxiSettings {
  reduceMotion: boolean; // 降低动效
  glassBlur: number; // 磨砂强度（px）
}

const SETTINGS_KEY = 'jiuxi-settings';
const FAV_KEY = 'jiuxi-favorites';
const FEED_PREFIX = 'jiuxi-feed-';

const DEFAULTS: JiuxiSettings = { reduceMotion: false, glassBlur: 16 };

export function getSettings(): JiuxiSettings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (s && typeof s === 'object') return { ...DEFAULTS, ...s };
  } catch {
    /* ignore */
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

/** 从 JSON 字符串导入（合并到现有），成功返回 true */
export function importData(json: string): boolean {
  try {
    const o = JSON.parse(json);
    if (o && typeof o === 'object') {
      if (o.settings) saveSettings({ ...getSettings(), ...o.settings });
      if (Array.isArray(o.favorites))
        localStorage.setItem(FAV_KEY, JSON.stringify(o.favorites));
      return true;
    }
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
