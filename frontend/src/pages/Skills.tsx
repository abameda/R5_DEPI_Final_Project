import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Chart } from "../components/Chart";
import { HBar, MonthLines, SkillBars } from "../components/charts";
import { Lattice } from "../components/Lattice";
import { Callout, ChartPanel, Guard, IconButton, PageHeader, Panel, Pill, Segmented, Select, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { axisStyle, baseOption, esc, HUE } from "../lib/echarts";
import { drillHref } from "../lib/filters";
import { fmtInt, fmtPct, fmtUsd } from "../lib/format";
import { useFilters, useLabels, useMeta, useParam } from "../lib/hooks";
import type { Cooc, Matrix, SkillDetail, TopSkills } from "../lib/types";

const DIMS = [
  { value: "role_category", label: "Role" }, { value: "market_type", label: "Market" }, { value: "seniority", label: "Seniority" },
  { value: "country", label: "Country" }, { value: "region", label: "Region" }, { value: "job_type", label: "Employment type" },
  { value: "cohort", label: "Collection" },
];

export default function Skills() {
  const [tab, setTab] = useParam("tab", "demand");
  const [view, setView] = useParam("view", "");
  return (
    <>
      <PageHeader title="Skills intelligence"
        description="Which skills postings ask for, how that differs by role and market, and which skills travel together. Shares use postings that list at least one skill as the denominator.">
        <Segmented label="Skills view" value={tab} onChange={setTab} options={[
          { value: "demand", label: "Demand" }, { value: "by", label: "By segment" }, { value: "pairs", label: "Pairings" }]} />
      </PageHeader>
      {view && <SkillProfile skill={view} onClose={() => setView(null)} />}
      {tab === "demand" && <Demand onPick={setView} />}
      {tab === "by" && <BySegment />}
      {tab === "pairs" && <Pairings onPick={setView} />}
    </>
  );
}

function Demand({ onPick }: { onPick: (s: string) => void }) {
  const { filters } = useFilters();
  const { data: meta } = useMeta();
  const [category, setCategory] = useParam("category", "");
  const [kind, setKind] = useParam("kind", "all");
  const technical = kind === "all" ? undefined : kind === "technical";
  const q = useApi<TopSkills>("/skills/top", filters, { limit: 30, category: category || undefined, technical });
  const cats = useApi<{ denominator: number; rows: { category: string; postings: number; share: number | null; is_technical: boolean; skills: number }[] }>("/skills/categories", filters);
  const soft = useApi<TopSkills>("/skills/top", filters, { limit: 10, technical: false });
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <ChartPanel title="Most requested skills"
        meta={q.data ? `Share of ${fmtInt(q.data.denominator)} postings with skill data${category ? ` · ${category}` : ""}` : undefined}
        info="Solid = written in the posting data as collected; hatched = added by the team afterwards. Switch 'Written in posting' in the filter bar to rank by posting-written skills only."
        extraActions={<>
          <Select label="Category" value={category} onChange={(v) => setCategory(v || null)} className="hidden sm:inline-flex"
            options={[{ value: "", label: "All" }, ...(meta?.skill_categories ?? []).map((c) => ({ value: c, label: c }))]} />
        </>}
        table={q.data ? { columns: ["Skill", "Category", "Postings", "Share", "Written in posting", "Added by team"], filename: "skills",
          rows: q.data.rows.map((r) => [r.skill, r.category, r.postings, fmtPct(r.share), r.observed, r.added]) } : undefined}>
        {(h) => (<>
          <div className="mb-3"><Segmented label="Technical or not" value={kind} onChange={setKind}
            options={[{ value: "all", label: "All skills" }, { value: "technical", label: "Technical" }, { value: "soft", label: "Soft skills & languages" }]} /></div>
          <Guard q={q} h={600} empty={(d) => !d.rows.length}>
            {(d) => <SkillBars handle={h} rows={d.rows} denominator={d.denominator} observedOnly={filters.provenance === "observed"} onSelect={onPick} />}
          </Guard>
        </>)}
      </ChartPanel>
      <ChartPanel title="Skill categories" meta="Share of postings listing at least one skill in the category"
        info="Categories come from the Kaggle dataset's own skill grouping (programming, cloud, libraries…) where it exists, otherwise from a documented curated list. 'Uncategorized' skills are not guessed."
        table={cats.data ? { columns: ["Category", "Postings", "Share", "Distinct skills"], filename: "skill-categories",
          rows: cats.data.rows.map((r) => [r.category, r.postings, fmtPct(r.share), r.skills]) } : undefined}>
        {(h) => <Guard q={cats} h={500}>{(d) => <HBar handle={h} label="Skill categories" color={HUE.skill} maxLabel={30}
          data={d.rows.map((r) => ({ label: r.category, value: r.postings, share: r.share, note: `${r.skills} distinct skills${r.is_technical ? "" : " · non-technical"}` }))}
          onSelect={(c) => setCategory(c)} />}</Guard>}
      </ChartPanel>
      <ChartPanel className="xl:col-start-2" title="Soft skills and languages"
        meta={soft.data ? `Non-technical skills · share of ${fmtInt(soft.data.denominator)} postings with skill data` : undefined}
        info="Soft skills and spoken languages are mostly added by the team from descriptions and role knowledge; the hatched part shows how much."
        table={soft.data ? { columns: ["Skill", "Postings", "Share", "Written in posting"], filename: "soft-skills",
          rows: soft.data.rows.map((r) => [r.skill, r.postings, fmtPct(r.share), r.observed]) } : undefined}>
        {(h) => <Guard q={soft} h={260} empty={(d) => !d.rows.length}>
          {(d) => <SkillBars handle={h} rows={d.rows} denominator={d.denominator} observedOnly={filters.provenance === "observed"} onSelect={onPick} />}
        </Guard>}
      </ChartPanel>
    </div>
  );
}

