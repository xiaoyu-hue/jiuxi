// 九溪 · 克制动效初始化（纯 vanilla，无框架依赖）
//
// 仅四类动效（见 DESIGN.md §6）：滚动渐显、卡片流增删过渡、平滑滚动、页面间淡入
// （淡入由 astro:transitions 的 ClientRouter 提供，此处不含）。
//
// 原则：
//  - 内容默认可见；.reveal 类只在 JS 运行时由本模块添加，故禁用 JS 时页面仍完整可读。
//  - 系统级 prefers-reduced-motion 或应用级 .reduce-motion 开启时，整体跳过动效。
//  - 平滑滚动（Lenis）只初始化一次，避免 astro:transitions 换页后重复实例化。
//  - stopMotion() 供设置页「降低动效」勾选时即时调用：无需刷新页面即可停掉在途动效。

import autoAnimate from '@formkit/auto-animate';
import Lenis from 'lenis';

/** 是否应降低动效（系统偏好或应用开关） */
function prefersReduced(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return document.body.classList.contains('reduce-motion');
}

let lenisStarted = false;
let lenis: Lenis | null = null;
let lenisRaf = 0;
// autoAnimate 返回的控制器句柄（disable() 可运行时关闭卡片流过渡）。
// 注意：autoAnimate 内置的降低动效守卫只认系统级 matchMedia，
// 不认应用级 .reduce-motion，故应用开关必须经此处显式停用。
let autoHandles: Array<{ disable(): void }> = [];

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
    const handle = autoAnimate(el, { duration: 280, easing: 'ease-out' });
    // 系统已开启降低动效时 autoAnimate 返回 undefined，无需记录
    if (handle) autoHandles.push(handle);
  });

  // ── 3) 平滑滚动（Lenis，仅初始化一次）──
  if (!lenisStarted) {
    lenisStarted = true;
    try {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      const raf = (time: number) => {
        if (!lenis) return; // stopMotion 已销毁：自然退出循环
        lenisRaf = requestAnimationFrame(raf);
        lenis.raf(time);
      };
      lenisRaf = requestAnimationFrame(raf);
    } catch {
      /* Lenis 不可用时静默降级为原生滚动 */
    }
  }
}

/**
 * 立即停止所有在途动效（设置页切换「降低动效」时调用，无需刷新页面）。
 *
 * 覆盖三类 JS 动效：
 *  1) Lenis 平滑滚动：销毁实例并取消 RAF 循环（lenisStarted 复位，
 *     之后若再关闭「降低动效」，initMotion 可重新初始化）；
 *  2) 卡片流过渡：autoAnimate 的 WAAPI 动画不受 CSS 过渡守卫约束，
 *     且其内置守卫只认系统 media query——用 handle.disable() 显式关闭，
 *     同时清掉 data-motion 标记以便日后重新绑定；
 *  3) 滚动渐显：把尚未触发的 .reveal 元素补上 .is-visible，
 *     避免勾选「降低动效」后元素停在 opacity:0 的不可见状态
 *     （.reveal 只在 IntersectionObserver 触发时才移除）。
 *
 * 页面间淡入（astro:transitions）的应用级守卫在 global.css：
 * Astro 内置守卫只认系统 prefers-reduced-motion，不认 .reduce-motion。
 */
export function stopMotion(): void {
  // 1) 停 Lenis
  if (lenisRaf) {
    cancelAnimationFrame(lenisRaf);
    lenisRaf = 0;
  }
  lenis?.destroy();
  lenis = null;
  lenisStarted = false;

  // 2) 停卡片流过渡
  autoHandles.forEach((h) => {
    try {
      h.disable();
    } catch {
      /* 句柄已失效时忽略 */
    }
  });
  autoHandles = [];
  document.querySelectorAll<HTMLElement>('.feed-grid').forEach((el) => {
    delete el.dataset.motion;
  });

  // 3) 兜底：确保没有元素停在 .reveal 的不可见状态
  document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
    el.classList.add('is-visible');
  });
}
