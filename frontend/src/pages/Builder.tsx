import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Chart } from "../components/Chart";
import { Button, Callout, ChartPanel, Guard, PageHeader, Panel, Select } from "../components/ui";
import { apiGet, usePost } from "../lib/api";
import { axisStyle, baseOption, esc } from "../lib/echarts";
import { filterBody } from "../lib/filters";
import { fmtInt, fmtPct, fmtUsdFull } from "../lib/format";
import { useFilters, useLabels, useParam } from "../lib/hooks";

interface Options { dimensions: { key: string; label: string; skill_level: boolean }[]; metrics: { key: string; label: string; skill_level: boolean }[] }
interface Result {
  dimension: string; split_by: string | null; metric: string; metric_label: string; dimension_label: string; split_label: string | null;
  rows: { d0: string; d1?: string; value: number | null; postings: number; salary_n: number; small_sample: boolean }[];
  warnings: string[]; hidden_small_salary_groups: number; filters: Record<string, unknown>;
}

export default function Builder() {
  const { filters } = useFilters();
  const labels = useLabels();
  const opts = useQuery<Options>({ queryKey: ["builder-options"], queryFn: () => apiGet<Options>("/builder/options"), staleTime: Infinity });
  const [dimension, setDimension] = useParam("dimension", "role_category");
  const [split, setSplit] = useParam("split", "");
  const [metric, setMetric] = useParam("metric", "postings");
  const [limit, setLimit] = useParam("limit", "15");
  const [view, setView] = useParam("chart", "bar");
  const skillDim = (k: string) => opts.data?.dimensions.find((d) => d.key === k)?.skill_level ?? false;
  const metricOk = (m: string) => !(skillDim(dimension) || (split && skillDim(split))) || (opts.data?.metrics.find((x) => x.key === m)?.skill_level ?? true);
  const splitOk = (k: string) => k !== dimension && !(skillDim(k) && skillDim(dimension));
  const body = { dimension, split_by: split || null, metric, limit: +limit, sort: "metric_desc", filters: filterBody(filters) };
  const valid = metricOk(metric) && (!split || splitOk(split));
  const q = usePost<Result>("/builder", body, valid && !!opts.data);
  const fmt = (v: number | null) => v == null ? "—" : metric === "median_salary" ? fmtUsdFull(v) : ["share", "salary_coverage", "remote_share"].includes(metric) ? fmtPct(v) : metric === "avg_skills" ? v.toFixed(1) : fmtInt(v);
  const name = (dim: string, v: string) => (dim === "cohort" ? labels.cohort(v) : dim === "source_dataset" ? labels.source(v) : v);

  const downloadCsv = async () => {
    const res = await fetch("/api/builder.csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await res.blob());
    a.download = `jmi_${dimension}_${metric}.csv`;
    a.click();
  };

  return (
    <>
      <PageHeader title="Insight builder" description="Build your own aggregate view from the posting data: choose what to group by, an optional split and a measure. Combinations that would mislead are not offered." />
      <Panel title="Build a view">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Group by" value={dimension} onChange={(v) => { setDimension(v); if (split === v) setSplit(null); }}
            options={(opts.data?.dimensions ?? []).map((d) => ({ value: d.key, label: d.label }))} />
          <label className="inline-flex items-center gap-2 text-sm text-ink-2"><span>Split by</span>
            <select value={split} onChange={(e) => setSplit(e.target.value || null)} className="h-8 rounded-md border border-line-strong bg-panel px-2 text-sm text-ink">
              <option value="">None</option>
              {(opts.data?.dimensions ?? []).map((d) => <option key={d.key} value={d.key} disabled={!splitOk(d.key)}>{d.label}{!splitOk(d.key) ? " (not combinable)" : ""}</option>)}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-ink-2"><span>Measure</span>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className="h-8 rounded-md border border-line-strong bg-panel px-2 text-sm text-ink">
              {(opts.data?.metrics ?? []).map((m) => <option key={m.key} value={m.key} disabled={!metricOk(m.key)}>{m.label}{!metricOk(m.key) ? " (posting-level only)" : ""}</option>)}
            </select>
          </label>
          <Select label="Show top" value={limit} onChange={setLimit} options={["10", "15", "25", "50"].map((x) => ({ value: x, label: x }))} />
          <Select label="Chart" value={view} onChange={setView} options={[{ value: "bar", label: "Bars" }, { value: "line", label: "Line (time only)" }, { value: "table", label: "Table" }]} />
          <Button onClick={downloadCsv} disabled={!valid}><Download size={14} /> CSV</Button>
        </div>
        {!valid && <p className="mt-3 text-sm text-crit">This measure is defined per posting and cannot be split by skill. Choose another measure.</p>}
        <p className="mt-3 text-xs text-ink-3">Uses the filters in the bar above. CSV exports contain aggregates only, never raw postings.</p>
      </Panel>
      <Guard q={q} h={420} empty={(r) => !r.rows.length}>
        {(r) => (<>
          {r.warnings.length > 0 && <div className="mt-4 grid gap-2">{r.warnings.map((w) => <Callout key={w} tone="warn">{w}</Callout>)}</div>}
          {view !== "table" && (
            <ChartPanel className="mt-4" title={`${r.metric_label} by ${r.dimension_label.toLowerCase()}${r.split_label ? ` and ${r.split_label.toLowerCase()}` : ""}`}
              meta={`${r.rows.length} cells · groups under 30 postings are marked${r.hidden_small_salary_groups ? ` · ${r.hidden_small_salary_groups} groups hidden (< 10 salaries)` : ""}`}>
              {(h) => <BuilderChart r={r} handle={h} fmt={fmt} name={name}
                line={view === "line" && ["posted_month", "posted_year"].includes(r.dimension)} />}
            </ChartPanel>
          )}
          <Panel className="mt-4" title="Values">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-panel text-left text-xs text-ink-3"><tr>
                  <th scope="col" className="py-1.5 font-medium">{r.dimension_label}</th>
                  {r.split_by && <th scope="col" className="py-1.5 font-medium">{r.split_label}</th>}
                  <th scope="col" className="py-1.5 text-right font-medium">{r.metric_label}</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Postings (n)</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Advertised salaries (n)</th>
                </tr></thead>
                <tbody>{r.rows.map((x, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1.5" dir="auto">{name(r.dimension, x.d0)}{x.small_sample && <span className="text-xs text-warn"> · small</span>}</td>
                    {r.split_by && <td className="py-1.5 text-ink-2" dir="auto">{name(r.split_by, x.d1 ?? "")}</td>}
                    <td className="tnum py-1.5 text-right">{fmt(x.value)}</td>
                    <td className="tnum py-1.5 text-right text-ink-2">{fmtInt(x.postings)}</td>
                    <td className="tnum py-1.5 text-right text-ink-3">{fmtInt(x.salary_n)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Panel>
        </>)}
      </Guard>
    </>
  );
}

function BuilderChart({ r, handle, line, fmt, name }: { r: Result; handle: React.MutableRefObject<import("../components/Chart").ChartHandle | null>; line: boolean;
  fmt: (v: number | null) => string; name: (dim: string, v: string) => string }) {
  const cats = [...new Set(r.rows.map((x) => x.d0))];
  const splits = r.split_by ? [...new Set(r.rows.map((x) => x.d1 ?? ""))] : [""];
  const val = (c: string, s: string) => r.rows.find((x) => x.d0 === c && (x.d1 ?? "") === s)?.value ?? null;
  const horizontal = !line;
  const shown = horizontal ? [...cats].reverse() : cats;
  return (
    <Chart label={`${r.metric_label} by ${r.dimension_label}`} handleRef={handle} deps={[r, line]}
      height={horizontal ? Math.max(220, shown.length * (r.split_by ? 14 * splits.length + 10 : 26) + 50) : 320}
      build={(t) => {
        const catAxis = { type: "category", data: shown.map((c) => name(r.dimension, c)), ...axisStyle(t), axisLabel: { color: t.ink2, fontSize: 11, formatter: (v: string) => (v.length > 28 ? `${v.slice(0, 27)}…` : v) } };
        const valAxis = { type: "value", ...axisStyle(t), axisLabel: { color: t.ink3, fontSize: 11, formatter: (v: number) => fmt(v) } };
        return {
          ...baseOption(t),
          color: t.series,
          grid: { left: 8, right: 60, top: splits.length > 1 ? 34 : 10, bottom: 8, containLabel: true },
          legend: splits.length > 1 ? { top: 0, left: 0, textStyle: { color: t.ink2, fontSize: 11 }, itemWidth: 12, itemHeight: 10 } : undefined,
          xAxis: horizontal ? valAxis : catAxis,
          yAxis: horizontal ? catAxis : valAxis,
          tooltip: { ...baseOption(t).tooltip, trigger: "axis", formatter: (ps: { seriesName: string; dataIndex: number; value: number | null; color: string }[]) =>
            `<b>${esc(name(r.dimension, shown[ps[0].dataIndex]))}</b><br/>` + ps.map((p) => `${splits.length > 1 ? `${esc(p.seriesName)}: ` : ""}<b>${fmt(p.value)}</b>`).join("<br/>") },
          series: splits.slice(0, 8).map((s) => ({
            name: r.split_by ? name(r.split_by, s) : r.metric_label, type: line ? "line" : "bar",
            barMaxWidth: 14, emphasis: { focus: "series" }, showSymbol: true,
            itemStyle: horizontal ? { borderRadius: [0, 3, 3, 0] } : undefined,
            label: splits.length === 1 && horizontal ? { show: true, position: "right", color: t.ink2, fontSize: 11, formatter: (p: { value: number | null }) => fmt(p.value) } : undefined,
            data: shown.map((c) => val(c, s)),
          })),
        };
      }} />
  );
}
