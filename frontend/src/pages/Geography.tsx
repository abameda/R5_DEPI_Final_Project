import clsx from "clsx";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chart } from "../components/Chart";
import { HBar } from "../components/charts";
import { Kpi, KpiStrip } from "../components/Kpi";
import { Callout, ChartPanel, Guard, Loading, PageHeader, Panel, Pill, Segmented, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { axisStyle, baseOption, esc, HUE } from "../lib/echarts";
import { drillHref } from "../lib/filters";
import { fmtInt, fmtPct, fmtUsd, fmtUsdFull } from "../lib/format";
import { useFilters, useParam } from "../lib/hooks";
import type { CountryRow, Geo } from "../lib/types";
import { loadWorld, mapName } from "../lib/world";

type Metric = "n" | "remote" | "salary";

export default function Geography() {
  const { filters } = useFilters();
  const nav = useNavigate();
  const q = useApi<Geo>("/geo/countries", filters);
  const [metric, setMetric] = useParam("metric", "n") as [Metric, (v: string | null) => void];
  const [names, setNames] = useState<Set<string> | null>(null);
  useEffect(() => { loadWorld().then(setNames); }, []);
  const cross = useApi<{ rows: { key: string; n: number }[]; cols: string[]; cells: { row: string; col: string; n: number; share: number | null }[] }>(
    "/crosstab", filters, { row: "country", col: "role_category", rows: 15, cols: 8 });
  const toExplorer = (country: string) => nav(drillHref("/explorer", filters, { country }));

  return (
    <>
      <PageHeader title="Geography" description="Where the postings are, how remote-friendly each market is and what it advertises. Countries come from each posting's own location; nothing is geocoded beyond that." >
        <Segmented label="Map metric" value={metric} onChange={setMetric}
          options={[{ value: "n", label: "Postings" }, { value: "remote", label: "Remote share" }, { value: "salary", label: "Median advertised pay" }]} />
      </PageHeader>
      <Guard q={q} h={88} empty={(g) => !g.countries.length}>
        {(g) => (
          <KpiStrip>
            <Kpi label="Countries" value={fmtInt(g.countries.length)} sub={`${fmtInt(g.countries.filter((c) => c.small_sample).length)} with fewer than 30 postings`} />
            <Kpi label="With a country" value={fmtInt(g.located)} sub={`${fmtInt(g.no_country)} remote / unknown`} />
            <Kpi label="Top 3 countries" value={fmtPct(g.concentration.top3_share)} sub={g.countries.slice(0, 3).map((c) => c.country).join(", ")} />
            <Kpi label="Concentration (HHI)" value={g.concentration.hhi?.toFixed(3) ?? "—"} sub="1 = all in one country"
              title="Herfindahl–Hirschman index of country shares: sum of squared shares." />
            <Kpi label="Arab League countries" value={fmtInt(g.countries.filter((c) => c.region === "Arab").length)}
              sub={`${fmtInt(g.countries.filter((c) => c.region === "Arab").reduce((a, c) => a + c.n, 0))} postings`} />
            <Kpi label="Pay reported for" value={fmtInt(g.countries.filter((c) => c.salary_median != null).length)} sub="countries with ≥ 10 advertised salaries" />
          </KpiStrip>
        )}
      </Guard>

      <ChartPanel className="mt-4" title={metric === "n" ? "Postings by country" : metric === "remote" ? "Share of postings that are remote" : "Median advertised salary (USD/yr, approx.)"}
        meta={metric === "salary" ? "Countries with fewer than 10 advertised salaries are left blank" : "Countries with fewer than 30 postings are drawn with a hatched fill"}
        info="Country names are matched to Natural Earth boundaries (public domain). Very small territories may not be drawn on the map; the table below lists every country."
        table={q.data ? { columns: ["Country", "Postings", "Remote share", "Median advertised salary", "Salary n"], filename: "countries",
          rows: q.data.countries.map((c) => [c.country, c.n, fmtPct(c.remote / c.n), c.salary_median, c.salary_n]) } : undefined}>
        {(h) => !names || !q.data ? <Loading h={440} /> : (
          <WorldMap rows={q.data.countries} metric={metric} handle={h} onPick={toExplorer} />
        )}
      </ChartPanel>

      <Callout tone="info" title="Location corrections">
        About 21,000 rows of the team's merged file listed “Sudan” as their country. That field was the Kaggle search location, not the job's location;
        the pipeline rebuilds the country from each posting's own location text (most are in the United States, the rest are “Anywhere”).
        No posting in this dashboard is attributed to Sudan for that reason. Evidence is on the <TextLink to="/quality">methodology page</TextLink>.
      </Callout>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Country table" meta="Select a header to sort · select a country to open its postings">
          <Guard q={q} h={400}>{(g) => <CountryTable rows={g.countries} onPick={toExplorer} />}</Guard>
        </Panel>
        <ChartPanel title="Arab League countries" meta="Share of the Arab-region postings located in each member state"
          table={q.data ? { columns: ["Country", "Postings", "Remote", "Median salary"], filename: "arab-countries",
            rows: q.data.countries.filter((c) => c.region === "Arab").map((c) => [c.country, c.n, c.remote, c.salary_median]) } : undefined}>
          {(h) => <Guard q={q} h={360}>{(g) => { const arab = g.countries.filter((c) => c.region === "Arab"); const tot = arab.reduce((a, c) => a + c.n, 0); return <HBar handle={h} label="Postings in Arab League countries" color={HUE.place}
            data={arab.map((c) => ({ label: c.country, value: c.n, share: tot ? c.n / tot : null, note: c.small_sample ? "Small sample" : undefined }))}
            onSelect={toExplorer} />; }}</Guard>}
        </ChartPanel>
      </div>

      <ChartPanel className="mt-4" title="Role mix in the 15 largest countries" meta="Share of each country's postings in each role (rows sum to the roles shown, which cover most postings)"
        table={cross.data ? { columns: ["Country", "Role", "Postings", "Share of country"], filename: "country-role",
          rows: cross.data.cells.map((c) => [c.row, c.col, c.n, fmtPct(c.share)]) } : undefined}>
        {(h) => <Guard q={cross} h={420} empty={(d) => !d.rows.length}>{(d) => {
          const rows = d.rows.map((r) => r.key);
          const data = d.cells.map((c) => [d.cols.indexOf(c.col), rows.indexOf(c.row), c.share ?? 0, c.n]);
          const top = Math.max(0.01, ...data.map((x) => x[2] as number));
          return (
            <Chart label="Role mix by country" handleRef={h} height={Math.max(300, rows.length * 28 + 90)} deps={[d]}
              onClick={(p) => { const [x, y] = p.value as number[]; nav(drillHref("/explorer", filters, { country: rows[y], role: d.cols[x] })); }}
              build={(t) => ({
                ...baseOption(t),
                grid: { left: 8, right: 8, top: 8, bottom: 56, containLabel: true },
                xAxis: { type: "category", data: d.cols, position: "top", ...axisStyle(t), axisLabel: { color: t.ink2, fontSize: 11, interval: 0, width: 90, overflow: "break" } },
                yAxis: { type: "category", data: rows, inverse: true, ...axisStyle(t), axisLabel: { color: t.ink2, fontSize: 12 } },
                visualMap: { dimension: 2, min: 0, max: top, text: [fmtPct(top, 0), "0%"], orient: "horizontal", left: "center", bottom: 0, itemHeight: 160,
                  inRange: { color: [t.panel2, t.series[0]] }, textStyle: { color: t.ink2, fontSize: 11 }, formatter: (v: number) => fmtPct(v, 0) },
                tooltip: { ...baseOption(t).tooltip, formatter: (p: { value: number[] }) =>
                  `<b>${esc(rows[p.value[1]])}</b> · ${esc(d.cols[p.value[0]])}<br/>${fmtPct(p.value[2])} of the country's postings (${fmtInt(p.value[3])})` },
                series: [{ type: "heatmap", data: data.map((v) => ({ value: v, label: { color: (v[2] as number) > top * 0.55 ? "#ffffff" : t.ink } })),
                  label: { show: true, fontSize: 10, formatter: (p: { value: number[] }) => (p.value[2] >= 0.01 ? fmtPct(p.value[2], 0) : "") },
                  itemStyle: { borderColor: t.panel, borderWidth: 2, borderRadius: 2 } }],
              })} />
          );
        }}</Guard>}
      </ChartPanel>
    </>
  );
}

function WorldMap({ rows, metric, handle, onPick }: { rows: CountryRow[]; metric: Metric; handle: React.MutableRefObject<import("../components/Chart").ChartHandle | null>; onPick: (c: string) => void }) {
  const byMap = useMemo(() => new Map(rows.map((r) => [mapName(r.country), r])), [rows]);
  const val = (r: CountryRow) => (metric === "n" ? r.n : metric === "remote" ? r.remote / r.n : r.salary_median);
  const vals = rows.map(val).filter((v): v is number => v != null);
  return (
    <Chart label="World map of the selected metric" handleRef={handle} height={440} deps={[rows, metric]}
      onClick={(p) => { const r = byMap.get(p.name); if (r) onPick(r.country); }}
      build={(t) => ({
        ...baseOption(t),
        tooltip: { ...baseOption(t).tooltip, trigger: "item", formatter: (p: { name: string }) => {
          const r = byMap.get(p.name);
          if (!r) return `${esc(p.name)}<br/><span style="color:${t.ink3}">No postings in this selection</span>`;
          return `<b>${esc(r.country)}</b>${r.small_sample ? " <i>(small sample)</i>" : ""}<br/>${fmtInt(r.n)} postings · ${fmtPct(r.remote / r.n)} remote<br/>`
            + `Median advertised pay: ${r.salary_median != null ? `${fmtUsdFull(r.salary_median)} (n=${fmtInt(r.salary_n)})` : "too few salaries"}<br/>`
            + `Top role: ${esc(r.top_role)}<br/>Top skill: ${esc(r.top_skill)} (${fmtPct(r.top_skill_share)})`;
        } },
        visualMap: {
          min: metric === "n" ? 0 : Math.min(...vals), max: metric === "n" ? Math.log10(Math.max(...vals, 10)) : Math.max(...vals, 1),
          left: 8, bottom: 8, itemHeight: 120, calculable: false, text: metric === "n" ? ["more", "fewer (log scale)"] : undefined,
          inRange: { color: [t.lattice0, t.lattice1] },
          textStyle: { color: t.ink2, fontSize: 11 },
          formatter: (v: number) => (metric === "n" ? fmtInt(10 ** v) : metric === "remote" ? fmtPct(v, 0) : fmtUsd(v)),
        },
        series: [{
          type: "map", map: "world", roam: true, zoom: 1.15, center: [15, 25], nameProperty: "name",
          itemStyle: { areaColor: t.panel2, borderColor: t.lineStrong, borderWidth: 0.4 },
          emphasis: { label: { show: false }, itemStyle: { areaColor: t.accent } },
          select: { disabled: true },
          data: rows.map((r) => ({ name: mapName(r.country), value: metric === "n" ? Math.log10(Math.max(1, r.n)) : val(r),
            itemStyle: r.small_sample ? { decal: { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 4], rotation: -Math.PI / 4, color: t.lineStrong } } : undefined })),
        }],
      }) as Record<string, unknown>} />
  );
}

