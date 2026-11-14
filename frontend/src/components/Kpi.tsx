import clsx from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { t } from "../lib/i18n";

/** One headline figure with its denominator. Flashes briefly when a filter change moves it. */
export function Kpi({ label, value, sub, title }: { label: string; value: string; sub?: ReactNode; title?: string }) {
  // The figure the visitor saw before their last filter edit; when the value
  // differs, a dot stays next to it (the flash is only an extra cue).
  const shown = useRef(value);
  const [changed, setChanged] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (shown.current !== value) {
      shown.current = value;
      setChanged(true);
      setTick((t) => t + 1);
    }
  }, [value]);
  return (
    <div className="min-w-0 px-5 py-4" title={title}>
      <dt className="flex items-center gap-1.5 text-xs text-ink-3">
        <span className="truncate">{label}</span>
        {changed && <span className="size-1.5 shrink-0 rounded-full bg-accent" title={t("Changed with your last filter edit", "تغيّر مع آخر تعديل في الفلاتر")}><span className="sr-only">{t(" (changed)", " (تغيّر)")}</span></span>}
      </dt>
      <dd className="m-0">
        <span key={tick} className={clsx("kpi mt-1 inline-block text-2xl font-semibold tracking-[-0.02em] text-ink", tick > 0 && "changed")}>{value}</span>
        {sub && <span className="mt-0.5 block text-xs leading-4 text-ink-3 [overflow-wrap:anywhere]">{sub}</span>}
      </dd>
    </div>
  );
}

export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <dl className="m-0 grid grid-cols-2 divide-line rounded-xl border border-line bg-panel sm:grid-cols-3 xl:grid-cols-6 [&>*]:border-line max-sm:[&>*:nth-child(n+3)]:border-t sm:max-xl:[&>*:nth-child(n+4)]:border-t xl:divide-x sm:max-xl:[&>*:not(:nth-child(3n+1))]:border-l max-sm:[&>*:nth-child(2n)]:border-l">
      {children}
    </dl>
  );
}
