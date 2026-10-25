import { Chart } from "../components/Chart";
import { HBar, Histogram } from "../components/charts";
import { Kpi, KpiStrip } from "../components/Kpi";
import { Callout, ChartPanel, Empty, Guard, PageHeader, Segmented, Select } from "../components/ui";
import { useApi } from "../lib/api";
import { axisStyle, baseOption, esc, HUE } from "../lib/echarts";
import { fmtInt, fmtPct, fmtUsd, fmtUsdFull } from "../lib/format";
import { useFilters, useLabels, useParam } from "../lib/hooks";
import type { SalarySummary } from "../lib/types";

const DIMS = [
  { value: "role_category", label: "Role" }, { value: "country", label: "Country" }, { value: "seniority", label: "Seniority" },
  { value: "job_type", label: "Employment type" }, { value: "work_mode", label: "Work mode" }, { value: "market_type", label: "Market" },
  { value: "skill", label: "Skill (top 20)" }, { value: "company", label: "Employer" }, { value: "source_dataset", label: "Data source" },
];

interface Coverage {
  postings: number; advertised: number; benchmark: number; advertised_unusable: number; benchmark_unusable: number;
  advertised_share: number | null; currencies: { kind: string; currency: string; n: number }[];
  periods: { kind: string; period: string; n: number }[];
  by_source: { source: string; postings: number; advertised: number; benchmark: number }[];
}

