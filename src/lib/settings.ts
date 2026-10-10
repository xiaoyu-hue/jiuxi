// 九溪 · 设置与数据管理（轻量版，无 Zod 依赖）
// settings.astro 使用本模块，避免将 Zod 整库打入生产 bundle。
// 原始带校验版本保留在 store.ts，供 feeds.ts 等需要强类型的地方使用。

const SETTINGS_KEY = 'jiuxi-settings';
const FAV_KEY = 'jiuxi-favorites';
export const FEED_PREFIX = 'jiuxi-feed-';

export interface JiuxiSettings {
  reduceMotion: boolean;
  glassBlur: number;
}

export const DEFAULTS: JiuxiSettings = { reduceMotion: false, glassBlur: 16 };

export function getSettings(): JiuxiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      // 简单校验，不符合预期则回退默认值
      if (
        typeof parsed.reduceMotion === 'boolean' &&
        typeof parsed.glassBlur === 'number' &&
        parsed.glassBlur >= 0 &&
        parsed.glassBlur <= 40
      ) {
        return {
          reduceMotion: parsed.reduceMotion,
          glassBlur: parsed.glassBlur,
        };
      }
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

export function exportData(): string {
  return JSON.stringify({ settings: getSettings(), favorites: getFavorites() }, null, 2);
}

/** 轻量导入：无需 Zod，简单结构校验即可，失败静默忽略 */
export function importData(json: string): boolean {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    if (typeof o !== 'object' || o === null) return false;
    const s = o.settings as Record<string, unknown> | undefined;
    const f = o.favorites;
    if (s && typeof s.reduceMotion === 'boolean' && typeof s.glassBlur === 'number') {
      saveSettings({
        reduceMotion: s.reduceMotion,
        glassBlur: Math.min(40, Math.max(0, s.glassBlur)),
      });
    }
    if (Array.isArray(f) && f.every((x: unknown) => typeof x === 'string')) {
      localStorage.setItem(FAV_KEY, JSON.stringify(f));
    }
    return true;
  } catch {
    return false;
  }
}

export function clearCaches(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(FEED_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}
