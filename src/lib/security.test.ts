import { describe, it, expect } from 'vitest';
import { sanitizeUrl, escapeHtml } from './security';

describe('sanitizeUrl', () => {
  it('放行 http / https / mailto 安全协议', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('http://a.b/c?d=1')).toBe('http://a.b/c?d=1');
    expect(sanitizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('拦截 javascript: / data: / file: 等危险协议（大小写不敏感）', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('#');
    expect(sanitizeUrl('data:text/html,<script>x</script>')).toBe('#');
    expect(sanitizeUrl('file:///etc/passwd')).toBe('#');
    expect(sanitizeUrl('vbscript:msgbox')).toBe('#');
  });

  it('相对路径与锚点安全放行（站内导航依赖）', () => {
    expect(sanitizeUrl('/ai')).toBe('/ai');
    expect(sanitizeUrl('./foo')).toBe('./foo');
    expect(sanitizeUrl('#top')).toBe('#top');
  });

  it('空值与缺失降级为 #', () => {
    expect(sanitizeUrl('')).toBe('#');
    expect(sanitizeUrl(undefined as unknown as string)).toBe('#');
  });

  it('SEC-4：拒绝协议相对 URL（//evil.com）与控制字符', () => {
    expect(sanitizeUrl('//evil.com/x')).toBe('#');
    expect(sanitizeUrl('java\nscript:alert(1)')).toBe('#');
    expect(sanitizeUrl('javascript:\u0000alert(1)')).toBe('#');
  });
});

describe('escapeHtml', () => {
  it('转义 5 个 HTML 特殊字符', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('注入上下文不会形成可执行的标签（阻断 XSS）', () => {
    const s = escapeHtml('</script><script>alert(1)</script>');
    expect(s).toBe('&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(s).not.toContain('<');
  });
});
