import clsx from "clsx";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Empty, ErrorState, Loading, PageHeader, Pill, Select, Button } from "../components/ui";
import { useApi } from "../lib/api";
import { fmtDate, fmtInt, fmtUsdFull } from "../lib/format";
import { useFilters, useLabels, useParam } from "../lib/hooks";
import type { Job, JobPage, SkillChip } from "../lib/types";

const SORTS = [
  { value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" },
  { value: "salary_high", label: "Highest advertised salary" }, { value: "salary_low", label: "Lowest advertised salary" },
  { value: "most_listed", label: "Listed on most boards" }, { value: "title", label: "Title A–Z" }, { value: "company", label: "Employer A–Z" },
];
const PAGE_SIZE = 25;

export default function Explorer() {
  const { filters, reset } = useFilters();
  const [sort, setSort] = useParam("sort", "newest");
  const [pageStr, setPage] = useParam("page", "1");
  const [selected, setSelected] = useParam("job", "");
  const page = Math.max(1, Number.parseInt(pageStr, 10) || 1);
  const q = useApi<JobPage>("/jobs", filters, { page, page_size: PAGE_SIZE, sort });
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / PAGE_SIZE)) : 1;
  const maxPage = Math.min(pages, Math.floor(10_000 / PAGE_SIZE) + 1);
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { top.current?.scrollIntoView({ block: "nearest" }); }, [page]);

  return (
    <>
      <PageHeader title="Job explorer" description="Search and filter the unique postings. Each posting links to its original advert when the source provided one.">
        <Select label="Sort" value={sort} onChange={(v) => { setSort(v); setPage("1"); }} options={SORTS} />
      </PageHeader>
      <div ref={top} className={clsx("grid gap-4", selected && "xl:grid-cols-[minmax(0,1fr)_420px]")}>
        <div className="min-w-0 rounded-lg border border-line bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 text-sm" aria-live="polite">
            <span className="text-ink-2">
              {q.data ? <><strong className="tnum text-ink">{fmtInt(q.data.total)}</strong> postings · page {fmtInt(page)} of {fmtInt(pages)}</> : "Loading…"}
            </span>
            {sort.startsWith("salary") && <span className="text-xs text-ink-3">Postings with an advertised salary are listed first.</span>}
          </div>
          {q.error && !q.data ? <div className="p-4"><ErrorState error={q.error} retry={() => q.refetch()} /></div>
            : !q.data ? <div className="p-4"><Loading h={480} /></div>
            : q.data.total === 0 ? <Empty action={<Button onClick={reset}>Reset filters</Button>} />
            : (
              <div className={clsx("transition-opacity", q.isFetching && "opacity-60")} aria-busy={q.isFetching}>
                <JobTable rows={q.data.rows} selected={selected} onSelect={(id) => setSelected(id === selected ? null : id)} />
                <Pager page={page} maxPage={maxPage} pages={pages} onPage={(p) => setPage(String(p))} />
              </div>
            )}
        </div>
        {selected && <JobDetail id={selected} onClose={() => setSelected(null)} />}
      </div>
    </>
  );
}

