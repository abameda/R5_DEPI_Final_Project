import { useState } from "react";
import { useFilters } from "../lib/hooks";
import { useApi } from "../lib/api";
import { fmtInt, fmtPct, fmtUsd } from "../lib/format";
import { useMeta } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import { matchFilters, placeName } from "../lib/match";
import { broaderWhere, type Where } from "../lib/profile";
import type { Count, SalarySummary } from "../lib/types";
import { Empty, ErrorState, InfoTip, Pill, Skeleton } from "./ui";

/**
 * Advertised pay for one role in one place. The place in the heading is always
 * the place the numbers come from: when a place has too few salaries the panel
 * says so and offers the next wider place as a button, never silently.
 */
export function PayLands({ role, where }: { role: string; where: Where }) {
  const { filters } = useFilters();
  const [picked, setPicked] = useState<{ from: Where; role: string; to: Where } | null>(null);
  // a new profile place or a new role resets a widened view
  const shown = picked && picked.from === where && picked.role === role ? picked.to : where;
  // the page's other filters (seniority, source, dates…) apply here too, as on the rest of the Compass
  const f = { ...matchFilters(filters, "local", shown, "all"), role: [role] };
  const meta = useMeta();
  const sum = useApi<SalarySummary>("/salary/summary", f, { dim: "country", kind: "advertised", limit: 3 }, !!role);
  const from = useApi<Count[]>("/breakdown", { ...f, salary: "advertised" }, { dim: "country", limit: 3 }, !!role);
  const place = placeName(shown);
  const min = meta.data?.thresholds.min_salary_n ?? 10;
  const s = sum.data?.overall;
  const wider = broaderWhere(shown);
  const top = from.data?.[0];
  // placeholder data belongs to the previous place: never show it under this place's heading
  const settling = sum.isLoading || sum.isPlaceholderData || from.isPlaceholderData;

  return (
    <section aria-label={t("Where your pay lands", "أين يقع أجرك")} className="rounded-xl border border-line bg-panel p-5">
      <h2 className="flex items-center gap-1.5 text-base font-semibold text-ink">
        {t(`Where your pay lands in ${place}`, `أين يقع أجرك في ${place}`)}
        <InfoTip>{t("Pay written in the postings themselves, converted to US dollars a year at fixed rates. Team benchmarks are never mixed in. The bar runs from the 10th to the 90th percentile; the box holds the middle half; the line is the median.",
          "الأجر كما كُتب في الإعلانات نفسها، محوَّلًا إلى دولار أمريكي سنويًا بأسعار ثابتة، ولا تُخلط به القيم المرجعية للفريق. يمتد الشريط من المئين العاشر إلى التسعين، ويضم الصندوق النصف الأوسط، والخط هو الوسيط.")}</InfoTip>
      </h2>
      {sum.error && !sum.data ? <div className="mt-4"><ErrorState error={sum.error} retry={() => sum.refetch()} /></div>
        : !s || settling ? <Skeleton h={120} className="mt-4" /> : s.confidence === "insufficient" || s.n < min || s.median == null ? (
        <Empty title={s.n < min
            ? t(`Only ${fmtInt(s.n)} ${tv(role)} postings in ${place} state their pay`, `${fmtInt(s.n)} إعلانًا فقط لدور ${tv(role)} في ${place} تذكر الأجر`)
            : t(`${fmtInt(s.n)} ${tv(role)} postings in ${place} state their pay, but not in a form we can compare`, `${fmtInt(s.n)} إعلانًا لدور ${tv(role)} في ${place} تذكر الأجر، لكن ليس بصيغة يمكن مقارنتها`)}
          hint={s.n < min
            ? t(`We need at least ${min} to show a range, so we show nothing rather than guess.`, `نحتاج ${min} على الأقل لعرض نطاق، لذا لا نعرض شيئًا بدل التخمين.`)
            : t("So we show no range rather than guess.", "لذا لا نعرض نطاقًا بدل التخمين.")}
          action={wider ? (
            <button type="button" onClick={() => setPicked({ from: where, role, to: wider })}
              className="h-9 rounded-lg border border-line-strong bg-panel px-3.5 text-sm font-medium text-ink hover:bg-panel-2">
              {t(`See ${placeName(wider).replace(/^./, (c) => c.toUpperCase())} instead`, `شوف ${placeName(wider)} بدلًا من ذلك`)}
            </button>
          ) : undefined} />
      ) : (<>
        <p className="mt-1 text-sm text-ink-2">
          {t(`Advertised pay in ${fmtInt(s.n)} ${tv(role)} postings in ${place}`, `الأجر المعلن في ${fmtInt(s.n)} إعلانًا لدور ${tv(role)} في ${place}`)}
          {s.confidence === "low" && <> <Pill tone="warn" title={t(`Fewer than ${meta.data?.thresholds.reliable_salary_n ?? 30} salaries`, `أقل من ${meta.data?.thresholds.reliable_salary_n ?? 30} راتبًا`)}>{t("Low confidence", "ثقة منخفضة")}</Pill></>}
        </p>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
          <span className="tnum text-[1.75rem] leading-9 font-semibold tracking-[-0.02em] text-ink">{fmtUsd(s.median)}</span>
          <span className="text-sm text-ink-2">{t("median a year", "الوسيط سنويًا")} · <span className="tnum">≈ {fmtUsd(s.median / 12)}</span> {t("a month", "شهريًا")}</span>
        </p>
        <Band s={s} />
        {top && top.share != null && top.share >= 0.5 && (
          <p className="mt-3 text-sm text-ink-2">{top.key == null
            ? t(`${fmtPct(top.share, 0)} have no single country (remote or not stated), so read it as pay from many places.`, `${fmtPct(top.share, 0)} منها بلا دولة محددة (عن بُعد أو غير مذكورة)، فاقرأها كأجور من أماكن متعددة.`)
            : t(`${fmtPct(top.share, 0)} are ${tv(top.key)} postings, so read it mostly as ${tv(top.key)} pay.`, `${fmtPct(top.share, 0)} منها إعلانات من ${tv(top.key)}، فاقرأها غالبًا كأجور ${tv(top.key)}.`)}</p>
        )}
        {shown !== where && (
          <button type="button" onClick={() => setPicked(null)} className="mt-3 text-sm font-medium text-accent-ink hover:underline">
            {t(`Back to ${placeName(where)}`, `رجوع إلى ${placeName(where)}`)}
          </button>
        )}
      </>)}
    </section>
  );
}

