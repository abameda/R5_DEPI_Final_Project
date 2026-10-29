import { BarChart, BoxplotChart, CustomChart, GraphChart, HeatmapChart, LineChart, MapChart, ScatterChart } from "echarts/charts";
import {
  AriaComponent, DataZoomComponent, GeoComponent, GridComponent, LegendComponent, MarkAreaComponent,
  MarkLineComponent, TooltipComponent, VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart, LineChart, HeatmapChart, ScatterChart, GraphChart, BoxplotChart, MapChart, CustomChart,
  GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, GeoComponent, MarkLineComponent,
  MarkAreaComponent, DataZoomComponent, AriaComponent, CanvasRenderer,
]);

export { echarts };

/**
 * Single-series data is the product blue, whatever it counts: one colour that
 * means "data" keeps every chart quiet. Sources and collections are slate so
 * provenance never reads as a finding. Teal and amber are NOT data hues: they
 * mean "you have it" and "gap". Index into Tokens.series.
 */
export const HUE = { posting: 0, skill: 0, source: 5, pay: 0, place: 0 } as const;

/** Categorical order for multi-series charts: blue, rose, cyan, violet, ochre. */
export const categorical = (t: Tokens) => [0, 1, 2, 3, 4].map((i) => t.series[i]);

/** Chart colours come from the CSS tokens so light/dark are each selected, not flipped. */
export interface Tokens {
  ink: string; ink2: string; ink3: string; line: string; lineStrong: string; panel: string; panel2: string;
  accent: string; accentInk: string; accentSoft: string; series: string[]; s1Soft: string; s3Soft: string; s4Soft: string;
  place0: string; crit: string; warn: string; good: string; goodFill: string; goodSoft: string; dark: boolean;
}

export function readTokens(): Tokens {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    ink: v("--ink"), ink2: v("--ink-2"), ink3: v("--ink-3"), line: v("--line"), lineStrong: v("--line-strong"),
    panel: v("--panel"), panel2: v("--panel-2"), accent: v("--accent"), accentInk: v("--accent-ink"),
    accentSoft: v("--accent-soft"), series: ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6"].map(v),
    s1Soft: v("--s1-soft"), s3Soft: v("--s3-soft"), s4Soft: v("--s4-soft"), place0: v("--place-0"), crit: v("--crit"),
    warn: v("--warn"), good: v("--good"), goodFill: v("--good-fill"), goodSoft: v("--good-soft"), dark: document.documentElement.dataset.theme === "dark",
  };
}

/** Shared chart chrome: recessive axes and grid, text in ink tokens, tooltip on panel. */
export function baseOption(t: Tokens) {
  return {
    animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
    animationDuration: 250,
    animationDurationUpdate: 250,
    textStyle: { fontFamily: "Geist Variable, Readex Pro Variable, Segoe UI, sans-serif", color: t.ink2, fontSize: 12 },
    // the container carries a written label and every panel has a table view;
    // ECharts' generated description would replace that label with raw numbers
    aria: { enabled: false },
    tooltip: {
      backgroundColor: t.panel, borderColor: t.lineStrong, borderWidth: 1, padding: [8, 10],
      textStyle: { color: t.ink, fontSize: 12 }, extraCssText: "box-shadow: var(--shadow); border-radius: 8px;",
      confine: true,
    },
  };
}

export function axisStyle(t: Tokens) {
  return {
    axisLine: { lineStyle: { color: t.lineStrong } },
    axisTick: { show: false },
    axisLabel: { color: t.ink3, fontSize: 11 },
    splitLine: { lineStyle: { color: t.line } },
    nameTextStyle: { color: t.ink3, fontSize: 11 },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Opt = Record<string, any>;
const SIDE: Record<string, string> = { left: "right", right: "left", insideLeft: "insideRight", insideRight: "insideLeft" };
const each = (x: unknown, fn: (o: Opt) => Opt) => (x == null ? x : Array.isArray(x) ? x.map(fn) : fn(x as Opt));
/** Swap a component's left/right offsets ("center" stays put). */
function flipBox(b: Opt): Opt {
  const out: Opt = { ...b };
  delete out.left;
  delete out.right;
  if (b.left === "center") out.left = "center";
  else if (b.left !== undefined) out.right = b.left;
  if (b.right !== undefined) out.left = b.right;
  return out;
}

/**
 * Right-to-left version of a chart option: horizontal axes run from the right,
 * vertical axes and category labels sit on the right, and left/right label
 * positions and corner radii swap. One rule for every chart, so builders stay
 * written left-to-right.
 */
export function mirror(o: Opt): Opt {
  const out: Opt = { ...o };
  for (const k of ["grid", "legend", "visualMap", "dataZoom"]) if (o[k]) out[k] = each(o[k], flipBox);
  out.xAxis = each(o.xAxis, (a) => ({ ...a, inverse: !a.inverse }));
  out.yAxis = each(o.yAxis, (a) => ({
    ...a, position: a.position === "right" ? "left" : "right",
    ...(a.axisLabel?.align && { axisLabel: { ...a.axisLabel, align: SIDE[a.axisLabel.align] ?? a.axisLabel.align } }),
  }));
  out.series = each(o.series, (s) => {
    const r = s.itemStyle?.borderRadius;
    return {
      ...s,
      ...(s.label?.position && { label: { ...s.label, position: SIDE[s.label.position] ?? s.label.position } }),
      ...(Array.isArray(r) && { itemStyle: { ...s.itemStyle, borderRadius: [r[1], r[0], r[3], r[2]] } }),
    };
  });
  if (o.xAxis === undefined) delete out.xAxis;
  if (o.yAxis === undefined) delete out.yAxis;
  return out;
}

/** Escape text before it goes into an HTML tooltip (data comes from job postings). */
export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
