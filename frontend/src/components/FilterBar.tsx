import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { Command } from "cmdk";
import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { activeCount, type Filters, type ListKey } from "../lib/filters";
import { fmtCompact, fmtInt, fmtPct } from "../lib/format";
import { useFilters, useLabels, useMeta } from "../lib/hooks";
import type { Count } from "../lib/types";
import { t, tv } from "../lib/i18n";
import { Segmented } from "./ui";

interface Option { value: string; label: string; n?: number; group?: string }

const facets = (): { key: ListKey; label: string; dim?: string }[] => [
  { key: "role", label: t("Role", "الدور"), dim: "role_category" },
  { key: "market", label: t("Market", "السوق"), dim: "market_type" },
  { key: "country", label: t("Country", "الدولة"), dim: "country" },
  { key: "skill", label: t("Skills", "المهارات") },
  { key: "seniority", label: t("Seniority", "مستوى الخبرة"), dim: "seniority" },
];
const more = (): { key: ListKey; label: string; dim?: string }[] => [
  { key: "work_mode", label: t("Work mode", "نمط العمل"), dim: "work_mode" },
  { key: "job_type", label: t("Employment type", "نوع التوظيف"), dim: "job_type" },
  { key: "region", label: t("Region", "المنطقة"), dim: "region" },
  { key: "cohort", label: t("Collection", "دفعة الجمع"), dim: "cohort" },
  { key: "source", label: t("Source", "المصدر"), dim: "source_dataset" },
  { key: "company", label: t("Employer", "جهة التوظيف") },
];
export const facetLabel = (key: string): string | undefined => [...facets(), ...more()].find((f) => f.key === key)?.label;

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
      label: key === "source" ? labels.source(d.value) : key === "cohort" ? labels.cohort(d.value) : tv(d.value),
    }));
  };

  return (
    <div className="border-b border-line bg-panel">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4 lg:px-8">
        <button type="button" aria-expanded={open} aria-controls="facets" onClick={() => setOpen(!open)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-sm text-ink-2 lg:hidden">
          <SlidersHorizontal size={15} /> {t("Filters", "الفلاتر")}{n > 0 && <span className="tnum rounded-md bg-accent-soft px-1.5 text-xs font-medium text-accent-ink">{n}</span>}
        </button>
        <div id="facets" className={clsx("w-full flex-wrap items-center gap-2 lg:flex lg:w-auto", open ? "flex" : "hidden")}>
        {facets().map((f) => f.key === "skill"
          ? <AsyncFacet key="skill" label={f.label} selected={filters.skill} onToggle={(v) => toggle("skill", v)} kind="skill" />
          : <Facet key={f.key} label={f.label} selected={filters[f.key]} options={optionsFor(f.key, f.dim)}
              onToggle={(v) => toggle(f.key, v)} onClear={() => set(f.key, [])} grouped={f.key === "country"} />)}
        <MoreFilters filters={filters} optionsFor={optionsFor} />
        </div>
        <div className="flex items-center gap-2 lg:ms-auto">
          <Segmented label={t("Which skills to count", "المهارات المحتسبة")} value={filters.provenance ?? "all"}
            onChange={(v) => set("provenance", v === "all" ? undefined : v)}
            options={[{ value: "all", label: t("All skills", "كل المهارات") }, { value: "observed", label: t("Written in posting", "مذكورة في الإعلان") }]} />
        </div>
      </div>
      <ActiveChips filters={filters} onRemove={(k, v) => (Array.isArray(filters[k as keyof Filters]) ? toggle(k as ListKey, v) : set(k as keyof Filters, undefined as never))}
        onReset={reset} count={n} />
      <Population />
    </div>
  );
}

function FacetButton({ label, count }: { label: string; count: number }) {
  return (
    <span className={clsx("inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
      count ? "border-accent-line bg-accent-soft font-medium text-accent-ink" : "border-line bg-panel text-ink-2 hover:border-line-strong hover:text-ink")}>
      {label}
      {count > 0 && <span className="tnum rounded-md bg-panel px-1.5 text-xs">{count}</span>}
      <ChevronDown size={14} className="opacity-70" />
    </span>
  );
}

