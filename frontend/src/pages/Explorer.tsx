import clsx from "clsx";
import { ChevronLeft, ChevronRight, Route } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { CoverageStrip } from "../components/Coverage";
import { JobDetail, noCountry, noEmployer } from "../components/JobDetail";
import { Button, Empty, ErrorState, Loading, PageHeader, Select } from "../components/ui";
import { useApi } from "../lib/api";
import { fmtDate, fmtInt, fmtUsdFull } from "../lib/format";
import { useFilters, useParam, useUpdateParams } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import { haveSet, useProfile } from "../lib/profile";
import type { Job, JobPage, SkillChip } from "../lib/types";

const sorts = () => [
  { value: "newest", label: t("Newest first", "الأحدث أولًا") }, { value: "oldest", label: t("Oldest first", "الأقدم أولًا") },
  { value: "salary_high", label: t("Highest advertised salary", "أعلى راتب معلن") }, { value: "salary_low", label: t("Lowest advertised salary", "أدنى راتب معلن") },
  { value: "most_listed", label: t("Listed on most boards", "الأكثر إدراجًا في المواقع") }, { value: "title", label: t("Title A–Z", "المسمى أبجديًا") },
  { value: "company", label: t("Employer A–Z", "جهة التوظيف أبجديًا") },
];
const PAGE_SIZE = 25;

export default function Explorer() {
  const { filters, reset } = useFilters();
  const { profile } = useProfile();
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
  const close = useCallback(() => setSelected(null), [setSelected]);
  // a shared link or a narrower filter can point past the last page
  useEffect(() => {
    if (q.data && !q.isFetching && page > maxPage) update({ page: maxPage > 1 ? String(maxPage) : null });
  }, [q.data, q.isFetching, page, maxPage, update]);
  // page turns bring the list back into view; the first render keeps the page header on screen
  const shownPage = useRef(page);
  useEffect(() => {
    if (shownPage.current === page) return;
    shownPage.current = page;
    top.current?.scrollIntoView({ block: "start" });
  }, [page]);
  // demand weights for the row strips: how often the postings in this selection ask for each skill
  const demand = useApi<{ rows: { skill: string; share: number | null }[] }>("/skills/top", filters, { limit: 100 });
  const weight = new Map(demand.data?.rows.map((r) => [r.skill, r.share]) ?? []);

  return (
    <>
      <PageHeader title={t("Jobs", "الوظائف")}
        description={t("Search and filter unique postings. Select a job to see how your skills match it.",
          "ابحث في الإعلانات الفريدة وصفِّها. اختر وظيفة لترى مدى توافق مهاراتك معها.")}>
        <Select label={t("Sort", "الترتيب")} value={sort} onChange={(v) => update({ sort: v === "newest" ? null : v, page: null })} options={sorts()} />
      </PageHeader>
      {!profile.skills.length && (
        <Link to="/career" className="mb-4 flex items-center gap-3 rounded-xl border border-accent-line/70 bg-info-soft px-4 py-3 text-sm text-ink no-underline hover:border-accent">
          <Route size={18} className="shrink-0 text-accent" />
          <span><span className="font-medium">{t("Add your skills to see how each job matches.", "أضف مهاراتك لترى مدى توافق كل وظيفة معك.")}</span>{" "}
            <span className="text-ink-2">{t("It takes a minute and stays in this browser.", "يستغرق ذلك دقيقة ويبقى في هذا المتصفح.")}</span></span>
          <ChevronRight size={16} className="ms-auto shrink-0 text-ink-3 rtl:rotate-180" />
        </Link>
      )}
      <div ref={top} className={clsx("grid scroll-mt-[calc(var(--filters-h,0px)+1rem)] items-start gap-5", selected && "xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.9fr)]")}>
        <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3 text-sm" aria-live="polite">
            <span className="text-ink-2">
              {q.data
                ? <><strong className="tnum font-semibold text-ink">{fmtInt(q.data.total)}</strong> {t("jobs", "وظيفة")}</>
                : t("Loading…", "جارٍ التحميل…")}
            </span>
            {sort.startsWith("salary") && <span className="text-xs text-ink-3">{t("Postings with an advertised salary are listed first.", "تظهر الإعلانات ذات الراتب المعلن أولًا.")}</span>}
          </div>
          {q.error && !q.data ? <div className="p-4"><ErrorState error={q.error} retry={() => q.refetch()} /></div>
            : !q.data ? <div className="p-4"><Loading h={480} /></div>
            : q.data.total === 0 ? <Empty title={t("No jobs match these filters", "لا توجد وظائف تطابق هذه الفلاتر")}
                action={<Button onClick={reset}>{t("Clear all filters", "مسح كل الفلاتر")}</Button>} />
            : (
              <div className={clsx("transition-opacity", q.isFetching && "opacity-60")} aria-busy={q.isFetching}>
                <JobList rows={q.data.rows} weight={weight} selected={selected} onSelect={(id) => setSelected(id === selected ? null : id)} />
                <Pager page={page} maxPage={maxPage} pages={pages} onPage={(p) => setPage(String(p))} />
              </div>
            )}
        </div>
        {selected && (<>
          <div className="fixed inset-0 z-40 bg-[#0e1525]/35 xl:hidden" onClick={close} aria-hidden />
          <aside aria-label={t("Job details", "تفاصيل الوظيفة")}
            className="fixed inset-y-0 end-0 z-50 w-full overflow-hidden bg-panel shadow-panel sm:w-[min(600px,92vw)] sm:border-s sm:border-line
              xl:sticky xl:inset-auto xl:top-[calc(var(--filters-h,0px)+1.5rem)] xl:z-auto xl:h-[calc(100vh-var(--filters-h,0px)-3rem)] xl:w-auto xl:rounded-xl xl:border xl:shadow-none">
            <JobDetail id={selected} onClose={close} />
          </aside>
        </>)}
      </div>
    </>
  );
}

