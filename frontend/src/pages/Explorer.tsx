import clsx from "clsx";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Empty, ErrorState, Loading, PageHeader, Pill, Select, Button } from "../components/ui";
import { useApi } from "../lib/api";
import { fmtDate, fmtInt, fmtUsdFull } from "../lib/format";
import { useFilters, useLabels, useParam, useUpdateParams } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import type { Job, JobPage, SkillChip } from "../lib/types";

const sorts = () => [
  { value: "newest", label: t("Newest first", "الأحدث أولًا") }, { value: "oldest", label: t("Oldest first", "الأقدم أولًا") },
  { value: "salary_high", label: t("Highest advertised salary", "أعلى راتب معلن") }, { value: "salary_low", label: t("Lowest advertised salary", "أدنى راتب معلن") },
  { value: "most_listed", label: t("Listed on most boards", "الأكثر إدراجًا في المواقع") }, { value: "title", label: t("Title A–Z", "المسمى أبجديًا") },
  { value: "company", label: t("Employer A–Z", "جهة التوظيف أبجديًا") },
];
const PAGE_SIZE = 25;
const PERIODS: Record<string, string> = { year: "سنة", month: "شهر", week: "أسبوع", day: "يوم", hour: "ساعة" };
const period = (p: string | null) => (p ? t(p, PERIODS[p] ?? p) : "");

export default function Explorer() {
  const { filters, reset } = useFilters();
  const [sort] = useParam("sort", "newest");
  const update = useUpdateParams();
  const [pageStr, setPage] = useParam("page", "1");
  const [selected, setSelected] = useParam("job", "");
  // never request beyond the browsable window (the API serves the first 10,000 results)
  const page = Math.min(Math.max(1, Number.parseInt(pageStr, 10) || 1), Math.floor(10_000 / PAGE_SIZE) + 1);
  const q = useApi<JobPage>("/jobs", filters, { page, page_size: PAGE_SIZE, sort });
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / PAGE_SIZE)) : 1;
  const maxPage = Math.min(pages, Math.floor(10_000 / PAGE_SIZE) + 1);
  const top = useRef<HTMLDivElement>(null);
  // a shared link or a narrower filter can point past the last page
  useEffect(() => {
    if (q.data && !q.isFetching && page > maxPage) update({ page: maxPage > 1 ? String(maxPage) : null });
  }, [q.data, q.isFetching, page, maxPage, update]);
  useEffect(() => { top.current?.scrollIntoView({ block: "nearest" }); }, [page]);

  return (
    <>
      <PageHeader title={t("Job explorer", "مستكشف الوظائف")}
        description={t("Search and filter the unique postings. Each posting links to its original advert when the source provided one.",
          "ابحث في الإعلانات الفريدة وصفِّها. يرتبط كل إعلان بإعلانه الأصلي متى وفّر المصدر رابطًا.")}>
        <Select label={t("Sort", "الترتيب")} value={sort} onChange={(v) => update({ sort: v === "newest" ? null : v, page: null })} options={sorts()} />
      </PageHeader>
      <div ref={top} className={clsx("grid gap-4", selected && "xl:grid-cols-[minmax(0,1fr)_420px]")}>
        <div className="min-w-0 rounded-lg border border-line bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 text-sm" aria-live="polite">
            <span className="text-ink-2">
              {q.data
                ? <><strong className="tnum text-ink">{fmtInt(q.data.total)}</strong> {t(`postings · page ${fmtInt(page)} of ${fmtInt(pages)}`, `إعلان · الصفحة ${fmtInt(page)} من ${fmtInt(pages)}`)}</>
                : t("Loading…", "جارٍ التحميل…")}
            </span>
            {sort.startsWith("salary") && <span className="text-xs text-ink-3">{t("Postings with an advertised salary are listed first.", "تظهر الإعلانات ذات الراتب المعلن أولًا.")}</span>}
          </div>
          {q.error && !q.data ? <div className="p-4"><ErrorState error={q.error} retry={() => q.refetch()} /></div>
            : !q.data ? <div className="p-4"><Loading h={480} /></div>
            : q.data.total === 0 ? <Empty action={<Button onClick={reset}>{t("Reset filters", "إعادة ضبط عوامل التصفية")}</Button>} />
            : (
              <div className={clsx("transition-opacity", q.isFetching && "opacity-60")} aria-busy={q.isFetching}>
                <JobTable rows={q.data.rows} selected={selected} onSelect={(id) => setSelected(id === selected ? null : id)} />
                <Pager page={page} maxPage={maxPage} pages={pages} onPage={(p) => setPage(String(p))} />
              </div>
            )}
        </div>
        {selected && <JobDetail id={selected} onClose={() => setSelected(null)} />}
      </div>
    </>
  );
}