function JobTable({ rows, selected, onSelect }: { rows: Job[]; selected: string; onSelect: (id: string) => void }) {
  const labels = useLabels();
  return (
    <>
      <table className="hidden w-full table-fixed text-sm md:table">
        <caption className="sr-only">Job postings matching the filters</caption>
        <colgroup><col /><col className="w-[18%]" /><col className="w-[17%]" /><col className="w-[13%]" /><col className="w-[11%]" /></colgroup>
        <thead className="border-b border-line text-left text-xs text-ink-3">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">Posting</th>
            <th scope="col" className="px-2 py-2 font-medium">Location</th>
            <th scope="col" className="px-2 py-2 font-medium">Role · seniority</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">Salary (USD/yr)</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Posted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((j) => (
            <tr key={j.job_id} onClick={() => onSelect(j.job_id)}
              className={clsx("cursor-pointer border-b border-line align-top transition-colors last:border-0 hover:bg-panel-2", selected === j.job_id && "bg-accent-soft hover:bg-accent-soft")}>
              <td className="px-4 py-2.5">
                <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(j.job_id); }} aria-expanded={selected === j.job_id}
                  className="block w-full text-left font-medium text-ink hover:underline" dir="auto">{j.title}</button>
                <span className="block truncate text-ink-2" dir="auto">{j.company ?? "Employer not given"}{j.company_is_placeholder && <span className="text-ink-3"> · job board / hidden employer</span>}</span>
                <SkillChips skills={j.skill_list} max={6} />
              </td>
              <td className="px-2 py-2.5 text-ink-2">
                <span className="block truncate" dir="auto">{j.city ? `${j.city}, ` : ""}{j.country ?? "No single country"}</span>
                <span className="text-xs text-ink-3">{j.market_type} · {j.work_mode}</span>
              </td>
              <td className="px-2 py-2.5 text-ink-2">
                <span className="block truncate">{j.role_category}</span>
                <span className="text-xs text-ink-3">{j.seniority} · {j.job_type}</span>
              </td>
              <td className="tnum px-2 py-2.5 text-right"><Salary j={j} /></td>
              <td className="px-4 py-2.5 text-right text-ink-2">
                <span className="tnum block">{fmtDate(j.posted_date)}</span>
                <span className="block truncate text-xs text-ink-3" title={labels.source(j.source_dataset)}>{j.source_platform ?? labels.source(j.source_dataset)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((j) => (
          <li key={j.job_id}>
            <button type="button" onClick={() => onSelect(j.job_id)} className={clsx("block w-full px-4 py-3 text-left", selected === j.job_id && "bg-accent-soft")}>
              <span className="block font-medium text-ink" dir="auto">{j.title}</span>
              <span className="block text-sm text-ink-2" dir="auto">{j.company ?? "Employer not given"} · {j.country ?? "No single country"}</span>
              <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-3"><span>{j.role_category}</span><span>{fmtDate(j.posted_date)}</span><Salary j={j} /></span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Salary({ j }: { j: Job }) {
  if (j.salary_kind === "advertised") return <span className="text-ink" title={`${j.salary_min ?? ""}–${j.salary_max ?? ""} ${j.salary_currency ?? ""} per ${j.salary_period ?? ""}`}>{fmtUsdFull(j.salary_usd_annual)}</span>;
  if (j.salary_kind === "benchmark") return <span className="text-ink-3" title="Market benchmark attached by the team, not the posting's pay">{fmtUsdFull(j.salary_usd_annual)} <span className="text-xs">benchmark</span></span>;
  return <span className="text-ink-3">—</span>;
}

export function SkillChips({ skills, max }: { skills: SkillChip[]; max?: number }) {
  if (!skills.length) return null;
  const shown = max ? skills.slice(0, max) : skills;
  return (
    <span className="mt-1.5 flex flex-wrap gap-1">
      {shown.map((s) => (
        <span key={s.skill} title={s.observed ? `${s.skill} — written in the posting data` : `${s.skill} — added by the team after collection`}
          className={clsx("rounded px-1.5 py-px text-xs", s.observed ? "bg-info-soft text-ink ring-1 ring-[var(--s1-soft)]" : "border border-dashed border-line-strong text-ink-3")}>
          {s.skill}{!s.observed && <span className="sr-only"> (added by team)</span>}
        </span>
      ))}
      {max && skills.length > max && <span className="px-1 text-xs text-ink-3">+{skills.length - max}</span>}
    </span>
  );
}

function Pager({ page, maxPage, pages, onPage }: { page: number; maxPage: number; pages: number; onPage: (p: number) => void }) {
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-sm">
      <Button variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={15} /> Previous</Button>
      {pages > maxPage && page >= maxPage
        ? <span className="text-xs text-ink-3">Only the first 10,000 results are browsable. Narrow the filters to see the rest.</span>
        : <span className="tnum text-ink-3">Page {fmtInt(page)} of {fmtInt(pages)}</span>}
      <Button variant="ghost" disabled={page >= maxPage} onClick={() => onPage(page + 1)}>Next <ChevronRight size={15} /></Button>
    </nav>
  );
}

function JobDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const labels = useLabels();
  const q = useApi<Job>(`/jobs/${encodeURIComponent(id)}`, null);
  const j = q.data;
  return (
    <aside aria-label="Posting details" className="h-fit rounded-lg border border-line bg-panel xl:sticky xl:top-36">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-lg font-semibold text-ink" dir="auto">{j?.title ?? "Posting"}</h2>
        <button type="button" onClick={onClose} aria-label="Close details" className="grid size-7 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink"><X size={16} /></button>
      </div>
      <div className="px-4 py-3">
        {q.error ? <ErrorState error={q.error} /> : !j ? <Loading h={260} /> : (
          <div className="space-y-4 text-sm">
            <p className="text-ink-2" dir="auto">{j.company ?? "Employer not given"} · {j.location ?? j.country ?? "No location"}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[["Role", j.role_category], ["Seniority", j.seniority], ["Market", j.market_type], ["Work mode", j.work_mode],
                ["Employment", j.job_type], ["Posted", fmtDate(j.posted_date)], ["Collection", labels.cohort(j.cohort)], ["Language", j.language]]
                .map(([k, v]) => <div key={k}><dt className="text-xs text-ink-3">{k}</dt><dd className="m-0 text-ink">{v}</dd></div>)}
            </dl>
            <div>
              <h3 className="text-xs text-ink-3">Salary</h3>
              {j.salary_kind === "advertised" ? (
                <p className="text-ink"><span className="font-semibold">{fmtUsdFull(j.salary_usd_annual)}</span> per year (approx.) · stated as {fmtInt(j.salary_min)}{j.salary_max !== j.salary_min ? `–${fmtInt(j.salary_max)}` : ""} {j.salary_currency} per {j.salary_period}</p>
              ) : j.salary_kind === "benchmark" ? (
                <p className="text-ink-2"><Pill tone="warn">Benchmark</Pill> {fmtUsdFull(j.salary_usd_annual)} per year — a market figure the team attached for this job title and country, not this posting’s pay.</p>
              ) : <p className="text-ink-3">The posting does not state a salary.</p>}
            </div>
            <div>
              <h3 className="text-xs text-ink-3">Skills ({j.skills_observed_count} written in posting, {j.skills_count - j.skills_observed_count} added by the team)</h3>
              <SkillChips skills={j.skill_list} />
            </div>
            {j.description && (
              <div>
                <h3 className="text-xs text-ink-3">Description{j.source_dataset === "jooble_careerjet_foreign" ? " (API snippet)" : ""}</h3>
                <p className="max-h-60 overflow-auto whitespace-pre-line text-ink-2" dir="auto">{j.description}</p>
              </div>
            )}
            <div className="space-y-1 border-t border-line pt-3 text-xs text-ink-3">
              <p>Source: {labels.source(j.source_dataset)}{j.source_platform ? ` · via ${j.source_platform}` : ""}</p>
              {j.duplicate_count > 1 && <p>Found {j.duplicate_count} times across boards ({j.sources}); counted once.</p>}
            </div>
            {j.url && /^https?:\/\//i.test(j.url) ? (
              <a href={j.url} target="_blank" rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 font-medium text-accent-ink underline decoration-accent-line underline-offset-2">
                Open original posting <ExternalLink size={14} />
              </a>
            ) : <p className="text-xs text-ink-3">The source did not provide a link to the original advert.</p>}
          </div>
        )}
      </div>
    </aside>
  );
}
