import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initMotion, stopMotion } from './motion';

// 2026-10-15 审查 L14：设置页勾选「降低动效」后应即时生效、无需刷新页面。
// motion.ts 为此新增 stopMotion()。本测试锁死三条行为：
//   1) .reduce-motion 存在时 initMotion 整体跳过（不加 .reveal）；
//   2) stopMotion 把尚未触发的 .reveal 元素补为可见（不会停在 opacity:0）；
//   3) stopMotion 幂等、且在未初始化时调用不炸。

function mountDom() {
  document.body.innerHTML = `
    <div class="feed-grid"><article class="feed-card">A</article></div>
    <section class="page-head">head</section>
    <div class="masthead">masthead</div>
  `;
}

beforeEach(() => {
  mountDom();
  document.body.classList.remove('reduce-motion');
});

afterEach(() => {
  // 每个用例后确保动效已停：Lenis 的 RAF 循环不能泄漏到后续用例
  stopMotion();
  document.body.classList.remove('reduce-motion');
  vi.restoreAllMocks();
});

describe('initMotion 与 .reduce-motion', () => {
  it('应用级降低动效开启时整体跳过（不加 .reveal）', () => {
    document.body.classList.add('reduce-motion');
    initMotion();
    expect(document.querySelectorAll('.reveal')).toHaveLength(0);
  });

  it('正常状态下给动效目标加 .reveal（happy-dom 无真实交叉，不会自动可见）', () => {
    initMotion();
    expect(document.querySelectorAll('.reveal').length).toBeGreaterThan(0);
    // 未触发 IntersectionObserver 前不应有 is-visible（这正是 stopMotion 要兜底的场景）
    expect(document.querySelectorAll('.reveal.is-visible')).toHaveLength(0);
  });
});

describe('stopMotion', () => {
  it('把未触发的 .reveal 元素补为可见，避免停在不可见状态', () => {
    initMotion();
    expect(document.querySelector('.feed-card')?.classList.contains('reveal')).toBe(true);
    stopMotion();
    const cards = document.querySelectorAll('.reveal');
    expect(cards.length).toBeGreaterThan(0);
    for (const el of cards) {
      expect(el.classList.contains('is-visible')).toBe(true);
    }
  });

  it('清掉 .feed-grid 的 data-motion 标记（便于日后重新绑定）', () => {
    initMotion();
    const grid = document.querySelector('.feed-grid') as HTMLElement;
    // autoAnimate 在 happy-dom（有 ResizeObserver）下应成功绑定
    expect(grid.dataset.motion).toBe('on');
    stopMotion();
    expect(grid.dataset.motion).toBeUndefined();
  });

  it('幂等：重复调用不抛错', () => {
    initMotion();
    stopMotion();
    expect(() => stopMotion()).not.toThrow();
    expect(() => stopMotion()).not.toThrow();
  });

  it('未初始化时调用不抛错（先停后启的顺序也安全）', () => {
    expect(() => stopMotion()).not.toThrow();
    expect(() => initMotion()).not.toThrow();
  });

  it('停掉后重新 initMotion 可再次绑定（取消勾选「降低动效」的场景）', () => {
    initMotion();
    stopMotion();
    initMotion();
    const grid = document.querySelector('.feed-grid') as HTMLElement;
    expect(grid.dataset.motion).toBe('on');
  });
});