const noEmployer = () => t("Employer not given", "جهة التوظيف غير مذكورة");
const noCountry = () => t("No single country", "بلا دولة محددة");

function JobTable({ rows, selected, onSelect }: { rows: Job[]; selected: string; onSelect: (id: string) => void }) {
  const labels = useLabels();
  return (
    <>
      <table className="hidden w-full table-fixed text-sm md:table">
        <caption className="sr-only">{t("Job postings matching the filters", "إعلانات الوظائف المطابقة لعوامل التصفية")}</caption>
        <colgroup><col /><col className="w-[18%]" /><col className="w-[17%]" /><col className="w-[13%]" /><col className="w-[11%]" /></colgroup>
        <thead className="border-b border-line text-start text-xs text-ink-3">
          <tr>
            <th scope="col" className="px-4 py-2 text-start font-medium">{t("Posting", "الإعلان")}</th>
            <th scope="col" className="px-2 py-2 text-start font-medium">{t("Location", "الموقع")}</th>
            <th scope="col" className="px-2 py-2 text-start font-medium">{t("Role · seniority", "الدور · الخبرة")}</th>
            <th scope="col" className="px-2 py-2 text-end font-medium">{t("Salary (USD/yr)", "الراتب (دولار/سنة)")}</th>
            <th scope="col" className="px-4 py-2 text-end font-medium">{t("Posted", "النشر")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((j) => (
            <tr key={j.job_id} onClick={() => onSelect(j.job_id)}
              className={clsx("cursor-pointer border-b border-line align-top transition-colors last:border-0 hover:bg-panel-2", selected === j.job_id && "bg-accent-soft hover:bg-accent-soft")}>
              <td className="px-4 py-2.5">
                <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(j.job_id); }} aria-expanded={selected === j.job_id}
                  className="block w-full text-start font-medium text-ink hover:underline" dir="auto">{j.title}</button>
                <span className="block truncate text-ink-2"><bdi>{j.company ?? noEmployer()}</bdi>{j.company_is_placeholder && <span className="text-ink-3">{t(" · job board / hidden employer", " · موقع توظيف / جهة غير معلنة")}</span>}</span>
                <SkillChips skills={j.skill_list} max={6} />
              </td>
              <td className="px-2 py-2.5 text-ink-2">
                <span className="block truncate" dir="auto">{j.city ? `${j.city}${t(", ", "، ")}` : ""}{j.country ? tv(j.country) : noCountry()}</span>
                <span className="text-xs text-ink-3">{tv(j.market_type)} · {tv(j.work_mode)}</span>
              </td>
              <td className="px-2 py-2.5 text-ink-2">
                <span className="block truncate">{tv(j.role_category)}</span>
                <span className="text-xs text-ink-3">{tv(j.seniority)} · {tv(j.job_type)}</span>
              </td>
              <td className="tnum px-2 py-2.5 text-end"><Salary j={j} /></td>
              <td className="px-4 py-2.5 text-end text-ink-2">
                <span className="tnum block">{fmtDate(j.posted_date)}</span>
                <span className="block truncate text-xs text-ink-3" title={labels.source(j.source_dataset)}>{j.source_platform ?? labels.source(j.source_dataset)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((j) => (
          <li key={j.job_id}>
            <button type="button" onClick={() => onSelect(j.job_id)} className={clsx("block w-full px-4 py-3 text-start", selected === j.job_id && "bg-accent-soft")}>
              <span className="block font-medium text-ink" dir="auto">{j.title}</span>
              <span className="block text-sm text-ink-2"><bdi>{j.company ?? noEmployer()}</bdi> · <bdi>{j.country ? tv(j.country) : noCountry()}</bdi></span>
              <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-3"><span>{tv(j.role_category)}</span><span>{fmtDate(j.posted_date)}</span><Salary j={j} /></span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Salary({ j }: { j: Job }) {
  if (j.salary_kind === "advertised") {
    return <span className="text-ink" title={t(`${j.salary_min ?? ""}–${j.salary_max ?? ""} ${j.salary_currency ?? ""} per ${j.salary_period ?? ""}`,
      `${j.salary_min ?? ""}–${j.salary_max ?? ""} ${j.salary_currency ?? ""} في ال${period(j.salary_period)}`)}>{fmtUsdFull(j.salary_usd_annual)}</span>;
  }
  if (j.salary_kind === "benchmark") {
    return <span className="text-ink-3" title={t("Market benchmark attached by the team, not the posting's pay", "قيمة مرجعية للسوق أرفقها الفريق، وليست راتب الإعلان")}>
      {fmtUsdFull(j.salary_usd_annual)} <span className="text-xs">{t("benchmark", "مرجعي")}</span></span>;
  }
  return <span className="text-ink-3">—</span>;
}

export function SkillChips({ skills, max }: { skills: SkillChip[]; max?: number }) {
  if (!skills.length) return null;
  const shown = max ? skills.slice(0, max) : skills;
  return (
    <span className="mt-1.5 flex flex-wrap gap-1">
      {shown.map((s) => (
        <span key={s.skill} title={s.observed ? t(`${s.skill} — written in the posting data`, `${s.skill} — مذكورة في بيانات الإعلان`) : t(`${s.skill} — added by the team after collection`, `${s.skill} — أضافها الفريق بعد الجمع`)}
          className={clsx("rounded px-1.5 py-px text-xs", s.observed ? "bg-[color-mix(in_oklab,var(--s3-soft)_55%,transparent)] text-ink ring-1 ring-[var(--s3-soft)]" : "border border-dashed border-line-strong text-ink-3")}>
          {s.skill}{!s.observed && <span className="sr-only">{t(" (added by team)", " (أضافها الفريق)")}</span>}
        </span>
      ))}
      {max && skills.length > max && <span className="px-1 text-xs text-ink-3">+{skills.length - max}</span>}
    </span>
  );
}

function Pager({ page, maxPage, pages, onPage }: { page: number; maxPage: number; pages: number; onPage: (p: number) => void }) {
  return (
    <nav aria-label={t("Pagination", "التنقل بين الصفحات")} className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-sm">
      <Button variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={15} className="rtl:rotate-180" /> {t("Previous", "السابق")}</Button>
      {pages > maxPage && page >= maxPage
        ? <span className="text-xs text-ink-3">{t("Only the first 10,000 results are browsable. Narrow the filters to see the rest.", "يمكن تصفح أول 10,000 نتيجة فقط. ضيّق عوامل التصفية لرؤية الباقي.")}</span>
        : <span className="tnum text-ink-3">{t(`Page ${fmtInt(page)} of ${fmtInt(pages)}`, `الصفحة ${fmtInt(page)} من ${fmtInt(pages)}`)}</span>}
      <Button variant="ghost" disabled={page >= maxPage} onClick={() => onPage(page + 1)}>{t("Next", "التالي")} <ChevronRight size={15} className="rtl:rotate-180" /></Button>
    </nav>
  );
}

function JobDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const labels = useLabels();
  const q = useApi<Job>(`/jobs/${encodeURIComponent(id)}`, null);
  const j = q.data;
  const ref = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // below xl the detail renders after the list: bring it into view and move focus there
  useEffect(() => {
    if (!matchMedia("(min-width: 1280px)").matches) ref.current?.scrollIntoView({ block: "start" });
    heading.current?.focus({ preventScroll: true });
  }, [id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <aside ref={ref} aria-label={t("Posting details", "تفاصيل الإعلان")}
      className="h-fit scroll-mt-4 rounded-lg border border-line bg-panel xl:sticky xl:top-[calc(var(--filters-h,0px)+1rem)] xl:max-h-[calc(100vh-var(--filters-h,0px)-2rem)] xl:overflow-auto">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold text-ink focus:outline-none" dir="auto">{j?.title ?? t("Posting", "الإعلان")}</h2>
        <button type="button" onClick={onClose} aria-label={t("Close details", "إغلاق التفاصيل")} className="grid size-7 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink"><X size={16} /></button>
      </div>
      <div className="px-4 py-3">
        {q.error ? <ErrorState error={q.error} /> : !j ? <Loading h={260} /> : (
          <div className="space-y-4 text-sm">
            <p className="text-ink-2"><bdi>{j.company ?? noEmployer()}</bdi> · <bdi>{j.location ?? (j.country ? tv(j.country) : t("No location", "بلا موقع"))}</bdi></p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[[t("Role", "الدور"), tv(j.role_category)], [t("Seniority", "مستوى الخبرة"), tv(j.seniority)], [t("Market", "السوق"), tv(j.market_type)],
                [t("Work mode", "نمط العمل"), tv(j.work_mode)], [t("Employment", "التوظيف"), tv(j.job_type)], [t("Posted", "تاريخ النشر"), fmtDate(j.posted_date)],
                [t("Collection", "دفعة الجمع"), labels.cohort(j.cohort)], [t("Language", "اللغة"), tv(j.language)]]
                .map(([k, v]) => <div key={k}><dt className="text-xs text-ink-3">{k}</dt><dd className="m-0 text-ink">{v}</dd></div>)}
            </dl>
            <div>
              <h3 className="text-xs text-ink-3">{t("Salary", "الراتب")}</h3>
              {j.salary_kind === "advertised" ? (
                <p className="text-ink"><span className="font-semibold">{fmtUsdFull(j.salary_usd_annual)}</span>{" "}
                  {t(`per year (approx.) · stated as ${fmtInt(j.salary_min)}${j.salary_max !== j.salary_min ? `–${fmtInt(j.salary_max)}` : ""} ${j.salary_currency} per ${j.salary_period}`,
                    `سنويًا (تقريبًا) · المذكور ${fmtInt(j.salary_min)}${j.salary_max !== j.salary_min ? `–${fmtInt(j.salary_max)}` : ""} ${j.salary_currency} في ال${period(j.salary_period)}`)}</p>
              ) : j.salary_kind === "benchmark" ? (
                <p className="text-ink-2"><Pill tone="warn">{t("Benchmark", "قيمة مرجعية")}</Pill>{" "}
                  {t(`${fmtUsdFull(j.salary_usd_annual)} per year — a market figure the team attached for this job title and country, not this posting’s pay.`,
                    `${fmtUsdFull(j.salary_usd_annual)} سنويًا — رقم سوقي أرفقه الفريق لهذا المسمى والدولة، وليس راتب هذا الإعلان.`)}</p>
              ) : <p className="text-ink-3">{t("The posting does not state a salary.", "لا يذكر الإعلان راتبًا.")}</p>}
            </div>
            <div>
              <h3 className="text-xs text-ink-3">{t(`Skills (${j.skills_observed_count} written in posting, ${j.skills_count - j.skills_observed_count} added by the team)`,
                `المهارات (${j.skills_observed_count} مذكورة في الإعلان، ${j.skills_count - j.skills_observed_count} أضافها الفريق)`)}</h3>
              <SkillChips skills={j.skill_list} />
            </div>
            {j.description && (
              <div>
                <h3 className="text-xs text-ink-3">{t("Description", "الوصف")}{j.source_dataset === "jooble_careerjet_foreign" ? t(" (API snippet)", " (مقتطف من الواجهة البرمجية)") : ""}</h3>
                <p className="max-h-60 overflow-auto whitespace-pre-line text-ink-2" dir="auto">{j.description}</p>
              </div>
            )}
            <div className="space-y-1 border-t border-line pt-3 text-xs text-ink-3">
              <p>{t("Source: ", "المصدر: ")}{labels.source(j.source_dataset)}{j.source_platform ? t(` · via ${j.source_platform}`, ` · عبر ${j.source_platform}`) : ""}</p>
              {j.duplicate_count > 1 && <p>{t(`Found ${j.duplicate_count} times across boards (${j.sources}); counted once.`, `وُجد ${j.duplicate_count} مرات في مواقع مختلفة (${j.sources})؛ احتُسب مرة واحدة.`)}</p>}
            </div>
            {j.url && /^https?:\/\//i.test(j.url) ? (
              <a href={j.url} target="_blank" rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 font-medium text-accent-ink underline decoration-accent-line underline-offset-2">
                {t("Open original posting", "افتح الإعلان الأصلي")} <ExternalLink size={14} />
              </a>
            ) : <p className="text-xs text-ink-3">{t("The source did not provide a link to the original advert.", "لم يوفّر المصدر رابطًا للإعلان الأصلي.")}</p>}
          </div>
        )}
      </div>
    </aside>
  );
}
