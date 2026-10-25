import clsx from "clsx";
import { Kpi, KpiStrip } from "../components/Kpi";
import { Guard, PageHeader, Panel } from "../components/ui";
import { useApi } from "../lib/api";
import { fmtDate, fmtInt, fmtPct } from "../lib/format";
import { useLabels, useMeta } from "../lib/hooks";

interface Q {
  dataset_kind: string; built_at: string;
  pipeline: { generated_at?: string; stages?: { stage: string; rows: number }[]; dropped?: Record<string, number>; raw_rows_by_source?: Record<string, number>;
    sudan_search_location_rows?: { rows: number; country_from_real_location: Record<string, number> } | null; runtime_seconds?: number };
  totals: { postings: number; appearances: number; merged_duplicates: number; placeholder_company_postings: number; placeholder_companies: number; missing: Record<string, number | null> };
  per_source: { source: string; label: string; postings: number; appearances: number; merged_duplicates: number; first_posted: string | null; last_posted: string | null;
    advertised_salary: number; benchmark_salary: number; skills_enriched: number; countries: number; missing: Record<string, number | null>;
    skill_rows: number; observed_skill_rows: number; observed_share: number | null }[];
  skill_provenance: { rows: number; observed: number; skills: number; observed_share: number | null };
  taxonomy: { source: string; skills: number; mentions: number }[];
  salary_kinds: { source: string; kind: string; n: number }[];
  language: { key: string; n: number }[];
  sudan_correction: { before: { rows: number; country_from_real_location: Record<string, number> } | null; after_dedup: { key: string; n: number }[] };
  cohorts: { key: string; label: string; note: string }[];
}

const FIELDS: [string, string][] = [["company", "Employer"], ["country", "Country"], ["city", "City"], ["skills", "Skills"], ["posted_date", "Date"], ["url", "Link"], ["salary_usd_annual", "Salary"], ["description", "Description"]];

