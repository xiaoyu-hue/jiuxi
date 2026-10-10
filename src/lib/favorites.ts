// 九溪 · 收藏夹（纯 localStorage，无 Zod 依赖）
// feeds.ts 与 feed 相关页面通过此模块操作收藏，避免将 Zod 打入生产 bundle。

const FAV_KEY = 'jiuxi-favorites';

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

/** 切换收藏状态，返回切换后是否已收藏 */
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
