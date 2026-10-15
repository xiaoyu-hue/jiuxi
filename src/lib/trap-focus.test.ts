import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { trapFocus } from './trap-focus';

// 2026-10-15 审查 M6/M7：aria-modal 浮层焦点圈定的单元测试。

function buildOverlay() {
  const overlay = document.createElement('div');
  overlay.hidden = false;
  overlay.innerHTML = `
    <button type="button" id="first">first</button>
    <input id="mid" type="text" />
    <button type="button" id="last">last</button>
    <button type="button" id="gone" hidden>gone</button>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function tabKey(opts: { shiftKey?: boolean } = {}) {
  const e = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: !!opts.shiftKey,
    bubbles: true,
    cancelable: true,
  });
  document.activeElement?.dispatchEvent(e);
  return e;
}

describe('trapFocus', () => {
  let overlay: HTMLElement;
  let outsideBtn: HTMLButtonElement;
  // 收集未显式 release 的 trap，afterEach 统一清理（document 级监听不清理会跨用例泄漏）
  let handles: ReturnType<typeof trapFocus>[] = [];

  beforeEach(() => {
    handles = [];
    document.body.innerHTML = '';
    outsideBtn = document.createElement('button');
    outsideBtn.textContent = 'outside';
    document.body.appendChild(outsideBtn);
    overlay = buildOverlay();
  });

  afterEach(() => {
    handles.forEach((h) => h.release());
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('打开时聚焦浮层内首个可聚焦元素', () => {
    handles.push(trapFocus(overlay));
    expect(document.activeElement?.id).toBe('first');
  });

  it('Tab 在末元素处循环回首元素', () => {
    handles.push(trapFocus(overlay));
    const last = overlay.querySelector('#last') as HTMLElement;
    last.focus();
    const e = tabKey();
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('first');
  });

  it('Shift+Tab 在首元素处循环至末元素', () => {
    handles.push(trapFocus(overlay));
    const first = overlay.querySelector('#first') as HTMLElement;
    first.focus();
    const e = tabKey({ shiftKey: true });
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('last');
  });

  it('中间元素的 Tab 不被拦截（浏览器自然移动焦点）', () => {
    handles.push(trapFocus(overlay));
    const mid = overlay.querySelector('#mid') as HTMLElement;
    mid.focus();
    const e = tabKey();
    expect(e.defaultPrevented).toBe(false);
  });

  it('hidden 的按钮不参与循环', () => {
    handles.push(trapFocus(overlay));
    const lastVisible = overlay.querySelector('#last') as HTMLElement;
    lastVisible.focus();
    tabKey();
    expect(document.activeElement?.id).toBe('first'); // 跳过 hidden 的 #gone 循环回首
  });

  it('焦点在容器外时被拉回首个元素', () => {
    handles.push(trapFocus(overlay));
    outsideBtn.focus();
    const e = tabKey();
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('first');
  });

  it('release 后焦点归还打开前的元素', () => {
    outsideBtn.focus();
    const handle = trapFocus(overlay);
    expect(document.activeElement?.id).toBe('first');
    handle.release();
    expect(document.activeElement).toBe(outsideBtn);
  });

  it('release 后 Tab 不再被拦截', () => {
    const handle = trapFocus(overlay);
    handle.release();
    const last = overlay.querySelector('#last') as HTMLElement;
    last.focus();
    const e = tabKey();
    expect(e.defaultPrevented).toBe(false);
  });

  it('release 时打开前元素已离页（换页场景）不抛错', () => {
    outsideBtn.focus();
    const handle = trapFocus(overlay);
    outsideBtn.remove();
    expect(() => handle.release()).not.toThrow();
  });

  it('浮层内没有可聚焦元素时拦住 Tab（不穿出到背景）', () => {
    const empty = document.createElement('div');
    empty.hidden = false;
    document.body.appendChild(empty);
    outsideBtn.focus();
    handles.push(trapFocus(empty));
    const e = tabKey();
    expect(e.defaultPrevented).toBe(true);
  });

  it('容器离页后泄漏的 trap 自动失效，不拦截新浮层的 Tab', () => {
    // 模拟换页：旧 overlay 被移除但 trap 未 release
    handles.push(trapFocus(overlay));
    overlay.remove();
    // 新浮层 + 新 trap
    const overlay2 = buildOverlay();
    handles.push(trapFocus(overlay2));
    const mid2 = overlay2.querySelector('#mid') as HTMLElement;
    mid2.focus();
    const e = tabKey();
    expect(e.defaultPrevented).toBe(false); // 陈旧 trap 不再拦截
  });
});
