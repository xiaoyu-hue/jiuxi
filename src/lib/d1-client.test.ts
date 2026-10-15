import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getD1Config, d1Query, ensureSchema, D1_TIMEOUT_MS } from '../../scripts/lib/d1.mjs';

// 2026-10-15 审查 P2：scripts/lib/d1.mjs 为 save-history / ensure-candidates
// 共用的 D1 REST 客户端。覆盖三条此前缺失的防线：
//   1) 15s 请求超时（旧版无超时，D1 挂起会卡死整条构建链）；
//   2) getD1Config 的 required 双模式（ensure-candidates 报错退出 vs save-history 静默跳过）；
//   3) 失败语义（HTTP 错误 / success:false / 超时）统一抛错，由调用方 try/catch。

const ENV_KEYS = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'D1_DATABASE_ID'] as const;
const ENV_BACKUP: Record<string, string | undefined> = {};

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  ENV_KEYS.forEach((k) => delete process.env[k]);
  Object.entries(values).forEach(([k, v]) => {
    process.env[k] = v as string;
  });
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

/** fetch mock 的类型化签名（实现可零参数，调用记录仍带类型） */
type FetchMock = (url: string, init: RequestInit) => Promise<ReturnType<typeof jsonResponse>>;

beforeEach(() => {
  ENV_KEYS.forEach((k) => {
    ENV_BACKUP[k] = process.env[k];
  });
});

afterEach(() => {
  ENV_KEYS.forEach((k) => {
    if (ENV_BACKUP[k] === undefined) delete process.env[k];
    else process.env[k] = ENV_BACKUP[k] as string;
  });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getD1Config', () => {
  it('环境变量齐全时返回配置对象', () => {
    setEnv({
      CLOUDFLARE_API_TOKEN: 'tok',
      CLOUDFLARE_ACCOUNT_ID: 'acc',
      D1_DATABASE_ID: 'db',
    });
    expect(getD1Config()).toEqual({
      apiToken: 'tok',
      accountId: 'acc',
      databaseId: 'db',
    });
  });

  it('缺任一变量且 required=false 时返回 null（save-history 的静默跳过语义）', () => {
    setEnv({ CLOUDFLARE_API_TOKEN: 'tok' });
    expect(getD1Config()).toBeNull();
    expect(getD1Config({ required: false })).toBeNull();
  });

  it('缺变量且 required=true 时报错退出（ensure-candidates 的原行为）', () => {
    setEnv({});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => getD1Config({ required: true })).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errSpy).toHaveBeenCalled();
  });
});

describe('d1Query', () => {
  const cfg = { apiToken: 'tok', accountId: 'acc', databaseId: 'db' };

  it('成功时返回响应体，且请求带 Authorization 头与超时信号', async () => {
    const fetchMock = vi.fn<FetchMock>();
    fetchMock.mockImplementation(async () => jsonResponse({ success: true, result: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const body = await d1Query(cfg, 'SELECT 1');
    expect(body).toEqual({ success: true, result: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/acc/d1/database/db/query');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal?.aborted).toBe(false);
  });

  it('HTTP 非 2xx 时抛出带 HTTP 状态码的错误', async () => {
    vi.stubGlobal('fetch', async () => jsonResponse(null, false, 500));
    await expect(d1Query(cfg, 'SELECT 1')).rejects.toThrow('HTTP 500');
  });

  it('success:false 时抛出 API 返回的错误信息', async () => {
    vi.stubGlobal('fetch', async () =>
      jsonResponse({ success: false, errors: [{ message: 'no such table' }] }),
    );
    await expect(d1Query(cfg, 'SELECT 1')).rejects.toThrow('no such table');
  });

  it('请求挂起时按超时抛出中文错误（旧版无超时会无限期卡死构建）', async () => {
    // mock 遵守 AbortSignal：收到 abort 时以 signal.reason（TimeoutError）拒绝
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<never>>();
    fetchMock.mockImplementation(
      (url, init) =>
        new Promise<never>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(d1Query(cfg, 'SELECT 1', [], 30)).rejects.toThrow('D1 请求超时（30ms）');
  });

  it('默认超时为 15s', () => {
    expect(D1_TIMEOUT_MS).toBe(15000);
  });
});

describe('ensureSchema', () => {
  it('逐条执行建表语句', async () => {
    const fetchMock = vi.fn<FetchMock>();
    fetchMock.mockImplementation(async () => jsonResponse({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    await ensureSchema({ apiToken: 't', accountId: 'a', databaseId: 'd' }, ['SQL-1', 'SQL-2']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const bodies = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body as string).sql);
    expect(bodies).toEqual(['SQL-1', 'SQL-2']);
  });
});