function Facet({ label, selected, options, onToggle, onClear, grouped }: {
  label: string; selected: string[]; options: Option[]; onToggle: (v: string) => void; onClear: () => void; grouped?: boolean;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={t(`Filter by ${label.toLowerCase()}${selected.length ? `, ${selected.length} selected` : ""}`, `تصفية حسب ${label}${selected.length ? `، ${selected.length} محدد` : ""}`)}><FacetButton label={label} count={selected.length} /></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12}
          className="z-50 w-72 rounded-xl border border-line bg-panel shadow-panel">
          <Command label={t(`${label} options`, `خيارات ${label}`)} className="flex max-h-[min(420px,70vh)] flex-col">
            <div className="border-b border-line p-2">
              <Command.Input autoFocus placeholder={t(`Find ${label.toLowerCase()}`, `ابحث في ${label}`)} dir="auto"
                className="h-9 w-full rounded-lg bg-panel-2 px-2.5 text-sm placeholder:text-ink-3 focus:outline-none" />
            </div>
            <Command.List className="overflow-auto p-1">
              <Command.Empty className="p-3 text-sm text-ink-3">{t("No match.", "لا نتائج.")}</Command.Empty>
              {(grouped ? groupBy(options) : [["", options] as const]).map(([g, opts]) => (
                <Command.Group key={g} heading={g || undefined}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ink-3">
                  {opts.map((o) => <OptionRow key={o.value} o={o} checked={selected.includes(o.value)} onSelect={() => onToggle(o.value)} />)}
                </Command.Group>
              ))}
            </Command.List>
            {selected.length > 0 && (
              <div className="border-t border-line p-2">
                <button type="button" onClick={onClear} className="text-sm font-medium text-accent-ink hover:underline">{t(`Clear ${label.toLowerCase()}`, `مسح ${label}`)}</button>
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
    .map(([g, o]) => [g === "Arab" ? t("Arab League countries", "دول الجامعة العربية") : g === "Non-Arab" ? t("Other countries", "دول أخرى") : tv(g), o] as const);
}

function OptionRow({ o, checked, onSelect }: { o: Option; checked: boolean; onSelect: () => void }) {
  return (
    <Command.Item value={`${o.label} ${o.value}`} onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm data-[selected=true]:bg-panel-2">
      <span className={clsx("grid size-4 shrink-0 place-items-center rounded border",
        checked ? "border-accent bg-accent text-white dark:text-[#0b0f17]" : "border-line-strong")} aria-hidden>
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 truncate" dir="auto">{o.label}</span>
      {o.n != null && <span className="tnum text-xs text-ink-3">{fmtCompact(o.n)}</span>}
      <span className="sr-only">{checked ? t("selected", "محدد") : ""}</span>
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
    ? (skills.data ?? []).map((s) => ({ value: s.skill, label: s.skill, n: s.postings, group: tv(s.category) }))
    : (companies.data?.rows ?? []).map((c) => ({ value: c.company, label: c.company, n: c.postings }));
  const merged = [...selected.filter((s) => !options.some((o) => o.value === s)).map((s) => ({ value: s, label: s })), ...options];
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label={t(`Filter by ${label.toLowerCase()}${selected.length ? `, ${selected.length} selected` : ""}`, `تصفية حسب ${label}${selected.length ? `، ${selected.length} محدد` : ""}`)}><FacetButton label={label} count={selected.length} /></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} className="z-50 w-72 rounded-xl border border-line bg-panel shadow-panel">
          <Command label={t(`${label} options`, `خيارات ${label}`)} shouldFilter={false} className="flex max-h-[min(420px,70vh)] flex-col">
            <div className="border-b border-line p-2">
              <Command.Input autoFocus value={q} onValueChange={setQ} placeholder={kind === "skill" ? t("Type a skill, e.g. Python", "اكتب مهارة، مثل Python") : t("Type an employer", "اكتب اسم جهة توظيف")}
                className="h-9 w-full rounded-lg bg-panel-2 px-2.5 text-sm placeholder:text-ink-3 focus:outline-none" />
            </div>
            <Command.List className="overflow-auto p-1">
              {kind === "skill" && <p className="px-2 py-1.5 text-xs text-ink-3">{t("Postings must list every selected skill.", "يجب أن يذكر الإعلان كل المهارات المحددة.")}</p>}
              <Command.Empty className="p-3 text-sm text-ink-3">{(skills.isFetching || companies.isFetching) ? t("Searching…", "جارٍ البحث…") : t("No match.", "لا نتائج.")}</Command.Empty>
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
  const count = more().reduce((a, f) => a + filters[f.key].length, 0) + (filters.date_from ? 1 : 0) + (filters.date_to ? 1 : 0) + (filters.salary === "advertised" ? 1 : 0);
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={t("More filters", "فلاتر إضافية")}>
        <span className={clsx("inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm",
          count ? "border-accent-line bg-accent-soft font-medium text-accent-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink")}>
          <SlidersHorizontal size={14} /> {t("More filters", "فلاتر أخرى")}{count > 0 && <span className="tnum rounded-md bg-panel px-1.5 text-xs">{count}</span>}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12}
          className="z-50 max-h-[min(640px,80vh)] w-[min(600px,92vw)] overflow-auto rounded-xl border border-line bg-panel p-5 shadow-panel">
          <div className="grid gap-4 sm:grid-cols-2">
            {more().filter((f) => f.dim).map((f) => (
              <fieldset key={f.key}>
                <legend className="mb-1.5 text-sm font-medium text-ink">{f.label}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {optionsFor(f.key, f.dim).map((o) => (
                    <button key={o.value} type="button" aria-pressed={filters[f.key].includes(o.value)} onClick={() => toggle(f.key, o.value)}
                      className={clsx("rounded-lg border px-2.5 py-1 text-sm", filters[f.key].includes(o.value)
                        ? "border-accent-line bg-accent-soft text-accent-ink" : "border-line text-ink-2 hover:bg-panel-2")}>
                      {o.label} <span className="tnum text-xs text-ink-3">{fmtCompact(o.n)}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">{t("Posting date", "تاريخ النشر")}</legend>
              <div className="flex items-center gap-2 text-sm">
                <input type="date" aria-label={t("Posted on or after", "نُشر في هذا التاريخ أو بعده")} value={filters.date_from ?? ""} min={meta?.date_range.min} max={meta?.date_range.max}
                  onChange={(e) => set("date_from", e.target.value || undefined)} className="h-9 rounded-lg border border-line-strong bg-panel px-2" />
                <span className="text-ink-3">{t("to", "إلى")}</span>
                <input type="date" aria-label={t("Posted on or before", "نُشر في هذا التاريخ أو قبله")} value={filters.date_to ?? ""} min={meta?.date_range.min} max={meta?.date_range.max}
                  onChange={(e) => set("date_to", e.target.value || undefined)} className="h-9 rounded-lg border border-line-strong bg-panel px-2" />
              </div>
              <p className="mt-1 text-xs text-ink-3">{t("Postings without a date are excluded when a date is set.", "تُستبعد الإعلانات غير المؤرَّخة عند تحديد تاريخ.")}</p>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">{t("Salary", "الراتب")}</legend>
              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" checked={filters.salary === "advertised"} onChange={(e) => set("salary", e.target.checked ? "advertised" : undefined)}
                  className="size-4 accent-[var(--accent)]" />
                {t("Only postings that advertise a salary", "الإعلانات التي تذكر راتبًا فقط")}
              </label>
              <p className="mt-1 text-xs text-ink-3">{t("Market benchmarks added by the team do not count.", "لا تُحتسب الرواتب المرجعية التي أضافها الفريق.")}</p>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">{t("Employer", "جهة التوظيف")}</legend>
              <AsyncFacet label={t("Employer", "جهة التوظيف")} kind="company" selected={filters.company} onToggle={(v) => toggle("company", v)} />
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
      for (const v of filters[k]) out.push({ k, v, text: k === "source" ? labels.source(v) : k === "cohort" ? labels.cohort(v) : tv(v) });
    }
    if (filters.q) out.push({ k: "q", v: filters.q, text: `“${filters.q}”` });
    if (filters.date_from) out.push({ k: "date_from", v: filters.date_from, text: t(`from ${filters.date_from}`, `من ${filters.date_from}`) });
    if (filters.date_to) out.push({ k: "date_to", v: filters.date_to, text: t(`to ${filters.date_to}`, `إلى ${filters.date_to}`) });
    if (filters.salary === "advertised") out.push({ k: "salary", v: "advertised", text: t("advertised salary", "راتب معلن") });
    return out;
  }, [filters, labels]);
  if (!count) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2.5 sm:px-4 lg:px-8" aria-label={t("Applied filters", "الفلاتر المطبقة")}>
      {chips.map((c) => (
        <span key={`${c.k}:${c.v}`} className="inline-flex h-7 items-center gap-1 rounded-lg bg-accent-soft ps-2.5 pe-1 text-sm text-ink">
          <span className="text-ink-2">{facetLabel(c.k) ?? (c.k === "q" ? t("Search", "البحث") : c.k.startsWith("date") ? t("Date", "التاريخ") : t("Salary", "الراتب"))}:</span>
          <span dir="auto" className="max-w-[220px] truncate">{c.text}</span>
          <button type="button" aria-label={t(`Remove ${c.text}`, `إزالة ${c.text}`)} onClick={() => onRemove(c.k, c.v)} className="grid size-5 place-items-center rounded-md text-ink-3 hover:bg-panel hover:text-ink">
            <X size={13} />
          </button>
        </span>
      ))}
      <button type="button" onClick={onReset} className="ms-1 text-sm font-medium text-accent-ink hover:underline">{t("Reset filters", "إعادة ضبط الفلاتر")}</button>
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
  // a non-zero share never rounds to 0% (nor a partial one to 100%): missing is not zero
  const pct = (r: Count) => ((r.share ?? 0) < 0.005 ? "<1%" : total && r.n < total && (r.share ?? 0) > 0.995 ? ">99%" : fmtPct(r.share, 0));
  const mix = q.data?.filter((r) => r.n).map((r) => `${pct(r)} ${labels.cohort(r.key)}`).join(" · ");
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-2 text-xs text-ink-2 sm:px-4 lg:px-8" aria-live="polite">
      <span>
        <strong className="tnum font-semibold text-ink">{total == null ? "…" : fmtInt(total)}</strong>
        {all != null && total !== all && <> {t("of", "من")} {fmtInt(all)}</>} {t("unique postings", "إعلانًا فريدًا")}
      </span>
      {mix && <span className="text-ink-3">{mix}</span>}
      {(filters.date_from || filters.date_to) && <span className="text-ink-3">{t("Undated postings are excluded while a date is set", "تُستبعد الإعلانات غير المؤرَّخة ما دام التاريخ محددًا")}</span>}
      <span className="text-ink-3">
        {t("Skills:", "المهارات:")} {filters.provenance === "observed" ? t("only those written in the posting data", "المذكورة في بيانات الإعلان فقط") : t("includes skills the team added after collection", "تشمل مهارات أضافها الفريق بعد الجمع")}
      </span>
    </div>
  );
}
