import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from './security';

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
});
