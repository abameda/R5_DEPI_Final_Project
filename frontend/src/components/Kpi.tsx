import clsx from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** One headline figure with its denominator. Flashes briefly when a filter change moves it. */
export function Kpi({ label, value, sub, title }: { label: string; value: string; sub?: ReactNode; title?: string }) {
  const prev = useRef(value);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (prev.current !== value) { prev.current = value; setTick((t) => t + 1); }
  }, [value]);
  return (
    <div className="min-w-0 px-4 py-3" title={title}>
      <dt className="truncate text-xs text-ink-3">{label}</dt>
      <dd className="m-0">
        <span key={tick} className={clsx("kpi inline-block text-2xl font-semibold tracking-tight text-ink", tick > 0 && "changed")}>{value}</span>
        {sub && <span className="mt-0.5 block truncate text-xs text-ink-3">{sub}</span>}
      </dd>
    </div>
  );
}

export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <dl className="m-0 grid grid-cols-2 divide-line rounded-lg border border-line bg-panel sm:grid-cols-3 xl:grid-cols-6 [&>*]:border-line max-sm:[&>*:nth-child(n+3)]:border-t sm:max-xl:[&>*:nth-child(n+4)]:border-t xl:divide-x sm:max-xl:[&>*:not(:nth-child(3n+1))]:border-l max-sm:[&>*:nth-child(2n)]:border-l">
      {children}
    </dl>
  );
}
