import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { Command } from "cmdk";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { activeCount, type Filters, type ListKey } from "../lib/filters";
import { fmtCompact, fmtInt, fmtPct } from "../lib/format";
import { useFilters, useLabels, useMeta } from "../lib/hooks";
import type { Count } from "../lib/types";
import { Segmented } from "./ui";

interface Option { value: string; label: string; n?: number; group?: string }

const FACETS: { key: ListKey; label: string; dim?: string }[] = [
  { key: "market", label: "Market", dim: "market_type" },
  { key: "country", label: "Country", dim: "country" },
  { key: "role", label: "Role", dim: "role_category" },
  { key: "seniority", label: "Seniority", dim: "seniority" },
  { key: "skill", label: "Skills" },
  { key: "cohort", label: "Collection", dim: "cohort" },
  { key: "source", label: "Source", dim: "source_dataset" },
];
const MORE: { key: ListKey; label: string; dim?: string }[] = [
  { key: "region", label: "Region", dim: "region" },
  { key: "job_type", label: "Employment type", dim: "job_type" },
  { key: "work_mode", label: "Work mode", dim: "work_mode" },
  { key: "company", label: "Employer" },
];
export const FACET_LABEL: Record<string, string> = Object.fromEntries([...FACETS, ...MORE].map((f) => [f.key, f.label]));

export function FilterBar() {
  const { filters, set, toggle, reset } = useFilters();
  const { data: meta } = useMeta();
  const labels = useLabels();
  const n = activeCount(filters);
  const [open, setOpen] = useState(false);

  const optionsFor = (key: ListKey, dim?: string): Option[] => {
    if (!meta || !dim) return [];
    return meta.dimensions[dim].map((d) => ({
      value: d.value, n: d.n, group: d.region,
      label: key === "source" ? labels.source(d.value) : key === "cohort" ? labels.cohort(d.value) : d.value,
    }));
  };

  return (
    <div className="border-b border-line bg-panel">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 lg:px-6">
        <KeywordSearch value={filters.q ?? ""} onChange={(v) => set("q", v || undefined)} />
        <button type="button" aria-expanded={open} aria-controls="facets" onClick={() => setOpen(!open)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong px-2.5 text-sm text-ink-2 lg:hidden">
          <SlidersHorizontal size={14} /> Filters{n > 0 && <span className="tnum rounded bg-accent-soft px-1 text-xs text-accent-ink">{n}</span>}
        </button>
        <div id="facets" className={clsx("w-full flex-wrap items-center gap-2 lg:flex lg:w-auto", open ? "flex" : "hidden")}>
        {FACETS.map((f) => f.key === "skill"
          ? <AsyncFacet key="skill" label="Skills" selected={filters.skill} onToggle={(v) => toggle("skill", v)} kind="skill" />
          : <Facet key={f.key} label={f.label} selected={filters[f.key]} options={optionsFor(f.key, f.dim)}
              onToggle={(v) => toggle(f.key, v)} onClear={() => set(f.key, [])} grouped={f.key === "country"} />)}
        <MoreFilters filters={filters} optionsFor={optionsFor} />
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <Segmented label="Which skills to count" value={filters.provenance ?? "all"}
            onChange={(v) => set("provenance", v === "all" ? undefined : v)}
            options={[{ value: "all", label: "All skills" }, { value: "observed", label: "Written in posting" }]} />
        </div>
      </div>
      <ActiveChips filters={filters} onRemove={(k, v) => (Array.isArray(filters[k as keyof Filters]) ? toggle(k as ListKey, v) : set(k as keyof Filters, undefined as never))}
        onReset={reset} count={n} />
      <Population />
    </div>
  );
}

function KeywordSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <label className="relative flex h-8 min-w-[200px] flex-1 items-center sm:max-w-[280px]">
      <Search size={15} className="pointer-events-none absolute left-2.5 text-ink-3" />
      <span className="sr-only">Search job titles and employers</span>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search titles or employers"
        dir="auto" type="search" maxLength={120}
        className="h-8 w-full rounded-md border border-line-strong bg-panel pl-8 pr-2 text-sm placeholder:text-ink-3 focus-visible:outline-2" />
    </label>
  );
}