type SortKey = "country" | "n" | "remote" | "salary_median" | "employers";

function CountryTable({ rows, onPick }: { rows: CountryRow[]; onPick: (c: string) => void }) {
  const [sort, setSort] = useState<{ k: SortKey; desc: boolean }>({ k: "n", desc: true });
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const va = sort.k === "remote" ? a.remote / a.n : a[sort.k];
    const vb = sort.k === "remote" ? b.remote / b.n : b[sort.k];
    if (va == null) return 1;
    if (vb == null) return -1;
    const c = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return sort.desc ? -c : c;
  }), [rows, sort]);
  const H = ({ k, children, right }: { k: SortKey; children: string; right?: boolean }) => (
    <th scope="col" aria-sort={sort.k === k ? (sort.desc ? "descending" : "ascending") : "none"} className={clsx("px-2 py-2 font-medium", right && "text-right")}>
      <button type="button" onClick={() => setSort({ k, desc: sort.k === k ? !sort.desc : k !== "country" })} className="inline-flex items-center gap-1 hover:text-ink">
        {children}{sort.k === k && (sort.desc ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
      </button>
    </th>
  );
  return (
    <div className="max-h-[520px] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-panel text-left text-xs text-ink-3">
          <tr><H k="country">Country</H><H k="n" right>Postings</H><H k="remote" right>Remote</H><H k="employers" right>Employers</H>
            <H k="salary_median" right>Median pay</H><th scope="col" className="px-2 py-2 font-medium">Top skill</th></tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.country} className="border-t border-line hover:bg-panel-2">
              <td className="px-2 py-1.5"><button type="button" onClick={() => onPick(r.country)} className="text-left font-medium text-ink hover:underline">{r.country}</button>
                {r.small_sample && <Pill tone="warn" title="Fewer than 30 postings">small</Pill>}</td>
              <td className="tnum px-2 py-1.5 text-right">{fmtInt(r.n)}</td>
              <td className="tnum px-2 py-1.5 text-right text-ink-2">{fmtPct(r.remote / r.n, 0)}</td>
              <td className="tnum px-2 py-1.5 text-right text-ink-2">{fmtInt(r.employers)}</td>
              <td className="tnum px-2 py-1.5 text-right text-ink-2" title={r.salary_median != null ? `n = ${r.salary_n}` : "Fewer than 10 advertised salaries"}>{r.salary_median != null ? fmtUsd(r.salary_median) : "—"}</td>
              <td className="truncate px-2 py-1.5 text-ink-2">{r.top_skill ?? "—"} {r.top_skill_share != null && <span className="text-ink-3">{fmtPct(r.top_skill_share, 0)}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
