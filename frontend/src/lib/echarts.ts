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
 * One stained-glass hue per kind of thing, the same in every module:
 * posting attributes (role, seniority, employment) cobalt, skills turquoise,
 * places (country, market, work mode) emerald, pay ruby, data sources and
 * collections violet. Amber is NOT a data hue: it is reserved for selection,
 * focus and the lattice's light. Index into Tokens.series.
 */
export const HUE = { posting: 0, skill: 2, source: 3, pay: 4, place: 5 } as const;

/** Categorical order for multi-series charts, amber excluded; validated for CVD
 * separation (adjacent pairs, and the first three all-pairs) in both themes. */
export const categorical = (t: Tokens) => [0, 2, 4, 3, 5].map((i) => t.series[i]);

/** Chart colours come from the CSS tokens so light/dark are each selected, not flipped. */
export interface Tokens {
  ink: string; ink2: string; ink3: string; line: string; lineStrong: string; panel: string; panel2: string;
  accent: string; accentInk: string; accentSoft: string; series: string[]; s1Soft: string; s3Soft: string; s4Soft: string;
  lattice0: string; lattice1: string; crit: string; warn: string; good: string; dark: boolean;
}

export function readTokens(): Tokens {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    ink: v("--ink"), ink2: v("--ink-2"), ink3: v("--ink-3"), line: v("--line"), lineStrong: v("--line-strong"),
    panel: v("--panel"), panel2: v("--panel-2"), accent: v("--accent"), accentInk: v("--accent-ink"),
    accentSoft: v("--accent-soft"), series: ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6"].map(v),
    s1Soft: v("--s1-soft"), s3Soft: v("--s3-soft"), s4Soft: v("--s4-soft"), lattice0: v("--lattice-0"), lattice1: v("--lattice-1"), crit: v("--crit"),
    warn: v("--warn"), good: v("--good"), dark: document.documentElement.dataset.theme === "dark",
  };
}

/** Shared chart chrome: recessive axes and grid, text in ink tokens, tooltip on panel. */
export function baseOption(t: Tokens) {
  return {
    animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
    animationDuration: 250,
    animationDurationUpdate: 250,
    textStyle: { fontFamily: "Readex Pro Variable, Segoe UI, sans-serif", color: t.ink2, fontSize: 12 },
    // the container carries a written label and every panel has a table view;
    // ECharts' generated description would replace that label with raw numbers
    aria: { enabled: false },
    tooltip: {
      backgroundColor: t.panel, borderColor: t.lineStrong, borderWidth: 1, padding: [8, 10],
      textStyle: { color: t.ink, fontSize: 12 }, extraCssText: "box-shadow: var(--shadow); border-radius: 6px;",
      confine: true,
    },
  };
}

export function axisStyle(t: Tokens) {
  return {
    axisLine: { lineStyle: { color: t.lineStrong } },
    axisTick: { show: false },
    axisLabel: { color: t.ink3, fontSize: 11 },
    splitLine: { lineStyle: { color: t.line, type: [3, 3] as number[] } },
    nameTextStyle: { color: t.ink3, fontSize: 11 },
  };
}

/** Escape text before it goes into an HTML tooltip (data comes from job postings). */
export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
