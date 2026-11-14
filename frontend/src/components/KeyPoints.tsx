import { fmtInt } from "../lib/format";
import { t } from "../lib/i18n";

/** A page's answer first: one finding as a sentence, then up to three points, each with its sample size. */
export function KeyPoints({ finding, points }: { finding: string; points: { text: string; n: number }[] }) {
  return (
    <section aria-label={t("Key findings", "أهم النتائج")} className="mb-6 rounded-xl border border-line bg-panel px-5 py-5 sm:px-6">
      <h2 className="max-w-3xl text-xl leading-8 font-semibold tracking-[-0.015em] text-ink">{finding}</h2>
      {points.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-[0.9375rem] leading-6 text-ink-2">
          {points.slice(0, 3).map((p) => (
            <li key={p.text} className="flex gap-2">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
              <span>{p.text} <span className="tnum text-sm text-ink-3">· n = {fmtInt(p.n)}</span></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
