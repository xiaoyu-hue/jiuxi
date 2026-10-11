// 九溪 · 克制动效初始化（纯 vanilla，无框架依赖）
//
// 仅四类动效（见 DESIGN.md §6）：滚动渐显、卡片流增删过渡、平滑滚动、页面间淡入
// （淡入由 astro:transitions 的 ClientRouter 提供，此处不含）。
//
// 原则：
//  - 内容默认可见；.reveal 类只在 JS 运行时由本模块添加，故禁用 JS 时页面仍完整可读。
//  - 系统级 prefers-reduced-motion 或应用级 .reduce-motion 开启时，整体跳过动效。
//  - 平滑滚动（Lenis）只初始化一次，避免 astro:transitions 换页后重复实例化。

import autoAnimate from '@formkit/auto-animate';
import Lenis from 'lenis';

/** 是否应降低动效（系统偏好或应用开关） */
function prefersReduced(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return document.body.classList.contains('reduce-motion');
}

let lenisStarted = false;

export function initMotion(): void {
  if (prefersReduced()) return;

  // ── 1) 滚动渐显（IntersectionObserver 兜底；Firefox 不支持 CSS scroll-driven 时仍可用）──
  const targets = document.querySelectorAll<HTMLElement>(
    '.feed-card, .bento-card, .page-head, .masthead',
  );
  if (targets.length && 'IntersectionObserver' in window) {
    targets.forEach((el) => el.classList.add('reveal'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    targets.forEach((el) => io.observe(el));
  }

  // ── 2) 卡片流增删/重排过渡（仅对未绑定过的网格生效）──
  document.querySelectorAll<HTMLElement>('.feed-grid').forEach((el) => {
    if (el.dataset.motion === 'on') return;
    el.dataset.motion = 'on';
    autoAnimate(el, { duration: 280, easing: 'ease-out' });
  });

  // ── 3) 平滑滚动（Lenis，仅初始化一次）──
  if (!lenisStarted) {
    lenisStarted = true;
    try {
      const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      const raf = (time: number) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    } catch {
      /* Lenis 不可用时静默降级为原生滚动 */
    }
  }
}
