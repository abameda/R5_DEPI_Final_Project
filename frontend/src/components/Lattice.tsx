import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { fmtInt, fmtPct } from "../lib/format";
import { getLang, isRtl, t, tv } from "../lib/i18n";
import type { Matrix } from "../lib/types";

/**
 * The role x skill lattice. Each aperture's AREA is the share of the row's
 * postings (with skill data) that list the column's skill; brightness repeats
 * the same value so the reading never depends on colour alone.
 */
export function Lattice({ matrix, rowLabel, onSelect, caption, rowName = tv }: {
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
  // the cell that holds the grid's single tab stop (roving tabindex)
  const [stop, setStop] = useState<[number, number]>([0, 0]);
  // a new matrix (filters changed) can be smaller: forget positions in the old one
  useEffect(() => { setActive(null); setStop([0, 0]); }, [matrix]);
  // rotated column labels: height follows the longest name (≈6.5px per character at 12px)
  const headerH = Math.min(120, 16 + Math.max(...skills.map((s) => s.length)) * 6.5);
  const gridRef = useRef<HTMLDivElement>(null);

  const focusCell = (r: number, c: number) => {
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${r}-${c}"]`);
    el?.focus();
  };
  const onKey = (e: React.KeyboardEvent, r: number, c: number) => {
    const last = [groups.length - 1, skills.length - 1];
    const fwd = isRtl() ? -1 : 1; // arrows follow the visual order
    const target: Record<string, [number, number]> = {
      ArrowRight: [r, c + fwd], ArrowLeft: [r, c - fwd], ArrowDown: [r + 1, c], ArrowUp: [r - 1, c],
      Home: e.ctrlKey ? [0, 0] : [r, 0], End: e.ctrlKey ? [last[0], last[1]] : [r, last[1]],
      PageUp: [0, c], PageDown: [last[0], c],
    };
    const t = target[e.key];
    if (!t) return;
    e.preventDefault();
    focusCell(Math.min(last[0], Math.max(0, t[0])), Math.min(last[1], Math.max(0, t[1])));
  };

  const readout = active && groups[active[0]] && skills[active[1]] ? (() => {
    const g = groups[active[0]];
    const s = skills[active[1]];
    const v = cell(g.key, s);
    return getLang() === "ar"
      ? <><b className="text-ink">{s}</b> في <b className="text-ink">{rowName(g.key)}</b>: {fmtPct(v.share)} من {fmtInt(g.denominator)} إعلانًا فيها بيانات مهارات ({fmtInt(v.n)}){g.small_sample && <> · <span className="text-warn">مجموعة صغيرة</span></>}{onSelect && <span className="text-ink-3"> · اضغط Enter أو انقر لعرض هذه الإعلانات</span>}</>
      : <><b className="text-ink">{s}</b> in <b className="text-ink">{rowName(g.key)}</b>: {fmtPct(v.share)} of {fmtInt(g.denominator)} postings with skill data ({fmtInt(v.n)}){g.small_sample && <> · <span className="text-warn">small group</span></>}{onSelect && <span className="text-ink-3"> · Enter or click to see these postings</span>}</>;
  })() : <span className="text-ink-3">{onSelect
    ? t("Hover or tab into the lattice to read a cell; select one to list its postings.", "مرِّر المؤشر أو انتقل بمفتاح Tab إلى الشبكة لقراءة خلية؛ اختر خلية لعرض إعلاناتها.")
    : t("Hover or tab into the lattice to read a cell.", "مرِّر المؤشر أو انتقل بمفتاح Tab إلى الشبكة لقراءة خلية.")}</span>;

  return (
    <figure className="m-0">
      <p className="mb-2 min-h-10 text-sm text-ink-2" aria-live="polite">{readout}</p>
      <p className="mb-1 text-xs text-ink-3 sm:hidden">{t(`Scroll sideways for all ${skills.length} skills →`, `مرِّر أفقيًا لرؤية المهارات الـ${skills.length} كلها ←`)}</p>
      <div className="overflow-x-auto pb-1">
        <div ref={gridRef} role="grid" aria-label={caption} aria-rowcount={groups.length + 1} aria-colcount={skills.length + 1}
          className="grid w-full min-w-min [--lattice-head:104px] sm:[--lattice-head:200px]" style={{ gridTemplateColumns: `var(--lattice-head) repeat(${skills.length}, minmax(32px, 64px))` }}
          onMouseLeave={() => setActive(null)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setActive(null); }}>
          <div role="row" className="contents">
            <div role="columnheader" className="sticky start-0 z-10 flex items-end bg-panel pb-2 pe-3 text-xs font-medium text-ink-3">{rowLabel} · n</div>
            {skills.map((s, c) => (
              <div role="columnheader" key={s} className="flex items-end justify-center pb-2" style={{ height: headerH }}>
                <span className={clsx("max-h-[120px] truncate text-xs [writing-mode:vertical-rl] rotate-180 transition-colors",
                  active?.[1] === c ? "font-semibold text-ink" : "text-ink-2")} title={s}>{s}</span>
              </div>
            ))}
          </div>
          {groups.map((g, r) => (
            <div role="row" key={g.key} className="contents">
              <div role="rowheader" className={clsx("sticky start-0 z-10 flex flex-col justify-center gap-0 bg-panel pe-2 text-sm leading-tight transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:pe-3",
                active?.[0] === r ? "font-medium text-ink" : "text-ink-2")}>
                <span className="line-clamp-2 sm:truncate" title={rowName(g.key)} dir="auto">{rowName(g.key)}</span>
                <span className={clsx("tnum shrink-0 text-xs", g.small_sample ? "text-warn" : "text-ink-3")}
                  title={g.small_sample ? t(`Fewer than ${matrix.min_group} postings with skill data`, `أقل من ${matrix.min_group} إعلانًا فيها بيانات مهارات`) : undefined}>{fmtInt(g.denominator)}</span>
              </div>
              {skills.map((s, c) => {
                const v = cell(g.key, s);
                const lit = v.share / max;
                const dim = active && active[0] !== r && active[1] !== c;
                return (
                  <button key={s} type="button" role="gridcell" data-cell={`${r}-${c}`} tabIndex={stop[0] === r && stop[1] === c ? 0 : -1}
                    aria-label={t(`${s} in ${rowName(g.key)}: ${fmtPct(v.share)} of ${fmtInt(g.denominator)} postings`, `${s} في ${rowName(g.key)}: ${fmtPct(v.share)} من ${fmtInt(g.denominator)} إعلانًا`)}
                    onMouseEnter={() => setActive([r, c])} onFocus={() => { setActive([r, c]); setStop([r, c]); }} onKeyDown={(e) => onKey(e, r, c)}
                    onClick={() => onSelect?.(g.key, s)}
                    className={clsx("relative m-px grid min-h-8 place-items-center rounded-md bg-panel-2 transition-opacity duration-200 sm:aspect-square",
                      g.small_sample && "outline-1 -outline-offset-1 outline-dashed outline-warn-fill", dim && "opacity-30", "focus-visible:z-10 focus-visible:outline-offset-0")}>
                    <span aria-hidden className="block rounded-full transition-transform duration-200"
                      style={{
                        width: `${Math.max(8, Math.sqrt(lit) * 86)}%`, aspectRatio: "1", maxHeight: "86%",
                        background: `color-mix(in oklab, var(--accent) ${Math.round(30 + lit * 70)}%, var(--panel-2))`,
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
        <span className="flex items-center gap-2">{t("Dot area = share of the row’s postings:", "مساحة النقطة = نسبة إعلانات الصف:")}
          {[0.1, 0.4, 1].map((k) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className="grid size-5 place-items-center rounded bg-panel-2">
                <span className="block rounded-full" style={{ width: `${Math.sqrt(k) * 86}%`, height: `${Math.sqrt(k) * 86}%`, background: `color-mix(in oklab, var(--accent) ${Math.round(30 + k * 70)}%, var(--panel-2))` }} />
              </span>
              {fmtPct(k * max, 0)}
            </span>
          ))}
        </span>
        <span>{t(`Dashed amber frame = fewer than ${matrix.min_group} postings with skill data.`, `الإطار المتقطع = أقل من ${matrix.min_group} إعلانًا فيها بيانات مهارات.`)}</span>
      </figcaption>
    </figure>
  );
}