function BySegment() {
  const { filters } = useFilters();
  const nav = useNavigate();
  const labels = useLabels();
  const [dim, setDim] = useParam("dim", "role_category");
  const q = useApi<Matrix>("/skills/matrix", filters, { dim, groups: dim === "country" ? 15 : 12, top: 18 });
  const label = DIMS.find((d) => d.value === dim)?.label ?? dim;
  const keyOf: Record<string, string> = { role_category: "role", market_type: "market", seniority: "seniority", country: "country", region: "region", job_type: "job_type", cohort: "cohort" };
  return (
    <Panel title={`Skill demand by ${label.toLowerCase()}`}
      meta="Each row's share uses that row's own postings with skill data, so small and large groups compare fairly. Select an opening to list the postings."
      info="Rows with fewer than 30 postings that list skills get a dashed frame: treat their shares as indicative only."
      actions={<Select label="Rows" value={dim} onChange={(v) => setDim(v)} options={DIMS} />}>
      <Guard q={q} h={460} empty={(m) => !m.groups.length}>
        {(m) => <Lattice matrix={m} rowLabel={label} rowName={dim === "cohort" ? labels.cohort : undefined}
          caption={`Share of each ${label.toLowerCase()}'s postings that list each skill`}
          onSelect={(row, skill) => nav(drillHref("/explorer", filters, { [keyOf[dim]]: row, skill }))} />}
      </Guard>
      {dim === "cohort" && <p className="mt-2 text-xs text-ink-3">Rows: {labels.cohort("kaggle_2023")} vs {labels.cohort("collected_2026")} — different sources and methods; this is a side-by-side, not a trend.</p>}
    </Panel>
  );
}

