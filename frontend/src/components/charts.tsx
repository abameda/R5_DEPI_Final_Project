import { axisStyle, baseOption, categorical, esc, HUE, type Tokens } from "../lib/echarts";
import { fmtCompact, fmtInt, fmtMonth, fmtPct, fmtUsd } from "../lib/format";
import { t as tr, tv } from "../lib/i18n";
import { Chart, type ChartHandle } from "./Chart";
import type { SkillRow } from "../lib/types";

type Handle = React.MutableRefObject<ChartHandle | null>;
const trunc = (s: string, n = 26) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const rowHeight = 26;
const WRITTEN = () => tr("Written in posting", "مذكورة في الإعلان");
const ADDED = () => tr("Added by team", "أضافها الفريق");

/** `have` marks a bar the visitor already has (a skill in their profile): drawn teal. */
export interface BarDatum { label: string; value: number; share?: number | null; note?: string; muted?: boolean; have?: boolean }

/** Ranked horizontal bars, largest on top, value + share as direct labels. */
export function HBar({ data, handle, onSelect, label, valueFmt = fmtInt, color = 0, maxLabel = 26, by = "value" }: {
  data: BarDatum[]; handle?: Handle; onSelect?: (label: string) => void; label: string;
  valueFmt?: (n: number) => string; color?: number; maxLabel?: number;
  /** "share" sizes bars by the share (for comparing groups of different sizes). */
  by?: "value" | "share";
}) {
  const rows = [...data].reverse();
  return (
    <Chart label={label} handleRef={handle} height={Math.max(120, rows.length * rowHeight + 24)} deps={[data, color, by]}
      onClick={onSelect ? (p) => onSelect(rows[p.dataIndex].label) : undefined}
      build={(t: Tokens) => ({
        ...baseOption(t),
        grid: { left: 8, right: 92, top: 4, bottom: 4, containLabel: true },
        xAxis: { type: "value", show: false },
        yAxis: {
          type: "category", data: rows.map((r) => r.label), ...axisStyle(t), axisLine: { show: false },
          axisLabel: { color: t.ink2, fontSize: 12, formatter: (v: string) => trunc(tv(v), maxLabel) },
        },
        tooltip: {
          ...baseOption(t).tooltip, trigger: "item",
          formatter: (p: { dataIndex: number }) => {
            const r = rows[p.dataIndex];
            return `<b>${esc(tv(r.label))}</b><br/>${valueFmt(r.value)}${r.share != null ? ` · ${fmtPct(r.share)}` : ""}${r.note ? `<br/><span style="color:${t.ink3}">${esc(r.note)}</span>` : ""}${onSelect ? `<br/><span style="color:${t.accentInk}">${tr("Click to drill down", "انقر للتعمق")}</span>` : ""}`;
          },
        },
        series: [{
          type: "bar", barMaxWidth: 14, barCategoryGap: "40%",
          data: rows.map((r) => ({ value: by === "share" ? r.share ?? 0 : r.value, itemStyle: { color: r.have ? t.goodFill : r.muted ? t.lineStrong : t.series[color] } })),
          itemStyle: { borderRadius: [0, 4, 4, 0] },
          emphasis: { focus: "self" },
          blur: { itemStyle: { opacity: 0.45 } },
          label: {
            show: true, position: "right", color: t.ink2, fontSize: 11,
            formatter: (p: { dataIndex: number }) => {
              const r = rows[p.dataIndex];
              return r.share != null ? `${fmtPct(r.share)}  ${fmtCompact(r.value)}` : valueFmt(r.value);
            },
          },
        }],
      })} />
  );
}

