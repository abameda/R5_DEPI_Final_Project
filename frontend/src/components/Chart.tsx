import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "../lib/hooks";
import { echarts, readTokens, type Tokens } from "../lib/echarts";

type Handler = (p: { name: string; seriesName?: string; data?: unknown; dataIndex: number; value?: unknown }) => void;

export interface ChartHandle { png: () => string | undefined }

/**
 * Thin ECharts wrapper. `build` receives the current theme tokens so every
 * chart is re-themed (not flipped) when the theme changes.
 */
export function Chart({ build, height = 280, onClick, label, handleRef, deps }: {
  build: (t: Tokens) => Record<string, unknown>;
  height?: number;
  onClick?: Handler;
  label: string;
  handleRef?: React.MutableRefObject<ChartHandle | null>;
  deps: unknown[];
}) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const [theme] = useTheme();
  const clickRef = useRef(onClick);
  clickRef.current = onClick;

  useEffect(() => {
    if (!el.current) return;
    const c = echarts.init(el.current, undefined, { renderer: "canvas" });
    chart.current = c;
    c.on("click", (p) => clickRef.current?.(p as Parameters<Handler>[0]));
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current);
    if (handleRef) handleRef.current = { png: () => c.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: readTokens().panel }) };
    return () => { ro.disconnect(); c.dispose(); chart.current = null; };
  }, [handleRef]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const option = useMemo(() => build(readTokens()), [...deps, theme]);

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true });
    // Label widths are measured with the web font; re-lay out once it has loaded.
    let live = true;
    document.fonts?.ready.then(() => { if (live) chart.current?.setOption(option, { notMerge: true }); });
    return () => { live = false; };
  }, [option]);

  return <div ref={el} role="img" aria-label={label} style={{ height, width: "100%" }} />;
}
