import { useSyncExternalStore } from "react";

/**
 * Two levels of detail. Simple keeps the job seeker's path (find jobs, see your
 * match, know what to learn next); Advanced adds the market analysis, the tools
 * and the numbers behind every figure. Like the theme, it lives in this browser.
 */
export type Mode = "simple" | "advanced";

const KEY = "jmi-mode";
const listeners = new Set<() => void>();

function read(): Mode {
  try { return localStorage.getItem(KEY) === "advanced" ? "advanced" : "simple"; } catch { return "simple"; } // storage may be blocked
}

let mode = read();

export function setMode(m: Mode) {
  mode = m;
  try { localStorage.setItem(KEY, m); } catch { /* storage may be blocked: keep it for this visit */ }
  listeners.forEach((l) => l());
}

export function useMode(): [Mode, (m: Mode) => void] {
  const m = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => mode);
  return [m, setMode];
}

export const useAdvanced = () => useMode()[0] === "advanced";
