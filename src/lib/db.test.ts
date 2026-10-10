import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readIndexedDB, writeIndexedDB, clearIndexedDB } from './db';

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
