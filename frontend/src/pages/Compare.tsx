import clsx from "clsx";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Chart } from "../components/Chart";
import { Callout, ChartPanel, Guard, PageHeader, Panel, Pill, Select } from "../components/ui";
import { useApi, usePost } from "../lib/api";
import { axisStyle, baseOption, esc } from "../lib/echarts";
import { EMPTY_FILTERS, filterBody, LIST_KEYS, type Filters, type ListKey } from "../lib/filters";
import { fmtInt, fmtPct, fmtPp, fmtUsd } from "../lib/format";
import { useLabels, useMeta } from "../lib/hooks";
import type { Count, Kpis, SalaryStats, TopSkills } from "../lib/types";

interface Segment { kpis: Kpis; salary: SalaryStats; cohorts: Count[]; sources: Count[]; roles: Count[]; seniority: Count[]; work_mode: Count[]; top_skills: TopSkills }
interface Result {
  a: Segment; b: Segment;
  skills: { skill: string; a_n: number; b_n: number; a_share: number; b_share: number; diff_pp: number; ratio: number | null; mainly: "a" | "b" | null }[];
  warnings: { level: "error" | "warn" | "info"; segment: "a" | "b" | null; code: string; text: string }[];
  rules: { dominance_ratio: number; min_gap_pp: number; min_group: number; min_salary_n: number };
}

const PRESETS: { label: string; a: Partial<Filters>; b: Partial<Filters> }[] = [
  { label: "Egypt vs United States", a: { country: ["Egypt"] }, b: { country: ["United States"] } },
  { label: "Arab market vs International", a: { market: ["Arab"] }, b: { market: ["International"] } },
  { label: "Data analyst vs data scientist", a: { role: ["Data Analysis & BI"] }, b: { role: ["Data Science & AI"] } },
  { label: "Python vs SQL postings", a: { skill: ["Python"] }, b: { skill: ["SQL"] } },
  { label: "Junior vs Senior", a: { seniority: ["Junior"] }, b: { seniority: ["Senior"] } },
  { label: "Remote vs On-site", a: { work_mode: ["Remote"] }, b: { work_mode: ["On-site"] } },
  { label: "2023 archive vs 2024–26 collection", a: { cohort: ["kaggle_2023"] }, b: { cohort: ["collected_2026"] } },
];
const EDIT_DIMS: { key: ListKey; label: string; dim: string }[] = [
  { key: "market", label: "Market", dim: "market_type" }, { key: "country", label: "Country", dim: "country" },
  { key: "role", label: "Role", dim: "role_category" }, { key: "seniority", label: "Seniority", dim: "seniority" },
  { key: "work_mode", label: "Work mode", dim: "work_mode" }, { key: "cohort", label: "Collection", dim: "cohort" },
];

function readSegment(sp: URLSearchParams, p: "a" | "b"): Filters {
  const f: Filters = { ...EMPTY_FILTERS };
  for (const k of LIST_KEYS) f[k] = sp.getAll(`${p}.${k}`);
  if (sp.get("provenance") === "observed") f.provenance = "observed";
  return f;
}

