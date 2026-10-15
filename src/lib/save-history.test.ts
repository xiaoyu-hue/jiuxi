import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readdirSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { isValidSection, saveSnapshot, cleanupExpired } from '../../scripts/save-history.mjs';

// 2026-10-15 审查 P2：save-history.mjs 原无 CLI 入口守卫（import 即跑 main()
// 读 stdin），无法单测。现已与 fetch-feeds.mjs 统一加守卫并导出纯函数。
// 覆盖两项新防线：
//   1) section/date 白名单：stdin JSON 的键直接拼文件名，含 "../" 可路径穿越；
//   2) cleanupExpired 时区统一 UTC：旧实现本地时间 cutoff vs UTC 文件名日期，
//      在 UTC+8 凌晨等场景差一天，导致该删不删/边界误删。

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(resolve(tmpdir(), 'jiuxi-history-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** 生成 N 天前的 UTC 日期串（与脚本内部同一时区基准） */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

describe('isValidSection 白名单', () => {
  it('接受现有板块名与合理的自定义名', () => {
    for (const s of ['ai', 'news', 'tech', 'gaming', 'my-section', 'a1']) {
      expect(isValidSection(s)).toBe(true);
    }
  });

  it('拒绝路径穿越与异常输入', () => {
    for (const s of [
      '../evil',
      '..',
      '.',
      'a/b',
      'a\\b',
      '',
      'AI',
      '0ai',
      '-ai',
      'ai section',
      'ai;rm',
      'x'.repeat(33),
      'ai.json',
    ]) {
      expect(isValidSection(s)).toBe(false);
    }
  });
});

describe('saveSnapshot', () => {
  it('正常板块写入 {section}-{date}.json', () => {
    const snap = saveSnapshot('ai', [{ title: 't' }], '2026-10-15', dir);
    expect(snap).not.toBeNull();
    expect(existsSync(resolve(dir, 'ai-2026-10-15.json'))).toBe(true);
    const parsed = JSON.parse(readFileSync(resolve(dir, 'ai-2026-10-15.json'), 'utf8'));
    expect(parsed).toMatchObject({
      id: 'ai-2026-10-15',
      section: 'ai',
      date: '2026-10-15',
      itemCount: 1,
    });
  });

  it('非法板块名不写任何文件（路径穿越防护）', () => {
    const before = readdirSync(dir);
    const snap = saveSnapshot('../../etc/passwd', [{ title: 't' }], '2026-10-15', dir);
    expect(snap).toBeNull();
    expect(readdirSync(dir)).toEqual(before);
    // 穿越目标（上级目录）同样未被创建
    expect(existsSync(resolve(dir, '../../etc/passwd-2026-10-15.json'))).toBe(false);
  });

  it('非法日期不写文件', () => {
    const snap = saveSnapshot('ai', [{ title: 't' }], '2026/10/15', dir);
    expect(snap).toBeNull();
    expect(readdirSync(dir)).toHaveLength(0);
  });

  it('空数据不写文件', () => {
    expect(saveSnapshot('ai', [], '2026-10-15', dir)).toBeNull();
    expect(readdirSync(dir)).toHaveLength(0);
  });
});

describe('cleanupExpired 时区与保留策略', () => {
  it('删除超过保留期的文件，保留保留期内的文件', () => {
    const old = daysAgo(40);
    const recent = daysAgo(5);
    writeFileSync(resolve(dir, `ai-${old}.json`), '{}');
    writeFileSync(resolve(dir, `news-${recent}.json`), '{}');
    writeFileSync(resolve(dir, `tech-${daysAgo(31)}.json`), '{}');

    cleanupExpired(30, dir);

    const left = readdirSync(dir).sort();
    expect(left).toEqual([`news-${recent}.json`]);
  });

  it('文件名无日期的文件不受影响', () => {
    writeFileSync(resolve(dir, 'README.json'), '{}');
    cleanupExpired(30, dir);
    expect(readdirSync(dir)).toEqual(['README.json']);
  });

  it('保留期边界：N-1 天前的文件保留，N 天前的文件删除', () => {
    // 语义：文件名日期按 UTC 午夜解析，cutoff = 现在 − N×24h。
    // 由于"现在"含当天时分，N 天前那个日期的文件实际年龄为
    // N 天 + 当天已过去的小时数，必然略超 cutoff → 删；
    // N-1 天前的文件必然在保留期内 → 留。
    const within = daysAgo(29);
    const over = daysAgo(30);
    writeFileSync(resolve(dir, `ai-${within}.json`), '{}');
    writeFileSync(resolve(dir, `news-${over}.json`), '{}');

    cleanupExpired(30, dir);

    expect(readdirSync(dir)).toEqual([`ai-${within}.json`]);
  });

  it('目录不存在时静默返回', () => {
    expect(() => cleanupExpired(30, resolve(dir, 'not-exist'))).not.toThrow();
  });
});