/** Skill demand split into written-in-posting (solid) and team-added (hatched). */
export function SkillBars({ rows, denominator, handle, onSelect, observedOnly, have }: {
  rows: SkillRow[]; denominator: number; handle?: Handle; onSelect?: (skill: string) => void; observedOnly: boolean;
  /** Skills the visitor has are drawn teal. */
  have?: (skill: string) => boolean;
}) {
  const r = [...rows].reverse();
  return (
    <Chart label={tr(`Most requested skills, share of ${fmtInt(denominator)} postings with skills`, `المهارات الأكثر طلبًا، نسبةً إلى ${fmtInt(denominator)} إعلانًا فيها مهارات`)} handleRef={handle}
      height={Math.max(140, r.length * rowHeight + 40)} deps={[rows, observedOnly, have]}
      onClick={onSelect ? (p) => onSelect(r[p.dataIndex].skill) : undefined}
      build={(t) => ({
        ...baseOption(t),
        grid: { left: 8, right: 64, top: observedOnly ? 4 : 28, bottom: 4, containLabel: true },
        legend: observedOnly ? undefined : {
          top: 0, left: 0, itemWidth: 12, itemHeight: 10, textStyle: { color: t.ink2, fontSize: 11 },
          data: [WRITTEN(), ADDED()],
        },
        xAxis: { type: "value", show: false, max: Math.max(...r.map((x) => x.share ?? 0)) * 1.02 },
        yAxis: { type: "category", data: r.map((x) => x.skill), ...axisStyle(t), axisLine: { show: false }, axisLabel: { color: t.ink2, fontSize: 12 } },
        tooltip: {
          ...baseOption(t).tooltip, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: t.accentSoft, opacity: 0.4 } },
          formatter: (ps: { dataIndex: number }[]) => {
            const x = r[ps[0].dataIndex];
            return `<b>${esc(x.skill)}</b> <span style="color:${t.ink3}">${esc(tv(x.category))}</span><br/>`
              + tr(`${fmtPct(x.share)} of postings with skills (${fmtInt(x.postings)})<br/>`, `${fmtPct(x.share)} من الإعلانات التي فيها مهارات (${fmtInt(x.postings)})<br/>`)
              + (observedOnly ? "" : tr(`Written in posting: ${fmtInt(x.observed)} · added by team: ${fmtInt(x.added)}`, `مذكورة في الإعلان: ${fmtInt(x.observed)} · أضافها الفريق: ${fmtInt(x.added)}`))
              + (onSelect ? `<br/><span style="color:${t.accentInk}">${tr("Click for the skill profile", "انقر لعرض ملف المهارة")}</span>` : "");
          },
        },
        series: (() => {
          const endLabel = { show: true, position: "right", color: t.ink2, fontSize: 11,
            formatter: (p: { dataIndex: number }) => fmtPct(r[p.dataIndex].share) };
          const observed = {
            name: WRITTEN(), type: "bar", stack: "s", barMaxWidth: 16, barCategoryGap: "38%",
            data: r.map((x) => ({ value: x.observed / denominator, itemStyle: have?.(x.skill) ? { color: t.goodFill } : undefined })), emphasis: { focus: "series" },
            itemStyle: { color: t.series[HUE.skill], borderRadius: observedOnly ? [0, 4, 4, 0] : 0 },
            label: observedOnly ? endLabel : undefined,
          };
          if (observedOnly) return [observed];
          return [observed, {
            name: ADDED(), type: "bar", stack: "s", barMaxWidth: 16,
            data: r.map((x) => x.added / denominator), emphasis: { focus: "series" },
            itemStyle: { color: t.s1Soft, borderColor: t.series[HUE.skill], borderWidth: 1, borderRadius: [0, 4, 4, 0],
              decal: { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 3], rotation: -Math.PI / 4, color: t.series[HUE.skill] } },
            label: endLabel,
          }];
        })(),
      })} />
  );
}

/** Vertical bars for a distribution (e.g. salary histogram). */
export function Histogram({ bins, binWidth, cap, label, handle, color = HUE.pay }: {
  bins: { bin: number; n: number }[]; binWidth: number; cap: number; label: string; handle?: Handle; color?: number;
}) {
  const cats = bins.map((b) => (b.bin >= cap ? `${fmtUsd(cap)}+` : `${fmtUsd(b.bin)}`));
  return (
    <Chart label={label} handleRef={handle} height={240} deps={[bins, color]}
      build={(t) => ({
        ...baseOption(t),
        grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
        xAxis: { type: "category", data: cats, ...axisStyle(t), name: tr("Annual salary (USD, approx.)", "الراتب السنوي (بالدولار، تقريبي)"), nameLocation: "middle", nameGap: 26 },
        yAxis: { type: "value", ...axisStyle(t), splitNumber: 3 },
        tooltip: { ...baseOption(t).tooltip, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: t.accentSoft, opacity: 0.4 } },
          formatter: (ps: { dataIndex: number }[]) => {
            const b = bins[ps[0].dataIndex];
            const range = b.bin >= cap ? tr(`${fmtUsd(cap)} and above`, `${fmtUsd(cap)} فأكثر`) : `${fmtUsd(b.bin)} – ${fmtUsd(b.bin + binWidth)}`;
            return `<b>${range}</b><br/>${tr(`${fmtInt(b.n)} postings`, `${fmtInt(b.n)} إعلانًا`)}`;
          } },
        series: [{ type: "bar", data: bins.map((b) => b.n), barCategoryGap: "8%", itemStyle: { color: t.series[color], borderRadius: [3, 3, 0, 0] } }],
      })} />
  );
}

/**
 * The two collections as small multiples: each has its own chart and scale, so
 * nothing implies they are one continuous series. Months with fewer than `min`
 * postings are reported in text, not plotted.
 */
