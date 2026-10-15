import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fakeIndexedDB from 'fake-indexeddb';
import { readIndexedDB, writeIndexedDB, clearIndexedDB } from './db';

const DB_NAME = 'jiuxi-feed-db';

// 验证 IndexedDB 不可用（隐私模式 / 旧浏览器）时的优雅降级：不抛错、不阻断渲染。
describe('db (IndexedDB 持久化 · 降级路径)', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('IndexedDB 不可用时 readIndexedDB 优雅返回 null', async () => {
    await expect(readIndexedDB('ai')).resolves.toBeNull();
  });

  it('IndexedDB 不可用时 writeIndexedDB / clearIndexedDB 不抛错', async () => {
    await expect(
      writeIndexedDB('ai', [{ title: 't', link: 'https://a.com' }]),
    ).resolves.toBeUndefined();
    await expect(clearIndexedDB('ai')).resolves.toBeUndefined();
  });
});

// 用 fake-indexeddb 验证正常路径的读写往返（2026-10-15 审查 M23 补齐：
// 此前只有降级路径有测试，happy path 的存取一致性无覆盖）。
describe('db (IndexedDB 持久化 · fake-indexeddb 往返)', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', fakeIndexedDB);
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    // 删除整个库，保证用例间数据隔离（fake-indexeddb 实例在进程内持久）
    await new Promise<void>((resolve) => {
      const req = fakeIndexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
  });

  it('写入后可原样读回（往返一致）', async () => {
    const items = [
      { title: '头条', link: 'https://a.com/1', pubDate: '2026-10-15T00:00:00Z' },
      { title: '次条', link: 'https://a.com/2', source: '量子位' },
    ];
    await writeIndexedDB('ai', items);
    await expect(readIndexedDB('ai')).resolves.toEqual(items);
  });

  it('读不存在的板块返回 null（而非空数组，调用方据此回退缓存）', async () => {
    await expect(readIndexedDB('news')).resolves.toBeNull();
  });

  it('空数组写入后读回为 null（既有语义：空条目等同无缓存）', async () => {
    await writeIndexedDB('tech', []);
    await expect(readIndexedDB('tech')).resolves.toBeNull();
  });

  it('clearIndexedDB 后读回为 null', async () => {
    await writeIndexedDB('gaming', [{ title: 't', link: 'https://g.com' }]);
    await clearIndexedDB('gaming');
    await expect(readIndexedDB('gaming')).resolves.toBeNull();
  });

  it('板块间相互隔离：写 ai 不影响读 news', async () => {
    await writeIndexedDB('ai', [{ title: 't', link: 'https://a.com' }]);
    await expect(readIndexedDB('news')).resolves.toBeNull();
  });

  it('覆写同板块返回最新一次写入', async () => {
    await writeIndexedDB('ai', [{ title: '旧', link: 'https://a.com/old' }]);
    await writeIndexedDB('ai', [{ title: '新', link: 'https://a.com/new' }]);
    const back = await readIndexedDB('ai');
    expect(back).toHaveLength(1);
    expect(back![0].title).toBe('新');
  });

  it('对象存储按 section 键存取（keyPath 行为回归）', async () => {
    // 间接验证 onupgradeneeded 里 keyPath:'section' 的建库逻辑真的生效
    await writeIndexedDB('ai', [{ title: 't', link: 'https://a.com' }]);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = fakeIndexedDB.open(DB_NAME, 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const keys = await new Promise<unknown[]>((resolve, reject) => {
      const tx = db.transaction('feed_cache', 'readonly');
      const req = tx.objectStore('feed_cache').getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    expect(keys).toEqual(['ai']);
  });
});
