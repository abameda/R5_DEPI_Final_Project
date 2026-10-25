import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet } from "./api";
import { EMPTY_FILTERS, filterParams, isFilterKey, parseFilters, type Filters, type ListKey } from "./filters";
import { getLang } from "./i18n";
import type { Meta } from "./types";

/** URL parameters that hold a page number (reset whenever the filters change). */
export const PAGE_KEYS = ["page", "epage"];

/** Global filters from the URL + setters that keep page-local params intact. */
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const replace = useCallback((next: Filters) => {
    setParams((prev) => {
      const sp = new URLSearchParams(filterParams(next));
      // keep page-local state (tab, sort ...) but reset pagination: the population changed
      prev.forEach((v, k) => { if (!isFilterKey(k) && !PAGE_KEYS.includes(k)) sp.append(k, v); });
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

/** Arabic twins of the API's label tables (api/labels.py), by the same keys. */
const AR_LABELS = {
  source: {
    kaggle_2023_international: "أرشيف Kaggle لوظائف البيانات 2023 (دولي)",
    kaggle_2023_arab_search: "أرشيف Kaggle لوظائف البيانات 2023 (بحث في مواقع عربية)",
    jooble_careerjet_foreign: "واجهات Jooble وCareerjet",
    all_tech_jobs: "مجموعة الفريق من الواجهات والمواقع",
    startup_jobs: "startup.jobs",
    remote_boards: "مواقع الوظائف عن بُعد",
    arab_jobs: "مواقع الوظائف العربية ومجموعة ArabJobs",
    cybersecurity_manual: "جمع يدوي لوظائف الأمن السيبراني",
  } as Record<string, string>,
  cohort: {
    kaggle_2023: "أرشيف Kaggle لعام 2023",
    collected_2026: "مجموعة 2024–26 من الواجهات والمواقع",
  } as Record<string, string>,
  cohortNote: {
    kaggle_2023: "إعلانات Google Jobs لوظائف البيانات، نُشرت بين يناير وديسمبر 2023 (مجموعة بيانات Kaggle).",
    collected_2026: "إعلانات جمعها الفريق من واجهات برمجية ومواقع توظيف، معظمها بين سبتمبر وأكتوبر 2026.",
  } as Record<string, string>,
  dimension: {
    role_category: "الدور", country: "الدولة", region: "المنطقة", market_type: "السوق", seniority: "مستوى الخبرة",
    job_type: "نوع التوظيف", work_mode: "نمط العمل", source_dataset: "مصدر البيانات", cohort: "دفعة الجمع",
    language: "اللغة", posted_month: "شهر النشر", posted_year: "سنة النشر", company: "جهة التوظيف",
    skill: "المهارة", skill_category: "فئة المهارة",
  } as Record<string, string>,
};

/** Label helpers that read the API's label tables (single source of truth), in the current language. */
export function useLabels() {
  const { data } = useMeta();
  return useMemo(() => {
    const ar = getLang() === "ar";
    const pick = (table: Record<string, string>, api: Record<string, string> | undefined) => (k: string) =>
      (ar ? table[k] : undefined) ?? api?.[k] ?? k;
    return {
      source: pick(AR_LABELS.source, data?.labels.source),
      cohort: pick(AR_LABELS.cohort, data?.labels.cohort),
      cohortNote: pick(AR_LABELS.cohortNote, data?.labels.cohort_notes),
      dim: pick(AR_LABELS.dimension, data?.labels.dimension),
    };
  }, [data]);
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
