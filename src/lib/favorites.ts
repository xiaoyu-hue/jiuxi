// 九溪 · 收藏夹（纯 localStorage，无 Zod 依赖）
//
// 单一数据源：feeds.ts（卡片收藏按钮）、settings.ts（导出/导入/渲染）、
// starred.astro 均经本模块操作，避免两份实现漂移。存储结构为对象数组
// {link,title,source?,ts}；旧版纯字符串条目在读时归一化，不丢历史数据。

const FAV_KEY = 'jiuxi-favorites';

export interface Favorite {
  link: string;
  title: string;
  source?: string;
  ts: number;
}

/**
 * 归一化单条收藏：兼容旧版纯字符串格式（{link:x,title:x,ts:0}）。
 * 导出供 settings.ts 导入路径复用——导入与读取必须共用同一套归一化，
 * 否则「导出→导入→读取」链路上两份实现一旦漂移，旧数据会在某一环被静默丢掉。
 */
export function normalizeFavorite(x: unknown): Favorite | null {
  if (typeof x === 'string') return { link: x, title: x, ts: 0 };
  if (x && typeof (x as { link?: unknown }).link === 'string') {
    const o = x as { link: string; title?: string; source?: string; ts?: number };
    return { link: o.link, title: o.title || o.link, source: o.source, ts: o.ts || 0 };
  }
  return null;
}

/** 批量写入收藏（导入用）：归一化过滤后整体落盘，存储键只在本模块出现一次 */
export function setFavorites(items: unknown[]): void {
  const norm = items.map(normalizeFavorite).filter((f): f is Favorite => !!f);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(norm));
  } catch {
    /* 容量满/隐私模式忽略 */
  }
}

export function getFavorites(): Favorite[] {
  try {
    const a = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    if (!Array.isArray(a)) return [];
    return a.map(normalizeFavorite).filter((f): f is Favorite => !!f);
  } catch {
    return [];
  }
}

export function isFavorite(link: string): boolean {
  return getFavorites().some((f) => f.link === link);
}

/**
 * 切换收藏状态，返回切换后是否已收藏。
 * 入参可为链接字符串（兼容旧调用）或对象；存储为 Favorite 对象，供 /starred 显示标题。
 */
export function toggleFavorite(
  item: string | { link: string; title?: string; source?: string },
): boolean {
  const favs = getFavorites();
  const link = typeof item === 'string' ? item : item.link;
  const i = favs.findIndex((f) => f.link === link);
  if (i >= 0) {
    favs.splice(i, 1);
  } else {
    favs.unshift({
      link,
      title: typeof item === 'string' ? item : item.title || item.link,
      source: typeof item === 'string' ? undefined : item.source,
      ts: Date.now(),
    });
  }
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  } catch {
    /* 容量满/隐私模式忽略 */
  }
  return i < 0;
}
