import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CohortMonths, HBar, Histogram, SkillBars } from "../components/charts";
import { Kpi, KpiStrip } from "../components/Kpi";
import { Lattice } from "../components/Lattice";
import { ChartPanel, Empty, Guard, PageHeader, Panel, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { HUE } from "../lib/echarts";
import { drillHref, filterParams } from "../lib/filters";
import { fmtDate, fmtInt, fmtPct } from "../lib/format";
import { useFilters, useLabels } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import type { Count, Matrix, Overview as OverviewData } from "../lib/types";

export default function Overview() {
  const { filters } = useFilters();
  const nav = useNavigate();
  const labels = useLabels();
  const q = useApi<OverviewData>("/overview", filters);
  const lattice = useApi<Matrix>("/skills/matrix", filters, { dim: "role_category", groups: 10, top: 16 });
  const go = (path: string, add: Record<string, string>, extra: Record<string, string> = {}) => nav(drillHref(path, filters, add, extra));
  const qs = new URLSearchParams(filterParams(filters)).toString();
  const link = (p: string) => (qs ? `${p}?${qs}` : p);
  const noCountry = t("No country", "بلا دولة");

  return (
    <>
      <PageHeader title={t("Market overview", "نظرة عامة على السوق")}
        description={t("Demand, skills and advertised pay across the postings in your selection. Every bar opens the postings behind it.",
          "الطلب والمهارات والرواتب المعلنة في إعلانات الوظائف التي اخترتها. كل شريط يفتح الإعلانات التي يمثّلها.")} />
      <Guard q={q} h={96} empty={(d) => d.kpis.postings === 0}>
        {(d) => {
          const k = d.kpis;
          const kaggle = d.cohorts.find((c) => c.key === "kaggle_2023")?.share ?? 0;
          return (<>
            <KpiStrip>
              <Kpi label={t("Unique postings", "إعلانات فريدة")} value={fmtInt(k.postings)}
                sub={t(`from ${fmtInt(k.appearances)} listings`, `من ${fmtInt(k.appearances)} إدراج`)} />
              <Kpi label={t("Countries", "الدول")} value={fmtInt(k.countries)}
                sub={t(`${fmtInt(k.no_country)} remote / no country`, `${fmtInt(k.no_country)} عن بُعد / بلا دولة`)} />
              <Kpi label={t("Employers", "جهات التوظيف")} value={fmtInt(k.employers)}
                sub={t("named employers, job boards excluded", "جهات مسمّاة، دون مواقع التوظيف")} />
              <Kpi label={t("Distinct skills", "مهارات مختلفة")} value={fmtInt(k.distinct_skills)}
                sub={t(`${fmtPct(k.with_skills / k.postings)} of postings list skills`, `${fmtPct(k.with_skills / k.postings)} من الإعلانات تذكر مهارات`)} />
              <Kpi label={t("Advertised salary", "راتب معلن")} value={fmtInt(k.advertised_salary)}
                sub={t(`${fmtPct(k.advertised_salary / k.postings)} · ${fmtInt(k.benchmark_salary)} benchmarks kept apart`,
                  `${fmtPct(k.advertised_salary / k.postings)} · ${fmtInt(k.benchmark_salary)} قيمة مرجعية محسوبة على حدة`)} />
              <Kpi label={t("Posting dates", "تواريخ النشر")} value={k.first_posted ? `${k.first_posted.slice(0, 4)}–${k.last_posted?.slice(0, 4)}` : "—"}
                sub={`${fmtDate(k.first_posted)} – ${fmtDate(k.last_posted)}`} />
            </KpiStrip>

            {kaggle > 0.5 && (
              <p className="mt-3 text-sm text-ink-2">
                {t(`${fmtPct(kaggle, 0)} of these postings come from the 2023 Kaggle archive, which covers data roles only — so data roles and data skills lead the rankings below.`,
                `${fmtPct(kaggle, 0)} من هذه الإعلانات مصدرها أرشيف Kaggle لعام 2023، وهو يغطي وظائف البيانات فقط — لذلك تتصدر وظائف البيانات ومهاراتها الترتيب أدناه.`)}{" "}
                <TextLink to="/quality">{t("How the data was built", "كيف بُنيت البيانات")}</TextLink>
              </p>
            )}

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <ChartPanel title={t("Postings by role", "الإعلانات حسب الدور")}
                meta={t(`Share of ${fmtInt(k.postings)} postings · role from title rules`, `النسبة من ${fmtInt(k.postings)} إعلان · الدور مستنتج من قواعد المسمى الوظيفي`)}
                info={t("Role category is assigned from the job title by documented keyword rules (src/clean_utils.py). It is a baseline, not a trained classifier.",
                  "تُحدَّد فئة الدور من المسمى الوظيفي بقواعد كلمات مفتاحية موثقة (src/clean_utils.py). إنها تصنيف أساسي، لا نموذج مدرَّب.")}
                table={countTable(d.roles, t("Role", "الدور"), "roles")}>
                {(h) => <HBar label={t("Postings by role", "الإعلانات حسب الدور")} handle={h} data={d.roles.map((r) => ({ label: r.key, value: r.n, share: r.share }))}
                  onSelect={(role) => go("/explorer", { role })} />}
              </ChartPanel>
              <ChartPanel title={t("Most requested skills", "المهارات الأكثر طلبًا")}
                meta={t(`Share of ${fmtInt(d.top_skills.denominator)} postings that list skills`, `النسبة من ${fmtInt(d.top_skills.denominator)} إعلان يذكر مهارات`)}
                info={t("Solid = the skill was in the posting data as collected. Hatched = the team added it later (inferred from the title or similar postings). Switch 'Written in posting' in the filter bar to count only the solid part.",
                  "المصمت = المهارة موجودة في بيانات الإعلان كما جُمعت. المخطط = أضافها الفريق لاحقًا (استنتاجًا من المسمى أو من إعلانات مشابهة). اختر «مذكورة في الإعلان» في شريط التصفية لاحتساب الجزء المصمت فقط.")}
                table={{ columns: [t("Skill", "المهارة"), t("Postings", "الإعلانات"), t("Share", "النسبة"), t("Written in posting", "مذكورة في الإعلان"), t("Added by team", "أضافها الفريق")], filename: "top-skills",
                  rows: d.top_skills.rows.map((r) => [r.skill, r.postings, fmtPct(r.share), r.observed, r.added]) }}>
                {(h) => <SkillBars handle={h} rows={d.top_skills.rows} denominator={d.top_skills.denominator}
                  observedOnly={filters.provenance === "observed"} onSelect={(s) => nav(link("/skills") + `${qs ? "&" : "?"}view=${encodeURIComponent(s)}`)} />}
              </ChartPanel>
            </div>
          </>);
        }}
      </Guard>

      <Panel className="mt-4" title={t("Which skills each role asks for", "المهارات التي يطلبها كل دور")}
        meta={t("The 10 largest roles × the 16 most requested skills", "أكبر 10 أدوار × أكثر 16 مهارة طلبًا")}
        info={t("Share = postings in the role that list the skill ÷ postings in the role that list any skill. Rows with fewer than 30 such postings are framed with a dashed line.",
          "النسبة = إعلانات الدور التي تذكر المهارة ÷ إعلانات الدور التي تذكر أي مهارة. الصفوف التي تضم أقل من 30 إعلانًا من هذا النوع محاطة بخط متقطع.")}>
        <Guard q={lattice} h={420} empty={(m) => !m.groups.length}>
          {(m) => <Lattice matrix={m} rowLabel={t("Role", "الدور")} caption={t("Share of each role's postings that list each skill", "نسبة إعلانات كل دور التي تذكر كل مهارة")}
            rowName={tv} onSelect={(role, skill) => go("/explorer", { role, skill })} />}
        </Guard>
      </Panel>

      <Guard q={q} h={300} empty={(d) => d.kpis.postings === 0}>
        {(d) => (<>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <ChartPanel title={t("Top countries", "أبرز الدول")} className="xl:col-span-1"
              meta={t(`${fmtInt(d.kpis.no_country)} postings have no single country (remote or unknown)`, `${fmtInt(d.kpis.no_country)} إعلان بلا دولة محددة (عن بُعد أو غير معروفة)`)}
              table={countTable(d.countries, t("Country", "الدولة"), "countries")}
              extraActions={<TextLink to={link("/geography")}>{t("Map", "الخريطة")}</TextLink>}>
              {(h) => <HBar label={t("Postings by country", "الإعلانات حسب الدولة")} handle={h} color={HUE.place} data={d.countries.map((r) => ({ label: r.key ?? noCountry, value: r.n, share: r.share }))}
                onSelect={(country) => country !== noCountry && go("/explorer", { country })} />}
            </ChartPanel>
            <div className="grid gap-4">
              <ChartPanel title={t("Market type", "نوع السوق")} meta={t("Remote > Arab League country > other country", "عن بُعد > دولة في الجامعة العربية > دولة أخرى")}
                table={countTable(d.markets, t("Market", "السوق"), "markets")}
                info={t("Documented rule (FR-04): a posting is Remote if marked remote or from a remote board; otherwise Arab if located in an Arab League country; otherwise International.",
                  "قاعدة موثقة (FR-04): يُصنَّف الإعلان «عن بُعد» إذا وُسم بذلك أو جاء من موقع للعمل عن بُعد؛ وإلا «عربي» إذا كان في دولة من الجامعة العربية؛ وإلا «دولي».")}>
                {(h) => <HBar label={t("Postings by market type", "الإعلانات حسب نوع السوق")} handle={h} color={HUE.place} data={d.markets.map((r) => ({ label: r.key, value: r.n, share: r.share }))}
                  onSelect={(market) => go("/explorer", { market })} />}
              </ChartPanel>
              <ChartPanel title={t("Work mode", "نمط العمل")} table={countTable(d.work_mode, t("Work mode", "نمط العمل"), "work-mode")}
                meta={t("Hybrid is rarely stated in the sources", "نادرًا ما تذكر المصادر العمل الهجين")}>
                {(h) => <HBar label={t("Postings by work mode", "الإعلانات حسب نمط العمل")} handle={h} color={HUE.place} data={d.work_mode.map((r) => ({ label: r.key, value: r.n, share: r.share }))}
                  onSelect={(work_mode) => go("/explorer", { work_mode })} />}
              </ChartPanel>
            </div>
            <div className="grid gap-4">
              <ChartPanel title={t("Seniority", "مستوى الخبرة")} meta={t("From title keywords; most titles state none", "من كلمات المسمى الوظيفي؛ معظم المسميات لا تذكره")}
                table={countTable(d.seniority, t("Seniority", "مستوى الخبرة"), "seniority")}>
                {(h) => <HBar label={t("Postings by seniority", "الإعلانات حسب مستوى الخبرة")} handle={h} data={d.seniority.map((r) => ({ label: r.key, value: r.n, share: r.share, muted: r.key === "Not specified" }))}
                  onSelect={(seniority) => go("/explorer", { seniority })} />}
              </ChartPanel>
              <ChartPanel title={t("Employment type", "نوع التوظيف")} table={countTable(d.job_type, t("Employment type", "نوع التوظيف"), "employment-type")}>
                {(h) => <HBar label={t("Postings by employment type", "الإعلانات حسب نوع التوظيف")} handle={h} data={d.job_type.map((r) => ({ label: r.key, value: r.n, share: r.share, muted: r.key === "Unknown" }))}
                  onSelect={(job_type) => go("/explorer", { job_type })} />}
              </ChartPanel>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartPanel title={t("Advertised salaries", "الرواتب المعلنة")}
              meta={t(`${fmtInt(d.kpis.advertised_salary)} postings state their pay · annualized, approximate USD`, `${fmtInt(d.kpis.advertised_salary)} إعلان يذكر الراتب · سنويًا، بالدولار الأمريكي تقريبًا`)}
              info={t("Only the posting's own salary. Benchmarks the team attached (Paylab, Indeed, BLS) are excluded here and shown separately in the Salaries module. Ranges use their midpoint; hourly pay × 2080, monthly × 12; currencies converted at fixed approximate rates.",
                "راتب الإعلان نفسه فقط. القيم المرجعية التي أرفقها الفريق (Paylab وIndeed وBLS) مستبعدة هنا وتظهر منفصلة في قسم الرواتب. تُستخدم نقطة منتصف النطاق؛ الأجر بالساعة × 2080، والشهري × 12؛ وتُحوَّل العملات بأسعار تقريبية ثابتة.")}
              table={{ columns: [t("From (USD/yr)", "من (دولار/سنة)"), t("Postings", "الإعلانات")], filename: "salary-histogram", rows: d.salary_histogram.map((b) => [b.bin, b.n]) }}
              extraActions={<TextLink to={link("/salary")}>{t("Salary lab", "مختبر الرواتب")}</TextLink>}>
              {(h) => d.kpis.advertised_salary < 10
                ? <Empty title={t("Too few advertised salaries", "عدد الرواتب المعلنة قليل جدًا")} hint={t("Fewer than 10 postings in this selection state a salary.", "أقل من 10 إعلانات في هذا الاختيار تذكر الراتب.")} />
                : <Histogram handle={h} label={t("Distribution of advertised annual salaries", "توزيع الرواتب السنوية المعلنة")} bins={d.salary_histogram} binWidth={20000} cap={300000} />}
            </ChartPanel>
            <ChartPanel title={t("Postings by month and collection", "الإعلانات حسب الشهر ودفعة الجمع")}
              meta={t("Two separate collections, each on its own scale — not one continuous series", "دفعتا جمع منفصلتان، لكل منهما مقياسها — وليستا سلسلة واحدة متصلة")}
              info={t("The 2023 archive and the 2024–26 collection were gathered by different methods from different sources. Read each line on its own; the gap between them is not a trend.",
                "جُمع أرشيف 2023 ودفعة 2024–26 بطرق مختلفة ومن مصادر مختلفة. اقرأ كل خط على حدة؛ الفجوة بينهما ليست اتجاهًا.")}
              table={{ columns: [t("Collection", "دفعة الجمع"), t("Month", "الشهر"), t("Postings", "الإعلانات")], filename: "postings-by-month", rows: d.months.map((m) => [labels.cohort(m.cohort), m.month.slice(0, 7), m.n]) }}
              extraActions={<TextLink to={link("/trends")}>{t("Time view", "العرض الزمني")}</TextLink>}>
              {(h) => <CohortMonths handle={h} months={d.months} cohortLabel={labels.cohort} />}
            </ChartPanel>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartPanel title={t("Skill categories", "فئات المهارات")}
              meta={t(`Share of ${fmtInt(d.skill_categories.denominator)} postings listing at least one skill in the category`, `النسبة من ${fmtInt(d.skill_categories.denominator)} إعلان يذكر مهارة واحدة على الأقل من الفئة`)}
              info={t("Categories come from the Kaggle dataset's own skill grouping where it exists, otherwise from a documented curated list. Soft skills and spoken languages are the non-technical groups.",
                "تأتي الفئات من تصنيف المهارات في مجموعة بيانات Kaggle حيثما وُجد، وإلا من قائمة منتقاة وموثقة. المهارات الشخصية واللغات المحكية هي الفئات غير التقنية.")}
              table={{ columns: [t("Category", "الفئة"), t("Postings", "الإعلانات"), t("Share", "النسبة"), t("Distinct skills", "مهارات مختلفة")], filename: "skill-categories", rows: d.skill_categories.rows.map((r) => [r.category, r.postings, fmtPct(r.share), r.skills]) }}>
              {(h) => (<>
                <HBar label={t("Skill categories", "فئات المهارات")} handle={h} color={HUE.skill} maxLabel={30}
                  data={d.skill_categories.rows.slice(0, 10).map((r) => ({ label: r.category, value: r.postings, share: r.share, note: r.is_technical ? undefined : t("Non-technical", "غير تقنية") }))} />
                {d.skill_categories.rows.length > 10 && (
                  <p className="mt-1 text-xs text-ink-3">{t(`${d.skill_categories.rows.length - 10} smaller categories (each under ${fmtPct(d.skill_categories.rows[10].share, 0)}) are in the table view.`,
                    `${d.skill_categories.rows.length - 10} فئات أصغر (كل منها أقل من ${fmtPct(d.skill_categories.rows[10].share, 0)}) موجودة في عرض الجدول.`)}</p>
                )}
              </>)}
            </ChartPanel>
            <ChartPanel title={t("Data sources", "مصادر البيانات")} meta={t("Unique postings kept after cross-source de-duplication", "الإعلانات الفريدة المتبقية بعد إزالة التكرار بين المصادر")}
              table={countTable(d.sources.map((s) => ({ ...s, key: labels.source(s.key) })), t("Source", "المصدر"), "sources")}
              extraActions={<TextLink to="/quality">{t("Methodology", "المنهجية")}</TextLink>}>
              {(h) => <HBar label={t("Postings by data source", "الإعلانات حسب مصدر البيانات")} handle={h} color={HUE.source} maxLabel={34}
                data={d.sources.map((r) => ({ label: labels.source(r.key), value: r.n, share: r.share }))} />}
            </ChartPanel>
          </div>
          <p className="mt-6 flex items-center gap-1 text-sm text-ink-3">
            {t("Want to know what to learn for a role?", "تريد معرفة ما تتعلمه لدور معيّن؟")} <TextLink to={link("/career")}>{t("Open the career planner", "افتح مخطِّط المسار المهني")}</TextLink> <ArrowRight size={14} className="rtl:rotate-180" />
          </p>
        </>)}
      </Guard>
    </>
  );
}

function countTable(rows: Count[], label: string, filename: string) {
  return { columns: [label, t("Postings", "الإعلانات"), t("Share", "النسبة")], filename, rows: rows.map((r) => [r.key ?? "—", r.n, fmtPct(r.share)]) };
}