export default function Salary() {
  const { filters } = useFilters();
  const labels = useLabels();
  const [kind, setKind] = useParam("kind", "advertised");
  const [dim, setDim] = useParam("dim", "role_category");
  const [period, setPeriod] = useParam("period", "");
  const periodParam = period ? [period] : undefined;
  const cov = useApi<Coverage>("/salary/coverage", filters);
  const sum = useApi<SalarySummary>("/salary/summary", filters, { dim, kind, period: periodParam, limit: 20 });
  const hist = useApi<{ bins: { bin: number; n: number }[]; bin_width: number; cap: number }>("/salary/histogram", filters, { kind, period: periodParam });
  const bench = kind === "benchmark";
  const dimLabel = DIMS.find((d) => d.value === dim)?.label ?? dim;
  const name = (k: string) => (dim === "source_dataset" ? labels.source(k) : k);

  return (
    <>
      <PageHeader title="Salary lab" description="What postings actually advertise, by role, place, seniority and skill. Benchmarks the team attached are a separate view and are never mixed in.">
        <Segmented label="Salary type" value={kind} onChange={setKind} options={[{ value: "advertised", label: "Advertised pay" }, { value: "benchmark", label: "Market benchmarks" }]} />
        <Select label="Stated per" value={period} onChange={(v) => setPeriod(v || null)}
          options={[{ value: "", label: "Any period" }, { value: "year", label: "Year" }, { value: "month", label: "Month" }, { value: "hour", label: "Hour" }]} />
      </PageHeader>

      {bench ? (
        <Callout tone="warn" title="You are viewing market benchmarks, not job-posting salaries">
          For postings without pay information the team attached a market figure for the job title and country (Paylab, Indeed, US BLS).
          They describe the market for that title in general, not what these employers offered. Use them for context only.
        </Callout>
      ) : (
        <Callout tone="info" title="How amounts are made comparable">
          The midpoint of the advertised range is annualized (hourly × 2080, daily × 260, weekly × 52, monthly × 12) and converted to USD at
          fixed approximate exchange rates — good for orders of magnitude, not exact historical values. Values outside $500–$1,000,000 per year are treated as parsing errors.
          Hourly 2023 Kaggle pay is a large share; use “Stated per: Year” to compare only salaries quoted annually.
        </Callout>
      )}

      <Guard q={cov} h={88}>
        {(c) => (
          <div className="mt-4"><KpiStrip>
            <Kpi label="Postings in selection" value={fmtInt(c.postings)} />
            <Kpi label="Advertise a salary" value={fmtInt(c.advertised)} sub={`${fmtPct(c.advertised_share)} of postings`} />
            <Kpi label="Benchmark attached" value={fmtInt(c.benchmark)} sub="kept apart" />
            <Kpi label="Unusable values" value={fmtInt(c.advertised_unusable + c.benchmark_unusable)} sub="unknown currency or out of range" />
            <Kpi label={`Median (${bench ? "benchmark" : "advertised"})`} value={sum.data?.overall.median != null && sum.data.overall.confidence !== "insufficient" ? fmtUsdFull(sum.data.overall.median) : "—"}
              sub={sum.data ? `n = ${fmtInt(sum.data.overall.n)} · USD per year` : undefined} />
            <Kpi label="Middle half (P25–P75)" value={sum.data?.overall.p25 != null && sum.data.overall.confidence !== "insufficient" ? `${fmtUsd(sum.data.overall.p25)}–${fmtUsd(sum.data.overall.p75)}` : "—"}
              sub={sum.data && sum.data.overall.currencies > 1 ? `from ${sum.data.overall.currencies} currencies` : "single currency"} />
          </KpiStrip></div>
        )}
      </Guard>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ChartPanel title={`${bench ? "Benchmark" : "Advertised"} salary by ${dimLabel.toLowerCase()}`}
          meta={sum.data ? `Box = middle half (P25–P75), line = median, whiskers = P10–P90. Groups need ≥ ${sum.data.min_n} salaries${sum.data.groups_hidden_small_n ? `; ${sum.data.groups_hidden_small_n} smaller groups hidden` : ""}.` : undefined}
          extraActions={<Select label="Group by" value={dim} onChange={setDim} options={DIMS} />}
          table={sum.data ? { columns: [dimLabel, "n", "P10", "P25", "Median", "P75", "P90", "Confidence"], filename: `salary-by-${dim}`,
            rows: sum.data.groups.map((g) => [name(g.key ?? ""), g.n, g.p10, g.p25, g.median, g.p75, g.p90, g.confidence]) } : undefined}>
          {(h) => <Guard q={sum} h={420} empty={(s) => !s.groups.length}>{(s) => {
            const g = [...s.groups].reverse();
            return (
              <Chart label={`Salary distribution by ${dimLabel}`} handleRef={h} height={Math.max(220, g.length * 30 + 50)} deps={[s, dim]}
                build={(t) => ({
                  ...baseOption(t),
                  grid: { left: 8, right: 70, top: 8, bottom: 28, containLabel: true },
                  xAxis: { type: "value", ...axisStyle(t), axisLabel: { color: t.ink3, fontSize: 11, formatter: (v: number) => fmtUsd(v) } },
                  yAxis: { type: "category", data: g.map((x) => name(x.key ?? "")), ...axisStyle(t), axisLine: { show: false },
                    axisLabel: { color: t.ink2, fontSize: 12, formatter: (v: string) => (v.length > 26 ? `${v.slice(0, 25)}…` : v) } },
                  tooltip: { ...baseOption(t).tooltip, trigger: "item", formatter: (p: { dataIndex: number }) => {
                    const x = g[p.dataIndex];
                    return `<b>${esc(name(x.key ?? ""))}</b> · n = ${fmtInt(x.n)}${x.confidence === "low" ? " <i>(small sample)</i>" : ""}<br/>`
                      + `Median ${fmtUsdFull(x.median)}<br/>P25–P75 ${fmtUsd(x.p25)}–${fmtUsd(x.p75)}<br/>P10–P90 ${fmtUsd(x.p10)}–${fmtUsd(x.p90)}`;
                  } },
                  series: [{
                    type: "boxplot", boxWidth: [8, 16],
                    data: g.map((x) => ({ value: [x.p10, x.p25, x.median, x.p75, x.p90],
                      itemStyle: x.confidence === "low"
                        ? { color: t.panel, borderColor: t.series[bench ? HUE.source : HUE.pay], borderType: "dashed", borderWidth: 1.5 }
                        : { color: t.accentSoft, borderColor: t.series[bench ? HUE.source : HUE.pay], borderWidth: 1.5 } })),
                  }, {
                    type: "scatter", symbolSize: 0, data: g.map((x) => [x.p90, g.indexOf(x)]),
                    label: { show: true, position: "right", color: t.ink3, fontSize: 11, formatter: (p: { dataIndex: number }) => `n=${fmtInt(g[p.dataIndex].n)}` },
                    silent: true, tooltip: { show: false },
                  }],
                })} />
            );
          }}</Guard>}
        </ChartPanel>

        <div className="grid gap-4">
          <ChartPanel title="Distribution" meta={`${bench ? "Benchmark" : "Advertised"} annual salary, USD (approx.)`}
            table={hist.data ? { columns: ["From (USD/yr)", "Postings"], filename: "salary-distribution", rows: hist.data.bins.map((b) => [b.bin, b.n]) } : undefined}>
            {(h) => <Guard q={hist} h={240} empty={(d) => !d.bins.length}>{(d) => <Histogram handle={h} label="Salary distribution" bins={d.bins} binWidth={d.bin_width} cap={d.cap} color={bench ? HUE.source : HUE.pay} />}</Guard>}
          </ChartPanel>
          <ChartPanel title="Original currencies" meta="Before conversion to USD" table={cov.data ? { columns: ["Currency", "Postings"], filename: "salary-currencies",
            rows: cov.data.currencies.filter((c) => c.kind === kind).map((c) => [c.currency, c.n]) } : undefined}>
            {(h) => <Guard q={cov} h={200}>{(c) => {
              const rows = c.currencies.filter((x) => x.kind === kind);
              const tot = rows.reduce((a, r) => a + r.n, 0);
              return rows.length ? <HBar handle={h} label="Salaries by original currency" color={bench ? HUE.source : HUE.pay}
                data={rows.slice(0, 10).map((r) => ({ label: r.currency, value: r.n, share: r.n / tot }))} /> : <Empty title="No salaries" hint="No postings in this selection carry this kind of salary." />;
            }}</Guard>}
          </ChartPanel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Salary coverage by source" meta="Share of each source's postings with an advertised salary"
          table={cov.data ? { columns: ["Source", "Postings", "Advertised", "Benchmark"], filename: "salary-coverage",
            rows: cov.data.by_source.map((s) => [labels.source(s.source), s.postings, s.advertised, s.benchmark]) } : undefined}>
          {(h) => <Guard q={cov} h={240}>{(c) => <HBar handle={h} by="share" label="Advertised salary coverage by source" color={HUE.source} maxLabel={34}
            data={c.by_source.map((s) => ({ label: labels.source(s.source), value: s.advertised, share: s.postings ? s.advertised / s.postings : 0, note: `${fmtInt(s.postings)} postings · ${fmtInt(s.benchmark)} benchmarks` }))} />}</Guard>}
        </ChartPanel>
        <ChartPanel title="How salaries were stated" meta="Pay period in the original posting"
          table={cov.data ? { columns: ["Period", "Postings"], filename: "salary-periods", rows: cov.data.periods.filter((p) => p.kind === kind).map((p) => [p.period, p.n]) } : undefined}>
          {(h) => <Guard q={cov} h={200}>{(c) => {
            const rows = c.periods.filter((x) => x.kind === kind);
            const tot = rows.reduce((a, r) => a + r.n, 0);
            return <HBar handle={h} label="Salaries by stated period" color={HUE.pay} data={rows.map((r) => ({ label: `per ${r.period}`, value: r.n, share: r.n / tot }))} />;
          }}</Guard>}
        </ChartPanel>
      </div>
    </>
  );
}
