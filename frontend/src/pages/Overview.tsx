import { ArrowRight, ChevronDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CohortMonths, HBar, Histogram, SkillBars } from "../components/charts";
import { Lattice } from "../components/Lattice";
import { ChartPanel, Empty, Guard, PageHeader, Panel, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { HUE } from "../lib/echarts";
import { drillHref, filterParams } from "../lib/filters";
import { fmtDate, fmtInt, fmtPct } from "../lib/format";
import { useFilters, useLabels } from "../lib/hooks";
import { getLang, t, tv } from "../lib/i18n";
import { haveSet, useProfile } from "../lib/profile";
import type { Count, Kpis, Matrix, Overview as OverviewData } from "../lib/types";

export default function Overview() {
  const { filters } = useFilters();
  const nav = useNavigate();
  const labels = useLabels();
  const { profile } = useProfile();
  const has = useMemo(() => haveSet(profile.skills), [profile.skills]);
  const q = useApi<OverviewData>("/overview", filters);
  const lattice = useApi<Matrix>("/skills/matrix", filters, { dim: "role_category", groups: 10, top: 16 });
  const go = (path: string, add: Record<string, string>, extra: Record<string, string> = {}) => nav(drillHref(path, filters, add, extra));
  const qs = new URLSearchParams(filterParams(filters)).toString();
  const link = (p: string) => (qs ? `${p}?${qs}` : p);
  const noCountry = t("No country", "بلا دولة");
  const teal = profile.skills.length > 0 ? t(" Teal = you have it.", " الأخضر = لديك.") : "";

  return (
    <>
      <PageHeader title={t("Market overview", "نظرة عامة على السوق")}
        description={t("What tech job postings ask for: which roles are hiring, which skills come up most, where the jobs are and what they pay. Select any bar to see the postings behind it.",
          "ما تطلبه إعلانات الوظائف التقنية: أي الأدوار مطلوبة، وأي المهارات تتكرر أكثر، وأين الوظائف، وكم تدفع. اختر أي شريط لترى الإعلانات التي يمثّلها.")} />

      <Guard q={q} h={140} empty={(d) => d.kpis.postings === 0}>
        {(d) => {
          const k = d.kpis;
          const kaggle = d.cohorts.find((c) => c.key === "kaggle_2023")?.share ?? 0;
          return (<>
            <Population k={k} kaggle={kaggle} />

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <ChartPanel title={t("Which roles are hiring", "الأدوار المطلوبة")}
                meta={t(`Share of ${fmtInt(k.postings)} postings · role read from the job title`, `النسبة من ${fmtInt(k.postings)} إعلان · الدور مستنتج من المسمى الوظيفي`)}
                info={t("Role category is assigned from the job title by documented keyword rules (src/clean_utils.py). It is a baseline, not a trained classifier.",
                  "تُحدَّد فئة الدور من المسمى الوظيفي بقواعد كلمات مفتاحية موثقة (src/clean_utils.py). إنها تصنيف أساسي، لا نموذج مدرَّب.")}
                table={countTable(d.roles, t("Role", "الدور"), "roles")}>
                {(h) => <HBar label={t("Postings by role", "الإعلانات حسب الدور")} handle={h} data={d.roles.map((r) => ({ label: r.key, value: r.n, share: r.share }))}
                  onSelect={(role) => go("/explorer", { role })} />}
              </ChartPanel>
              <ChartPanel title={t("Which skills are asked for", "المهارات المطلوبة")}
                meta={t(`Share of ${fmtInt(d.top_skills.denominator)} postings that list skills.${teal}`, `النسبة من ${fmtInt(d.top_skills.denominator)} إعلان يذكر مهارات.${teal}`)}
                info={t("Solid = the skill was in the posting data as collected. Hatched = the team added it later (inferred from the title or similar postings). Switch 'Written in posting' in the filter bar to count only the solid part.",
                  "المصمت = المهارة موجودة في بيانات الإعلان كما جُمعت. المخطط = أضافها الفريق لاحقًا (استنتاجًا من المسمى أو من إعلانات مشابهة). اختر «مذكورة في الإعلان» في شريط التصفية لاحتساب الجزء المصمت فقط.")}
                table={{ columns: [t("Skill", "المهارة"), t("Postings", "الإعلانات"), t("Share", "النسبة"), t("Written in posting", "مذكورة في الإعلان"), t("Added by team", "أضافها الفريق")], filename: "top-skills",
                  rows: d.top_skills.rows.map((r) => [r.skill, r.postings, fmtPct(r.share), r.observed, r.added]) }}
                extraActions={<TextLink to={link("/skills")}>{t("All skills", "كل المهارات")}</TextLink>}>
                {(h) => <SkillBars handle={h} rows={d.top_skills.rows} denominator={d.top_skills.denominator} have={profile.skills.length ? has : undefined}
                  observedOnly={filters.provenance === "observed"} onSelect={(s) => nav(link("/skills") + `${qs ? "&" : "?"}view=${encodeURIComponent(s)}`)} />}
              </ChartPanel>
            </div>
          </>);
        }}
      </Guard>

      <Panel className="mt-4" title={t("Which skills each role asks for", "المهارات التي يطلبها كل دور")}
        meta={t("The 10 largest roles × the 16 most requested skills. Select a cell to see those postings.", "أكبر 10 أدوار × أكثر 16 مهارة طلبًا. اختر خلية لعرض تلك الإعلانات.")}
        info={t("Share = postings in the role that list the skill ÷ postings in the role that list any skill. Rows with fewer than 30 such postings are framed with a dashed line.",
          "النسبة = إعلانات الدور التي تذكر المهارة ÷ إعلانات الدور التي تذكر أي مهارة. الصفوف التي تضم أقل من 30 إعلانًا من هذا النوع محاطة بخط متقطع.")}>
        <Guard q={lattice} h={420} empty={(m) => !m.groups.length}>
          {(m) => <Lattice matrix={m} rowLabel={t("Role", "الدور")} caption={t("Share of each role's postings that list each skill", "نسبة إعلانات كل دور التي تذكر كل مهارة")}
            rowName={tv} onSelect={(role, skill) => go("/explorer", { role, skill })} />}
        </Guard>
      </Panel>

      <Guard q={q} h={300} empty={(d) => d.kpis.postings === 0}>
        {(d) => (<>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartPanel title={t("Where the jobs are", "أين الوظائف")}
              meta={t(`Top countries · ${fmtInt(d.kpis.no_country)} postings have no single country (remote or unknown)`, `أبرز الدول · ${fmtInt(d.kpis.no_country)} إعلان بلا دولة محددة (عن بُعد أو غير معروفة)`)}
              table={countTable(d.countries, t("Country", "الدولة"), "countries")}
              extraActions={<TextLink to={link("/geography")}>{t("Open the map", "افتح الخريطة")}</TextLink>}>
              {(h) => <HBar label={t("Postings by country", "الإعلانات حسب الدولة")} handle={h} color={HUE.place} data={d.countries.map((r) => ({ label: r.key ?? noCountry, value: r.n, share: r.share }))}
                onSelect={(country) => country !== noCountry && go("/explorer", { country })} />}
            </ChartPanel>
            <div className="grid content-start gap-4">
              <ChartPanel title={t("Arab, international or remote", "عربي أم دولي أم عن بُعد")} meta={t("Remote > Arab League country > other country", "عن بُعد > دولة في الجامعة العربية > دولة أخرى")}
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
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartPanel title={t("What postings advertise as pay", "الرواتب التي تعلنها الإعلانات")}
              meta={t(`${fmtInt(d.kpis.advertised_salary)} postings (${fmtPct(d.kpis.advertised_salary / d.kpis.postings)}) state their pay · USD per year, approximate`,
                `${fmtInt(d.kpis.advertised_salary)} إعلان (${fmtPct(d.kpis.advertised_salary / d.kpis.postings)}) يذكر الراتب · دولار أمريكي سنويًا، تقريبًا`)}
              info={t("Only the posting's own salary. Benchmarks the team attached (Paylab, Indeed, BLS) are excluded here and shown separately on the Salaries page. Ranges use their midpoint; hourly pay × 2080, monthly × 12; currencies converted at fixed approximate rates.",
                "راتب الإعلان نفسه فقط. القيم المرجعية التي أرفقها الفريق (Paylab وIndeed وBLS) مستبعدة هنا وتظهر منفصلة في صفحة الرواتب. تُستخدم نقطة منتصف النطاق؛ الأجر بالساعة × 2080، والشهري × 12؛ وتُحوَّل العملات بأسعار تقريبية ثابتة.")}
              table={{ columns: [t("From (USD/yr)", "من (دولار/سنة)"), t("Postings", "الإعلانات")], filename: "salary-histogram", rows: d.salary_histogram.map((b) => [b.bin, b.n]) }}
              extraActions={<TextLink to={link("/salary")}>{t("Open salaries", "افتح الرواتب")}</TextLink>}>
              {(h) => d.kpis.advertised_salary < 10
                ? <Empty title={t("Too few advertised salaries", "عدد الرواتب المعلنة قليل جدًا")} hint={t("Fewer than 10 postings in this selection state a salary.", "أقل من 10 إعلانات في هذا الاختيار تذكر الراتب.")} />
                : <Histogram handle={h} label={t("Distribution of advertised annual salaries", "توزيع الرواتب السنوية المعلنة")} bins={d.salary_histogram} binWidth={20000} cap={300000} />}
            </ChartPanel>
            <ChartPanel title={t("When the postings were collected", "متى جُمعت الإعلانات")}
              meta={t("Two separate collections, each on its own scale — not one continuous series", "دفعتا جمع منفصلتان، لكل منهما مقياسها — وليستا سلسلة واحدة متصلة")}
              info={t("The 2023 archive and the 2024–26 collection were gathered by different methods from different sources. Read each chart on its own; the gap between them is not a trend.",
                "جُمع أرشيف 2023 ودفعة 2024–26 بطرق مختلفة ومن مصادر مختلفة. اقرأ كل مخطط على حدة؛ الفجوة بينهما ليست اتجاهًا.")}
              table={{ columns: [t("Collection", "دفعة الجمع"), t("Month", "الشهر"), t("Postings", "الإعلانات")], filename: "postings-by-month", rows: d.months.map((m) => [labels.cohort(m.cohort), m.month.slice(0, 7), m.n]) }}
              extraActions={<TextLink to={link("/trends")}>{t("Open over time", "افتح عبر الزمن")}</TextLink>}>
              {(h) => <CohortMonths handle={h} months={d.months} cohortLabel={labels.cohort} />}
            </ChartPanel>
          </div>

          <MoreBreakdowns title={t("More breakdowns", "تفصيلات أخرى")}
            sub={t("Seniority, employment type, skill categories and data sources", "مستوى الخبرة ونوع التوظيف وفئات المهارات ومصادر البيانات")}>
            <ChartPanel title={t("Seniority", "مستوى الخبرة")} meta={t("From title keywords; most titles state none", "من كلمات المسمى الوظيفي؛ معظم المسميات لا تذكره")}
              table={countTable(d.seniority, t("Seniority", "مستوى الخبرة"), "seniority")}>
              {(h) => <HBar label={t("Postings by seniority", "الإعلانات حسب مستوى الخبرة")} handle={h} data={d.seniority.map((r) => ({ label: r.key, value: r.n, share: r.share, muted: r.key === "Not specified" }))}
                onSelect={(seniority) => go("/explorer", { seniority })} />}
            </ChartPanel>
            <ChartPanel title={t("Employment type", "نوع التوظيف")} table={countTable(d.job_type, t("Employment type", "نوع التوظيف"), "employment-type")}>
              {(h) => <HBar label={t("Postings by employment type", "الإعلانات حسب نوع التوظيف")} handle={h} data={d.job_type.map((r) => ({ label: r.key, value: r.n, share: r.share, muted: r.key === "Unknown" }))}
                onSelect={(job_type) => go("/explorer", { job_type })} />}
            </ChartPanel>
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
          </MoreBreakdowns>

          <p className="mt-6 flex items-center gap-1 text-sm text-ink-3">
            {t("Want to know what to learn for a role?", "تريد معرفة ما تتعلمه لدور معيّن؟")} <TextLink to={link("/career")}>{t("Open your skills and plan", "افتح مهاراتك وخطتك")}</TextLink> <ArrowRight size={14} className="rtl:rotate-180" />
          </p>
        </>)}
      </Guard>
    </>
  );
}

/**
 * Who the page describes, as one sentence: each figure sits next to its own
 * denominator, so the population reads in one pass instead of six tiles.
 */
function Population({ k, kaggle }: { k: Kpis; kaggle: number }) {
  const B = ({ children }: { children: ReactNode }) => <b className="tnum font-semibold text-ink">{children}</b>;
  const dated = !!k.first_posted;
  const skillsShare = k.postings ? k.with_skills / k.postings : null;
  const payShare = k.postings ? k.advertised_salary / k.postings : null;
  return (
    <section aria-labelledby="population-h" className="rounded-xl border border-line bg-panel px-5 py-5 sm:px-6">
      <h2 id="population-h" className="text-[0.9375rem] font-semibold text-ink">{t("The postings behind these figures", "الإعلانات وراء هذه الأرقام")}</h2>
      {getLang() === "ar" ? (<>
        <p className="mt-2 max-w-4xl text-lg leading-7 text-ink-2">
          <B>{fmtInt(k.postings)}</B> إعلان وظيفة تقنية فريد، بعد إزالة التكرار من <B>{fmtInt(k.appearances)}</B> إدراج في <B>{fmtInt(k.sources)}</B> مصادر.
          {" "}تذكر <B>{fmtInt(k.countries)}</B> دولة (و<B>{fmtInt(k.no_country)}</B> إعلان عن بُعد أو بلا دولة) و<B>{fmtInt(k.employers)}</B> جهة توظيف مسمّاة
          {dated ? <>، ونُشرت بين <B>{fmtDate(k.first_posted)}</B> و<B>{fmtDate(k.last_posted)}</B>.</> : "."}
        </p>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-2">
          <B>{fmtPct(skillsShare)}</B> منها تذكر مهارة واحدة على الأقل، لذا تُحسب نسب المهارات أدناه من هذه الإعلانات البالغة <B>{fmtInt(k.with_skills)}</B>.
          {" "}و<B>{fmtPct(payShare)}</B> تذكر راتبًا (<B>{fmtInt(k.advertised_salary)}</B>)؛ أما القيم المرجعية التي أرفقها الفريق لـ<B>{fmtInt(k.benchmark_salary)}</B> إعلان فتُعرض منفصلة.
        </p>
      </>) : (<>
        <p className="mt-2 max-w-4xl text-lg leading-7 text-ink-2">
          <B>{fmtInt(k.postings)}</B> unique tech job postings, left after removing duplicates from <B>{fmtInt(k.appearances)}</B> listings on <B>{fmtInt(k.sources)}</B> sources.
          {" "}They name <B>{fmtInt(k.countries)}</B> countries (<B>{fmtInt(k.no_country)}</B> more are remote or give no country) and <B>{fmtInt(k.employers)}</B> named employers
          {dated ? <>, and were posted between <B>{fmtDate(k.first_posted)}</B> and <B>{fmtDate(k.last_posted)}</B>.</> : "."}
        </p>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-2">
          <B>{fmtPct(skillsShare)}</B> list at least one skill, so skill shares below are out of those <B>{fmtInt(k.with_skills)}</B> postings.
          {" "}<B>{fmtPct(payShare)}</B> state a salary (<B>{fmtInt(k.advertised_salary)}</B>); team benchmarks attached to <B>{fmtInt(k.benchmark_salary)}</B> postings are kept separate.
        </p>
      </>)}
      <p className="mt-4 border-t border-line pt-3 text-sm leading-6 text-ink-3">
        {kaggle > 0.5
          ? t(`${fmtPct(kaggle, 0)} of these postings come from the 2023 Kaggle archive, which covers data roles only — so data roles and data skills lead the rankings below. Figures describe this collected sample, not the whole job market.`,
            `${fmtPct(kaggle, 0)} من هذه الإعلانات مصدرها أرشيف Kaggle لعام 2023، وهو يغطي وظائف البيانات فقط — لذلك تتصدر وظائف البيانات ومهاراتها الترتيب أدناه. الأرقام تصف هذه العينة المجمَّعة، لا سوق العمل بأكمله.`)
          : t("Figures describe this collected sample, not the whole job market.", "الأرقام تصف هذه العينة المجمَّعة، لا سوق العمل بأكمله.")}{" "}
        <TextLink to="/quality">{t("How the data was built", "كيف بُنيت البيانات")}</TextLink>
      </p>
    </section>
  );
}

/** Secondary breakdowns, collapsed by default; charts mount only once opened. */
function MoreBreakdowns({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="group mt-4" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-line bg-panel px-5 py-4 hover:bg-panel-2 [&::-webkit-details-marker]:hidden">
        <span><span className="block text-[0.9375rem] font-semibold text-ink">{title}</span>
          <span className="block text-sm text-ink-3">{sub}</span></span>
        <ChevronDown size={18} className="shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>
      {open && <div className="mt-4 grid gap-4 xl:grid-cols-2">{children}</div>}
    </details>
  );
}

function countTable(rows: Count[], label: string, filename: string) {
  return { columns: [label, t("Postings", "الإعلانات"), t("Share", "النسبة")], filename, rows: rows.map((r) => [r.key ?? "—", r.n, fmtPct(r.share)]) };
}
