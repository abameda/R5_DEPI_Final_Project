import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet } from "./api";
import { EMPTY_FILTERS, filterParams, isFilterKey, parseFilters, type Filters, type ListKey } from "./filters";
import type { Meta } from "./types";

/** Global filters from the URL + setters that keep page-local params intact. */
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const replace = useCallback((next: Filters) => {
    setParams((prev) => {
      const sp = new URLSearchParams(filterParams(next));
      // keep page-local state (tab, sort ...) but reset pagination: the population changed
      prev.forEach((v, k) => { if (!isFilterKey(k) && k !== "page") sp.append(k, v); });
      return sp;
    });
  }, [setParams]);

  const set = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    replace({ ...filters, [key]: value });
  }, [filters, replace]);

  const toggle = useCallback((key: ListKey, value: string) => {
    const cur = filters[key];
    set(key, cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]);
  }, [filters, set]);

  const reset = useCallback(() => replace({ ...EMPTY_FILTERS, provenance: filters.provenance }), [replace, filters.provenance]);

  return { filters, set, toggle, reset, replace };
}

/**
 * Update several page-local URL parameters in ONE navigation. Two separate
 * setSearchParams calls in the same event both start from the current URL,
 * so the second would silently undo the first (e.g. sort + page reset).
 */
export function useUpdateParams() {
  const [, setParams] = useSearchParams();
  return useCallback((updates: Record<string, string | null>) => {
    setParams((prev) => {
      const sp = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      return sp;
    }, { replace: true });
  }, [setParams]);
}

/** A page-local URL parameter (tab, sort, selected skill ...). */
export function useParam(key: string, fallback = ""): [string, (v: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? fallback;
  const setValue = useCallback((v: string | null) => {
    setParams((prev) => {
      const sp = new URLSearchParams(prev);
      if (v === null || v === "" || v === fallback) sp.delete(key);
      else sp.set(key, v);
      return sp;
    }, { replace: true });
  }, [key, fallback, setParams]);
  return [value, setValue];
}

export function useMeta() {
  return useQuery<Meta>({ queryKey: ["meta"], queryFn: () => apiGet<Meta>("/meta"), staleTime: Infinity });
}

/** Label helpers that read the API's label tables (single source of truth). */
export function useLabels() {
  const { data } = useMeta();
  return useMemo(() => ({
    source: (k: string) => data?.labels.source[k] ?? k,
    cohort: (k: string) => data?.labels.cohort[k] ?? k,
    dim: (k: string) => data?.labels.dimension[k] ?? k,
  }), [data]);
}

// --- theme --------------------------------------------------------------------
type Theme = "light" | "dark";
const listeners = new Set<() => void>();
const getTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("jmi-theme", t); } catch { /* storage may be blocked */ }
  listeners.forEach((l) => l());
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, getTheme);
  return [theme, setTheme];
}

/** Remembers a value across renders so a figure can flash when it changes. */
export function useChanged(value: unknown): boolean {
  const key = JSON.stringify(value);
  const [state, setState] = useState({ key, changed: false });
  useEffect(() => {
    if (key !== state.key) setState({ key, changed: true });
  }, [key, state.key]);
  return state.changed && state.key === key;
}

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const mq = matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}
