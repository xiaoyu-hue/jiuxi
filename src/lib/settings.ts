// 九溪 · 设置与数据管理（轻量版，无 Zod 依赖）
// settings.astro、feeds.ts 等均使用本模块，避免将 Zod 整库打入生产 bundle。
// 收藏逻辑统一由 ./favorites 提供（单一数据源），本文件仅 re-export。

const SETTINGS_KEY = 'jiuxi-settings';
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

// 收藏逻辑统一由 ./favorites 提供（单一数据源，避免两份实现漂移）
import { getFavorites, isFavorite, toggleFavorite, setFavorites } from './favorites';
export { getFavorites, isFavorite, toggleFavorite };
export type { Favorite } from './favorites';

export function exportData(): string {
  return JSON.stringify({ settings: getSettings(), favorites: getFavorites() }, null, 2);
}

/** 轻量导入：无需 Zod，简单结构校验即可，失败静默忽略 */
export function importData(json: string): boolean {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    // 数组也拒绝：JSON 数组不是合法备份（2026-10-15 审查 M23 发现：
    // 原先数组能通过 typeof 检查，导入后返回 true 提示"导入成功"却什么都没写）。
    if (typeof o !== 'object' || o === null || Array.isArray(o)) return false;
    const s = o.settings as Record<string, unknown> | undefined;
    const f = o.favorites;
    if (s && typeof s.reduceMotion === 'boolean' && typeof s.glassBlur === 'number') {
      saveSettings({
        reduceMotion: s.reduceMotion,
        glassBlur: Math.min(40, Math.max(0, s.glassBlur)),
      });
    }
    if (Array.isArray(f)) {
      // 归一化与存储键均在 favorites 模块内完成（2026-10-15 审查 M2：
      // 原先本文件复制了一份 normalize、又重复定义 FAV_KEY，两份实现会漂移）。
      setFavorites(f);
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
