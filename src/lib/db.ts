// 九溪 · IndexedDB 离线持久化
//
// 纯浏览器端轻量 IndexedDB 封装，用于跨会话保存动态资讯。
// 优先级：实时抓取 > IndexedDB 旧缓存 > localStorage 临时缓存（30分钟）
// 全部操作异步，失败静默降级为本地缓存或直接空数组。

const DB_NAME = 'jiuxi-feed-db';
const STORE_NAME = 'feed_cache';
const DB_VERSION = 1;

interface FeedEntry {
  section: string;
  items: any[];
  fetchedAt: number;
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'section' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 读取某板块的 IndexedDB 缓存（不限时，永久保存） */
export async function readIndexedDB(section: string): Promise<any[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(section);
      req.onsuccess = () => {
        const entry = req.result as FeedEntry | undefined;
        db.close();
        if (entry && Array.isArray(entry.items) && entry.items.length > 0) {
          resolve(entry.items);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
      tx.oncomplete = () => {};
    });
  } catch {
    return null;
  }
}

/** 写入某板块的 IndexedDB 缓存 */
export async function writeIndexedDB(section: string, items: any[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ section, items, fetchedAt: Date.now() });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // IndexedDB 不可用时静默降级
  }
}

/** 清除某板块的 IndexedDB 缓存 */
export async function clearIndexedDB(section: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(section);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // ignore
  }
}
