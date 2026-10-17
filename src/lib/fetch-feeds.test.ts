import { describe, it, expect } from 'vitest';
import { injectData, rankZhFirstByTime } from '../../scripts/fetch-feeds.mjs';

// 回归测试：构建脚本把 RSS 数据注入 <script type="application/json"> 时必须转义 <，
// 否则标题含 </script> 会提前闭合脚本块并注入可执行脚本（全站存储型 XSS）。
describe('fetch-feeds injectData (SEC-1)', () => {
  it('标题含 </script> 不会提前闭合 JSON 脚本块', () => {
    const items = [
      { title: '</script><script>alert(1)</script>', link: 'https://x.com', source: 'S' },
    ];
    const out = injectData('<head></head>', 'ai', items);
    expect(out).toContain('id="jiuxi-feed-ai"');
    // 注入数据内不含字面 </script>，不会出现第二个可执行脚本块
    expect(out).not.toMatch(/<\/script>\s*<script/i);
    // 危险字符已被转义为 \u003c
    expect(out).toContain('\\u003c/script>');
  });

  it('正常数据注入后整页仍只含一条 JSON 脚本块', () => {
    const out = injectData('<head></head>', 'news', [{ title: 'Hello', link: 'https://a.com' }]);
    const matches = out.match(/<script type="application\/json"/g);
    expect(matches).toHaveLength(1);
  });
});

// 2026-10-17 策略变更：板块分配由「按源轮询」改为「中文优先 + 时间降序」。
describe('fetch-feeds rankZhFirstByTime（中文优先 + 时间降序）', () => {
  it('中文条目在前、各组内按时间降序，并截断到 limit', () => {
    const items = [
      { title: 'OpenAI news', link: 'en1', pubDate: '2026-10-15T00:00:00Z' },
      { title: '国内 AI', link: 'zh1', pubDate: '2026-10-10T00:00:00Z' },
      { title: 'Google blog', link: 'en2', pubDate: '2026-10-14T00:00:00Z' },
      { title: '华为芯片', link: 'zh2', pubDate: '2026-10-12T00:00:00Z' },
    ];
    const out = rankZhFirstByTime(items, 3);
    expect(out.map((i) => i.link)).toEqual(['zh2', 'zh1', 'en1']);
  });

  it('全英文时退化为按时间降序', () => {
    const items = [
      { title: 'B news', link: 'b', pubDate: '2026-10-10T00:00:00Z' },
      { title: 'A news', link: 'a', pubDate: '2026-10-15T00:00:00Z' },
    ];
    expect(rankZhFirstByTime(items, 24).map((i) => i.link)).toEqual(['a', 'b']);
  });

  // 2026-10-17 v1.10.0：英文保底配额（与 src/lib/feeds.ts 的 rankZhFirst 逻辑保持一致，
  // 两端行为必须一致，否则构建期注入的数据与浏览器端重排结果会打架）
  it('英文保底配额：中文再多也按配额给英文留位（18 中 + 6 英）', () => {
    const items = [];
    for (let i = 0; i < 30; i++) {
      items.push({
        title: `中文${i}`,
        link: `zh${i}`,
        pubDate: `2026-10-${String(10 + (i % 8)).padStart(2, '0')}T00:00:00Z`,
      });
    }
    for (let i = 0; i < 10; i++) {
      items.push({ title: `English ${i}`, link: `en${i}`, pubDate: '2026-10-15T00:00:00Z' });
    }
    const out = rankZhFirstByTime(items, 24, 6);
    expect(out.filter((i) => i.link.startsWith('zh'))).toHaveLength(18);
    expect(out.filter((i) => i.link.startsWith('en'))).toHaveLength(6);
  });

  it('英文不足配额时多余名额由中文补上；中文不足时英文补满空位', () => {
    const enShort = rankZhFirstByTime(
      [
        { title: 'English', link: 'en1', pubDate: '2026-10-15T00:00:00Z' },
        { title: '中文一', link: 'zh1', pubDate: '2026-10-14T00:00:00Z' },
        { title: '中文二', link: 'zh2', pubDate: '2026-10-13T00:00:00Z' },
      ],
      4,
      6,
    );
    expect(enShort.map((i) => i.link)).toEqual(['zh1', 'zh2', 'en1']);
    const zhShort = rankZhFirstByTime(
      [
        { title: '中文', link: 'zh1', pubDate: '2026-10-14T00:00:00Z' },
        { title: 'English A', link: 'en1', pubDate: '2026-10-15T00:00:00Z' },
        { title: 'English B', link: 'en2', pubDate: '2026-10-13T00:00:00Z' },
        { title: 'English C', link: 'en3', pubDate: '2026-10-12T00:00:00Z' },
      ],
      4,
      2,
    );
    expect(zhShort.map((i) => i.link)).toEqual(['zh1', 'en1', 'en2', 'en3']);
  });

  it('enQuota 大于 limit 时全英文且总数不超 limit', () => {
    const out = rankZhFirstByTime(
      [
        { title: '中文', link: 'zh1', pubDate: '2026-10-14T00:00:00Z' },
        { title: 'English A', link: 'en1', pubDate: '2026-10-15T00:00:00Z' },
        { title: 'English B', link: 'en2', pubDate: '2026-10-13T00:00:00Z' },
      ],
      2,
      5,
    );
    expect(out.map((i) => i.link)).toEqual(['en1', 'en2']);
  });

  it('enQuota 默认 0 保持 v1.9.0 旧行为（中文排满后英文才补位）', () => {
    const items = [
      { title: '中文', link: 'zh1', pubDate: '2026-10-14T00:00:00Z' },
      { title: 'English', link: 'en1', pubDate: '2026-10-15T00:00:00Z' },
    ];
    expect(rankZhFirstByTime(items, 4).map((i) => i.link)).toEqual(['zh1', 'en1']);
    expect(rankZhFirstByTime(items, 4, 0).map((i) => i.link)).toEqual(['zh1', 'en1']);
  });
});
