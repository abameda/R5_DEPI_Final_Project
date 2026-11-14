import type { Filters } from "./filters";
import { t } from "./i18n";
import { whereFilters, type Where } from "./profile";

/**
 * Which postings a skill match is computed from.
 * - global: every posting for the role, wherever it is. This is the only scope
 *   shown today, as the "Global Skill Match".
 * - local: only postings in the visitor's chosen place. Used for the jobs list
 *   now; a "Local Skill Match" can use it once regional samples are reliable.
 */
export type MatchScope = "global" | "local";
/** all = every posting; recent = only the 2024–26 collection. */
export type Recency = "all" | "recent";

export const LOCATION_KEYS = ["country", "region", "market"] as const;

/** Builds the filters for a match request. The role is sent separately as `target_role`. */
export function matchFilters(base: Filters, scope: MatchScope, where: Where, recency: Recency): Filters {
  const f: Filters = { ...base, role: [], cohort: recency === "recent" ? ["collected_2026"] : [] };
  for (const k of LOCATION_KEYS) f[k] = [];
  return scope === "local" ? { ...f, ...whereFilters(where) } : f;
}

/** The name and scope note shown with a match, so no screen hard-codes "global". */
export function scopeText(scope: MatchScope): { name: string; note: string } {
  return scope === "global"
    ? { name: t("Global Skill Match", "التوافق العالمي للمهارات"),
        note: t("Skills asked for across all markets. Not specific to Egypt or your chosen location.", "المهارات المطلوبة في كل الأسواق، وليست خاصة بمصر أو بالمكان الذي اخترته.") }
    : { name: t("Local Skill Match", "التوافق المحلي للمهارات"), note: "" };
}

/** The five places, short enough for one segmented control. */
export const whereOptions = (): { value: Where; label: string }[] => [
  { value: "egypt", label: t("Egypt", "مصر") }, { value: "arab", label: t("Arab", "عربي") },
  { value: "remote", label: t("Remote", "عن بُعد") }, { value: "international", label: t("Int’l", "دولي") },
  { value: "any", label: t("Anywhere", "أي مكان") },
];

/** A place as people say it, for headings and buttons ("in Egypt", "See Arab countries instead"). */
export function placeName(w: Where): string {
  switch (w) {
    case "egypt": return t("Egypt", "مصر");
    case "arab": return t("Arab countries", "الدول العربية");
    case "remote": return t("remote jobs", "الوظائف عن بُعد");
    case "international": return t("international markets", "الأسواق الدولية");
    default: return t("all markets", "كل الأسواق");
  }
}

/** Maps a match share (0–1) to the needle's angle: -90° at 0%, 90° at 100%. */
export function dialAngle(score: number): number {
  if (!Number.isFinite(score)) return -90;
  return Math.min(1, Math.max(0, score)) * 180 - 90;
}
