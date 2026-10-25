/**
 * Global filters live in the URL (shareable, back-button friendly) and use the
 * same parameter names as the API, so a view's query string IS its API query.
 */
export const LIST_KEYS = [
  "country", "region", "market", "role", "seniority", "job_type", "work_mode",
  "source", "cohort", "company", "skill",
] as const;
export const SCALAR_KEYS = ["q", "date_from", "date_to", "salary", "provenance"] as const;
export type ListKey = (typeof LIST_KEYS)[number];
export type ScalarKey = (typeof SCALAR_KEYS)[number];
export type FilterKey = ListKey | ScalarKey;

export interface Filters {
  country: string[]; region: string[]; market: string[]; role: string[]; seniority: string[];
  job_type: string[]; work_mode: string[]; source: string[]; cohort: string[]; company: string[];
  skill: string[];
  q?: string; date_from?: string; date_to?: string;
  salary?: "any" | "advertised";
  provenance?: "all" | "observed";
}

export const EMPTY_FILTERS: Filters = {
  country: [], region: [], market: [], role: [], seniority: [], job_type: [], work_mode: [],
  source: [], cohort: [], company: [], skill: [],
};

export function parseFilters(params: URLSearchParams): Filters {
  const f: Filters = { ...EMPTY_FILTERS };
  for (const k of LIST_KEYS) f[k] = params.getAll(k).filter(Boolean);
  const q = params.get("q");
  if (q) f.q = q;
  const df = params.get("date_from");
  if (df) f.date_from = df;
  const dt = params.get("date_to");
  if (dt) f.date_to = dt;
  if (params.get("salary") === "advertised") f.salary = "advertised";
  if (params.get("provenance") === "observed") f.provenance = "observed";
  return f;
}

/** Filters -> query params (only non-default values, stable order). */
export function filterParams(f: Partial<Filters>): [string, string][] {
  const out: [string, string][] = [];
  for (const k of LIST_KEYS) for (const v of f[k] ?? []) out.push([k, v]);
  if (f.q) out.push(["q", f.q]);
  if (f.date_from) out.push(["date_from", f.date_from]);
  if (f.date_to) out.push(["date_to", f.date_to]);
  if (f.salary === "advertised") out.push(["salary", "advertised"]);
  if (f.provenance === "observed") out.push(["provenance", "observed"]);
  return out;
}

export function activeCount(f: Filters): number {
  return filterParams(f).filter(([k]) => k !== "provenance").length;
}

/** JSON body form used by POST endpoints (compare, builder). */
export function filterBody(f: Partial<Filters>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const k of LIST_KEYS) if (f[k]?.length) body[k] = f[k];
  for (const k of SCALAR_KEYS) if (f[k]) body[k] = f[k];
  if (body.salary === "any") delete body.salary;
  if (body.provenance === "all") delete body.provenance;
  return body;
}

export function isFilterKey(k: string): k is FilterKey {
  return (LIST_KEYS as readonly string[]).includes(k) || (SCALAR_KEYS as readonly string[]).includes(k);
}

/** Build "path?params" for a drilldown, merging new filter values into the current ones. */
export function drillHref(path: string, current: Filters, add: Partial<Record<ListKey, string>>, extra: Record<string, string> = {}): string {
  const next: Filters = { ...current };
  for (const [k, v] of Object.entries(add) as [ListKey, string][]) {
    if (v && !next[k].includes(v)) next[k] = [...next[k], v];
  }
  const sp = new URLSearchParams(filterParams(next));
  for (const [k, v] of Object.entries(extra)) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}
