import { useEffect, RefObject } from "react";

/**
 * Focus trap + Escape close + auto-focus first focusable.
 * Pass active=false to disable.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement>,
  onEscape?: () => void,
  active: boolean = true
) {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      const list = node.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(list).filter(
        (el) => !el.hasAttribute("aria-hidden") && el.offsetParent !== null
      );
    };

    // Auto focus first
    const focusables = getFocusable();
    if (focusables.length > 0) focusables[0].focus();
    else node.setAttribute("tabindex", "-1"), node.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;
      const f = getFocusable();
      if (f.length === 0) {
        e.preventDefault();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !node.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !node.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previouslyFocused?.focus?.();
    };
  }, [ref, onEscape, active]);
}