// 九溪 · 主题管理
// 在浏览器端切换 data-theme 并记忆到 localStorage。

export type ThemeName = 'chenxi' | 'midnight' | 'aurora' | 'sakura';

export interface ThemeMeta {
  name: ThemeName;
  label: string;
}

export const THEMES: ThemeMeta[] = [
  { name: 'chenxi', label: '晨曦' },
  { name: 'midnight', label: '午夜' },
  { name: 'aurora', label: '极光' },
  { name: 'sakura', label: '樱粉' },
];

export const STORAGE_KEY = 'jiuxi-theme';

/** 应用主题：写 <html data-theme> 并记忆 */
export function applyTheme(name: ThemeName): void {
  document.documentElement.setAttribute('data-theme', name);
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* 隐私模式等无法写入时忽略 */
  }
}

/** 读取已存主题（无效值返回 null） */
export function getStoredTheme(): ThemeName | null {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return THEMES.some((x) => x.name === t) ? (t as ThemeName) : null;
  } catch {
    return null;
  }
}
