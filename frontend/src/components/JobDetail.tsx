import clsx from "clsx";
import { ArrowRight, Check, ExternalLink, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../lib/api";
import { fmtDate, fmtInt, fmtPct, fmtUsdFull } from "../lib/format";
import { useLabels } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import { haveSet, useProfile } from "../lib/profile";
import type { CareerGap, Job } from "../lib/types";
import { CoverageStrip } from "./Coverage";
import { SkillPicker } from "./SkillPicker";
import { Advanced, ErrorState, Pill, Skeleton } from "./ui";

const PERIODS: Record<string, string> = { year: "سنة", month: "شهر", week: "أسبوع", day: "يوم", hour: "ساعة" };
const period = (p: string | null) => (p ? t(p, PERIODS[p] ?? p) : "");
export const noEmployer = () => t("Employer not given", "جهة التوظيف غير مذكورة");
export const noCountry = () => t("No single country", "بلا دولة محددة");

/**
 * A posting read against the visitor: what it asks for, what they have, and
 * which gaps matter most, weighted by how often the posting's role asks for
 * each skill across the sample. Overlap with listed skills, never a hiring odds.
 */
export function JobDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useApi<Job>(`/jobs/${encodeURIComponent(id)}`, null);
  const j = q.data;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [id, j?.job_id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold tracking-[-0.015em] text-ink focus:outline-none" dir="auto">{j?.title ?? t("Posting", "الإعلان")}</h2>
          {j && <p className="mt-1 text-sm text-ink-2"><bdi className="font-medium text-ink">{j.company ?? noEmployer()}</bdi>
            {j.company_is_placeholder && <span className="text-ink-3">{t(" · job board / hidden employer", " · موقع توظيف / جهة غير معلنة")}</span>}
            {" · "}<bdi>{j.location ?? (j.country ? tv(j.country) : noCountry())}</bdi></p>}
        </div>
        <button type="button" onClick={onClose} aria-label={t("Close details", "إغلاق التفاصيل")}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-panel-2 hover:text-ink"><X size={18} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-6">
        {q.error ? <ErrorState error={q.error} retry={() => q.refetch()} /> : !j ? <div className="space-y-4"><Skeleton h={64} /><Skeleton h={180} /><Skeleton h={120} /></div> : (
          <div className="space-y-7">
            <Facts j={j} />
            <Match j={j} />
            <About j={j} />
            {j.description && <Description j={j} />}
            <Advanced><Provenance j={j} /></Advanced>
          </div>
        )}
      </div>
    </div>
  );
}

function Facts({ j }: { j: Job }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-ink-3">{t("Salary", "الراتب")}</p>
        {j.salary_kind === "advertised" ? (
          <p className="mt-0.5"><span className="kpi text-2xl font-semibold tracking-[-0.02em] text-ink">{fmtUsdFull(j.salary_usd_annual)}</span>
            <span className="ms-1.5 text-sm text-ink-2">{t("per year, approx.", "سنويًا تقريبًا")}</span>
            <span className="block text-xs text-ink-3">{t(`Stated as ${fmtInt(j.salary_min)}${j.salary_max !== j.salary_min ? `–${fmtInt(j.salary_max)}` : ""} ${j.salary_currency} per ${j.salary_period}`,
              `المذكور ${fmtInt(j.salary_min)}${j.salary_max !== j.salary_min ? `–${fmtInt(j.salary_max)}` : ""} ${j.salary_currency} في ال${period(j.salary_period)}`)}</span></p>
        ) : j.salary_kind === "benchmark" ? (
          <p className="mt-0.5 text-sm text-ink-2"><span className="kpi text-lg font-semibold text-ink-2">{fmtUsdFull(j.salary_usd_annual)}</span>{" "}
            <Pill tone="warn">{t("Benchmark, not this posting’s pay", "قيمة مرجعية، لا راتب هذا الإعلان")}</Pill></p>
        ) : <p className="mt-0.5 text-sm text-ink-2">{t("Not stated in the posting", "غير مذكور في الإعلان")}</p>}
      </div>
      {j.url && /^https?:\/\//i.test(j.url) ? (
        <a href={j.url} target="_blank" rel="noopener noreferrer nofollow"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white no-underline hover:bg-accent-ink dark:text-[#0b0f17]">
          {t("Open original posting", "افتح الإعلان الأصلي")} <ExternalLink size={15} />
        </a>
      ) : <p className="max-w-56 text-xs text-ink-3">{t("The source did not provide a link to the original advert.", "لم يوفّر المصدر رابطًا للإعلان الأصلي.")}</p>}
    </div>
  );
}