function JobList({ rows, weight, selected, onSelect }: { rows: Job[]; weight: Map<string, number | null>; selected: string; onSelect: (id: string) => void }) {
  const { profile } = useProfile();
  const has = haveSet(profile.skills);
  return (
    <ul className="divide-y divide-line">
      {rows.map((j) => {
        const listed = j.skill_list.length;
        const matched = j.skill_list.filter((s) => has(s.skill)).length;
        const active = selected === j.job_id;
        return (
          <li key={j.job_id} className={clsx("relative transition-colors", active ? "bg-accent-soft" : "hover:bg-panel-2/70")}>
            <button type="button" onClick={() => onSelect(j.job_id)} aria-expanded={active}
              className="grid w-full gap-x-6 gap-y-2 px-5 py-4 text-start md:grid-cols-[minmax(0,1fr)_11rem]">
              <span className="min-w-0">
                <span className={clsx("block font-semibold", active ? "text-accent-ink" : "text-ink")} dir="auto">{j.title}</span>
                <span className="mt-0.5 block truncate text-sm text-ink-2">
                  <bdi>{j.company ?? noEmployer()}</bdi> · <bdi dir="auto">{j.city ? `${j.city}${t(", ", "، ")}` : ""}{j.country ? tv(j.country) : noCountry()}</bdi>
                </span>
                <span className="mt-1 block text-xs text-ink-3">{[j.role_category, j.seniority, j.work_mode].filter((x) => x && x !== "Not specified" && x !== "Unknown").map(tv).join(" · ")}</span>
                <SkillChips skills={j.skill_list} max={7} have={profile.skills.length ? has : undefined} />
              </span>
              <span className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1.5 md:flex-col md:items-end md:justify-start">
                <Salary j={j} />
                <span className="tnum text-xs text-ink-3">{fmtDate(j.posted_date)}</span>
                {profile.skills.length > 0 && listed > 0 && (
                  <span className="flex w-full max-w-40 flex-col gap-1 md:items-end">
                    <span className="tnum text-xs font-medium text-ink-2">{t(`${matched} of ${listed} skills`, `${matched} من ${listed} مهارات`)}</span>
                    <CoverageStrip size="sm" label={t(`You have ${matched} of ${listed} listed skills`, `لديك ${matched} من ${listed} مهارات مذكورة`)}
                      items={j.skill_list.map((s) => ({ skill: s.skill, weight: weight.get(s.skill) ?? null, have: has(s.skill) }))} />
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Salary({ j }: { j: Job }) {
  if (j.salary_kind === "advertised") {
    return <span className="tnum text-sm font-semibold text-ink">{fmtUsdFull(j.salary_usd_annual)}<span className="ms-1 text-xs font-normal text-ink-3">{t("/yr", "/سنة")}</span></span>;
  }
  if (j.salary_kind === "benchmark") {
    return <span className="tnum text-sm text-ink-3" title={t("Market benchmark attached by the team, not the posting's pay", "قيمة مرجعية للسوق أرفقها الفريق، وليست راتب الإعلان")}>
      {fmtUsdFull(j.salary_usd_annual)} <span className="text-xs">{t("benchmark", "مرجعي")}</span></span>;
  }
  return <span className="text-xs text-ink-3">{t("Salary not stated", "الراتب غير مذكور")}</span>;
}

export function SkillChips({ skills, max, have }: { skills: SkillChip[]; max?: number; have?: (s: string) => boolean }) {
  if (!skills.length) return null;
  const shown = max ? skills.slice(0, max) : skills;
  return (
    <span className="mt-2.5 flex flex-wrap gap-1.5">
      {shown.map((s) => {
        const mine = have?.(s.skill);
        return (
          <span key={s.skill} title={s.observed ? t(`${s.skill} — written in the posting data`, `${s.skill} — مذكورة في بيانات الإعلان`) : t(`${s.skill} — added by the team after collection`, `${s.skill} — أضافها الفريق بعد الجمع`)}
            className={clsx("rounded-md px-1.5 py-0.5 text-xs",
              mine ? "bg-good-soft font-medium text-good" : s.observed ? "bg-panel-2 text-ink-2" : "border border-dashed border-line-strong text-ink-3")}>
            {s.skill}{!s.observed && <span className="sr-only">{t(" (added by team)", " (أضافها الفريق)")}</span>}{mine && <span className="sr-only">{t(" (you have it)", " (لديك)")}</span>}
          </span>
        );
      })}
      {max && skills.length > max && <span className="px-1 py-0.5 text-xs text-ink-3">+{skills.length - max}</span>}
    </span>
  );
}

function Pager({ page, maxPage, pages, onPage }: { page: number; maxPage: number; pages: number; onPage: (p: number) => void }) {
  return (
    <nav aria-label={t("Pagination", "التنقل بين الصفحات")} className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-sm">
      <Button variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={15} className="rtl:rotate-180" /> {t("Previous", "السابق")}</Button>
      {pages > maxPage && page >= maxPage
        ? <span className="text-xs text-ink-3">{t("Only the first 10,000 results are browsable. Narrow the filters to see the rest.", "يمكن تصفح أول 10,000 نتيجة فقط. ضيّق عوامل التصفية لرؤية الباقي.")}</span>
        : <span className="tnum text-ink-3">{t(`Page ${fmtInt(page)} of ${fmtInt(pages)}`, `الصفحة ${fmtInt(page)} من ${fmtInt(pages)}`)}</span>}
      <Button variant="ghost" disabled={page >= maxPage} onClick={() => onPage(page + 1)}>{t("Next", "التالي")} <ChevronRight size={15} className="rtl:rotate-180" /></Button>
    </nav>
  );
}
