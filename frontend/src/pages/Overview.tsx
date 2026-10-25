import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CohortMonths, HBar, Histogram, SkillBars } from "../components/charts";
import { Kpi, KpiStrip } from "../components/Kpi";
import { Lattice } from "../components/Lattice";
import { Callout, ChartPanel, Empty, Guard, PageHeader, Panel, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { drillHref, filterParams } from "../lib/filters";
import { fmtDate, fmtInt, fmtPct } from "../lib/format";
import { useFilters, useLabels } from "../lib/hooks";
import type { Count, Insight, Matrix, Overview as OverviewData } from "../lib/types";

export default function Overview() {
  const { filters } = useFilters();
  const nav = useNavigate();
  const labels = useLabels();
  const q = useApi<OverviewData>("/overview", filters);
  const lattice = useApi<Matrix>("/skills/matrix", filters, { dim: "role_category", groups: 10, top: 16 });
  const insights = useApi<Insight[]>("/insights", filters);
  const go = (path: string, add: Record<string, string>, extra: Record<string, string> = {}) => nav(drillHref(path, filters, add, extra));
  const qs = new URLSearchParams(filterParams(filters)).toString();
  const link = (p: string) => (qs ? `${p}?${qs}` : p);

  return (
    <>
      <PageHeader title="Market overview"
        description="Demand, skills and advertised pay across the postings in your selection. Every bar opens the postings behind it." />
      <Guard q={q} h={96} empty={(d) => d.kpis.postings === 0}>
        {(d) => {
          const k = d.kpis;
          const kaggle = d.cohorts.find((c) => c.key === "kaggle_2023")?.share ?? 0;
          return (<>
            <KpiStrip>
              <Kpi label="Unique postings" value={fmtInt(k.postings)} sub={`from ${fmtInt(k.appearances)} listings`} />
              <Kpi label="Countries" value={fmtInt(k.countries)} sub={`${fmtInt(k.no_country)} remote / no country`} />
              <Kpi label="Employers" value={fmtInt(k.employers)} sub="named employers, job boards excluded" />
              <Kpi label="Distinct skills" value={fmtInt(k.distinct_skills)} sub={`${fmtPct(k.with_skills / k.postings)} of postings list skills`} />
              <Kpi label="Advertised salary" value={fmtInt(k.advertised_salary)} sub={`${fmtPct(k.advertised_salary / k.postings)} · ${fmtInt(k.benchmark_salary)} benchmarks kept apart`} />
              <Kpi label="Posting dates" value={k.first_posted ? `${k.first_posted.slice(0, 4)}–${k.last_posted?.slice(0, 4)}` : "—"}
                sub={`${fmtDate(k.first_posted)} – ${fmtDate(k.last_posted)}`} />
            </KpiStrip>

            {kaggle > 0.5 && (
              <div className="mt-4">
                <Callout tone="info" title="Read with the sample in mind">
                  {fmtPct(kaggle, 0)} of these postings come from the 2023 Kaggle archive, which was collected for data roles
                  (analyst, engineer, scientist). Role and skill rankings reflect that focus; filter the 2024–26 collection for software, security and other tracks.{" "}
                  <TextLink to="/quality">How the data was built</TextLink>
                </Callout>
              </div>
            )}

            <Guard q={insights} h={64}>
              {(ins) => (
                <ul className="mt-4 grid gap-2 md:grid-cols-3" aria-label="Key findings">
                  {ins.slice(0, 3).map((i) => (
                    <li key={i.id} className="rounded-lg border border-line bg-panel px-4 py-3 text-sm text-ink-2">
                      {i.text}
                      {i.n !== i.denominator && <span className="mt-1 block text-xs text-ink-3">n = {fmtInt(i.n)} of {fmtInt(i.denominator)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Guard>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <ChartPanel title="Postings by role" meta={`Share of ${fmtInt(k.postings)} postings · role from title rules`}
                info="Role category is assigned from the job title by documented keyword rules (src/clean_utils.py). It is a baseline, not a trained classifier."
                table={countTable(d.roles, "Role", "roles")}>
                {(h) => <HBar label="Postings by role" handle={h} data={d.roles.map((r) => ({ label: r.key, value: r.n, share: r.share }))}
                  onSelect={(role) => go("/explorer", { role })} />}
              </ChartPanel>
              <ChartPanel title="Most requested skills" meta={`Share of ${fmtInt(d.top_skills.denominator)} postings that list skills`}
                info="Solid = the skill was in the posting data as collected. Hatched = the team added it later (inferred from the title or similar postings). Switch 'Written in posting' in the filter bar to count only the solid part."
                table={{ columns: ["Skill", "Postings", "Share", "Written in posting", "Added by team"], filename: "top-skills",
                  rows: d.top_skills.rows.map((r) => [r.skill, r.postings, fmtPct(r.share), r.observed, r.added]) }}>
                {(h) => <SkillBars handle={h} rows={d.top_skills.rows} denominator={d.top_skills.denominator}
                  observedOnly={filters.provenance === "observed"} onSelect={(s) => nav(link("/skills") + `${qs ? "&" : "?"}view=${encodeURIComponent(s)}`)} />}
              </ChartPanel>
            </div>
          </>);
        }}
      </Guard>

      <Panel className="mt-4" title="Which skills each role asks for"
        meta="Rows: the 10 largest roles. Columns: the 16 most requested skills. Select an opening to list those postings."
        info="Share = postings in the role that list the skill ÷ postings in the role that list any skill. Rows with fewer than 30 such postings are framed with a dashed line.">
        <Guard q={lattice} h={420} empty={(m) => !m.groups.length}>
          {(m) => <Lattice matrix={m} rowLabel="Role" caption="Share of each role's postings that list each skill"
            onSelect={(role, skill) => go("/explorer", { role, skill })} />}
        </Guard>
      </Panel>

      <Guard q={q} h={300} empty={(d) => d.kpis.postings === 0}>
        {(d) => (<>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <ChartPanel title="Top countries" className="xl:col-span-1" meta={`${fmtInt(d.kpis.no_country)} postings have no single country (remote or unknown)`}
              table={countTable(d.countries, "Country", "countries")}
              extraActions={<TextLink to={link("/geography")}>Map</TextLink>}>
              {(h) => <HBar label="Postings by country" handle={h} data={d.countries.map((r) => ({ label: r.key ?? "No country", value: r.n, share: r.share }))}
                onSelect={(country) => country !== "No country" && go("/explorer", { country })} />}
            </ChartPanel>
            <div className="grid gap-4">
              <ChartPanel title="Market type" meta="Remote > Arab League country > other country" table={countTable(d.markets, "Market", "markets")}
                info="Documented rule (FR-04): a posting is Remote if marked remote or from a remote board; otherwise Arab if located in an Arab League country; otherwise International.">
                {(h) => <HBar label="Postings by market type" handle={h} color={2} data={d.markets.map((r) => ({ label: r.key, value: r.n, share: r.share }))}
                  onSelect={(market) => go("/explorer", { market })} />}
              </ChartPanel>
              <ChartPanel title="Work mode" table={countTable(d.work_mode, "Work mode", "work-mode")}
                meta="Hybrid is rarely stated in the sources">
                {(h) => <HBar label="Postings by work mode" handle={h} color={2} data={d.work_mode.map((r) => ({ label: r.key, value: r.n, share: r.share }))}
                  onSelect={(work_mode) => go("/explorer", { work_mode })} />}
              </ChartPanel>
            </div>
            <div className="grid gap-4">
              <ChartPanel title="Seniority" meta="From title keywords; most titles state none" table={countTable(d.seniority, "Seniority", "seniority")}>
                {(h) => <HBar label="Postings by seniority" handle={h} color={3} data={d.seniority.map((r) => ({ label: r.key, value: r.n, share: r.share, muted: r.key === "Not specified" }))}
                  onSelect={(seniority) => go("/explorer", { seniority })} />}
              </ChartPanel>
              <ChartPanel title="Employment type" table={countTable(d.job_type, "Employment type", "employment-type")}>
                {(h) => <HBar label="Postings by employment type" handle={h} color={3} data={d.job_type.map((r) => ({ label: r.key, value: r.n, share: r.share, muted: r.key === "Unknown" }))}
                  onSelect={(job_type) => go("/explorer", { job_type })} />}
              </ChartPanel>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartPanel title="Advertised salaries" meta={`${fmtInt(d.kpis.advertised_salary)} postings state their pay · annualized, approximate USD`}
              info="Only the posting's own salary. Benchmarks the team attached (Paylab, Indeed, BLS) are excluded here and shown separately in the Salaries module. Ranges use their midpoint; hourly pay × 2080, monthly × 12; currencies converted at fixed approximate rates."
              table={{ columns: ["From (USD/yr)", "Postings"], filename: "salary-histogram", rows: d.salary_histogram.map((b) => [b.bin, b.n]) }}
              extraActions={<TextLink to={link("/salary")}>Salary lab</TextLink>}>
              {(h) => d.kpis.advertised_salary < 10
                ? <Empty title="Too few advertised salaries" hint="Fewer than 10 postings in this selection state a salary." />
                : <Histogram handle={h} label="Distribution of advertised annual salaries" bins={d.salary_histogram} binWidth={20000} cap={300000} />}
            </ChartPanel>
            <ChartPanel title="Postings by month and collection" meta="Two separate collections, each on its own scale — not one continuous series"
              info="The 2023 archive and the 2024–26 collection were gathered by different methods from different sources. Read each line on its own; the gap between them is not a trend."
              table={{ columns: ["Collection", "Month", "Postings"], filename: "postings-by-month", rows: d.months.map((m) => [labels.cohort(m.cohort), m.month.slice(0, 7), m.n]) }}
              extraActions={<TextLink to={link("/trends")}>Time view</TextLink>}>
              {(h) => <CohortMonths handle={h} months={d.months} cohortLabel={labels.cohort} />}
            </ChartPanel>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartPanel title="Skill categories" meta={`Share of ${fmtInt(d.skill_categories.denominator)} postings listing at least one skill in the category`}
              info="Categories come from the Kaggle dataset's own skill grouping where it exists, otherwise from a documented curated list. Soft skills and spoken languages are the non-technical groups."
              table={{ columns: ["Category", "Postings", "Share", "Distinct skills"], filename: "skill-categories", rows: d.skill_categories.rows.map((r) => [r.category, r.postings, fmtPct(r.share), r.skills]) }}>
              {(h) => <HBar label="Skill categories" handle={h} color={3} maxLabel={30}
                data={d.skill_categories.rows.map((r) => ({ label: r.category, value: r.postings, share: r.share, note: r.is_technical ? undefined : "Non-technical" }))} />}
            </ChartPanel>
            <ChartPanel title="Data sources" meta="Unique postings kept after cross-source de-duplication"
              table={countTable(d.sources.map((s) => ({ ...s, key: labels.source(s.key) })), "Source", "sources")}
              extraActions={<TextLink to="/quality">Methodology</TextLink>}>
              {(h) => <HBar label="Postings by data source" handle={h} maxLabel={34}
                data={d.sources.map((r) => ({ label: labels.source(r.key), value: r.n, share: r.share }))} />}
            </ChartPanel>
          </div>
          <p className="mt-6 flex items-center gap-1 text-sm text-ink-3">
            Want to know what to learn for a role? <TextLink to={link("/career")}>Open the career planner</TextLink> <ArrowRight size={14} />
          </p>
        </>)}
      </Guard>
    </>
  );
}

function countTable(rows: Count[], label: string, filename: string) {
  return { columns: [label, "Postings", "Share"], filename, rows: rows.map((r) => [r.key ?? "—", r.n, fmtPct(r.share)]) };
}