function FacetButton({ label, count }: { label: string; count: number }) {
  return (
    <span className={clsx("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors",
      count ? "border-accent-line bg-accent-soft font-medium text-accent-ink" : "border-line-strong bg-panel text-ink-2 hover:text-ink hover:bg-panel-2")}>
      {label}
      {count > 0 && <span className="tnum rounded bg-panel px-1 text-xs">{count}</span>}
      <ChevronDown size={14} />
    </span>
  );
}

function Facet({ label, selected, options, onToggle, onClear, grouped }: {
  label: string; selected: string[]; options: Option[]; onToggle: (v: string) => void; onClear: () => void; grouped?: boolean;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={`Filter by ${label.toLowerCase()}`}><FacetButton label={label} count={selected.length} /></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12}
          className="z-50 w-72 rounded-lg border border-line-strong bg-panel shadow-panel">
          <Command label={`${label} options`} className="flex max-h-[min(420px,70vh)] flex-col">
            <div className="border-b border-line p-2">
              <Command.Input autoFocus placeholder={`Find ${label.toLowerCase()}`} dir="auto"
                className="h-8 w-full rounded-md bg-panel-2 px-2 text-sm placeholder:text-ink-3 focus:outline-none" />
            </div>
            <Command.List className="overflow-auto p-1">
              <Command.Empty className="p-3 text-sm text-ink-3">No match.</Command.Empty>
              {(grouped ? groupBy(options) : [["", options] as const]).map(([g, opts]) => (
                <Command.Group key={g} heading={g || undefined}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ink-3">
                  {opts.map((o) => <OptionRow key={o.value} o={o} checked={selected.includes(o.value)} onSelect={() => onToggle(o.value)} />)}
                </Command.Group>
              ))}
            </Command.List>
            {selected.length > 0 && (
              <div className="border-t border-line p-2">
                <button type="button" onClick={onClear} className="text-sm font-medium text-accent-ink hover:underline">Clear {label.toLowerCase()}</button>
              </div>
            )}
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function groupBy(options: Option[]): (readonly [string, Option[]])[] {
  const order = ["Arab", "Non-Arab", "Worldwide / Unknown"];
  const m = new Map<string, Option[]>();
  for (const o of options) m.set(o.group ?? "", [...(m.get(o.group ?? "") ?? []), o]);
  return [...m.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([g, o]) => [g === "Arab" ? "Arab League countries" : g === "Non-Arab" ? "Other countries" : g, o] as const);
}

function OptionRow({ o, checked, onSelect }: { o: Option; checked: boolean; onSelect: () => void }) {
  return (
    <Command.Item value={`${o.label} ${o.value}`} onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm data-[selected=true]:bg-panel-2">
      <span className={clsx("grid size-4 shrink-0 place-items-center rounded border",
        checked ? "border-accent-ink bg-accent text-rail" : "border-line-strong")} aria-hidden>
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 truncate" dir="auto">{o.label}</span>
      {o.n != null && <span className="tnum text-xs text-ink-3">{fmtCompact(o.n)}</span>}
      <span className="sr-only">{checked ? "selected" : ""}</span>
    </Command.Item>
  );
}

/** Skills and employers have too many values to list; they are searched on the server. */
function AsyncFacet({ label, selected, onToggle, kind }: { label: string; selected: string[]; onToggle: (v: string) => void; kind: "skill" | "company" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 200); return () => clearTimeout(t); }, [q]);
  const skills = useApi<{ skill: string; postings: number; category: string }[]>("/skills/search", null, { q: debounced, limit: 30 }, open && kind === "skill");
  const companies = useApi<{ rows: { company: string; postings: number }[] }>("/companies", null, { search: debounced, page_size: 30 }, open && kind === "company");
  const options: Option[] = kind === "skill"
    ? (skills.data ?? []).map((s) => ({ value: s.skill, label: s.skill, n: s.postings, group: s.category }))
    : (companies.data?.rows ?? []).map((c) => ({ value: c.company, label: c.company, n: c.postings }));
  const merged = [...selected.filter((s) => !options.some((o) => o.value === s)).map((s) => ({ value: s, label: s })), ...options];
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label={`Filter by ${label.toLowerCase()}`}><FacetButton label={label} count={selected.length} /></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} className="z-50 w-72 rounded-lg border border-line-strong bg-panel shadow-panel">
          <Command label={`${label} options`} shouldFilter={false} className="flex max-h-[min(420px,70vh)] flex-col">
            <div className="border-b border-line p-2">
              <Command.Input autoFocus value={q} onValueChange={setQ} placeholder={kind === "skill" ? "Type a skill, e.g. Python" : "Type an employer"}
                className="h-8 w-full rounded-md bg-panel-2 px-2 text-sm placeholder:text-ink-3 focus:outline-none" />
            </div>
            <Command.List className="overflow-auto p-1">
              {kind === "skill" && <p className="px-2 py-1.5 text-xs text-ink-3">Postings must list every selected skill.</p>}
              <Command.Empty className="p-3 text-sm text-ink-3">{(skills.isFetching || companies.isFetching) ? "Searching…" : "No match."}</Command.Empty>
              {merged.map((o) => <OptionRow key={o.value} o={o} checked={selected.includes(o.value)} onSelect={() => onToggle(o.value)} />)}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MoreFilters({ filters, optionsFor }: { filters: Filters; optionsFor: (k: ListKey, dim?: string) => Option[] }) {
  const { set, toggle } = useFilters();
  const { data: meta } = useMeta();
  const count = MORE.reduce((a, f) => a + filters[f.key].length, 0) + (filters.date_from ? 1 : 0) + (filters.date_to ? 1 : 0) + (filters.salary === "advertised" ? 1 : 0);
  return (
    <Popover.Root>
      <Popover.Trigger aria-label="More filters">
        <span className={clsx("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm",
          count ? "border-accent-line bg-accent-soft font-medium text-accent-ink" : "border-line-strong text-ink-2 hover:bg-panel-2 hover:text-ink")}>
          <SlidersHorizontal size={14} /> More{count > 0 && <span className="tnum rounded bg-panel px-1 text-xs">{count}</span>}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12}
          className="z-50 w-[min(560px,92vw)] rounded-lg border border-line-strong bg-panel p-4 shadow-panel">
          <div className="grid gap-4 sm:grid-cols-2">
            {MORE.filter((f) => f.dim).map((f) => (
              <fieldset key={f.key}>
                <legend className="mb-1.5 text-sm font-medium text-ink">{f.label}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {optionsFor(f.key, f.dim).map((o) => (
                    <button key={o.value} type="button" aria-pressed={filters[f.key].includes(o.value)} onClick={() => toggle(f.key, o.value)}
                      className={clsx("rounded-md border px-2 py-1 text-sm", filters[f.key].includes(o.value)
                        ? "border-accent-line bg-accent-soft text-accent-ink" : "border-line text-ink-2 hover:bg-panel-2")}>
                      {o.label} <span className="tnum text-xs text-ink-3">{fmtCompact(o.n)}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Posting date</legend>
              <div className="flex items-center gap-2 text-sm">
                <input type="date" aria-label="Posted on or after" value={filters.date_from ?? ""} min={meta?.date_range.min} max={meta?.date_range.max}
                  onChange={(e) => set("date_from", e.target.value || undefined)} className="h-8 rounded-md border border-line-strong bg-panel px-2" />
                <span className="text-ink-3">to</span>
                <input type="date" aria-label="Posted on or before" value={filters.date_to ?? ""} min={meta?.date_range.min} max={meta?.date_range.max}
                  onChange={(e) => set("date_to", e.target.value || undefined)} className="h-8 rounded-md border border-line-strong bg-panel px-2" />
              </div>
              <p className="mt-1 text-xs text-ink-3">Postings without a date are excluded when a date is set.</p>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Salary</legend>
              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" checked={filters.salary === "advertised"} onChange={(e) => set("salary", e.target.checked ? "advertised" : undefined)}
                  className="size-4 accent-[var(--accent-ink)]" />
                Only postings that advertise a salary
              </label>
              <p className="mt-1 text-xs text-ink-3">Market benchmarks added by the team do not count.</p>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Employer</legend>
              <AsyncFacet label="Employer" kind="company" selected={filters.company} onToggle={(v) => toggle("company", v)} />
            </fieldset>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ActiveChips({ filters, onRemove, onReset, count }: { filters: Filters; onRemove: (k: string, v: string) => void; onReset: () => void; count: number }) {
  const labels = useLabels();
  const chips = useMemo(() => {
    const out: { k: string; v: string; text: string }[] = [];
    for (const k of ["market", "country", "region", "role", "seniority", "job_type", "work_mode", "skill", "company", "cohort", "source"] as ListKey[]) {
      for (const v of filters[k]) out.push({ k, v, text: k === "source" ? labels.source(v) : k === "cohort" ? labels.cohort(v) : v });
    }
    if (filters.q) out.push({ k: "q", v: filters.q, text: `“${filters.q}”` });
    if (filters.date_from) out.push({ k: "date_from", v: filters.date_from, text: `from ${filters.date_from}` });
    if (filters.date_to) out.push({ k: "date_to", v: filters.date_to, text: `to ${filters.date_to}` });
    if (filters.salary === "advertised") out.push({ k: "salary", v: "advertised", text: "advertised salary" });
    return out;
  }, [filters, labels]);
  if (!count) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2.5 lg:px-6" aria-label="Applied filters">
      {chips.map((c) => (
        <span key={`${c.k}:${c.v}`} className="inline-flex items-center gap-1 rounded-md bg-panel-2 py-0.5 pl-2 pr-1 text-sm text-ink ring-1 ring-line">
          <span className="text-ink-3">{FACET_LABEL[c.k] ?? (c.k === "q" ? "Search" : c.k.startsWith("date") ? "Date" : "Salary")}:</span>
          <span dir="auto" className="max-w-[220px] truncate">{c.text}</span>
          <button type="button" aria-label={`Remove ${c.text}`} onClick={() => onRemove(c.k, c.v)} className="grid size-5 place-items-center rounded text-ink-3 hover:bg-line hover:text-ink">
            <X size={13} />
          </button>
        </span>
      ))}
      <button type="button" onClick={onReset} className="ml-1 text-sm font-medium text-accent-ink hover:underline">Reset filters</button>
    </div>
  );
}

/** Always tells the visitor which population every number on the page describes. */
function Population() {
  const { filters } = useFilters();
  const { data: meta } = useMeta();
  const labels = useLabels();
  const q = useApi<Count[]>("/breakdown", filters, { dim: "cohort" });
  const total = q.data?.reduce((a, r) => a + r.n, 0);
  const all = meta?.totals.postings;
  const mix = q.data?.filter((r) => r.n).map((r) => `${fmtPct(r.share, 0)} ${labels.cohort(r.key)}`).join(" · ");
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-panel-2 px-4 py-1.5 text-xs text-ink-2 lg:px-6" aria-live="polite">
      <span>
        <strong className="tnum font-semibold text-ink">{total == null ? "…" : fmtInt(total)}</strong>
        {all != null && total !== all && <> of {fmtInt(all)}</>} unique postings
      </span>
      {mix && <span className="text-ink-3">{mix}</span>}
      <span className="text-ink-3">
        Skills: {filters.provenance === "observed" ? "only those written in the posting data" : "includes skills the team added after collection"}
      </span>
    </div>
  );
}
