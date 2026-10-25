import clsx from "clsx";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HBar, SkillBars } from "../components/charts";
import { Kpi, KpiStrip } from "../components/Kpi";
import { Button, Callout, ChartPanel, Empty, ErrorState, Guard, IconButton, PageHeader, Panel, Pill, Select, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { HUE } from "../lib/echarts";
import { drillHref } from "../lib/filters";
import { fmtDate, fmtInt, fmtUsd } from "../lib/format";
import { useFilters, useLabels, useParam, useUpdateParams } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import type { Count, Kpis, SalarySummary, TopSkills } from "../lib/types";

interface Row { company: string; postings: number; appearances: number; countries: number; top_role: string; is_placeholder: boolean; salary_n: number; salary_median: number | null; last_posted: string | null }
interface Profile { company: string; is_placeholder: boolean; kpis: Kpis; titles: Count[]; roles: Count[]; countries: Count[]; seniority: Count[]; work_mode: Count[]; cohorts: Count[]; top_skills: TopSkills; salary: SalarySummary }

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
  const q = useApi<{ total: number; rows: Row[] }>("/companies", filters, { search: search || undefined, page, page_size: 25, sort, include_placeholders: boards === "1" });
  const pages = q.data ? Math.max(1, Math.min(400, Math.ceil(q.data.total / 25))) : 1;
  useEffect(() => {
    if (q.data && !q.isFetching && page > pages) update({ epage: pages > 1 ? String(pages) : null });
  }, [q.data, q.isFetching, page, pages, update]);

  return (
    <>
      <PageHeader title={t("Employers", "جهات التوظيف")}
        description={t("Who posts the jobs in your selection, what they ask for and where. Counts are postings in this sample — not workforce size or total hiring.",
          "من ينشر الوظائف في اختيارك، وما الذي يطلبه وأين. الأعداد هي إعلانات في هذه العينة — وليست حجم القوى العاملة أو إجمالي التوظيف.")} />
      {name && <EmployerProfile name={name} onClose={() => setName(null)} />}
      <Panel title={t("Employer directory", "دليل جهات التوظيف")} meta={q.data ? t(`${fmtInt(q.data.total)} employers`, `${fmtInt(q.data.total)} جهة توظيف`) : undefined}
        actions={<Select label={t("Sort", "الترتيب")} value={sort} onChange={(v) => update({ esort: v === "postings" ? null : v, epage: null })} options={[
          { value: "postings", label: t("Most postings", "الأكثر إعلانات") }, { value: "salary", label: t("Highest median pay", "أعلى وسيط أجر") },
          { value: "recent", label: t("Most recent", "الأحدث") }, { value: "name", label: t("Name", "الاسم") }]} />}>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="relative flex h-8 min-w-[220px] items-center">
            <Search size={15} className="pointer-events-none absolute start-2.5 text-ink-3" />
            <span className="sr-only">{t("Find an employer", "ابحث عن جهة توظيف")}</span>
            <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Find an employer", "ابحث عن جهة توظيف")} maxLength={80} dir="auto"
              className="h-8 w-full rounded-md border border-line-strong bg-panel ps-8 pe-2 text-sm placeholder:text-ink-3" />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={boards === "1"} onChange={(e) => update({ boards: e.target.checked ? "1" : null, epage: null })} className="size-4 accent-[var(--accent-ink)]" />
            {t("Include job boards and hidden employers (“Confidential”, Dice, Upwork …)", "تضمين مواقع التوظيف والجهات غير المعلنة («Confidential» وDice وUpwork …)")}
          </label>
        </div>
        <Guard q={q} h={480} empty={(d) => !d.rows.length}>
          {(d) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-start text-xs text-ink-3">
                  <tr>
                    <th scope="col" className="py-2 pe-2 text-start font-medium">{t("Employer", "جهة التوظيف")}</th>
                    <th scope="col" className="px-2 py-2 text-end font-medium" title={t("Unique postings after de-duplication", "الإعلانات الفريدة بعد إزالة التكرار")}>{t("Postings", "الإعلانات")}</th>
                    <th scope="col" className="px-2 py-2 text-end font-medium" title={t("Listings across all boards before de-duplication", "الإدراجات في كل المواقع قبل إزالة التكرار")}>{t("Listings", "الإدراجات")}</th>
                    <th scope="col" className="px-2 py-2 text-end font-medium">{t("Countries", "الدول")}</th>
                    <th scope="col" className="px-2 py-2 text-start font-medium">{t("Most common role", "الدور الأكثر شيوعًا")}</th>
                    <th scope="col" className="px-2 py-2 text-end font-medium">{t("Median pay", "وسيط الأجر")}</th>
                    <th scope="col" className="py-2 ps-2 text-end font-medium">{t("Latest", "الأحدث")}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((r) => (
                    <tr key={r.company} className={clsx("border-t border-line hover:bg-panel-2", name === r.company && "bg-accent-soft")}>
                      <td className="py-1.5 pe-2">
                        <button type="button" onClick={() => setName(r.company)} className="text-start font-medium text-ink hover:underline" dir="auto">{r.company}</button>
                        {r.is_placeholder && <> <Pill tone="warn" title={t("A job board or a hidden employer name, not one company", "موقع توظيف أو اسم جهة غير معلنة، وليس شركة واحدة")}>{t("board / hidden", "موقع / غير معلنة")}</Pill></>}
                      </td>
                      <td className="tnum px-2 py-1.5 text-end">{fmtInt(r.postings)}</td>
                      <td className="tnum px-2 py-1.5 text-end text-ink-3">{fmtInt(r.appearances)}</td>
                      <td className="tnum px-2 py-1.5 text-end text-ink-2">{fmtInt(r.countries)}</td>
                      <td className="px-2 py-1.5 text-ink-2">{tv(r.top_role)}</td>
                      <td className="tnum px-2 py-1.5 text-end text-ink-2" title={r.salary_median != null ? `n = ${r.salary_n}` : t("Fewer than 10 advertised salaries", "أقل من 10 رواتب معلنة")}>{r.salary_median != null ? fmtUsd(r.salary_median) : "—"}</td>
                      <td className="tnum py-1.5 ps-2 text-end text-ink-3">{fmtDate(r.last_posted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <nav aria-label={t("Employer pages", "صفحات جهات التوظيف")} className="mt-3 flex items-center justify-between text-sm">
                <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(String(page - 1))}><ChevronLeft size={15} className="rtl:rotate-180" /> {t("Previous", "السابق")}</Button>
                <span className="tnum text-ink-3">{t(`Page ${page} of ${fmtInt(pages)}`, `الصفحة ${page} من ${fmtInt(pages)}`)}</span>
                <Button variant="ghost" disabled={page >= pages} onClick={() => setPage(String(page + 1))}>{t("Next", "التالي")} <ChevronRight size={15} className="rtl:rotate-180" /></Button>
              </nav>
            </div>
          )}
        </Guard>
      </Panel>
    </>
  );
}

function EmployerProfile({ name, onClose }: { name: string; onClose: () => void }) {
  const { filters } = useFilters();
  const nav = useNavigate();
  const labels = useLabels();
  const q = useApi<Profile>("/companies/profile", filters, { name });
  const noCountry = t("No country", "بلا دولة");
  return (
    <Panel className="mb-4 border-accent-line" title={<span dir="auto">{name}</span>} meta={t("Employer profile within the current filters", "ملف جهة التوظيف ضمن عوامل التصفية الحالية")}
      actions={<IconButton label={t("Close employer profile", "إغلاق ملف جهة التوظيف")} onClick={onClose}><X size={16} /></IconButton>}>
      {q.error?.status === 404 ? <Empty title={t("No postings for this employer with the current filters", "لا إعلانات لجهة التوظيف هذه مع عوامل التصفية الحالية")} />
        : q.error ? <ErrorState error={q.error} retry={() => q.refetch()} /> : (
        <Guard q={q} h={360}>
          {(p) => (
            <div className="grid gap-4">
              {p.is_placeholder && <Callout tone="warn">{t("This name is a job board or a hidden-employer label, so its postings belong to many different companies.",
                "هذا الاسم موقع توظيف أو تسمية لجهة غير معلنة، لذا تعود إعلاناته إلى شركات عديدة مختلفة.")}</Callout>}
              <KpiStrip>
                <Kpi label={t("Unique postings", "إعلانات فريدة")} value={fmtInt(p.kpis.postings)}
                  sub={t(`${fmtInt(p.kpis.appearances)} listings across boards`, `${fmtInt(p.kpis.appearances)} إدراج في المواقع`)} />
                <Kpi label={t("Countries", "الدول")} value={fmtInt(p.kpis.countries)} />
                <Kpi label={t("Distinct titles", "مسميات مختلفة")} value={fmtInt(p.kpis.distinct_titles)} />
                <Kpi label={t("Remote", "عن بُعد")} value={fmtInt(p.kpis.remote)} />
                <Kpi label={t("Advertised salaries", "رواتب معلنة")} value={fmtInt(p.salary.overall.n)}
                  sub={p.salary.overall.median != null && p.salary.overall.n >= 10 ? t(`median ${fmtUsd(p.salary.overall.median)}`, `الوسيط ${fmtUsd(p.salary.overall.median)}`) : t("too few for a median", "أقل من أن يُحسب لها وسيط")} />
                <Kpi label={t("Collection", "دفعة الجمع")} value={p.cohorts.map((c) => `${Math.round((c.share ?? 0) * 100)}%`).join(" / ")} sub={p.cohorts.map((c) => labels.cohort(c.key)).join(" / ")} />
              </KpiStrip>
              <div className="grid gap-4 lg:grid-cols-3">
                <ChartPanel title={t("Most advertised titles", "أكثر المسميات إعلانًا")} table={{ columns: [t("Title", "المسمى"), t("Postings", "الإعلانات")], filename: "employer-titles", rows: p.titles.map((x) => [x.key, x.n]) }}>
                  {(h) => <HBar handle={h} label={t("Titles", "المسميات")} maxLabel={34} data={p.titles.map((x) => ({ label: x.key, value: x.n }))} />}
                </ChartPanel>
                <ChartPanel title={t("Where", "أين")} table={{ columns: [t("Country", "الدولة"), t("Postings", "الإعلانات")], filename: "employer-countries", rows: p.countries.map((x) => [x.key ?? noCountry, x.n]) }}>
                  {(h) => <HBar handle={h} label={t("Countries", "الدول")} color={HUE.place} data={p.countries.map((x) => ({ label: x.key ?? noCountry, value: x.n, share: x.share }))}
                    onSelect={(c) => c !== noCountry && nav(drillHref("/explorer", filters, { company: name, country: c }))} />}
                </ChartPanel>
                <ChartPanel title={t("Seniority", "مستوى الخبرة")} table={{ columns: [t("Seniority", "مستوى الخبرة"), t("Postings", "الإعلانات")], filename: "employer-seniority", rows: p.seniority.map((x) => [x.key, x.n]) }}>
                  {(h) => <HBar handle={h} label={t("Seniority", "مستوى الخبرة")} data={p.seniority.map((x) => ({ label: x.key, value: x.n, share: x.share, muted: x.key === "Not specified" }))} />}
                </ChartPanel>
              </div>
              <ChartPanel title={t("Skills this employer asks for", "المهارات التي تطلبها جهة التوظيف هذه")}
                meta={t(`Share of its ${fmtInt(p.top_skills.denominator)} postings that list skills`, `النسبة من ${fmtInt(p.top_skills.denominator)} إعلان لها يذكر مهارات`)}>
                {(h) => p.top_skills.rows.length ? <SkillBars handle={h} rows={p.top_skills.rows} denominator={p.top_skills.denominator} observedOnly={filters.provenance === "observed"} />
                  : <p className="text-sm text-ink-3">{t("No skill data for this employer.", "لا توجد بيانات مهارات لجهة التوظيف هذه.")}</p>}
              </ChartPanel>
              <TextLink to={drillHref("/explorer", filters, { company: name })}>{t(`Open all ${fmtInt(p.kpis.postings)} postings`, `افتح كل الإعلانات (${fmtInt(p.kpis.postings)})`)}</TextLink>
            </div>
          )}
        </Guard>
      )}
    </Panel>
  );
}
