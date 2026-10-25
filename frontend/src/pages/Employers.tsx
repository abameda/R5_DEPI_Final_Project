import clsx from "clsx";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HBar, SkillBars } from "../components/charts";
import { Kpi, KpiStrip } from "../components/Kpi";
import { Button, Callout, ChartPanel, Empty, Guard, IconButton, PageHeader, Panel, Pill, Select, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { drillHref } from "../lib/filters";
import { fmtDate, fmtInt, fmtUsd } from "../lib/format";
import { useFilters, useLabels, useParam, useUpdateParams } from "../lib/hooks";
import type { Count, Kpis, SalarySummary, TopSkills } from "../lib/types";

interface Row { company: string; postings: number; appearances: number; countries: number; top_role: string; is_placeholder: boolean; salary_n: number; salary_median: number | null; last_posted: string | null }
interface Profile { company: string; is_placeholder: boolean; kpis: Kpis; titles: Count[]; roles: Count[]; countries: Count[]; seniority: Count[]; work_mode: Count[]; cohorts: Count[]; top_skills: TopSkills; salary: SalarySummary }

export default function Employers() {
  const { filters } = useFilters();
  const [name, setName] = useParam("name", "");
  const [sort] = useParam("esort", "postings");
  const [boards] = useParam("boards", "");
  const update = useUpdateParams();
  const [pageStr, setPage] = useParam("epage", "1");
  const [search] = useParam("find", "");
  const [text, setText] = useState(search);
  useEffect(() => { const t = setTimeout(() => { if (text !== search) update({ find: text || null, epage: null }); }, 300); return () => clearTimeout(t); }, [text, search, update]);
  const page = Math.max(1, +pageStr || 1);
  const q = useApi<{ total: number; rows: Row[] }>("/companies", filters, { search: search || undefined, page, page_size: 25, sort, include_placeholders: boards === "1" });
  const pages = q.data ? Math.max(1, Math.min(400, Math.ceil(q.data.total / 25))) : 1;

  return (
    <>
      <PageHeader title="Employers" description="Who posts the jobs in your selection, what they ask for and where. Counts are postings in this sample — not workforce size or total hiring." />
      {name && <EmployerProfile name={name} onClose={() => setName(null)} />}
      <Panel title="Employer directory" meta={q.data ? `${fmtInt(q.data.total)} employers` : undefined}
        actions={<Select label="Sort" value={sort} onChange={(v) => update({ esort: v === "postings" ? null : v, epage: null })} options={[
          { value: "postings", label: "Most postings" }, { value: "salary", label: "Highest median pay" }, { value: "recent", label: "Most recent" }, { value: "name", label: "Name" }]} />}>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="relative flex h-8 min-w-[220px] items-center">
            <Search size={15} className="pointer-events-none absolute left-2.5 text-ink-3" />
            <span className="sr-only">Find an employer</span>
            <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Find an employer" maxLength={80} dir="auto"
              className="h-8 w-full rounded-md border border-line-strong bg-panel pl-8 pr-2 text-sm placeholder:text-ink-3" />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={boards === "1"} onChange={(e) => update({ boards: e.target.checked ? "1" : null, epage: null })} className="size-4 accent-[var(--accent-ink)]" />
            Include job boards and hidden employers (“Confidential”, Dice, Upwork …)
          </label>
        </div>
        <Guard q={q} h={480} empty={(d) => !d.rows.length}>
          {(d) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-ink-3">
                  <tr>
                    <th scope="col" className="py-2 pr-2 font-medium">Employer</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium" title="Unique postings after de-duplication">Postings</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium" title="Listings across all boards before de-duplication">Listings</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Countries</th>
                    <th scope="col" className="px-2 py-2 font-medium">Most common role</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Median pay</th>
                    <th scope="col" className="py-2 pl-2 text-right font-medium">Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((r) => (
                    <tr key={r.company} className={clsx("border-t border-line hover:bg-panel-2", name === r.company && "bg-accent-soft")}>
                      <td className="py-1.5 pr-2">
                        <button type="button" onClick={() => setName(r.company)} className="text-left font-medium text-ink hover:underline" dir="auto">{r.company}</button>
                        {r.is_placeholder && <> <Pill tone="warn" title="A job board or a hidden employer name, not one company">board / hidden</Pill></>}
                      </td>
                      <td className="tnum px-2 py-1.5 text-right">{fmtInt(r.postings)}</td>
                      <td className="tnum px-2 py-1.5 text-right text-ink-3">{fmtInt(r.appearances)}</td>
                      <td className="tnum px-2 py-1.5 text-right text-ink-2">{fmtInt(r.countries)}</td>
                      <td className="px-2 py-1.5 text-ink-2">{r.top_role}</td>
                      <td className="tnum px-2 py-1.5 text-right text-ink-2" title={r.salary_median != null ? `n = ${r.salary_n}` : "Fewer than 10 advertised salaries"}>{r.salary_median != null ? fmtUsd(r.salary_median) : "—"}</td>
                      <td className="tnum py-1.5 pl-2 text-right text-ink-3">{fmtDate(r.last_posted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <nav aria-label="Employer pages" className="mt-3 flex items-center justify-between text-sm">
                <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(String(page - 1))}><ChevronLeft size={15} /> Previous</Button>
                <span className="tnum text-ink-3">Page {page} of {fmtInt(pages)}</span>
                <Button variant="ghost" disabled={page >= pages} onClick={() => setPage(String(page + 1))}>Next <ChevronRight size={15} /></Button>
              </nav>
            </div>
          )}
        </Guard>
      </Panel>
    </>
  );
}

function EmployerProfile({ name, onClose }: { name: string; onClose: () => void }) {
  const { filters } = useFilters();
  const nav = useNavigate();
  const labels = useLabels();
  const q = useApi<Profile>("/companies/profile", filters, { name });
  return (
    <Panel className="mb-4 border-accent-line" title={<span dir="auto">{name}</span>} meta="Employer profile within the current filters"
      actions={<IconButton label="Close employer profile" onClick={onClose}><X size={16} /></IconButton>}>
      {q.error ? <Empty title="No postings for this employer with the current filters" /> : (
        <Guard q={q} h={360}>
          {(p) => (
            <div className="grid gap-4">
              {p.is_placeholder && <Callout tone="warn">This name is a job board or a hidden-employer label, so its postings belong to many different companies.</Callout>}
              <KpiStrip>
                <Kpi label="Unique postings" value={fmtInt(p.kpis.postings)} sub={`${fmtInt(p.kpis.appearances)} listings across boards`} />
                <Kpi label="Countries" value={fmtInt(p.kpis.countries)} />
                <Kpi label="Distinct titles" value={fmtInt(p.kpis.distinct_titles)} />
                <Kpi label="Remote" value={fmtInt(p.kpis.remote)} />
                <Kpi label="Advertised salaries" value={fmtInt(p.salary.overall.n)} sub={p.salary.overall.median != null && p.salary.overall.n >= 10 ? `median ${fmtUsd(p.salary.overall.median)}` : "too few for a median"} />
                <Kpi label="Collection" value={p.cohorts.map((c) => `${Math.round((c.share ?? 0) * 100)}%`).join(" / ")} sub={p.cohorts.map((c) => labels.cohort(c.key)).join(" / ")} />
              </KpiStrip>
              <div className="grid gap-4 lg:grid-cols-3">
                <ChartPanel title="Most advertised titles" table={{ columns: ["Title", "Postings"], filename: "employer-titles", rows: p.titles.map((t) => [t.key, t.n]) }}>
                  {(h) => <HBar handle={h} label="Titles" maxLabel={34} data={p.titles.map((t) => ({ label: t.key, value: t.n }))} />}
                </ChartPanel>
                <ChartPanel title="Where" table={{ columns: ["Country", "Postings"], filename: "employer-countries", rows: p.countries.map((t) => [t.key ?? "No country", t.n]) }}>
                  {(h) => <HBar handle={h} label="Countries" color={2} data={p.countries.map((t) => ({ label: t.key ?? "No country", value: t.n, share: t.share }))}
                    onSelect={(c) => c !== "No country" && nav(drillHref("/explorer", filters, { company: name, country: c }))} />}
                </ChartPanel>
                <ChartPanel title="Seniority" table={{ columns: ["Seniority", "Postings"], filename: "employer-seniority", rows: p.seniority.map((t) => [t.key, t.n]) }}>
                  {(h) => <HBar handle={h} label="Seniority" color={3} data={p.seniority.map((t) => ({ label: t.key, value: t.n, share: t.share, muted: t.key === "Not specified" }))} />}
                </ChartPanel>
              </div>
              <ChartPanel title="Skills this employer asks for" meta={`Share of its ${fmtInt(p.top_skills.denominator)} postings that list skills`}>
                {(h) => p.top_skills.rows.length ? <SkillBars handle={h} rows={p.top_skills.rows} denominator={p.top_skills.denominator} observedOnly={filters.provenance === "observed"} />
                  : <p className="text-sm text-ink-3">No skill data for this employer.</p>}
              </ChartPanel>
              <TextLink to={drillHref("/explorer", filters, { company: name })}>Open all {fmtInt(p.kpis.postings)} postings</TextLink>
            </div>
          )}
        </Guard>
      )}
    </Panel>
  );
}
