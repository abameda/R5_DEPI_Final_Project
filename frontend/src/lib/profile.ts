import { useCallback, useSyncExternalStore } from "react";

/**
 * The visitor's own career profile: a target role and the skills they have.
 * It lives only in this browser (no accounts exist); every page reads it so
 * jobs, the plan and the market can speak to the same person.
 */
export interface Profile { role: string; skills: string[] }

const KEY = "jmi-profile";
const EMPTY: Profile = { role: "", skills: [] };
const listeners = new Set<() => void>();

function read(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<Profile>;
    return {
      role: typeof p.role === "string" ? p.role : "",
      skills: Array.isArray(p.skills) ? p.skills.filter((s): s is string => typeof s === "string" && s.length > 0 && s.length <= 120).slice(0, 60) : [],
    };
  } catch { return EMPTY; } // storage may be blocked or hold a stale shape
}

let snapshot = read();

function write(next: Profile) {
  snapshot = { role: next.role, skills: [...new Set(next.skills)] };
  try { localStorage.setItem(KEY, JSON.stringify(snapshot)); } catch { /* storage may be blocked: keep it for this visit */ }
  listeners.forEach((l) => l());
}

export function useProfile() {
  const profile = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => snapshot);
  const setRole = useCallback((role: string) => write({ ...snapshot, role }), []);
  const setSkills = useCallback((skills: string[]) => write({ ...snapshot, skills }), []);
  const addSkill = useCallback((s: string) => write({ ...snapshot, skills: [...snapshot.skills, s] }), []);
  const removeSkill = useCallback((s: string) => write({ ...snapshot, skills: snapshot.skills.filter((x) => x !== s) }), []);
  return { profile, setRole, setSkills, addSkill, removeSkill, replace: write };
}

/** Case-insensitive membership, so "sql" typed elsewhere still counts as SQL. */
export function haveSet(skills: string[]) {
  const s = new Set(skills.map((x) => x.toLowerCase()));
  return (skill: string) => s.has(skill.toLowerCase());
}