/** p10–p90 bar, p25–p75 box and the median line, with the ends labelled. */
function Band({ s }: { s: SalarySummary["overall"] }) {
  const lo = s.p10 ?? s.median!;
  const hi = s.p90 ?? s.median!;
  const pad = (hi - lo) * 0.04 || 1;
  const x = (v: number | null) => `${(((v ?? lo) - (lo - pad)) / (hi - lo + 2 * pad)) * 100}%`;
  return (
    <div className="mt-4" role="img" aria-label={t(`10th percentile ${fmtUsd(s.p10)}, middle half ${fmtUsd(s.p25)} to ${fmtUsd(s.p75)}, median ${fmtUsd(s.median)}, 90th percentile ${fmtUsd(s.p90)}`,
      `المئين العاشر ${fmtUsd(s.p10)}، النصف الأوسط من ${fmtUsd(s.p25)} إلى ${fmtUsd(s.p75)}، الوسيط ${fmtUsd(s.median)}، المئين التسعون ${fmtUsd(s.p90)}`)}>
      <div className="relative h-8">
        <span className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent-soft ring-1 ring-accent-line ring-inset" style={{ insetInlineStart: x(s.p10), insetInlineEnd: `calc(100% - ${x(s.p90)})` }} />
        <span className="absolute top-1 bottom-1 rounded-md bg-accent" style={{ insetInlineStart: x(s.p25), insetInlineEnd: `calc(100% - ${x(s.p75)})` }} />
        <span className="absolute -top-0.5 -bottom-0.5 w-[3px] -translate-x-1/2 rounded-full bg-ink rtl:translate-x-1/2" style={{ insetInlineStart: x(s.median) }} />
      </div>
      <div className="tnum mt-1.5 flex justify-between text-xs text-ink-3">
        <span>{fmtUsd(s.p10)}</span>
        <span>{t(`middle half ${fmtUsd(s.p25)}–${fmtUsd(s.p75)}`, `النصف الأوسط ${fmtUsd(s.p25)}–${fmtUsd(s.p75)}`)}</span>
        <span>{fmtUsd(s.p90)}</span>
      </div>
    </div>
  );
}
