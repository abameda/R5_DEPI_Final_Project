import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** True when the visitor asked the system for less motion. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => { const m = matchMedia(QUERY); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => matchMedia(QUERY).matches,
    () => false,
  );
}

/**
 * Animates a number toward `target` with an ease-out curve, starting from the
 * value it last showed. The first value is shown at once unless `fromZero`
 * (the Home counters count up from 0 once). Reduced motion shows every value at once.
 */
export function useCountUp(target: number | undefined, ms = 600, fromZero = false): number | undefined {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(fromZero && !reduced ? 0 : target);
  const from = useRef<number | undefined>(fromZero ? 0 : target);

  useEffect(() => {
    if (target === undefined) return;
    const start = from.current;
    if (reduced || start === undefined || start === target) { from.current = target; setShown(target); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const v = start + (target - start) * (1 - (1 - p) ** 3);
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduced]);

  return shown;
}
