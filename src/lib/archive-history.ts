// 九溪 · 资讯历史归档模块（IndexedDB 实现）
//
// 功能：将每次抓取的资讯快照存入 IndexedDB，支持按日期、板块查询历史回顾
// 设计原则：
//   - 数据持久化：跨会话保存，不清除缓存即可回看历史
//   - 自动清理：保留最近 30 天数据，超出部分自动删除，避免存储溢出
//   - 零依赖：使用原生 IndexedDB API，无需外部库
//   - 异步非阻塞：所有操作异步执行，失败静默降级

const DB_NAME = 'jiuxi-archive';
const DB_VERSION = 1;
const STORE_NAME = 'history_snapshots';
const RETENTION_DAYS = 30; // 保留最近 30 天数据

export interface ArchiveSnapshot {
  id: string;           // 唯一标识：${section}-${date}
  section: string;      // 板块标识：ai/news/tech/gaming
  date: string;         // 日期字符串：YYYY-MM-DD
  timestamp: number;    // 时间戳
  items: FeedItem[];    // 资讯条目列表
  itemCount: number;    // 条目数量（用于快速统计）
}

export interface FeedItem {
  title: string;
  link: string;
  source?: string;
  pubDate?: string;
  snippet?: string;
}

/** 打开 IndexedDB 数据库 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // 创建索引以支持按日期和板块查询
        store.createIndex('by_date', 'date', { unique: false });
        store.createIndex('by_section', 'section', { unique: false });
        store.createIndex('by_date_section', ['date', 'section'], { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 保存历史快照
 * @param section 板块名称
 * @param items 资讯条目列表
 * @returns Promise<void>
 */
export async function saveSnapshot(section: string, items: FeedItem[]): Promise<void> {
  if (!items || items.length === 0) return;

  try {
    const db = await openDatabase();
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const id = `${section}-${date}`;

    const snapshot: ArchiveSnapshot = {
      id,
      section,
      date,
      timestamp: Date.now(),
      items,
      itemCount: items.length,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(snapshot);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
    });
  } catch (error) {
    console.warn('[九溪] 历史快照保存失败:', error);
  }
}

/**
 * 查询指定日期的历史快照
 * @param date 日期字符串 YYYY-MM-DD
 * @param section 可选，指定板块
 * @returns Promise<ArchiveSnapshot | null>
 */
export async function getSnapshotByDate(
  date: string,
  section?: string
): Promise<ArchiveSnapshot | null> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      // 如果指定了板块，使用复合索引查询
      if (section) {
        const index = store.index('by_date_section');
        const request = index.get([date, section]);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      } else {
        // 否则查询该日期的所有快照
        const index = store.index('by_date');
        const request = index.getAll(date);
        request.onsuccess = () => {
          const results = request.result as ArchiveSnapshot[];
          resolve(results.length > 0 ? results[0] : null);
        };
        request.onerror = () => reject(request.error);
      }

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('[九溪] 查询历史快照失败:', error);
    return null;
  }
}

/**
 * 获取所有历史快照列表（按日期降序）
 * @param section 可选，筛选特定板块
 * @param limit 可选，限制返回数量
 * @returns Promise<ArchiveSnapshot[]>
 */
export async function getHistoryList(
  section?: string,
  limit: number = 30
): Promise<ArchiveSnapshot[]> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = section
        ? store.index('by_section').getAll(section)
        : store.getAll();

      request.onsuccess = () => {
        const results = request.result as ArchiveSnapshot[];
        // 按日期降序排序
        results.sort((a, b) => b.timestamp - a.timestamp);
        // 限制数量
        resolve(results.slice(0, limit));
      };
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('[九溪] 获取历史记录列表失败:', error);
    return [];
  }
}

/**
 * 清理过期数据（保留最近 RETENTION_DAYS 天）
 * @returns Promise<number> 删除的记录数
 */
export async function cleanupExpiredData(): Promise<number> {
  try {
    const db = await openDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffTimestamp = cutoffDate.getTime();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');

      // 使用范围查询删除过期数据
      const range = IDBKeyRange.upperBound(cutoffTimestamp);
      const request = index.openCursor(range);
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
    });
  } catch (error) {
    console.warn('[九溪] 清理过期数据失败:', error);
    return 0;
  }
}

/**
 * 删除指定日期的历史快照
 * @param date 日期字符串
 * @param section 可选，指定板块
 * @returns Promise<boolean>
 */
export async function deleteSnapshot(date: string, section?: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    const id = section ? `${section}-${date}` : date;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('[九溪] 删除历史快照失败:', error);
    return false;
  }
}

/**
 * 清空所有历史数据
 * @returns Promise<number> 删除的记录数
 */
export async function clearAllHistory(): Promise<number> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(0);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('[九溪] 清空历史数据失败:', error);
    return 0;
  }
}

/**
 * 获取历史统计数据
 * @returns Promise<{ totalDays: number; totalItems: number; sections: Record<string, number> }>
 */
export async function getHistoryStats(): Promise<{
  totalDays: number;
  totalItems: number;
  sections: Record<string, number>;
}> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const snapshots = request.result as ArchiveSnapshot[];
        const dates = new Set(snapshots.map((s) => s.date));
        const sections: Record<string, number> = {};

        snapshots.forEach((s) => {
          sections[s.section] = (sections[s.section] || 0) + s.itemCount;
        });

        resolve({
          totalDays: dates.size,
          totalItems: snapshots.reduce((sum, s) => sum + s.itemCount, 0),
          sections,
        });
      };
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('[九溪] 获取统计数据失败:', error);
    return { totalDays: 0, totalItems: 0, sections: {} };
  }
}

/**
 * 检查 IndexedDB 是否可用
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return !!window.indexedDB;
  } catch {
    return false;
  }
}
