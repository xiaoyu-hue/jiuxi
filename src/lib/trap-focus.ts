// 九溪 · 浮层焦点圈定（focus trap，可访问性工具）
//
// 背景：SearchOverlay 与 MobileTabBar 的 sheet 都声明了 aria-modal="true"，
// 但此前没有焦点圈定——Tab 键会穿出浮层落到背后的页面上，键盘用户
// 「模态浮层开着却在操作背景内容」，违反 WAI-ARIA 模态对话框规范
// （2026-10-15 审查 M6/M7 修复）。
//
// 用法：浮层打开（hidden 移除）后调用 trapFocus(container) 拿到 handle，
// 关闭时调用 handle.release()——自动把焦点归还打开前的元素。

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface FocusTrapHandle {
  /** 解除圈定并把焦点归还打开前的元素 */
  release(): void;
}

/** 当前可见（非 display:none / 非 hidden 属性）的可聚焦元素 */
function isVisible(el: HTMLElement): boolean {
  // happy-dom 的 offsetParent 恒为 undefined、checkVisibility 不识别 hidden，
  // 故以 hidden 属性为主判据（浏览器与测试环境行为一致），浏览器里再叠加
  // offsetParent 兜底 CSS display:none（offsetParent 为 null）的情况。
  if (el.hidden) return false;
  if (el.offsetParent === null) return false;
  return true;
}

function focusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible);
}

/**
 * 圈定 container 内的键盘焦点。
 * 打开时自动聚焦首个可聚焦元素；Tab / Shift+Tab 在容器内循环；
 * release 时移除监听并焦点归还。
 *
 * 监听器挂在 document 而非 container：万一焦点因浏览器怪癖穿出浮层，
 * 下一次 Tab 会把它拉回容器（模态语义），而不是放任用户在背景操作。
 */
export function trapFocus(container: HTMLElement): FocusTrapHandle {
  const prevFocus = document.activeElement as HTMLElement | null;

  focusables(container)[0]?.focus();

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    // 容器已离页（换页 / 重复打开未 release 的泄漏场景）：本 trap 自动失效，
    // 避免陈旧监听器拦截属于新浮层的 Tab。
    if (!container.isConnected) return;
    const list = focusables(container);
    if (!list.length) {
      // 浮层内暂无可聚焦元素（如搜索结果还没渲染）：拦住 Tab，防止穿出
      e.preventDefault();
      return;
    }
    const firstEl = list[0];
    const lastEl = list[list.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (!active || !container.contains(active)) {
      // 焦点不知何故在容器外：拉回首个
      e.preventDefault();
      firstEl.focus();
      return;
    }
    if (e.shiftKey && active === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && active === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };

  document.addEventListener('keydown', onKeydown);

  return {
    release() {
      document.removeEventListener('keydown', onKeydown);
      // 焦点归还打开前的元素；若该元素已不在文档（换页场景）则安全忽略
      if (prevFocus && prevFocus.isConnected) prevFocus.focus();
    },
  };
}
