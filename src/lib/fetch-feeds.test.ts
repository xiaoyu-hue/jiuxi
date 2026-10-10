import { describe, it, expect } from 'vitest';
import { injectData } from '../../scripts/fetch-feeds.mjs';

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
