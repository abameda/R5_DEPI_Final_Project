import clsx from "clsx";
import { useMemo, useRef, useState } from "react";
import { fmtInt, fmtPct } from "../lib/format";
import type { Matrix } from "../lib/types";

/**
 * The role x skill lattice. Each aperture's AREA is the share of the row's
 * postings (with skill data) that list the column's skill; brightness repeats
 * the same value so the reading never depends on colour alone.
 */
export function Lattice({ matrix, rowLabel, onSelect, caption, rowName = (k) => k }: {
  matrix: Matrix; rowLabel: string; onSelect?: (row: string, skill: string) => void; caption: string;
  rowName?: (key: string) => string;
}) {
  const { groups, skills } = matrix;
  const cell = useMemo(() => {
    const m = new Map<string, { n: number; share: number }>();
    for (const c of matrix.cells) m.set(`${c.key}\u0000${c.skill}`, { n: c.n, share: c.share ?? 0 });
    return (r: string, s: string) => m.get(`${r}\u0000${s}`) ?? { n: 0, share: 0 };
  }, [matrix]);
  const max = useMemo(() => Math.max(0.0001, ...matrix.cells.map((c) => c.share ?? 0)), [matrix]);
  const [active, setActive] = useState<[number, number] | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const focusCell = (r: number, c: number) => {
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${r}-${c}"]`);
    el?.focus();
  };
  const onKey = (e: React.KeyboardEvent, r: number, c: number) => {
    const moves: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
    const mv = moves[e.key];
    if (!mv) return;
    e.preventDefault();
    focusCell(Math.min(groups.length - 1, Math.max(0, r + mv[0])), Math.min(skills.length - 1, Math.max(0, c + mv[1])));
  };

  const readout = active ? (() => {
    const g = groups[active[0]];
    const s = skills[active[1]];
    const v = cell(g.key, s);
    return <><b className="text-ink">{s}</b> in <b className="text-ink">{rowName(g.key)}</b>: {fmtPct(v.share)} of {fmtInt(g.denominator)} postings with skill data ({fmtInt(v.n)}){g.small_sample && <> · <span className="text-warn">small group</span></>}{onSelect && <span className="text-ink-3"> · Enter or click to see these postings</span>}</>;
  })() : <span className="text-ink-3">Hover or tab into the lattice to read a cell. Larger, brighter openings = a larger share of the row’s postings.</span>;

  return (
    <figure className="m-0">
      <p className="mb-3 min-h-10 text-sm text-ink-2" aria-live="polite">{readout}</p>
      <div className="overflow-x-auto pb-1">
        <div ref={gridRef} role="grid" aria-label={caption} aria-rowcount={groups.length + 1} aria-colcount={skills.length + 1}
          className="grid w-max min-w-full" style={{ gridTemplateColumns: `minmax(118px, 210px) repeat(${skills.length}, minmax(34px, 46px))` }}
          onMouseLeave={() => setActive(null)}>
          <div role="row" className="contents">
            <div role="columnheader" className="sticky left-0 z-10 flex items-end bg-panel pb-2 pr-3 text-xs font-medium text-ink-3">{rowLabel} · n</div>
            {skills.map((s, c) => (
              <div role="columnheader" key={s} className="flex h-24 items-end justify-center pb-2">
                <span className={clsx("max-h-28 truncate text-xs [writing-mode:vertical-rl] rotate-180 transition-colors",
                  active?.[1] === c ? "font-semibold text-ink" : "text-ink-2")} title={s}>{s}</span>
              </div>
            ))}
          </div>
          {groups.map((g, r) => (
            <div role="row" key={g.key} className="contents">
              <div role="rowheader" className={clsx("sticky left-0 z-10 flex items-center justify-between gap-2 bg-panel pr-3 text-sm transition-colors",
                active?.[0] === r ? "font-medium text-ink" : "text-ink-2")}>
                <span className="truncate" title={rowName(g.key)} dir="auto">{rowName(g.key)}</span>
                <span className={clsx("tnum shrink-0 text-xs", g.small_sample ? "text-warn" : "text-ink-3")}
                  title={g.small_sample ? `Fewer than ${matrix.min_group} postings with skill data` : undefined}>{fmtInt(g.denominator)}</span>
              </div>
              {skills.map((s, c) => {
                const v = cell(g.key, s);
                const lit = v.share / max;
                const dim = active && active[0] !== r && active[1] !== c;
                return (
                  <button key={s} type="button" role="gridcell" data-cell={`${r}-${c}`} tabIndex={r === 0 && c === 0 ? 0 : -1}
                    aria-label={`${s} in ${rowName(g.key)}: ${fmtPct(v.share)} of ${fmtInt(g.denominator)} postings`}
                    onMouseEnter={() => setActive([r, c])} onFocus={() => setActive([r, c])} onKeyDown={(e) => onKey(e, r, c)}
                    onClick={() => onSelect?.(g.key, s)}
                    className={clsx("relative grid aspect-square place-items-center border-[3px] border-[var(--rail)] bg-[var(--rail-2)] transition-opacity duration-200",
                      g.small_sample && "border-dashed", dim && "opacity-35", "focus-visible:z-10 focus-visible:outline-offset-0")}>
                    <span aria-hidden className="block rounded-full transition-transform duration-200"
                      style={{
                        width: `${Math.max(8, Math.sqrt(lit) * 86)}%`, height: `${Math.max(8, Math.sqrt(lit) * 86)}%`,
                        background: `color-mix(in oklab, var(--accent) ${Math.round(18 + lit * 82)}%, var(--rail-2))`,
                        boxShadow: lit > 0.5 ? "0 0 0 1px color-mix(in oklab, var(--accent) 40%, transparent)" : undefined,
                        transform: active?.[0] === r && active?.[1] === c ? "scale(1.08)" : undefined,
                      }} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-3">
        <span className="flex items-center gap-2">Opening area = share of the row’s postings:
          {[0.1, 0.4, 1].map((k) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className="grid size-5 place-items-center bg-[var(--rail-2)] ring-2 ring-[var(--rail)]">
                <span className="block rounded-full" style={{ width: `${Math.sqrt(k) * 86}%`, height: `${Math.sqrt(k) * 86}%`, background: `color-mix(in oklab, var(--accent) ${Math.round(18 + k * 82)}%, var(--rail-2))` }} />
              </span>
              {fmtPct(k * max, 0)}
            </span>
          ))}
        </span>
        <span>Dashed frame = fewer than {matrix.min_group} postings with skill data.</span>
      </figcaption>
    </figure>
  );
}