function Match({ j }: { j: Job }) {
  const { profile, addSkill } = useProfile();
  const has = haveSet(profile.skills);
  // role-wide demand: how often postings in this role ask for each skill
  const gap = useApi<CareerGap>("/career/gap", null, { target_role: j.role_category, have: profile.skills }, j.role_category !== "Other / Unclassified");
  const share = new Map(gap.data?.skills.map((s) => [s.skill, s.share]) ?? []);
  const items = [...j.skill_list]
    .map((s) => ({ skill: s.skill, weight: share.get(s.skill) ?? null, have: has(s.skill), added: !s.observed, category: s.category }))
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  const haveItems = items.filter((i) => i.have);
  const missing = items.filter((i) => !i.have);
  const roleCtx = t(`${tv(j.role_category)} postings`, `إعلانات ${tv(j.role_category)}`);

  return (
    <section aria-labelledby="match-h">
      <h3 id="match-h" className="text-base font-semibold text-ink">{t("How you match", "مدى توافقك")}</h3>
      {items.length === 0 ? (
        <div className="mt-2 rounded-xl bg-panel-2 p-4 text-sm text-ink-2">
          <p>{t("This posting lists no skills, so there is nothing to compare.", "لا يذكر هذا الإعلان أي مهارات، فلا يوجد ما يُقارَن.")}</p>
          {gap.data?.skills.length ? <p className="mt-1">{t(`${tv(j.role_category)} postings most often ask for `, `أكثر ما تطلبه إعلانات ${tv(j.role_category)}: `)}
            {gap.data.skills.slice(0, 5).map((s) => s.skill).join(t(", ", "، "))}.</p> : null}
        </div>
      ) : !profile.skills.length ? (
        <div className="mt-2 space-y-4">
          <p className="text-sm text-ink-2">{t(`This posting lists ${items.length} skills. Add the skills you have to see which ones you already cover.`, `يذكر هذا الإعلان ${items.length} مهارات. أضف مهاراتك لترى ما تغطيه منها.`)}</p>
          <div>{gap.isLoading ? <Skeleton h={64} /> : <CoverageStrip label={t(`${items.length} skills listed in this posting`, `${items.length} مهارات مذكورة في هذا الإعلان`)} context={roleCtx}
            items={items} onSelect={addSkill} />}</div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
            {t("Click a segment if you have that skill, or", "انقر على أي جزء إن كانت لديك تلك المهارة، أو")}
            <SkillPicker selected={profile.skills} onAdd={addSkill} suggestions={items.map((i) => i.skill)} suggestionsTitle={t("Listed in this posting", "مذكورة في هذا الإعلان")} />
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-5">
          <p className="text-sm text-ink-2">
            <span className="font-semibold text-ink">{t(`You have ${haveItems.length} of the ${items.length} skills this posting lists.`, `لديك ${haveItems.length} من ${items.length} مهارات يذكرها هذا الإعلان.`)}</span>{" "}
            {missing.length > 0 && t("Gaps are ranked by how often this role asks for them.", "الفجوات مرتبة حسب مدى طلب هذا الدور لها.")}
          </p>
          <div>{gap.isLoading ? <Skeleton h={64} /> : <CoverageStrip label={t(`${items.length} skills listed in this posting`, `${items.length} مهارات مذكورة في هذا الإعلان`)} context={roleCtx}
            items={items} onSelect={(s) => !has(s) && addSkill(s)} />}</div>
          <div className="grid gap-5 sm:grid-cols-2">
            <SkillList title={t(`To learn (${missing.length})`, `لتتعلمها (${missing.length})`)} tone="gap" items={missing} onAdd={addSkill}
              empty={t("Nothing missing: you have every listed skill.", "لا شيء ينقصك: لديك كل المهارات المذكورة.")} />
            <SkillList title={t(`You have (${haveItems.length})`, `لديك (${haveItems.length})`)} tone="have" items={haveItems}
              empty={t("None of the listed skills yet.", "لا شيء من المهارات المذكورة بعد.")} />
          </div>
          <p className="text-xs leading-5 text-ink-3">{t(`Bars show how often ${tv(j.role_category)} postings ask for each skill${gap.data ? ` (${fmtInt(gap.data.denominator)} postings that list skills)` : ""}. This is overlap with the posting’s listed skills, not a prediction of being hired.`,
            `تُظهر الأشرطة مدى طلب إعلانات ${tv(j.role_category)} لكل مهارة${gap.data ? ` (${fmtInt(gap.data.denominator)} إعلانًا تذكر مهارات)` : ""}. هذا تداخل مع المهارات المذكورة في الإعلان، وليس توقعًا للتوظيف.`)}</p>
        </div>
      )}
    </section>
  );
}

