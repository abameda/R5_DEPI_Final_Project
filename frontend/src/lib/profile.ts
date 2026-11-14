import { useCallback, useSyncExternalStore } from "react";
import type { Filters } from "./filters";

/** Where the visitor wants to work. It scopes pay and jobs, never the Global Skill Match. */
export type Where = "egypt" | "arab" | "remote" | "international" | "any";
export const WHERE_VALUES: readonly Where[] = ["egypt", "arab", "remote", "international", "any"];
const isWhere = (v: unknown): v is Where => typeof v === "string" && (WHERE_VALUES as readonly string[]).includes(v);

/**
 * The visitor's own career profile: a target role, the skills they have and
 * where they want to work. It lives only in this browser (no accounts exist);
 * every page reads it so jobs, the plan and the market can speak to the same person.
 */
export interface Profile { role: string; skills: string[]; where: Where }

const KEY = "jmi-profile";
const EMPTY: Profile = { role: "", skills: [], where: "any" };
const listeners = new Set<() => void>();

/** Parses a stored profile; anything missing or malformed falls back to the empty value. */
export function readProfile(raw: string | null): Profile {
  if (!raw) return EMPTY;
  try {
    const p = JSON.parse(raw) as Partial<Profile>;
    return {
      role: typeof p.role === "string" ? p.role : "",
      skills: Array.isArray(p.skills) ? p.skills.filter((s): s is string => typeof s === "string" && s.length > 0 && s.length <= 120).slice(0, 60) : [],
      where: isWhere(p.where) ? p.where : "any", // profiles saved before "where" existed
    };
  } catch { return EMPTY; } // a stale or corrupted value
}

function read(): Profile {
  try { return readProfile(localStorage.getItem(KEY)); } catch { return EMPTY; } // storage may be blocked
}

let snapshot = read();

function write(next: Profile) {
  snapshot = { role: next.role, skills: [...new Set(next.skills)], where: isWhere(next.where) ? next.where : "any" };
  try { localStorage.setItem(KEY, JSON.stringify(snapshot)); } catch { /* storage may be blocked: keep it for this visit */ }
  listeners.forEach((l) => l());
}

export function useProfile() {
  const profile = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => snapshot);
  const setRole = useCallback((role: string) => write({ ...snapshot, role }), []);
  const setSkills = useCallback((skills: string[]) => write({ ...snapshot, skills }), []);
  const addSkill = useCallback((s: string) => write({ ...snapshot, skills: [...snapshot.skills, s] }), []);
  const removeSkill = useCallback((s: string) => write({ ...snapshot, skills: withoutSkill(snapshot.skills, s) }), []);
  const setWhere = useCallback((where: Where) => write({ ...snapshot, where }), []);
  return { profile, setRole, setSkills, addSkill, removeSkill, setWhere, replace: write };
}

/** The filters that select a place. Egypt is a country; the rest are market types. */
export function whereFilters(w: Where): Partial<Filters> {
  switch (w) {
    case "egypt": return { country: ["Egypt"] };
    case "arab": return { market: ["Arab"] };
    case "remote": return { market: ["Remote"] };
    case "international": return { market: ["International"] };
    default: return {};
  }
}

/** The next wider place to offer when a place has too few postings; null when nothing is wider. */
export function broaderWhere(w: Where): Where | null {
  if (w === "egypt") return "arab";
  return w === "any" ? null : "any";
}

/** Drops every spelling of a skill, so removal matches the case-insensitive ticks of `haveSet`. */
export function withoutSkill(skills: string[], skill: string) {
  const k = skill.toLowerCase();
  return skills.filter((x) => x.toLowerCase() !== k);
}

/** Case-insensitive membership, so "sql" typed elsewhere still counts as SQL. */
export function haveSet(skills: string[]) {
  const s = new Set(skills.map((x) => x.toLowerCase()));
  return (skill: string) => s.has(skill.toLowerCase());
}