function Pairings({ onPick }: { onPick: (s: string) => void }) {
  const { filters } = useFilters();
  const [metric, setMetric] = useParam("metric", "lift");
  const q = useApi<Cooc>("/skills/cooccurrence", filters, { limit: 18 });
  const metricLabel = metric === "lift" ? "Lift" : metric === "cond" ? "P(column | row)" : "Jaccard";
  return (
    <div className="grid gap-4">
      <Callout tone="info">
        <b>Lift</b> = how many times more often two skills appear together than if they were unrelated (1.0 = no association).
        {" "}<b>P(column | row)</b> = share of postings listing the row skill that also list the column skill. <b>Jaccard</b> = together ÷ either.
      </Callout>
      <ChartPanel title="Skills that appear together" meta={q.data ? `The 18 most requested skills · ${fmtInt(q.data.denominator)} postings with skill data` : undefined}
        extraActions={<Segmented label="Association measure" value={metric} onChange={setMetric}
          options={[{ value: "lift", label: "Lift" }, { value: "cond", label: "P(col | row)" }, { value: "jaccard", label: "Jaccard" }]} />}
        table={q.data ? { columns: ["Skill A", "Skill B", "Together", "Lift", "P(B|A)", "P(A|B)", "Jaccard"], filename: "skill-pairs",
          rows: q.data.links.map((l) => [l.a, l.b, l.together, l.lift, fmtPct(l.p_b_given_a), fmtPct(l.p_a_given_b), l.jaccard]) } : undefined}>
        {(h) => <Guard q={q} h={520} empty={(d) => d.nodes.length < 2}>{(d) => {
          const names = d.nodes.map((n) => n.skill);
          const cell = (a: string, b: string) => {
            const l = d.links.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
            if (!l) return null;
            if (metric === "lift") return l.lift;
            if (metric === "jaccard") return l.jaccard;
            return l.a === a ? l.p_b_given_a : l.p_a_given_b;
          };
          const data: [number, number, number | null][] = [];
          names.forEach((a, i) => names.forEach((b, j) => { if (i !== j) data.push([j, i, cell(a, b)]); }));
          const vals = data.map((x) => x[2] ?? 0);
          const diverging = metric === "lift";
          return (
            <Chart label={`${metricLabel} between pairs of top skills`} handleRef={h} height={560} deps={[d, metric]}
              onClick={(p) => onPick(names[(p.data as number[])[1]])}
              build={(t) => ({
                ...baseOption(t),
                grid: { left: 8, right: 8, top: 8, bottom: 70, containLabel: true },
                xAxis: { type: "category", data: names, ...axisStyle(t), axisLabel: { color: t.ink2, fontSize: 11, rotate: 50 }, splitArea: { show: false } },
                yAxis: { type: "category", data: names, inverse: true, ...axisStyle(t), axisLabel: { color: t.ink2, fontSize: 11 } },
                visualMap: diverging
                  ? { type: "piecewise", orient: "horizontal", left: "center", bottom: 0, itemWidth: 14, textStyle: { color: t.ink2, fontSize: 11 },
                      pieces: [{ lt: 0.8, color: t.series[4], label: "< 0.8 (avoid each other)" }, { gte: 0.8, lt: 1.25, color: t.panel2, label: "0.8–1.25 (no link)" },
                        { gte: 1.25, lt: 2, color: t.s3Soft, label: "1.25–2" }, { gte: 2, color: t.series[HUE.skill], label: "≥ 2 (strong pair)" }] }
                  : { min: 0, max: Math.max(...vals, 0.01), orient: "horizontal", left: "center", bottom: 0, itemHeight: 140, calculable: false,
                      inRange: { color: [t.panel2, t.series[HUE.skill]] }, textStyle: { color: t.ink2, fontSize: 11 }, formatter: (v: number) => fmtPct(v, 0) },
                tooltip: { ...baseOption(t).tooltip, formatter: (p: { data: [number, number, number | null] }) => {
                  const [x, y, v] = p.data;
                  const l = d.links.find((k) => (k.a === names[y] && k.b === names[x]) || (k.a === names[x] && k.b === names[y]));
                  return `<b>${esc(names[y])} + ${esc(names[x])}</b><br/>${fmtInt(l?.together)} postings together<br/>${metricLabel}: <b>${v == null ? "—" : metric === "lift" ? v.toFixed(2) : fmtPct(v)}</b>`;
                } },
                series: [{ type: "heatmap", data, itemStyle: { borderColor: t.panel, borderWidth: 2, borderRadius: 2 }, emphasis: { itemStyle: { borderColor: t.accent, borderWidth: 2 } } }],
              })} />
          );
        }}</Guard>}
      </ChartPanel>
      <ChartPanel title="Pairing network" meta="Lines join pairs with lift ≥ 1.5 and at least 1% of postings together; circle area = postings listing the skill. Drag to rearrange, scroll to zoom."
        info="A force layout places strongly related skills near each other. Only meaningful associations are drawn so the network stays readable.">
        {(h) => <Guard q={q} h={460}>{(d) => {
          const edges = d.links.filter((l) => (l.lift ?? 0) >= 1.5 && l.together >= 0.01 * d.denominator);
          const maxN = Math.max(...d.nodes.map((n) => n.postings));
          return (
            <Chart label="Network of strongly associated skills" handleRef={h} height={480} deps={[d]}
              onClick={(p) => p.data && (p.data as { name?: string }).name && onPick((p.data as { name: string }).name)}
              build={(t) => ({
                ...baseOption(t),
                tooltip: { ...baseOption(t).tooltip, formatter: (p: { dataType: string; data: { name?: string; value?: number; source?: string; target?: string; lift?: number; together?: number } }) =>
                  p.dataType === "edge" ? `<b>${esc(p.data.source)} + ${esc(p.data.target)}</b><br/>Lift ${p.data.lift?.toFixed(2)} · ${fmtInt(p.data.together)} postings`
                    : `<b>${esc(p.data.name)}</b><br/>${fmtInt(p.data.value)} postings` },
                series: [{
                  type: "graph", layout: "force", roam: true, draggable: true,
                  force: { repulsion: 1100, edgeLength: [90, 230], gravity: 0.05, layoutAnimation: false },
                  label: { show: true, position: "right", color: t.ink, fontSize: 11 },
                  emphasis: { focus: "adjacency", lineStyle: { width: 3 } },
                  blur: { itemStyle: { opacity: 0.25 }, lineStyle: { opacity: 0.08 } },
                  lineStyle: { color: t.lineStrong, curveness: 0.1 },
                  data: d.nodes.map((n) => ({ name: n.skill, value: n.postings, symbolSize: 10 + 34 * Math.sqrt(n.postings / maxN),
                    itemStyle: { color: n.is_technical ? t.series[HUE.skill] : t.series[HUE.source], borderColor: t.panel, borderWidth: 2 } })),
                  links: edges.map((l) => ({ source: l.a, target: l.b, lift: l.lift, together: l.together,
                    lineStyle: { width: Math.min(6, 0.6 + (l.lift ?? 1)), opacity: 0.55 } })),
                }],
              })} />
          );
        }}</Guard>}
      </ChartPanel>
    </div>
  );
}