function SkillList({ title, items, tone, empty, onAdd }: {
  title: string; items: { skill: string; weight: number | null; added: boolean; category: string }[]; tone: "have" | "gap"; empty: string;
  onAdd?: (s: string) => void;
}) {
  return (
    <div>
      <p className={clsx("mb-2 text-xs font-semibold", tone === "have" ? "text-good" : "text-warn")}>{title}</p>
      {items.length === 0 ? <p className="text-sm text-ink-3">{empty}</p> : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.skill} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
              <span className="flex min-w-0 items-center gap-1.5 text-sm">
                {tone === "have" ? <Check size={14} className="shrink-0 text-good" aria-hidden /> : <span className="size-3 shrink-0 rounded-[4px] ring-[1.5px] ring-inset ring-warn-fill" aria-hidden />}
                <span className="truncate font-medium text-ink">{i.skill}</span>
                {i.added && <span className="shrink-0 text-xs text-ink-3" title={t("Added by the team after collection, not written in the posting", "أضافها الفريق بعد الجمع، ولم تُذكر في الإعلان")}>{t("· added", "· مُضافة")}</span>}
              </span>
              {onAdd ? (
                <button type="button" onClick={() => onAdd(i.skill)} aria-label={t(`I have ${i.skill}`, `لدي ${i.skill}`)} title={t("I have this", "لدي هذه المهارة")}
                  className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink"><Plus size={14} /></button>
              ) : <span />}
              <span className="col-span-2 flex items-center gap-2">
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-panel-2">
                  <span className={clsx("block h-full rounded-full", tone === "have" ? "bg-good-fill" : "bg-warn-fill")} style={{ width: `${(i.weight ?? 0) * 100}%` }} />
                </span>
                <span className="tnum w-9 text-end text-xs text-ink-3">{i.weight == null ? "—" : fmtPct(i.weight, 0)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function About({ j }: { j: Job }) {
  const labels = useLabels();
  const rows: [string, string][] = [
    [t("Role", "الدور"), tv(j.role_category)], [t("Seniority", "مستوى الخبرة"), tv(j.seniority)],
    [t("Work mode", "نمط العمل"), tv(j.work_mode)], [t("Employment", "التوظيف"), tv(j.job_type)],
    [t("Market", "السوق"), tv(j.market_type)], [t("Posted", "تاريخ النشر"), fmtDate(j.posted_date)],
    [t("Language", "اللغة"), tv(j.language)], [t("Collection", "دفعة الجمع"), labels.cohort(j.cohort)],
  ];
  return (
    <section aria-labelledby="about-h" className="border-t border-line pt-6">
      <h3 id="about-h" className="text-base font-semibold text-ink">{t("About this job", "عن هذه الوظيفة")}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {rows.map(([k, v]) => <div key={k}><dt className="text-xs text-ink-3">{k}</dt><dd className="m-0 mt-0.5 text-ink">{v}</dd></div>)}
      </dl>
      {j.role_category !== "Other / Unclassified" && (
        <Link to={`/career?target=${encodeURIComponent(j.role_category)}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink no-underline hover:underline">
          {t(`Plan your path to ${tv(j.role_category)}`, `خطّط طريقك إلى ${tv(j.role_category)}`)} <ArrowRight size={14} className="rtl:rotate-180" />
        </Link>
      )}
    </section>
  );
}

function Description({ j }: { j: Job }) {
  const [open, setOpen] = useState(false);
  const long = (j.description?.length ?? 0) > 600;
  return (
    <section aria-labelledby="desc-h" className="border-t border-line pt-6">
      <h3 id="desc-h" className="text-base font-semibold text-ink">{t("Description", "الوصف")}
        {j.source_dataset === "jooble_careerjet_foreign" && <span className="ms-1.5 text-xs font-normal text-ink-3">{t("API snippet", "مقتطف من الواجهة البرمجية")}</span>}</h3>
      <p className={clsx("mt-2 whitespace-pre-line text-sm leading-6 text-ink-2", !open && long && "line-clamp-[10]")} dir="auto">{j.description}</p>
      {long && <button type="button" onClick={() => setOpen(!open)} className="mt-2 text-sm font-medium text-accent-ink hover:underline">
        {open ? t("Show less", "عرض أقل") : t("Show full description", "عرض الوصف كاملًا")}</button>}
    </section>
  );
}

function Provenance({ j }: { j: Job }) {
  const labels = useLabels();
  return (
    <div className="space-y-1 border-t border-line pt-4 text-xs leading-5 text-ink-3">
      <p>{t("Source: ", "المصدر: ")}{labels.source(j.source_dataset)}{j.source_platform ? t(` · via ${j.source_platform}`, ` · عبر ${j.source_platform}`) : ""}</p>
      {j.duplicate_count > 1 && <p>{t(`Found ${j.duplicate_count} times across boards (${j.sources}); counted once.`, `وُجد ${j.duplicate_count} مرات في مواقع مختلفة (${j.sources})؛ احتُسب مرة واحدة.`)}</p>}
      <p>{t(`Skills: ${j.skills_observed_count} written in the posting, ${j.skills_count - j.skills_observed_count} added by the team (marked “added”).`,
        `المهارات: ${j.skills_observed_count} مذكورة في الإعلان، و${j.skills_count - j.skills_observed_count} أضافها الفريق (موسومة بـ«مُضافة»).`)}</p>
    </div>
  );
}
