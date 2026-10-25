import { useSearchParams } from "react-router-dom";
import { Chart } from "../components/Chart";
import { MonthLines } from "../components/charts";
import { Callout, ChartPanel, Guard, PageHeader, Panel, Select } from "../components/ui";
import { useApi } from "../lib/api";
import { axisStyle, baseOption, esc } from "../lib/echarts";
import { fmtInt, fmtPct, fmtPp } from "../lib/format";
import { useFilters, useLabels, useMeta } from "../lib/hooks";
import type { SkillTrend, TopSkills } from "../lib/types";

interface Trends {
  skills: string[]; skill_trend: SkillTrend; roles_2023: { month: string; role: string; n: number }[];
  half_year_2023: { skill: string; h1_share: number; h2_share: number; change_pp: number; h1_denominator: number; h2_denominator: number }[];
  snapshot: Record<string, TopSkills>; min_group: number;
}

export default function TrendsPage() {
  const { filters } = useFilters();
  const labels = useLabels();
  const { data: meta } = useMeta();
  const [sp, setSp] = useSearchParams();
  const series = sp.getAll("series");
  const q = useApi<Trends>("/trends", filters, { series });
  const pool = useApi<TopSkills>("/skills/top", filters, { limit: 40 });
  const setSeries = (next: string[]) => setSp((prev) => {
    const s = new URLSearchParams(prev);
    s.delete("series");
    next.slice(0, 6).forEach((x) => s.append("series", x));
    return s;
  }, { replace: true });

  return (
    <>
      <PageHeader title="Time & cohorts" description="How demand moves within each collection, and how the two collections differ. They are never joined into one time series." />
      <div className="grid gap-4 md:grid-cols-2">
        {["kaggle_2023", "collected_2026"].map((c) => (
          <div key={c} className="rounded-lg border border-line bg-panel p-4">
            <h2 className="text-base font-semibold">{labels.cohort(c)}</h2>
            <p className="mt-1 text-sm text-ink-2">{meta?.labels.cohort_notes[c]}</p>
            <p className="mt-2 text-sm text-ink-3">{fmtInt(meta?.dimensions.cohort.find((x) => x.value === c)?.n)} postings in the whole dataset</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Callout tone="warn" title="What this page will not show">
          Growth rates between 2023 and 2026, and forecasts. The two collections differ in sources, roles covered and collection method, and the 2024–26
          collection spans only a few months — a difference between them cannot be separated from those changes, and there is not enough history to validate a forecast.
        </Callout>
      </div>

      <Guard q={q} h={480}>
        {(t) => {
          const lines = t.skill_trend.series.map((s) => ({ name: s.skill,
            points: s.points.filter((p) => p.cohort === "kaggle_2023" && p.reliable).map((p) => ({ x: p.month.slice(0, 7), y: p.share, n: p.denominator })) }));
          const months2026 = t.skill_trend.months.filter((m) => m.cohort === "collected_2026");
          return (<>
            <ChartPanel className="mt-4" title={`Monthly skill share in the ${labels.cohort("kaggle_2023")}`}
              meta={`Share of each month's postings with skill data · months with fewer than ${t.min_group} such postings are left out`}
              extraActions={<Select label="Add skill" value="" onChange={(v) => v && setSeries([...(series.length ? series : t.skills), v])}
                options={[{ value: "", label: "Choose…" }, ...(pool.data?.rows ?? []).filter((r) => !t.skills.includes(r.skill)).map((r) => ({ value: r.skill, label: r.skill }))]} />}
              table={{ columns: ["Skill", "Month", "Share", "Postings with skills"], filename: "skill-trend-2023",
                rows: lines.flatMap((l) => l.points.map((p) => [l.name, p.x, fmtPct(p.y), p.n ?? null])) }}>
              {(h) => (<>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {t.skills.map((s) => (
                    <button key={s} type="button" onClick={() => setSeries(t.skills.filter((x) => x !== s))} aria-label={`Remove ${s} from the chart`}
                      className="rounded-md bg-panel-2 px-2 py-0.5 text-sm text-ink-2 ring-1 ring-line hover:text-ink">{s} ×</button>
                  ))}
                </div>
                {lines.some((l) => l.points.length) ? <MonthLines handle={h} label="Monthly share of postings listing each skill, 2023" series={lines} yName="" yFmt={(v) => fmtPct(v, 0)} height={300} />
                  : <p className="text-sm text-ink-3">No month of the 2023 archive has enough postings in this selection.</p>}
              </>)}
            </ChartPanel>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <ChartPanel title="Change within 2023: Jan–Jun vs Jul–Dec"
                meta={t.half_year_2023[0] ? `Top 30 skills · ${fmtInt(t.half_year_2023[0].h1_denominator)} vs ${fmtInt(t.half_year_2023[0].h2_denominator)} postings with skills` : "Not enough dated 2023 postings"}
                info="Same dataset, same collection method, so the comparison is like for like. Shares are of each half's postings that list skills; differences are in percentage points. Descriptive only, no forecast."
                table={{ columns: ["Skill", "Jan–Jun", "Jul–Dec", "Change (pp)"], filename: "half-year-2023",
                  rows: t.half_year_2023.map((r) => [r.skill, fmtPct(r.h1_share), fmtPct(r.h2_share), r.change_pp]) }}>
                {(h) => {
                  const r = [...t.half_year_2023].sort((a, b) => a.change_pp - b.change_pp);
                  return r.length ? (
                    <Chart label="Change in skill share between the two halves of 2023" handleRef={h} height={Math.max(240, r.length * 22 + 30)} deps={[r]}
                      build={(tk) => ({
                        ...baseOption(tk),
                        grid: { left: 8, right: 50, top: 8, bottom: 8, containLabel: true },
                        xAxis: { type: "value", ...axisStyle(tk), axisLabel: { color: tk.ink3, fontSize: 11, formatter: (v: number) => `${v > 0 ? "+" : ""}${v} pp` } },
                        yAxis: { type: "category", data: r.map((x) => x.skill), ...axisStyle(tk), axisLine: { show: false }, axisLabel: { color: tk.ink2, fontSize: 11 } },
                        tooltip: { ...baseOption(tk).tooltip, trigger: "item", formatter: (p: { dataIndex: number }) => {
                          const x = r[p.dataIndex];
                          return `<b>${esc(x.skill)}</b><br/>Jan–Jun ${fmtPct(x.h1_share)} → Jul–Dec ${fmtPct(x.h2_share)}<br/>${fmtPp(x.change_pp)}`;
                        } },
                        series: [{ type: "bar", barMaxWidth: 12, data: r.map((x) => ({ value: x.change_pp,
                          itemStyle: { color: x.change_pp >= 0 ? tk.series[0] : tk.series[4], borderRadius: x.change_pp >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3] } })),
                          label: { show: true, position: "right", color: tk.ink3, fontSize: 10, formatter: (p: { value: number }) => fmtPp(p.value) } }],
                      })} />
                  ) : <p className="text-sm text-ink-3">Not enough dated 2023 postings in this selection.</p>;
                }}
              </ChartPanel>
              <Panel title={`${labels.cohort("collected_2026")}: postings by month`} meta="Most were collected in September–October 2026; earlier dates are older adverts still online">
                {months2026.length ? (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-ink-3"><tr><th scope="col" className="py-1.5 font-medium">Month</th><th scope="col" className="py-1.5 text-right font-medium">Postings</th><th scope="col" className="py-1.5 text-right font-medium">Used for trends</th></tr></thead>
                    <tbody>
                      {months2026.slice(-10).reverse().map((m) => (
                        <tr key={m.month} className="border-t border-line">
                          <td className="py-1.5">{m.month.slice(0, 7)}</td>
                          <td className="tnum py-1.5 text-right">{fmtInt(m.postings)}</td>
                          <td className="py-1.5 text-right text-ink-3">{m.reliable ? "yes" : `no (< ${t.min_group})`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-sm text-ink-3">No dated postings from this collection in the selection.</p>}
              </Panel>
            </div>

            <Panel className="mt-4" title="Top skills in each collection, side by side" meta="Snapshots — the difference reflects period, sources and roles covered together">
              <div className="grid gap-6 md:grid-cols-2">
                {(["kaggle_2023", "collected_2026"] as const).map((c) => {
                  const s = t.snapshot[c];
                  return (
                    <div key={c}>
                      <h3 className="text-sm font-medium">{labels.cohort(c)} <span className="font-normal text-ink-3">· {fmtInt(s?.denominator)} postings with skills</span></h3>
                      {s && s.denominator >= t.min_group ? (
                        <ol className="mt-2 space-y-1">
                          {s.rows.map((r, i) => (
                            <li key={r.skill} className="flex items-center gap-2 text-sm">
                              <span className="tnum w-5 text-ink-3">{i + 1}</span>
                              <span className="w-32 truncate">{r.skill}</span>
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2"><span className="block h-full" style={{ width: `${(r.share ?? 0) * 100}%`, background: c === "kaggle_2023" ? "var(--s1)" : "var(--s3)" }} /></span>
                              <span className="tnum w-12 text-right text-ink-2">{fmtPct(r.share, 0)}</span>
                            </li>
                          ))}
                        </ol>
                      ) : <p className="mt-2 text-sm text-ink-3">Too few postings with skills in this selection.</p>}
                    </div>
                  );
                })}
              </div>
            </Panel>
          </>);
        }}
      </Guard>
    </>
  );
}