export function SkillProfile({ skill, onClose }: { skill: string; onClose: () => void }) {
  const { filters } = useFilters();
  const nav = useNavigate();
  const labels = useLabels();
  const q = useApi<SkillDetail>("/skills/detail", filters, { name: skill });
  return (
    <Panel className="mb-4 border-accent-line" title={<>Skill profile: <span dir="auto">{skill}</span></>}
      meta={q.data ? `${q.data.category} · category from ${q.data.category_source === "none" ? "no source (uncategorized)" : q.data.category_source}` : undefined}
      actions={<IconButton label="Close skill profile" onClick={onClose}><X size={16} /></IconButton>}>
      <Guard q={q} h={360}>
        {(d) => {
          const added = d.postings - d.observed_postings;
          const sal = (w: boolean) => d.salary.find((s) => s.with_skill === w);
          const s1 = sal(true);
          const s0 = sal(false);
          const trend = d.trend.series[0]?.points.filter((p) => p.cohort === "kaggle_2023" && p.reliable) ?? [];
          return (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
                <p><span className="kpi text-2xl font-semibold text-ink">{fmtPct(d.share)}</span> <span className="text-ink-2">of {fmtInt(d.denominator)} postings with skill data list {skill}</span></p>
                <p className="text-sm text-ink-2">{fmtInt(d.observed_postings)} written in the posting · {fmtInt(added)} added by the team
                  {d.postings > 0 && added / d.postings > 0.5 && <Pill tone="warn" title="Most mentions of this skill were added after collection">mostly team-added</Pill>}</p>
                <TextLink to={drillHref("/explorer", filters, { skill })}>See the {fmtInt(d.postings)} postings</TextLink>
                <TextLink to={drillHref("/career", filters, {}, { have: skill })}>Plan a career with it</TextLink>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div><h3 className="mb-1 text-sm font-medium">By role <span className="font-normal text-ink-3">share within the role</span></h3>
                  <HBar by="share" label={`${skill} share by role`} data={d.by_role.slice(0, 10).map((r) => ({ label: r.key, value: r.n, share: r.share }))}
                    onSelect={(role) => nav(drillHref("/explorer", filters, { role, skill }))} /></div>
                <div><h3 className="mb-1 text-sm font-medium">By country <span className="font-normal text-ink-3">share within the 12 largest countries</span></h3>
                  <HBar by="share" label={`${skill} share by country`} color={HUE.place} data={d.by_country.map((r) => ({ label: r.key, value: r.n, share: r.share }))}
                    onSelect={(country) => nav(drillHref("/explorer", filters, { country, skill }))} /></div>
                <div><h3 className="mb-1 text-sm font-medium">Most often paired with <span className="font-normal text-ink-3">share of {skill} postings</span></h3>
                  <HBar by="share" label={`Skills paired with ${skill}`} color={HUE.skill} data={d.co_skills.slice(0, 10).map((c) => ({ label: c.skill, value: c.together, share: c.p_given_skill, note: c.lift ? `Lift ${c.lift.toFixed(2)}` : undefined }))} /></div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div><h3 className="mb-1 text-sm font-medium">By seniority</h3>
                  <HBar by="share" label={`${skill} share by seniority`} data={d.by_seniority.map((r) => ({ label: r.key, value: r.n, share: r.share }))} /></div>
                <div>
                  <h3 className="mb-1 text-sm font-medium">Monthly share in the 2023 archive</h3>
                  {trend.length >= 3 ? <MonthLines label={`${skill} monthly share, 2023 archive`} height={200} yName="" yFmt={(v) => fmtPct(v, 0)}
                    series={[{ name: skill, points: trend.map((p) => ({ x: p.month.slice(0, 7), y: p.share, n: p.denominator })) }]} />
                    : <p className="text-sm text-ink-3">Not enough dated 2023 postings in this selection.</p>}
                  <p className="text-xs text-ink-3">Within one collection only; {labels.cohort("collected_2026")} is not joined to this line.</p>
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-medium">Advertised pay, with vs without {skill}</h3>
                  {s1 && s1.median != null && s0 && s0.median != null ? (
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-ink-3">With</dt><dd className="m-0"><span className="kpi text-lg font-semibold">{fmtUsd(s1.median)}</span> <span className="text-ink-3">n = {fmtInt(s1.n)}</span></dd></div>
                      <div><dt className="text-ink-3">Without</dt><dd className="m-0"><span className="kpi text-lg font-semibold">{fmtUsd(s0.median)}</span> <span className="text-ink-3">n = {fmtInt(s0.n)}</span></dd></div>
                      <p className="col-span-2 text-xs text-ink-3">Median annual USD (approx.) among postings that list skills and advertise pay. A difference here is an association in this sample — role, country and seniority mix also differ — not the value of learning the skill.</p>
                    </dl>
                  ) : <p className="text-sm text-ink-3">Fewer than 10 advertised salaries on one side — not shown.</p>}
                  {d.employers.length > 0 && <>
                    <h3 className="mt-3 mb-1 text-sm font-medium">Employers asking for it most</h3>
                    <p className="text-sm text-ink-2" dir="auto">{d.employers.slice(0, 6).map((e) => `${e.key} (${fmtInt(e.n)})`).join(" · ")}</p>
                  </>}
                </div>
              </div>
            </div>
          );
        }}
      </Guard>
    </Panel>
  );
}
