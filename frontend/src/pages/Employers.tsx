import clsx from "clsx";
import { ArrowRight, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HBar, SkillBars } from "../components/charts";
import { Button, Callout, ChartPanel, Empty, ErrorState, Guard, IconButton, PageHeader, Pill, Select } from "../components/ui";
import { useApi } from "../lib/api";
import { HUE } from "../lib/echarts";
import { drillHref } from "../lib/filters";
import { fmtDate, fmtInt, fmtPct, fmtUsd } from "../lib/format";
import { useFilters, useLabels, useParam, useUpdateParams } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import { haveSet, useProfile } from "../lib/profile";
import type { Count, Kpis, SalarySummary, TopSkills } from "../lib/types";

interface Row { company: string; postings: number; appearances: number; countries: number; top_role: string; is_placeholder: boolean; salary_n: number; salary_median: number | null; last_posted: string | null }
interface EmployerData { company: string; is_placeholder: boolean; kpis: Kpis; titles: Count[]; roles: Count[]; countries: Count[]; seniority: Count[]; work_mode: Count[]; cohorts: Count[]; top_skills: TopSkills; salary: SalarySummary }

const PAGE_SIZE = 25;

export default function Employers() {
  const { filters } = useFilters();
  const [name, setName] = useParam("name", "");
  const [sort] = useParam("esort", "postings");
  const [boards] = useParam("boards", "");
  const update = useUpdateParams();
  const [pageStr, setPage] = useParam("epage", "1");
  const [search] = useParam("find", "");
  const [text, setText] = useState(search);
  useEffect(() => { const id = setTimeout(() => { if (text !== search) update({ find: text || null, epage: null }); }, 300); return () => clearTimeout(id); }, [text, search, update]);
  const page = Math.max(1, +pageStr || 1);
  const q = useApi<{ total: number; rows: Row[] }>("/companies", filters, { search: search || undefined, page, page_size: PAGE_SIZE, sort, include_placeholders: boards === "1" });
  const pages = q.data ? Math.max(1, Math.min(400, Math.ceil(q.data.total / PAGE_SIZE))) : 1;
  useEffect(() => {
    if (q.data && !q.isFetching && page > pages) update({ epage: pages > 1 ? String(pages) : null });
  }, [q.data, q.isFetching, page, pages, update]);

  return (
    <>
      <PageHeader title={t("Employers", "جهات التوظيف")}
        description={t("Who is hiring in your selection: how many postings each employer has, where, and what they ask for. Counts are postings in this sample, not company size or total hiring.",
          "من يوظّف ضمن اختيارك: عدد إعلانات كل جهة توظيف، وأين، وما الذي تطلبه. الأعداد هي إعلانات في هذه العينة، وليست حجم الشركة أو إجمالي التوظيف.")} />

      {name && <EmployerProfile name={name} onClose={() => setName(null)} />}

      <section aria-labelledby="dir-h" className="min-w-0 overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="dir-h" className="text-[0.9375rem] font-semibold text-ink">{t("Employer directory", "دليل جهات التوظيف")}</h2>
            <p className="mt-0.5 text-sm text-ink-3" aria-live="polite">
              {q.data ? t(`${fmtInt(q.data.total)} employers · select one to see its profile`, `${fmtInt(q.data.total)} جهة توظيف · اختر واحدة لعرض ملفها`) : t("Loading…", "جارٍ التحميل…")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative flex h-9 w-full items-center sm:w-64">
              <Search size={15} className="pointer-events-none absolute start-3 text-ink-3" />
              <span className="sr-only">{t("Find an employer", "ابحث عن جهة توظيف")}</span>
              <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Find an employer", "ابحث عن جهة توظيف")} maxLength={80} dir="auto"
                className="h-9 w-full rounded-lg border border-line-strong bg-panel ps-9 pe-2.5 text-sm placeholder:text-ink-3" />
            </label>
            <Select label={t("Sort", "الترتيب")} value={sort} onChange={(v) => update({ esort: v === "postings" ? null : v, epage: null })} options={[
              { value: "postings", label: t("Most postings", "الأكثر إعلانات") }, { value: "salary", label: t("Highest median pay", "أعلى وسيط أجر") },
              { value: "recent", label: t("Most recent", "الأحدث") }, { value: "name", label: t("Name", "الاسم") }]} />
          </div>
          <label className="flex basis-full items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={boards === "1"} onChange={(e) => update({ boards: e.target.checked ? "1" : null, epage: null })} className="size-4 accent-[var(--accent-ink)]" />
            {t("Include job boards and hidden employers (“Confidential”, Dice, Upwork …)", "تضمين مواقع التوظيف والجهات غير المعلنة («Confidential» وDice وUpwork …)")}
          </label>
        </div>
        <Guard q={q} h={480} empty={(d) => !d.rows.length}>
            {(d) => (<>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-panel-2/60 text-xs text-ink-3">
                    <tr>
                      <th scope="col" className="py-2.5 ps-5 pe-3 text-start font-medium">{t("Employer · most common role", "جهة التوظيف · الدور الأكثر شيوعًا")}</th>
                      <th scope="col" className="px-3 py-2.5 text-end font-medium" title={t("Unique postings after de-duplication; below, listings across all boards before de-duplication", "الإعلانات الفريدة بعد إزالة التكرار؛ وتحتها الإدراجات في كل المواقع قبل إزالة التكرار")}>{t("Postings", "الإعلانات")}</th>
                      <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Countries", "الدول")}</th>
                      <th scope="col" className="px-3 py-2.5 text-end font-medium" title={t("Median advertised salary, shown when at least 10 postings state one", "وسيط الراتب المعلن، يظهر عندما يذكره 10 إعلانات على الأقل")}>{t("Median pay", "وسيط الأجر")}</th>
                      <th scope="col" className="py-2.5 ps-3 pe-5 text-end font-medium">{t("Latest posting", "أحدث إعلان")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.rows.map((r) => {
                      const active = name === r.company;
                      return (
                        <tr key={r.company} className={clsx("border-t border-line transition-colors", active ? "bg-accent-soft" : "hover:bg-panel-2/70")}>
                          <td className="py-3 ps-5 pe-3">
                            <button type="button" onClick={() => setName(active ? null : r.company)} aria-pressed={active}
                              className={clsx("text-start font-medium hover:underline", active ? "text-accent-ink" : "text-ink")} dir="auto">{r.company}</button>
                            {r.is_placeholder && <> <Pill tone="warn" title={t("A job board or a hidden employer name, not one company", "موقع توظيف أو اسم جهة غير معلنة، وليس شركة واحدة")}>{t("board / hidden", "موقع / غير معلنة")}</Pill></>}
                            <span className="mt-0.5 block text-xs text-ink-3">{tv(r.top_role)}</span>
                          </td>
                          <td className="px-3 py-3 text-end">
                            <span className="tnum block font-medium text-ink">{fmtInt(r.postings)}</span>
                            {r.appearances !== r.postings && <span className="tnum block text-xs text-ink-3">{t(`${fmtInt(r.appearances)} listings`, `${fmtInt(r.appearances)} إدراج`)}</span>}
                          </td>
                          <td className="tnum px-3 py-3 text-end text-ink-2">{fmtInt(r.countries)}</td>
                          <td className="px-3 py-3 text-end" title={r.salary_median != null ? `n = ${r.salary_n}` : t("Fewer than 10 advertised salaries", "أقل من 10 رواتب معلنة")}>
                            {r.salary_median != null ? <>
                              <span className="tnum block text-ink">{fmtUsd(r.salary_median)}</span>
                              <span className="tnum block text-xs text-ink-3">n = {fmtInt(r.salary_n)}</span>
                            </> : <span className="text-ink-3">—</span>}
                          </td>
                          <td className="tnum py-3 ps-3 pe-5 text-end whitespace-nowrap text-ink-3">{fmtDate(r.last_posted)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <nav aria-label={t("Employer pages", "صفحات جهات التوظيف")} className="flex items-center justify-between gap-2 border-t border-line px-4 py-3 text-sm">
                <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(String(page - 1))}><ChevronLeft size={15} className="rtl:rotate-180" /> {t("Previous", "السابق")}</Button>
                <span className="tnum text-ink-3">{t(`Page ${page} of ${fmtInt(pages)}`, `الصفحة ${page} من ${fmtInt(pages)}`)}</span>
                <Button variant="ghost" disabled={page >= pages} onClick={() => setPage(String(page + 1))}>{t("Next", "التالي")} <ChevronRight size={15} className="rtl:rotate-180" /></Button>
              </nav>
            </>)}
        </Guard>
      </section>
    </>
  );
}

function EmployerProfile({ name, onClose }: { name: string; onClose: () => void }) {
  const { filters } = useFilters();
  const nav = useNavigate();
  const labels = useLabels();
  const { profile } = useProfile();
  const has = useMemo(() => (profile.skills.length ? haveSet(profile.skills) : undefined), [profile.skills]);
  const q = useApi<EmployerData>("/companies/profile", filters, { name });
  const noCountry = t("No country", "بلا دولة");
  const top = useRef<HTMLElement>(null);
  useEffect(() => { top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [name]);
  const allJobs = drillHref("/explorer", filters, { company: name });

  return (
    <section ref={top} aria-labelledby="emp-h" className="mb-8 scroll-mt-40 border-b border-line pb-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="emp-h" className="text-xl font-semibold tracking-[-0.01em] text-ink" dir="auto">{name}</h2>
          <p className="mt-0.5 text-sm text-ink-3">{t("Employer profile within your current filters", "ملف جهة التوظيف ضمن الفلاتر الحالية")}</p>
        </div>
        <div className="flex items-center gap-2">
          {q.data && (
            <Link to={allJobs} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-medium text-white no-underline hover:bg-accent-ink dark:text-[#0b0f17]">
              {t(`See its ${fmtInt(q.data.kpis.postings)} jobs`, `اعرض وظائفها (${fmtInt(q.data.kpis.postings)})`)} <ArrowRight size={15} className="rtl:rotate-180" />
            </Link>
          )}
          <IconButton label={t("Close employer profile", "إغلاق ملف جهة التوظيف")} onClick={onClose}><X size={16} /></IconButton>
        </div>
      </div>

      {q.error?.status === 404 ? <div className="rounded-xl border border-line bg-panel"><Empty title={t("No postings for this employer with the current filters", "لا إعلانات لجهة التوظيف هذه مع الفلاتر الحالية")} /></div>
        : q.error ? <ErrorState error={q.error} retry={() => q.refetch()} /> : (
        <Guard q={q} h={360}>
          {(p) => {
            const skills = p.top_skills.rows;
            const matched = has ? skills.filter((s) => has(s.skill)).length : 0;
            const salaryOk = p.salary.overall.median != null && p.salary.overall.n >= 10;
            return (
              <div className="grid gap-4">
                {p.is_placeholder && <Callout tone="warn">{t("This name is a job board or a hidden-employer label, so its postings belong to many different companies.",
                  "هذا الاسم موقع توظيف أو تسمية لجهة غير معلنة، لذا تعود إعلاناته إلى شركات عديدة مختلفة.")}</Callout>}

                <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-line bg-panel px-5 py-4 sm:grid-cols-3 xl:grid-cols-6">
                  <Fact label={t("Unique postings", "إعلانات فريدة")} value={fmtInt(p.kpis.postings)} sub={t(`${fmtInt(p.kpis.appearances)} listings across boards`, `${fmtInt(p.kpis.appearances)} إدراج في المواقع`)} />
                  <Fact label={t("Countries", "الدول")} value={fmtInt(p.kpis.countries)} />
                  <Fact label={t("Distinct titles", "مسميات مختلفة")} value={fmtInt(p.kpis.distinct_titles)} />
                  <Fact label={t("Remote postings", "إعلانات عن بُعد")} value={fmtInt(p.kpis.remote)} sub={p.kpis.postings ? t(`${fmtPct(p.kpis.remote / p.kpis.postings, 0)} of its postings`, `${fmtPct(p.kpis.remote / p.kpis.postings, 0)} من إعلاناتها`) : undefined} />
                  <Fact label={t("Advertised salaries", "رواتب معلنة")} value={fmtInt(p.salary.overall.n)}
                    sub={salaryOk ? t(`median ${fmtUsd(p.salary.overall.median)} a year`, `الوسيط ${fmtUsd(p.salary.overall.median)} سنويًا`)
                      : <span className="text-warn">{t("too few for a median", "أقل من أن يُحسب لها وسيط")}</span>} />
                  <Fact label={t("Collection", "دفعة الجمع")} value={p.cohorts.map((c) => fmtPct(c.share ?? 0, 0)).join(" / ")} sub={p.cohorts.map((c) => labels.cohort(c.key)).join(" / ")} />
                </dl>

                <ChartPanel title={t("Skills this employer asks for", "المهارات التي تطلبها جهة التوظيف هذه")}
                  meta={<>
                    {t(`Share of its ${fmtInt(p.top_skills.denominator)} postings that list skills`, `النسبة من ${fmtInt(p.top_skills.denominator)} إعلانًا لها يذكر مهارات`)}
                    {has && skills.length > 0 && <span className="text-good">{t(` · you have ${matched} of these ${skills.length} (teal)`, ` · لديك ${matched} من هذه الـ${skills.length} (بالأخضر)`)}</span>}
                  </>}
                  table={{ columns: [t("Skill", "المهارة"), t("Postings", "الإعلانات"), t("Written in posting", "مذكورة في الإعلان"), t("Added by team", "أضافها الفريق"), t("Share", "النسبة")], filename: "employer-skills",
                    rows: skills.map((s) => [s.skill, s.postings, s.observed, s.added, fmtPct(s.share)]) }}>
                  {(h) => skills.length ? <SkillBars handle={h} rows={skills} denominator={p.top_skills.denominator} observedOnly={filters.provenance === "observed"} have={has}
                    onSelect={(s) => nav(drillHref("/skills", filters, { company: name }, { view: s }))} />
                    : <p className="text-sm text-ink-3">{t("No skill data for this employer.", "لا توجد بيانات مهارات لجهة التوظيف هذه.")}</p>}
                </ChartPanel>

                <div className="grid gap-4 lg:grid-cols-3">
                  <ChartPanel title={t("Job titles it posts most", "أكثر المسميات التي تنشرها")} table={{ columns: [t("Title", "المسمى"), t("Postings", "الإعلانات")], filename: "employer-titles", rows: p.titles.map((x) => [x.key, x.n]) }}>
                    {(h) => <HBar handle={h} label={t("Titles", "المسميات")} maxLabel={34} data={p.titles.map((x) => ({ label: x.key, value: x.n }))} />}
                  </ChartPanel>
                  <ChartPanel title={t("Where it hires", "أين توظّف")} meta={t("Select a country to see those jobs", "اختر دولة لعرض وظائفها")}
                    table={{ columns: [t("Country", "الدولة"), t("Postings", "الإعلانات")], filename: "employer-countries", rows: p.countries.map((x) => [x.key ?? noCountry, x.n]) }}>
                    {(h) => <HBar handle={h} label={t("Countries", "الدول")} color={HUE.place} data={p.countries.map((x) => ({ label: x.key ?? noCountry, value: x.n, share: x.share }))}
                      onSelect={(c) => c !== noCountry && nav(drillHref("/explorer", filters, { company: name, country: c }))} />}
                  </ChartPanel>
                  <ChartPanel title={t("Seniority asked for", "مستوى الخبرة المطلوب")} meta={t("Grey = the title states no level", "الرمادي = المسمى لا يذكر مستوى")}
                    table={{ columns: [t("Seniority", "مستوى الخبرة"), t("Postings", "الإعلانات")], filename: "employer-seniority", rows: p.seniority.map((x) => [x.key, x.n]) }}>
                    {(h) => <HBar handle={h} label={t("Seniority", "مستوى الخبرة")} data={p.seniority.map((x) => ({ label: x.key, value: x.n, share: x.share, muted: x.key === "Not specified" }))} />}
                  </ChartPanel>
                </div>
              </div>
            );
          }}
        </Guard>
      )}
    </section>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="m-0 mt-0.5">
        <span className="tnum block text-lg font-semibold tracking-[-0.01em] text-ink">{value}</span>
        {sub && <span className="block text-xs leading-4 text-ink-3 [overflow-wrap:anywhere]">{sub}</span>}
      </dd>
    </div>
  );
}