export default function Compare() {
  const [sp, setSp] = useSearchParams();
  const fresh = ![...sp.keys()].some((k) => k.startsWith("a.") || k.startsWith("b."));
  const a = fresh ? { ...EMPTY_FILTERS, ...PRESETS[0].a } : readSegment(sp, "a");
  const b = fresh ? { ...EMPTY_FILTERS, ...PRESETS[0].b } : readSegment(sp, "b");
  const body = useMemo(() => ({ a: filterBody(a), b: filterBody(b) }), [JSON.stringify(a), JSON.stringify(b)]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = usePost<Result>("/compare", body);
  const labels = useLabels();
  const describe = (f: Filters) => {
    const parts = LIST_KEYS.flatMap((k) => f[k].map((v) => (k === "cohort" ? labels.cohort(v) : k === "skill" ? `lists ${v}` : v)));
    return parts.length ? parts.join(" · ") : "All postings";
  };
  const write = (na: Partial<Filters>, nb: Partial<Filters>) => setSp((prev) => {
    const next = new URLSearchParams();
    for (const [p, seg] of [["a", na], ["b", nb]] as const) LIST_KEYS.forEach((k) => (seg[k] ?? []).forEach((v) => next.append(`${p}.${k}`, v)));
    const prov = prev.get("provenance");
    if (prov) next.set("provenance", prov);
    return next;
  });
  const setSeg = (p: "a" | "b", f: Partial<Filters>) => (p === "a" ? write(f, b) : write(a, f));
  const nameA = describe(a);
  const nameB = describe(b);

  return (
    <>
      <PageHeader title="Compare markets" description="Put two segments side by side. Every figure is normalized within its own segment, and the comparison flags small samples and mismatched collections.">
        <Select label="Preset" value="" onChange={(v) => { const p = PRESETS[+v]; if (p) write(p.a, p.b); }}
          options={[{ value: "", label: "Choose a comparison…" }, ...PRESETS.map((p, i) => ({ value: String(i), label: p.label }))]} />
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2">
        <SegmentEditor which="a" f={a} name={nameA} onChange={(f) => setSeg("a", f)} />
        <SegmentEditor which="b" f={b} name={nameB} onChange={(f) => setSeg("b", f)} />
      </div>
      <Guard q={q} h={480}>
        {(r) => (<>
          {r.warnings.length > 0 && (
            <div className="mt-4 grid gap-2">
              {r.warnings.map((w, i) => <Callout key={i} tone={w.level === "error" ? "crit" : w.level === "warn" ? "warn" : "info"}>{w.text}</Callout>)}
            </div>
          )}
          <Panel className="mt-4" title="Side by side" meta="Shares are within each segment">
            <MetricsTable r={r} nameA={nameA} nameB={nameB} />
          </Panel>
          <ChartPanel className="mt-4" title="Skill demand, A vs B"
            meta={`Share of each segment's postings that list skills · union of both top-15 lists · sorted by the size of the gap`}
            info={`“Mainly in” marks skills whose share in one segment is at least ${r.rules.dominance_ratio}× the other's and at least ${r.rules.min_gap_pp} percentage points higher.`}
            table={{ columns: ["Skill", "A share", "B share", "Difference (pp)", "A postings", "B postings", "Mainly in"], filename: "compare-skills",
              rows: r.skills.map((s) => [s.skill, fmtPct(s.a_share), fmtPct(s.b_share), s.diff_pp, s.a_n, s.b_n, s.mainly?.toUpperCase() ?? ""]) }}>
            {(h) => r.a.top_skills.rows.length === 0 && r.b.top_skills.rows.length === 0
              ? <p className="text-sm text-ink-3">Both segments are too small to rank skills.</p>
              : <Dumbbell handle={h} rows={r.skills} />}
          </ChartPanel>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <MixPanel title="Role mix" a={r.a.roles} b={r.b.roles} />
            <MixPanel title="Seniority mix" a={r.a.seniority} b={r.b.seniority} />
          </div>
        </>)}
      </Guard>
    </>
  );
}

function SegmentEditor({ which, f, name, onChange }: { which: "a" | "b"; f: Filters; name: string; onChange: (f: Filters) => void }) {
  const { data: meta } = useMeta();
  const labels = useLabels();
  const skills = useApi<TopSkills>("/skills/top", null, { limit: 60 });
  return (
    <section aria-label={`Segment ${which.toUpperCase()}`} className={clsx("rounded-lg border bg-panel p-4", which === "a" ? "border-s1" : "border-s2")}>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span className={clsx("grid size-6 place-items-center rounded text-xs font-bold text-white", which === "a" ? "bg-s1" : "bg-s2")}>{which.toUpperCase()}</span>
        <span className="truncate" dir="auto">{name}</span>
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {EDIT_DIMS.map((d) => (
          <label key={d.key} className="text-xs text-ink-3">{d.label}
            <select value={f[d.key][0] ?? ""} onChange={(e) => onChange({ ...f, [d.key]: e.target.value ? [e.target.value] : [] })}
              className="mt-0.5 h-8 w-full rounded-md border border-line-strong bg-panel px-1.5 text-sm text-ink">
              <option value="">Any</option>
              {(meta?.dimensions[d.dim] ?? []).slice(0, d.key === "country" ? 80 : undefined).map((o) =>
                <option key={o.value} value={o.value}>{d.key === "cohort" ? labels.cohort(o.value) : o.value}</option>)}
            </select>
          </label>
        ))}
        <label className="text-xs text-ink-3">Lists skill
          <select value={f.skill[0] ?? ""} onChange={(e) => onChange({ ...f, skill: e.target.value ? [e.target.value] : [] })}
            className="mt-0.5 h-8 w-full rounded-md border border-line-strong bg-panel px-1.5 text-sm text-ink">
            <option value="">Any</option>
            {(skills.data?.rows ?? []).map((s) => <option key={s.skill} value={s.skill}>{s.skill}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

function MetricsTable({ r, nameA, nameB }: { r: Result; nameA: string; nameB: string }) {
  const labels = useLabels();
  const share = (s: Segment, v: number) => (s.kpis.postings ? v / s.kpis.postings : null);
  const kag = (s: Segment) => s.cohorts.find((c) => c.key === "kaggle_2023")?.share ?? 0;
  const rows: [string, string, string, string?][] = [
    ["Unique postings", fmtInt(r.a.kpis.postings), fmtInt(r.b.kpis.postings)],
    ["Postings that list skills", fmtInt(r.a.top_skills.denominator), fmtInt(r.b.top_skills.denominator)],
    ["Named employers", fmtInt(r.a.kpis.employers), fmtInt(r.b.kpis.employers)],
    ["Countries", fmtInt(r.a.kpis.countries), fmtInt(r.b.kpis.countries)],
    ["Remote share", fmtPct(share(r.a, r.a.kpis.remote)), fmtPct(share(r.b, r.b.kpis.remote)),
      fmtPp(100 * ((share(r.a, r.a.kpis.remote) ?? 0) - (share(r.b, r.b.kpis.remote) ?? 0)))],
    ["Advertised salaries (n)", fmtInt(r.a.salary.n), fmtInt(r.b.salary.n)],
    ["Median advertised salary (USD/yr)", r.a.salary.median != null ? fmtUsd(r.a.salary.median) : "too few", r.b.salary.median != null ? fmtUsd(r.b.salary.median) : "too few",
      r.a.salary.median != null && r.b.salary.median != null ? `${(((r.a.salary.median - r.b.salary.median) / r.b.salary.median) * 100).toFixed(0)}% vs B` : undefined],
    ["Middle half (P25–P75)", r.a.salary.p25 != null ? `${fmtUsd(r.a.salary.p25)}–${fmtUsd(r.a.salary.p75)}` : "—", r.b.salary.p25 != null ? `${fmtUsd(r.b.salary.p25)}–${fmtUsd(r.b.salary.p75)}` : "—"],
    [`From the ${labels.cohort("kaggle_2023")}`, fmtPct(kag(r.a)), fmtPct(kag(r.b))],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-ink-3">
          <tr><th scope="col" className="py-1.5 font-medium">Measure</th>
            <th scope="col" className="py-1.5 text-right font-medium"><span className="text-s1">A</span> <span className="hidden sm:inline">{nameA}</span></th>
            <th scope="col" className="py-1.5 text-right font-medium"><span className="text-s2">B</span> <span className="hidden sm:inline">{nameB}</span></th>
            <th scope="col" className="py-1.5 text-right font-medium">Difference</th></tr>
        </thead>
        <tbody>
          {rows.map(([k, va, vb, d]) => (
            <tr key={k} className="border-t border-line">
              <th scope="row" className="py-1.5 text-left font-normal text-ink-2">{k}</th>
              <td className="tnum py-1.5 text-right text-ink">{va}</td>
              <td className="tnum py-1.5 text-right text-ink">{vb}</td>
              <td className="tnum py-1.5 text-right text-ink-3">{d ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dumbbell({ rows, handle }: { rows: Result["skills"]; handle: React.MutableRefObject<import("../components/Chart").ChartHandle | null> }) {
  const r = [...rows].slice(0, 22).reverse();
  return (
    <Chart label="Skill share in segment A and segment B" handleRef={handle} height={Math.max(220, r.length * 26 + 50)} deps={[rows]}
      build={(t) => ({
        ...baseOption(t),
        grid: { left: 8, right: 8, top: 30, bottom: 8, containLabel: true },
        legend: { top: 0, left: 0, data: ["A", "B"], itemWidth: 10, itemHeight: 10, textStyle: { color: t.ink2, fontSize: 11 } },
        xAxis: { type: "value", min: 0, max: (v: { max: number }) => Math.min(1, Math.ceil(v.max * 10 + 0.5) / 10), ...axisStyle(t), axisLabel: { color: t.ink3, fontSize: 11, formatter: (v: number) => fmtPct(v, 0) } },
        yAxis: [
          { type: "category", data: r.map((x) => x.skill), ...axisStyle(t), axisLine: { show: false }, axisLabel: { color: t.ink2, fontSize: 12 } },
          // gap labels in their own right-hand column so they never sit on the marks
          { type: "category", position: "right", data: r.map((x) => `${fmtPp(x.diff_pp)}${x.mainly ? `  mainly ${x.mainly.toUpperCase()}` : ""}`),
            axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: t.ink2, fontSize: 11 } },
        ],
        tooltip: { ...baseOption(t).tooltip, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: t.accentSoft, opacity: 0.4 } },
          formatter: (ps: { dataIndex: number }[]) => {
            const x = r[ps[0].dataIndex];
            return `<b>${esc(x.skill)}</b><br/>A: ${fmtPct(x.a_share)} (${fmtInt(x.a_n)})<br/>B: ${fmtPct(x.b_share)} (${fmtInt(x.b_n)})<br/>Gap: ${fmtPp(x.diff_pp)}`;
          } },
        series: [
          { type: "custom", silent: true, data: r.map((x, i) => [x.a_share, x.b_share, i]),
            renderItem: (_: unknown, api: { value: (i: number) => number; coord: (v: number[]) => number[] }) => {
              const p1 = api.coord([api.value(0), api.value(2)]);
              const p2 = api.coord([api.value(1), api.value(2)]);
              return { type: "line", shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] }, style: { stroke: t.lineStrong, lineWidth: 2 } };
            } },
          { name: "A", type: "scatter", symbolSize: 10, data: r.map((x) => x.a_share), itemStyle: { color: t.series[0], borderColor: t.panel, borderWidth: 2 } },
          { name: "B", type: "scatter", symbol: "diamond", symbolSize: 11, data: r.map((x) => x.b_share), itemStyle: { color: t.series[1], borderColor: t.panel, borderWidth: 2 } },
        ],
      })} />
  );
}

function MixPanel({ title, a, b }: { title: string; a: Count[]; b: Count[] }) {
  const keys = [...new Set([...a.map((x) => x.key), ...b.map((x) => x.key)])];
  const sa = (k: string) => a.find((x) => x.key === k)?.share ?? 0;
  const sb = (k: string) => b.find((x) => x.key === k)?.share ?? 0;
  return (
    <Panel title={title} meta="Share of each segment's postings">
      <ul className="space-y-2 text-sm">
        {keys.map((k) => (
          <li key={k}>
            <div className="flex justify-between"><span className="text-ink-2">{k}</span>
              <span className="tnum text-ink-3"><span className="text-s1">A</span> {fmtPct(sa(k), 0)} · <span className="text-s2">B</span> {fmtPct(sb(k), 0)}
                {Math.abs(sa(k) - sb(k)) >= 0.1 && <> <Pill tone="accent">{fmtPp(100 * (sa(k) - sb(k)))}</Pill></>}</span></div>
            <div className="mt-1 grid gap-0.5">
              <span className="block h-1.5 rounded-full bg-s1" style={{ width: `${sa(k) * 100}%` }} />
              <span className="block h-1.5 rounded-full bg-s2" style={{ width: `${sb(k) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
