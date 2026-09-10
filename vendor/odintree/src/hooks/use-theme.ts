import { useEffect, useState } from "react";

/**
 * Reactive theme hook. Listens for `dark` class changes on <html> and
 * returns the current value so consumers (e.g. syntax highlighters) can
 * swap their colour theme live when the user toggles theme.
 */
export function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return isDark;
}
