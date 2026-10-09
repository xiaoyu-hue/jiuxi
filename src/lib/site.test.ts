import { describe, it, expect, afterEach, vi } from 'vitest';
import { withBase } from './site';

describe('withBase', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('根 base（Cloudflare / 本地）下拼接正确', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/')).toBe('/');
    expect(withBase('/ai')).toBe('/ai');
    expect(withBase('news')).toBe('/news');
  });

  it('子路径 base（GitHub Pages /jiuxi/）下拼接正确，修复备站 404', () => {
    vi.stubEnv('BASE_URL', '/jiuxi/');
    expect(withBase('/')).toBe('/jiuxi/');
    expect(withBase('/ai')).toBe('/jiuxi/ai');
    expect(withBase('/timeline')).toBe('/jiuxi/timeline');
  });
});