export function CohortMonths({ months, cohortLabel, handle, min = 30 }: {
  months: { cohort: string; month: string; n: number }[]; cohortLabel: (k: string) => string; handle?: Handle; min?: number;
}) {
  const parts = ["kaggle_2023", "collected_2026"].map((c) => {
    const all = months.filter((m) => m.cohort === c);
    return { c, shown: all.filter((m) => m.n >= min), hidden: all.filter((m) => m.n < min) };
  }).filter((p) => p.shown.length || p.hidden.length);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {parts.map((p, i) => (
        <div key={p.c} className="min-w-0">
          <p className="text-sm font-medium text-ink">{cohortLabel(p.c)}</p>
          {p.shown.length ? (
            <Chart label={tr(`Postings per month, ${cohortLabel(p.c)}`, `الإعلانات شهريًا، ${cohortLabel(p.c)}`)} handleRef={i === 0 ? handle : undefined} height={200} deps={[p.shown]}
              build={(t) => ({
                ...baseOption(t),
                grid: { left: 4, right: 12, top: 12, bottom: 4, containLabel: true },
                xAxis: { type: "category", data: p.shown.map((m) => m.month.slice(0, 7)), ...axisStyle(t),
                  axisLabel: { color: t.ink3, fontSize: 11, formatter: (v: string) => fmtMonth(v).replace(" 20", " ’") } },
                yAxis: { type: "value", ...axisStyle(t), splitNumber: 3, axisLabel: { color: t.ink3, fontSize: 11, formatter: (v: number) => fmtCompact(v) } },
                tooltip: { ...baseOption(t).tooltip, trigger: "axis", formatter: (ps: { dataIndex: number }[]) =>
                  `<b>${fmtMonth(p.shown[ps[0].dataIndex].month)}</b><br/>${tr(`${fmtInt(p.shown[ps[0].dataIndex].n)} postings`, `${fmtInt(p.shown[ps[0].dataIndex].n)} إعلانًا`)}` },
                series: [{ type: "bar", data: p.shown.map((m) => m.n), barMaxWidth: 22,
                  itemStyle: { color: i === 0 ? t.series[HUE.source] : t.panel2, borderColor: t.series[HUE.source], borderWidth: i === 0 ? 0 : 1, borderRadius: [3, 3, 0, 0] } }],
              })} />
          ) : <p className="py-6 text-sm text-ink-3">{tr(`No month reaches ${min} postings.`, `لا يبلغ أي شهر ${min} إعلانًا.`)}</p>}
          {p.hidden.length > 0 && (
            <p className="mt-1 text-xs text-ink-3">
              {tr(`Not plotted: ${fmtInt(p.hidden.reduce((a, m) => a + m.n, 0))} postings spread over ${p.hidden.length} months with fewer than ${min} each.`,
                `غير معروضة: ${fmtInt(p.hidden.reduce((a, m) => a + m.n, 0))} إعلانًا موزعة على ${p.hidden.length} أشهر، في كلٍّ منها أقل من ${min}.`)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export interface LineSeries { name: string; points: { x: string; y: number | null; n?: number; dashed?: boolean }[] }

/** Monthly lines; points below the reliability threshold are drawn hollow and noted in the tooltip. */
export function MonthLines({ series, label, handle, yFmt = fmtInt, yName, height = 260, markArea }: {
  series: LineSeries[]; label: string; handle?: Handle; yFmt?: (n: number) => string; yName: string; height?: number;
  markArea?: { from: string; to: string; label: string };
}) {
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  return (
    <Chart label={label} handleRef={handle} height={height} deps={[series, markArea]}
      build={(t) => ({
        ...baseOption(t),
        color: categorical(t),
        grid: { left: 8, right: 24, top: series.length > 1 ? 34 : 16, bottom: 8, containLabel: true },
        legend: series.length > 1 ? { top: 0, left: 0, itemWidth: 14, itemHeight: 3, textStyle: { color: t.ink2, fontSize: 11 } } : undefined,
        xAxis: { type: "category", data: xs, boundaryGap: false, ...axisStyle(t), axisLabel: { color: t.ink3, fontSize: 11, formatter: (v: string) => fmtMonth(v) } },
        yAxis: { type: "value", ...axisStyle(t), name: yName, splitNumber: 4, axisLabel: { color: t.ink3, fontSize: 11, formatter: (v: number) => yFmt(v) } },
        tooltip: {
          ...baseOption(t).tooltip, trigger: "axis",
          axisPointer: { type: "line", lineStyle: { color: t.lineStrong } },
          formatter: (ps: { seriesIndex: number; dataIndex: number; color: string }[]) => {
            const x = xs[ps[0].dataIndex];
            return `<b>${fmtMonth(x)}</b><br/>` + ps.map((p) => {
              const s = series[p.seriesIndex];
              const pt = s.points.find((q) => q.x === x);
              if (!pt || pt.y == null) return "";
              return `<span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${p.color};margin-inline-end:6px"></span>${esc(tv(s.name))}: <b>${yFmt(pt.y)}</b>${pt.n != null ? ` <span style="color:${t.ink3}">n=${fmtInt(pt.n)}</span>` : ""}`;
            }).join("<br/>");
          },
        },
        series: series.map((s, i) => ({
          name: tv(s.name), type: "line", smooth: false, showSymbol: true, symbolSize: 6,
          connectNulls: false, lineStyle: { width: 2 }, emphasis: { focus: "series" },
          data: xs.map((x) => s.points.find((p) => p.x === x)?.y ?? null),
          ...(i === 0 && markArea ? { markArea: { silent: true, itemStyle: { color: t.panel2 }, label: { color: t.ink3, fontSize: 11, position: "insideTop" },
            data: [[{ xAxis: markArea.from, name: markArea.label }, { xAxis: markArea.to }]] } } : {}),
        })),
      })} />
  );
}
