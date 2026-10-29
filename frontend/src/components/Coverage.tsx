import clsx from "clsx";
import { useState } from "react";
import { fmtPct } from "../lib/format";
import { t } from "../lib/i18n";

export interface CoverageItem {
  skill: string;
  /** How often the population asks for the skill (0-1); sets the segment's width. */
  weight: number | null;
  have: boolean;
  /** Team-added rather than written in the posting: drawn dashed, never by colour alone. */
  added?: boolean;
}

const growOf = (w: number | null) => Math.max(0.04, w ?? 0);

/**
 * The coverage strip: requested skills as one segmented bar. Width = how often
 * the skill is asked for; teal fill = you have it, amber outline = a gap.
 */
export function CoverageStrip({ items, size = "lg", label, onSelect, context }: {
  items: CoverageItem[]; size?: "sm" | "lg"; label: string;
  onSelect?: (skill: string) => void;
  /** Population the weights describe, used in the readout ("Data Analysis & BI postings"). */
  context?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (!items.length) return null;
  // flex-grow only hands out its own fraction of the free space when the total is below 1,
  // so widths are normalised: segments always fill the strip, in proportion to demand
  const sum = items.reduce((a, i) => a + growOf(i.weight), 0);
  const grow = (w: number | null) => growOf(w) / sum;
  const have = items.filter((i) => i.have).length;

  if (size === "sm") {
    // same grammar as the full strip, read at a glance: what you have first, then gaps by demand
    const ordered = [...items].sort((a, b) => Number(b.have) - Number(a.have) || (b.weight ?? 0) - (a.weight ?? 0));
    return (
      <span role="img" aria-label={label} title={label} className="flex h-2 w-full min-w-20 gap-[2px]">
        {ordered.map((it) => (
          <span key={it.skill} style={{ flexGrow: grow(it.weight), flexBasis: 0 }}
            className={clsx("min-w-[4px] rounded-[3px]", it.have ? "bg-good-fill" : "bg-warn-soft ring-1 ring-inset ring-warn-fill")} />
        ))}
      </span>
    );
  }

  const cur = active != null ? items[active] : null;
  return (
    <figure className="m-0">
      <p className="mb-2 min-h-5 text-sm text-ink-2" aria-live="polite">
        {cur ? <>
          <b className="font-medium text-ink">{cur.skill}</b>
          {cur.weight != null && <> · {context
            ? t(`asked for in ${fmtPct(cur.weight, 0)} of ${context}`, `مطلوبة في ${fmtPct(cur.weight, 0)} من ${context}`)
            : t(`asked for in ${fmtPct(cur.weight, 0)} of postings`, `مطلوبة في ${fmtPct(cur.weight, 0)} من الإعلانات`)}</>}
          {" · "}<span className={cur.have ? "text-good" : "text-warn"}>{cur.have ? t("you have it", "لديك") : t("to learn", "لتتعلمها")}</span>
        </> : <span className="text-ink-3">{label}</span>}
      </p>
      <div className="flex h-9 w-full gap-[3px]" role="list" aria-label={label} onMouseLeave={() => setActive(null)}>
        {items.map((it, i) => (
          <button key={it.skill} type="button" role="listitem"
            aria-label={`${it.skill}: ${it.have ? t("you have it", "لديك") : t("to learn", "لتتعلمها")}${it.weight != null ? `, ${fmtPct(it.weight, 0)}` : ""}${it.added ? t(", added by the team", "، أضافها الفريق") : ""}`}
            style={{ flexGrow: grow(it.weight), flexBasis: 0, animationDelay: `${Math.min(i, 12) * 28}ms` }}
            onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
            onClick={onSelect ? () => onSelect(it.skill) : undefined}
            className={clsx("strip-seg min-w-[6px] rounded-[5px] transition-[opacity,box-shadow] duration-200 first:rounded-s-lg last:rounded-e-lg",
              onSelect ? "cursor-pointer" : "cursor-default",
              it.have ? "bg-good-fill" : "bg-warn-soft ring-[1.5px] ring-inset ring-warn-fill",
              it.added && !it.have && "[background-image:repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_oklab,var(--warn-fill)_22%,transparent)_4px_5px)]",
              it.added && it.have && "[background-image:repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_oklab,white_28%,transparent)_4px_5px)]",
              active != null && active !== i && "opacity-45",
              active === i && "shadow-[0_0_0_2px_var(--panel),0_0_0_4px_var(--ink)]")} />
        ))}
      </div>
      <figcaption className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-good-fill" aria-hidden />{t(`You have ${have}`, `لديك ${have}`)}</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-warn-soft ring-[1.5px] ring-inset ring-warn-fill" aria-hidden />{t(`To learn ${items.length - have}`, `لتتعلمها ${items.length - have}`)}</span>
        <span>{t("Width = how often the skill is asked for", "العرض = مدى تكرار طلب المهارة")}</span>
        {items.some((i) => i.added) && <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm [background-image:repeating-linear-gradient(135deg,var(--ink-3)_0_1px,transparent_1px_3px)]" aria-hidden />{t("Hatched = added by the team", "المخطط = أضافه الفريق")}</span>}
      </figcaption>
    </figure>
  );
}