export default function Quality() {
  const q = useApi<Q>("/quality", null);
  const { data: meta } = useMeta();
  const labels = useLabels();
  return (
    <>
      <PageHeader title="Data & methodology" description="How the dataset was built, how complete it is, and what it can and cannot tell you. Everything here covers the whole dataset; the filter bar does not apply." />
      <Guard q={q} h={500}>
        {(d) => {
          const stages = d.pipeline.stages ?? [];
          const raw = stages[0]?.rows;
          const tax = d.taxonomy.reduce((a, t) => a + t.mentions, 0);
          return (<div className="grid gap-4">
            <KpiStrip>
              <Kpi label="Raw rows loaded" value={raw ? fmtInt(raw) : "—"} sub="7 source files" />
              <Kpi label="Unique postings kept" value={fmtInt(d.totals.postings)} sub={raw ? `${fmtPct(d.totals.postings / raw)} of raw rows` : undefined} />
              <Kpi label="Merged duplicates" value={fmtInt(d.totals.merged_duplicates)} sub="postings found on 2+ boards" />
              <Kpi label="Skills written in posting" value={fmtPct(d.skill_provenance.observed_share)} sub={`of ${fmtInt(d.skill_provenance.rows)} posting–skill pairs`} />
              <Kpi label="Pipeline run" value={d.pipeline.generated_at ? fmtDate(d.pipeline.generated_at.slice(0, 10)) : "—"} sub={d.pipeline.runtime_seconds ? `${Math.round(d.pipeline.runtime_seconds)} s end to end` : undefined} />
              <Kpi label="Store built" value={fmtDate(d.built_at.slice(0, 10))} sub={d.dataset_kind === "synthetic" ? "SYNTHETIC demo data" : "from data/processed"} />
            </KpiStrip>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Pipeline stages" meta="Record counts logged by src/pipeline.py (FR-28)">
                <ol className="space-y-2">
                  {stages.map((s, i) => (
                    <li key={s.stage}>
                      <div className="flex justify-between text-sm"><span className="text-ink-2">{s.stage}</span><span className="tnum font-medium">{fmtInt(s.rows)}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-panel-2"><div className={clsx("h-full rounded-full", i === stages.length - 1 ? "bg-s4" : "bg-[var(--s4-soft)]")} style={{ width: `${(s.rows / (raw || 1)) * 100}%` }} /></div>
                    </li>
                  ))}
                </ol>
                {d.pipeline.dropped && <p className="mt-3 text-sm text-ink-3">Dropped before de-duplication: {Object.entries(d.pipeline.dropped).map(([k, v]) => `${k} ${fmtInt(v)}`).join(" · ")}</p>}
                <p className="mt-2 text-sm text-ink-3">De-duplication: exact duplicates first, then the same normalized title + employer + location + country (job boards and “Confidential” also compare date and description). The most complete copy is kept and every source it appeared in is recorded.</p>
              </Panel>
              <Panel title="Collections (cohorts)" meta="Why time comparisons are restricted">
                <ul className="space-y-3 text-sm">
                  {d.cohorts.map((c) => <li key={c.key}><p className="font-medium">{c.label}</p><p className="text-ink-2">{c.note}</p></li>)}
                </ul>
                <p className="mt-3 text-sm text-ink-2">Monthly trends are computed only inside the 2023 archive; the two collections are compared as snapshots, never as growth.</p>
              </Panel>
            </div>

            <Panel title="Sources" meta="Raw rows (before cleaning) → unique postings kept · completeness of key fields (share missing)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-ink-3">
                    <tr>
                      <th scope="col" className="py-2 pr-2 font-medium">Source</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Raw rows</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Kept</th>
                      <th scope="col" className="px-2 py-2 font-medium">Posting dates</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Advertised pay</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Benchmarks</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium" title="Share of posting–skill pairs that were in the data as collected">Skills written</th>
                      {FIELDS.map(([, l]) => <th key={l} scope="col" className="px-1 py-2 text-center font-medium">{l}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {d.per_source.map((s) => (
                      <tr key={s.source} className="border-t border-line">
                        <th scope="row" className="py-1.5 pr-2 text-left font-normal">{s.label}</th>
                        <td className="tnum px-2 py-1.5 text-right text-ink-3">{fmtInt(d.pipeline.raw_rows_by_source?.[s.source])}</td>
                        <td className="tnum px-2 py-1.5 text-right">{fmtInt(s.postings)}</td>
                        <td className="tnum px-2 py-1.5 whitespace-nowrap text-ink-2">{s.first_posted ? `${s.first_posted.slice(0, 7)} – ${s.last_posted?.slice(0, 7)}` : "no dates"}</td>
                        <td className="tnum px-2 py-1.5 text-right">{fmtInt(s.advertised_salary)}</td>
                        <td className="tnum px-2 py-1.5 text-right text-ink-3">{fmtInt(s.benchmark_salary)}</td>
                        <td className="tnum px-2 py-1.5 text-right">{fmtPct(s.observed_share, 0)}</td>
                        {FIELDS.map(([k]) => <MissingCell key={k} v={s.missing[k]} />)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-ink-3">Cell shading = share of the source's postings missing that field (darker = more missing). Descriptions are absent from the Kaggle data and are short API snippets for Jooble/Careerjet.</p>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title="Skill provenance" meta="Per posting × skill (job_skills.is_observed)">
                <p className="text-sm text-ink-2">A skill is <b>written in posting</b> when it was in the posting data as collected (the Kaggle skills field, the API's original skills, the Arab file's original column). Skills the team inferred later from the title or similar postings are <b>added by team</b>.</p>
                <p className="mt-2 text-sm text-ink-2">Every skill chart shows the two parts; the “Written in posting” switch removes added skills from counts and denominators.</p>
                <p className="mt-2 text-sm text-ink-3">Check: on all 31,178 Kaggle Arab-search rows marked “Original”, the recovered original skills match the dataset's own job_type_skills exactly.</p>
              </Panel>
              <Panel title="Skill categories" meta="Where each skill's category comes from">
                <ul className="space-y-1 text-sm">
                  {d.taxonomy.map((t) => <li key={t.source} className="flex justify-between"><span className="text-ink-2">{t.source === "none" ? "Uncategorized (not guessed)" : t.source === "kaggle" ? "Kaggle job_type_skills" : t.source === "curated" ? "Curated list (team-added skills)" : "Kaggle, documented correction"}</span>
                    <span className="tnum">{fmtPct(t.mentions / tax)} · {fmtInt(t.skills)} skills</span></li>)}
                </ul>
              </Panel>
              <Panel title="Salary provenance" meta="Advertised vs benchmark, by source">
                <ul className="space-y-1 text-sm">
                  {d.per_source.filter((s) => s.advertised_salary + s.benchmark_salary > 0).map((s) => (
                    <li key={s.source} className="flex justify-between gap-2"><span className="truncate text-ink-2">{s.label}</span>
                      <span className="tnum shrink-0">{fmtInt(s.advertised_salary)} adv. · {fmtInt(s.benchmark_salary)} bench.</span></li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-3">Benchmarks (Paylab, Indeed, US BLS) describe the job title in that country, not the posting, and appear only in the Salary lab's benchmark view.</p>
              </Panel>
            </div>

            <Panel title="Location correction: the “Sudan” rows" meta="Evidence recorded by the pipeline (reports/pipeline_stats.json)">
              {d.sudan_correction.before ? (
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <p className="text-ink-2">{fmtInt(d.sudan_correction.before.rows)} rows of the merged team file have <code>job_country = "Sudan"</code>: it was the Kaggle <i>search location</i>. Their country rebuilt from each posting's own location:</p>
                    <ul className="mt-2 space-y-0.5">{Object.entries(d.sudan_correction.before.country_from_real_location).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="tnum">{fmtInt(v)}</span></li>)}</ul>
                  </div>
                  <div>
                    <p className="text-ink-2">After cleaning and de-duplication those postings are counted as:</p>
                    <ul className="mt-2 space-y-0.5">{d.sudan_correction.after_dedup.map((r) => <li key={r.key} className="flex justify-between"><span>{r.key}</span><span className="tnum">{fmtInt(r.n)}</span></li>)}</ul>
                    <p className="mt-2 text-ink-3">“Remote (Anywhere)” rows have no single country and count as Remote.</p>
                  </div>
                </div>
              ) : <p className="text-sm text-ink-3">Not available for this store.</p>}
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Metric definitions">
                <dl className="space-y-2 text-sm">
                  {[
                    ["Unique postings", "Rows of the de-duplicated dataset. 'Listings' counts every board the posting appeared on."],
                    ["Skill share", "Postings in the population that list the skill ÷ postings in the population that list any skill (same provenance mode)."],
                    ["Market type", "Remote if marked remote or from a remote board; otherwise Arab if in an Arab League country; otherwise International."],
                    ["Advertised salary", "Midpoint of the posting's own range, annualized, converted to USD at fixed approximate rates; $500–$1M per year kept."],
                    ["Lift", "How many times more often two skills co-occur than if independent. 1 = no association."],
                    ["Alignment (career planner)", "Share-weighted coverage of the 15 most requested skills of a role. Descriptive; not a hiring probability."],
                    ["Small sample", `Groups below ${meta?.thresholds.min_group_postings ?? 30} postings are flagged or hidden; salary statistics need ${meta?.thresholds.min_salary_n ?? 10}+ salaries.`],
                  ].map(([k, v]) => <div key={k}><dt className="font-medium">{k}</dt><dd className="m-0 text-ink-2">{v}</dd></div>)}
                </dl>
              </Panel>
              <Panel title="What this data can and cannot show">
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">
                  <li>It describes {fmtInt(d.totals.postings)} collected postings, not the whole labour market or real hiring volumes.</li>
                  <li>{labels.cohort("kaggle_2023")} is about {fmtPct((meta?.dimensions.cohort.find((c) => c.value === "kaggle_2023")?.n ?? 0) / d.totals.postings, 0)} of the data and covers data roles only, so data skills dominate every overall ranking.</li>
                  <li>Arab-market postings are few compared with international ones; country comparisons carry sample-size flags.</li>
                  <li>Role and seniority come from title keywords (a baseline, not a trained classifier); most titles state no seniority.</li>
                  <li>Only {fmtPct(1 - (d.totals.missing.salary_usd_annual ?? 1), 0)} of postings carry a usable salary of either kind; pay results describe that subset.</li>
                  <li>Employer counts are postings in this sample, not company size. {fmtInt(d.totals.placeholder_company_postings)} postings name a job board or a hidden employer.</li>
                  <li>Raw postings are not redistributed: exports are aggregates only (NFR-08).</li>
                </ul>
              </Panel>
            </div>
          </div>);
        }}
      </Guard>
    </>
  );
}

function MissingCell({ v }: { v: number | null | undefined }) {
  const x = v ?? 0;
  return (
    <td className="px-1 py-1.5 text-center">
      <span className="tnum inline-block w-11 rounded px-1 text-xs" title={`${fmtPct(x)} missing`}
        style={{ background: `color-mix(in oklab, var(--s5) ${Math.round(x * 55)}%, transparent)`, color: x > 0.6 ? "var(--ink)" : "var(--ink-2)" }}>
        {fmtPct(x, 0)}
      </span>
    </td>
  );
}
