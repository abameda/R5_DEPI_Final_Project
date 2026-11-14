import clsx from "clsx";
import type { ReactNode } from "react";
import { Callout, Guard, PageHeader } from "../components/ui";
import { useApi } from "../lib/api";
import { fmtDate, fmtInt, fmtPct } from "../lib/format";
import { useLabels, useMeta } from "../lib/hooks";
import { getLang, t, tv } from "../lib/i18n";

interface Q {
  dataset_kind: string; built_at: string;
  pipeline: { generated_at?: string; stages?: { stage: string; rows: number }[]; dropped?: Record<string, number>; raw_rows_by_source?: Record<string, number>;
    sudan_search_location_rows?: { rows: number; country_from_real_location: Record<string, number> } | null; runtime_seconds?: number };
  totals: { postings: number; appearances: number; merged_duplicates: number; placeholder_company_postings: number; placeholder_companies: number; missing: Record<string, number | null> };
  per_source: { source: string; label: string; postings: number; appearances: number; merged_duplicates: number; first_posted: string | null; last_posted: string | null;
    advertised_salary: number; benchmark_salary: number; skills_enriched: number; countries: number; missing: Record<string, number | null>;
    skill_rows: number; observed_skill_rows: number; observed_share: number | null }[];
  skill_provenance: { rows: number; observed: number; skills: number; observed_share: number | null };
  taxonomy: { source: string; skills: number; mentions: number }[];
  salary_kinds: { source: string; kind: string; n: number }[];
  language: { key: string; n: number }[];
  sudan_correction: { before: { rows: number; country_from_real_location: Record<string, number> } | null; after_dedup: { key: string; n: number }[] };
  cohorts: { key: string; label: string; note: string }[];
}

const FIELDS: [string, string, string][] = [["company", "Employer", "جهة التوظيف"], ["country", "Country", "الدولة"], ["city", "City", "المدينة"], ["skills", "Skills", "المهارات"],
  ["posted_date", "Date", "التاريخ"], ["url", "Link", "الرابط"], ["salary_usd_annual", "Salary", "الراتب"], ["description", "Description", "الوصف"]];

/** Arabic names for the stages and drop reasons the pipeline logs (reports/pipeline_stats.json). */
const PIPELINE_AR: Record<string, string> = {
  "1. raw rows loaded (all sources)": "1. الصفوف الخام المحمّلة (كل المصادر)",
  "2-5. after cleaning & standardizing (no rows removed)": "2-5. بعد التنظيف والتوحيد (دون حذف صفوف)",
  "6. after dropping missing-title & non-tech rows": "6. بعد حذف الصفوف بلا مسمى وغير التقنية",
  "7a. after removing exact duplicates": "7أ. بعد إزالة التكرارات المطابقة",
  "7b. after removing near-duplicates (title+company+location)": "7ب. بعد إزالة التكرارات المتقاربة (المسمى + جهة التوظيف + الموقع)",
  "missing title": "بلا مسمى وظيفي",
  "non-tech roles (FR-10)": "أدوار غير تقنية (FR-10)",
  "Remote (Anywhere)": "عن بُعد (من أي مكان)",
  "Other/Unknown": "أخرى / غير معروفة",
};
const pipe = (s: string) => t(s, PIPELINE_AR[s] ?? tv(s));

const SECTIONS = () => [
  ["figures", t("Key figures", "أرقام أساسية")],
  ["pipeline", t("How the dataset was built", "كيف بُنيت البيانات")],
  ["collections", t("The two collections", "دفعتا الجمع")],
  ["sources", t("Sources and completeness", "المصادر واكتمال الحقول")],
  ["skills", t("Where skills come from", "مصدر المهارات")],
  ["salary", t("Where salaries come from", "مصدر الرواتب")],
  ["location", t("Location correction", "تصحيح الموقع")],
  ["definitions", t("Metric definitions", "تعريفات المقاييس")],
  ["limits", t("What the data can and cannot show", "ما تُظهره البيانات وما لا تُظهره")],
] as const;

export default function Quality() {
  const q = useApi<Q>("/quality", null);
  const { data: meta } = useMeta();
  const labels = useLabels();
  return (
    <>
      <PageHeader title={t("Data & methodology", "البيانات والمنهجية")} description={t("How the dataset was built, how complete it is, and what it can and cannot tell you. Everything here covers the whole dataset; filters do not apply.",
        "كيف بُنيت مجموعة البيانات، ومدى اكتمالها، وما يمكن أن تخبرك به وما لا يمكن. كل ما هنا يغطي مجموعة البيانات كاملة؛ ولا تنطبق عليه الفلاتر.")} />
      <div className="grid items-start gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] xl:gap-12">
        <nav aria-label={t("On this page", "في هذه الصفحة")} className="hidden lg:sticky lg:top-6 lg:block">
          <p className="mb-2 text-xs font-medium text-ink-3">{t("On this page", "في هذه الصفحة")}</p>
          <ol className="space-y-0.5 border-s border-line text-sm">
            {SECTIONS().map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="-ms-px block border-s border-transparent py-1 ps-3 text-ink-2 no-underline hover:border-accent hover:text-ink">{label}</a></li>
            ))}
          </ol>
        </nav>

        <Guard q={q} h={500}>
          {(d) => {
            const stages = d.pipeline.stages ?? [];
            const raw = stages[0]?.rows;
            const tax = d.taxonomy.reduce((a, x) => a + x.mentions, 0) || 1;
            const kaggleShare = (meta?.dimensions.cohort.find((c) => c.value === "kaggle_2023")?.n ?? 0) / (d.totals.postings || 1);
            const s = SECTIONS();
            const title = (id: string) => s.find(([k]) => k === id)?.[1] ?? id;
            return (
              <div className="min-w-0 space-y-12">
                {d.dataset_kind === "synthetic" && (
                  <Callout tone="warn" title={t("This deployment serves synthetic demo data", "هذا النشر يعرض بيانات تجريبية مُولَّدة")}>
                    {t("The store behind this site was generated for demonstration. Its figures do not describe the real collected postings.",
                      "قاعدة البيانات خلف هذا الموقع مُولَّدة للعرض التجريبي، وأرقامها لا تصف الإعلانات الحقيقية المجمَّعة.")}
                  </Callout>
                )}

                <Section id="figures" title={title("figures")}>
                  <Table head={[t("Figure", "الرقم"), t("Value", "القيمة"), t("Note", "ملاحظة")]} align={["start", "end", "start"]} rows={[
                    [t("Raw rows loaded", "الصفوف الخام المحمّلة"), raw ? fmtInt(raw) : "—", t("7 source files", "7 ملفات مصدر")],
                    [t("Unique postings kept", "إعلانات فريدة محتفظ بها"), fmtInt(d.totals.postings), raw ? t(`${fmtPct(d.totals.postings / raw)} of raw rows`, `${fmtPct(d.totals.postings / raw)} من الصفوف الخام`) : ""],
                    [t("Merged duplicates", "تكرارات مدمجة"), fmtInt(d.totals.merged_duplicates), t("postings found on 2 or more boards", "إعلانات ظهرت في موقعين أو أكثر")],
                    [t("Skills written in posting", "مهارات مذكورة في الإعلان"), fmtPct(d.skill_provenance.observed_share), t(`of ${fmtInt(d.skill_provenance.rows)} posting–skill pairs; the rest were added by the team`, `من ${fmtInt(d.skill_provenance.rows)} زوج إعلان–مهارة؛ والباقي أضافه الفريق`)],
                    [t("Pipeline run", "تشغيل خط المعالجة"), d.pipeline.generated_at ? fmtDate(d.pipeline.generated_at.slice(0, 10)) : "—", d.pipeline.runtime_seconds ? t(`${Math.round(d.pipeline.runtime_seconds)} s end to end`, `${Math.round(d.pipeline.runtime_seconds)} ثانية من البداية للنهاية`) : ""],
                    [t("Store built", "بناء قاعدة البيانات"), fmtDate(d.built_at.slice(0, 10)), d.dataset_kind === "synthetic" ? <span className="font-medium text-warn">{t("SYNTHETIC demo data", "بيانات تجريبية مُولَّدة")}</span> : t("from data/processed", "من data/processed")],
                  ]} />
                </Section>

                <Section id="pipeline" title={title("pipeline")} meta={t("Record counts logged by src/pipeline.py (FR-28)", "أعداد السجلات كما سجّلها src/pipeline.py (FR-28)")}>
                  <ol className="space-y-3 rounded-xl border border-line bg-panel px-5 py-4">
                    {stages.map((st, i) => (
                      <li key={st.stage}>
                        <div className="flex justify-between gap-4 text-sm"><span className="text-ink-2">{pipe(st.stage)}</span><span className="tnum font-medium text-ink">{fmtInt(st.rows)}</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-panel-2"><div className={clsx("h-full rounded-full", i === stages.length - 1 ? "bg-accent" : "bg-accent/30")} style={{ width: `${(st.rows / (raw || 1)) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ol>
                  {d.pipeline.dropped && <Prose className="mt-4">{t("Dropped before de-duplication: ", "حُذف قبل إزالة التكرار: ")}{Object.entries(d.pipeline.dropped).map(([k, v]) => `${pipe(k)} ${fmtInt(v)}`).join(" · ")}</Prose>}
                  <Prose className="mt-3">{t("De-duplication: exact duplicates first, then the same normalized title + employer + location + country (job boards and “Confidential” also compare date and description). The most complete copy is kept and every source it appeared in is recorded.",
                    "إزالة التكرار: التكرارات المطابقة أولًا، ثم الإعلانات ذات المسمى وجهة التوظيف والموقع والدولة نفسها بعد التوحيد (ويُقارَن أيضًا التاريخ والوصف لمواقع التوظيف و«جهة سرية»). تُحفظ النسخة الأكمل ويُسجَّل كل مصدر ظهرت فيه.")}</Prose>
                </Section>

                <Section id="collections" title={title("collections")} meta={t("Why time comparisons are restricted", "لماذا تُقيَّد المقارنات الزمنية")}>
                  <dl className="m-0 max-w-[70ch] space-y-4 text-[0.9375rem] leading-7">
                    {d.cohorts.map((c) => <div key={c.key}><dt className="font-medium text-ink">{t(c.label, labels.cohort(c.key))}</dt><dd className="m-0 text-ink-2">{t(c.note, labels.cohortNote(c.key))}</dd></div>)}
                  </dl>
                  <Prose className="mt-4">{t("Monthly trends are computed only inside the 2023 archive; the two collections are compared as snapshots, never as growth.", "تُحسب الاتجاهات الشهرية داخل أرشيف 2023 فقط؛ وتُقارَن الدفعتان كلقطتين منفصلتين، لا كنمو.")}</Prose>
                </Section>

                <Section id="sources" title={title("sources")} meta={t("Raw rows (before cleaning) → unique postings kept · completeness of key fields (share missing)", "الصفوف الخام (قبل التنظيف) ← الإعلانات الفريدة المحتفظ بها · اكتمال الحقول الرئيسية (نسبة المفقود)")}>
                  <div tabIndex={0} role="region" aria-label={title("sources")} className="overflow-x-auto rounded-xl border border-line bg-panel">
                    <table className="w-full text-sm">
                      <thead className="bg-panel-2 text-xs text-ink-3">
                        <tr>
                          <th scope="col" className="py-2.5 ps-4 pe-2 text-start font-medium">{t("Source", "المصدر")}</th>
                          <th scope="col" className="px-2 py-2.5 text-end font-medium">{t("Raw rows", "صفوف خام")}</th>
                          <th scope="col" className="px-2 py-2.5 text-end font-medium">{t("Kept", "المحتفظ به")}</th>
                          <th scope="col" className="px-2 py-2.5 text-start font-medium">{t("Posting dates", "تواريخ النشر")}</th>
                          <th scope="col" className="px-2 py-2.5 text-end font-medium">{t("Advertised pay", "رواتب معلنة")}</th>
                          <th scope="col" className="px-2 py-2.5 text-end font-medium">{t("Benchmarks", "رواتب مرجعية")}</th>
                          <th scope="col" className="px-2 py-2.5 text-end font-medium" title={t("Share of posting–skill pairs that were in the data as collected", "نسبة أزواج الإعلان–المهارة الموجودة في البيانات كما جُمعت")}>{t("Skills written", "مهارات مذكورة")}</th>
                          {FIELDS.map(([k, en, ar]) => <th key={k} scope="col" className="px-1 py-2.5 text-center font-medium">{t(en, ar)}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {d.per_source.map((src) => (
                          <tr key={src.source} className="border-t border-line">
                            <th scope="row" className="min-w-56 py-2 ps-4 pe-2 text-start font-normal text-ink">{t(src.label, labels.source(src.source))}</th>
                            <td className="tnum px-2 py-2 text-end text-ink-3">{fmtInt(d.pipeline.raw_rows_by_source?.[src.source])}</td>
                            <td className="tnum px-2 py-2 text-end text-ink">{fmtInt(src.postings)}</td>
                            <td className="tnum px-2 py-2 whitespace-nowrap text-ink-2"><bdi>{src.first_posted ? `${src.first_posted.slice(0, 7)} – ${src.last_posted?.slice(0, 7)}` : t("no dates", "بلا تواريخ")}</bdi></td>
                            <td className="tnum px-2 py-2 text-end text-ink">{fmtInt(src.advertised_salary)}</td>
                            <td className="tnum px-2 py-2 text-end text-ink-3">{fmtInt(src.benchmark_salary)}</td>
                            <td className="tnum px-2 py-2 text-end text-ink">{fmtPct(src.observed_share, 0)}</td>
                            {FIELDS.map(([k]) => <MissingCell key={k} v={src.missing[k]} />)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 max-w-[70ch] text-xs leading-5 text-ink-3">{t("Cell shading = share of the source's postings missing that field (darker = more missing). Descriptions are absent from the Kaggle data and are short API snippets for Jooble/Careerjet.",
                    "تظليل الخلية = نسبة إعلانات المصدر التي ينقصها ذلك الحقل (الأغمق = نقص أكبر). الأوصاف غير موجودة في بيانات Kaggle، وهي مقتطفات قصيرة من الواجهات البرمجية في Jooble/Careerjet.")}</p>
                </Section>

                <Section id="skills" title={title("skills")} meta={t("Per posting × skill (job_skills.is_observed)", "لكل زوج إعلان × مهارة (job_skills.is_observed)")}>
                  {getLang() === "en" ? <>
                    <Prose>A skill is <b>written in posting</b> when it was in the posting data as collected (the Kaggle skills field, the API's original skills, the Arab file's original column). Skills the team inferred later from the title or similar postings are <b>added by team</b>.</Prose>
                    <Prose className="mt-3">Every skill chart shows the two parts (team-added drawn hatched or dashed); the “Written in posting” switch removes added skills from counts and denominators.</Prose>
                    <Prose className="mt-3" muted>Check: on all 31,178 Kaggle Arab-search rows marked “Original”, the recovered original skills match the dataset's own job_type_skills exactly.</Prose>
                  </> : <>
                    <Prose>تكون المهارة <b>مذكورة في الإعلان</b> إذا وُجدت في بيانات الإعلان كما جُمعت (حقل المهارات في Kaggle، والمهارات الأصلية من الواجهة البرمجية، والعمود الأصلي في الملف العربي). أما المهارات التي استنتجها الفريق لاحقًا من المسمى أو من إعلانات مشابهة فهي <b>مهارات أضافها الفريق</b>.</Prose>
                    <Prose className="mt-3">كل رسم للمهارات يُظهر الجزأين (وتُرسم المهارات المضافة مخطّطة أو متقطعة)؛ ومفتاح «مذكورة في الإعلان» يستبعد المهارات المضافة من الأعداد والمقامات.</Prose>
                    <Prose className="mt-3" muted>تحقق: في كل صفوف بحث Kaggle العربية الـ31,178 الموسومة «Original»، تطابق المهارات الأصلية المستعادة حقل job_type_skills في مجموعة البيانات تمامًا.</Prose>
                  </>}
                  <h3 className="mt-6 mb-2 text-sm font-semibold text-ink">{t("Where each skill's category comes from", "من أين تأتي فئة كل مهارة")}</h3>
                  <Table head={[t("Category source", "مصدر الفئة"), t("Share of mentions", "نسبة الإشارات"), t("Skills", "المهارات")]} align={["start", "end", "end"]}
                    rows={d.taxonomy.map((x) => [
                      x.source === "none" ? t("Uncategorized (not guessed)", "غير مصنفة (دون تخمين)") : x.source === "kaggle" ? "Kaggle job_type_skills" : x.source === "curated" ? t("Curated list (team-added skills)", "قائمة منتقاة (مهارات أضافها الفريق)") : t("Kaggle, documented correction", "Kaggle، مع تصحيح موثّق"),
                      fmtPct(x.mentions / tax), fmtInt(x.skills)])} />
                </Section>

                <Section id="salary" title={title("salary")} meta={t("Advertised vs benchmark, by source", "المعلنة مقابل المرجعية، حسب المصدر")}>
                  <Prose>{t("Advertised salaries come from the posting itself. Benchmarks (Paylab, Indeed, US BLS) describe the job title in that country, not the posting, and appear only in the benchmark view of the Salaries page. The two are never mixed.",
                    "الرواتب المعلنة مأخوذة من الإعلان نفسه. أما الرواتب المرجعية (Paylab وIndeed وUS BLS) فتصف المسمى الوظيفي في تلك الدولة لا الإعلان، وتظهر فقط في العرض المرجعي بصفحة الرواتب. ولا يُخلط بين النوعين أبدًا.")}</Prose>
                  <div className="mt-4">
                    <Table head={[t("Source", "المصدر"), t("Advertised", "معلنة"), t("Benchmark", "مرجعية")]} align={["start", "end", "end"]}
                      rows={d.per_source.filter((x) => x.advertised_salary + x.benchmark_salary > 0).map((x) => [t(x.label, labels.source(x.source)), fmtInt(x.advertised_salary), fmtInt(x.benchmark_salary)])} />
                  </div>
                </Section>

                <Section id="location" title={title("location")} meta={t("The “Sudan” rows · evidence recorded by the pipeline (reports/pipeline_stats.json)", "صفوف «السودان» · أدلة سجّلها خط المعالجة (reports/pipeline_stats.json)")}>
                  {d.sudan_correction.before ? (<>
                    <Prose>{getLang() === "en"
                      ? <>{fmtInt(d.sudan_correction.before.rows)} rows of the merged team file have <code>job_country = "Sudan"</code>: it was the Kaggle <i>search location</i>, not where the job is. Each posting's country was rebuilt from its own location.</>
                      : <>{fmtInt(d.sudan_correction.before.rows)} صفًا في ملف الفريق المدمج تحمل <code>job_country = "Sudan"</code>: وهو <i>موقع البحث</i> في Kaggle، لا مكان الوظيفة. أُعيد بناء دولة كل إعلان من موقعه.</>}</Prose>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-ink">{t("Country rebuilt from the posting's location", "الدولة بعد إعادة بنائها من موقع الإعلان")}</h3>
                        <Table head={[t("Country", "الدولة"), t("Rows", "الصفوف")]} align={["start", "end"]}
                          rows={Object.entries(d.sudan_correction.before.country_from_real_location).map(([k, v]) => [pipe(k), fmtInt(v)])} />
                      </div>
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-ink">{t("Counted after cleaning and de-duplication", "المحتسبة بعد التنظيف وإزالة التكرار")}</h3>
                        <Table head={[t("Country", "الدولة"), t("Postings", "الإعلانات")]} align={["start", "end"]}
                          rows={d.sudan_correction.after_dedup.map((r) => [pipe(r.key), fmtInt(r.n)])} />
                      </div>
                    </div>
                    <Prose className="mt-3" muted>{t("“Remote (Anywhere)” rows have no single country and count as Remote.", "صفوف «عن بُعد (من أي مكان)» ليست لها دولة محددة وتُحتسب ضمن العمل عن بُعد.")}</Prose>
                  </>) : <Prose muted>{t("Not available for this store.", "غير متاح لقاعدة البيانات هذه.")}</Prose>}
                </Section>

                <Section id="definitions" title={title("definitions")}>
                  <dl className="m-0 divide-y divide-line rounded-xl border border-line bg-panel">
                    {[
                      [t("Unique postings", "إعلانات فريدة"), t("Rows of the de-duplicated dataset. 'Listings' counts every board the posting appeared on.", "صفوف مجموعة البيانات بعد إزالة التكرار. أما «الإدراجات» فتعدّ كل موقع ظهر فيه الإعلان.")],
                      [t("Skill share", "نسبة المهارة"), t("Postings in the population that list the skill ÷ postings in the population that list any skill (same provenance mode).", "الإعلانات التي تذكر المهارة ÷ الإعلانات التي تذكر أي مهارة، ضمن المجموعة نفسها (وبنمط المصدر نفسه).")],
                      [t("Market type", "نوع السوق"), t("Remote if marked remote or from a remote board; otherwise Arab if in an Arab League country; otherwise International.", "عن بُعد إذا وُسم كذلك أو جاء من موقع للعمل عن بُعد؛ وإلا فعربي إذا كان في دولة عضو في جامعة الدول العربية؛ وإلا فدولي.")],
                      [t("Advertised salary", "الراتب المعلن"), t("Midpoint of the posting's own range, annualized, converted to USD at fixed approximate rates; $500–$1M per year kept.", "منتصف النطاق المذكور في الإعلان، محوَّلًا إلى قيمة سنوية وإلى الدولار بأسعار تقريبية ثابتة؛ ويُحتفظ بما بين 500 دولار ومليون دولار سنويًا.")],
                      [t("Lift", "الرفع (Lift)"), t("How many times more often two skills co-occur than if independent. 1 = no association.", "كم مرة تظهر مهارتان معًا أكثر مما لو كانتا مستقلتين. 1 = لا ارتباط.")],
                      [t("Match (my skills & plan)", "التوافق (مهاراتي وخطتي)"), t("Share-weighted coverage of the 15 most requested skills of a role. Descriptive overlap with these postings; not a hiring probability.", "تغطية أكثر 15 مهارة طلبًا لدور ما، موزونة بنسبها. تداخل وصفي مع هذه الإعلانات؛ وليس احتمالًا للتوظيف.")],
                      [t("Small sample", "عينة صغيرة"), t(`Groups below ${meta?.thresholds.min_group_postings ?? 30} postings are flagged or hidden; salary statistics need ${meta?.thresholds.min_salary_n ?? 10}+ salaries.`,
                        `تُميَّز أو تُخفى المجموعات التي تقل عن ${meta?.thresholds.min_group_postings ?? 30} إعلانًا؛ وتحتاج إحصاءات الرواتب إلى ${meta?.thresholds.min_salary_n ?? 10} رواتب على الأقل.`)],
                    ].map(([k, v]) => (
                      <div key={k} className="grid gap-x-6 gap-y-0.5 px-5 py-3 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
                        <dt className="font-medium text-ink">{k}</dt><dd className="m-0 max-w-[70ch] leading-6 text-ink-2">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>

                <Section id="limits" title={title("limits")}>
                  <ul className="max-w-[70ch] list-disc space-y-2 ps-5 text-[0.9375rem] leading-7 text-ink-2 marker:text-ink-3">
                    <li>{t(`It describes ${fmtInt(d.totals.postings)} collected postings, not the whole labour market or real hiring volumes.`, `تصف ${fmtInt(d.totals.postings)} إعلانًا مجمَّعًا، لا سوق العمل كله ولا أحجام التوظيف الفعلية.`)}</li>
                    <li>{t(`${labels.cohort("kaggle_2023")} is about ${fmtPct(kaggleShare, 0)} of the data and covers data roles only, so data skills dominate every overall ranking.`,
                      `يمثّل ${labels.cohort("kaggle_2023")} نحو ${fmtPct(kaggleShare, 0)} من البيانات ويغطي وظائف البيانات فقط، لذا تتصدر مهارات البيانات كل ترتيب إجمالي.`)}</li>
                    <li>{t("Arab-market postings are few compared with international ones; country comparisons carry sample-size flags.", "إعلانات السوق العربي قليلة مقارنةً بالدولية؛ لذا تحمل مقارنات الدول تنبيهات بحجم العينة.")}</li>
                    <li>{t("Role and seniority come from title keywords (a baseline, not a trained classifier); most titles state no seniority.", "يُستخلص الدور ومستوى الخبرة من كلمات المسمى الوظيفي (أساس مبدئي لا مصنِّف مدرَّب)؛ ومعظم المسميات لا تذكر مستوى الخبرة.")}</li>
                    <li>{t(`Only ${fmtPct(1 - (d.totals.missing.salary_usd_annual ?? 1), 0)} of postings carry a usable salary of either kind; pay results describe that subset.`, `${fmtPct(1 - (d.totals.missing.salary_usd_annual ?? 1), 0)} فقط من الإعلانات تحمل راتبًا صالحًا للاستخدام من أي نوع؛ ونتائج الرواتب تصف هذه المجموعة الفرعية.`)}</li>
                    <li>{t(`Employer counts are postings in this sample, not company size. ${fmtInt(d.totals.placeholder_company_postings)} postings name a job board or a hidden employer.`, `أعداد جهات التوظيف هي إعلانات في هذه العينة، لا حجم الشركات. ${fmtInt(d.totals.placeholder_company_postings)} إعلانًا تذكر موقع توظيف أو جهة توظيف مخفية.`)}</li>
                    <li>{t("Raw postings are not redistributed: exports are aggregates only (NFR-08).", "لا يُعاد نشر الإعلانات الخام: الصادرات بيانات مجمّعة فقط (NFR-08).")}</li>
                  </ul>
                </Section>
              </div>
            );
          }}
        </Guard>
      </div>
    </>
  );
}

function Section({ id, title, meta, children }: { id: string; title: string; meta?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6">
      <h2 id={`${id}-h`} className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {meta && <p className="mt-0.5 text-sm text-ink-3">{meta}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Prose({ children, className, muted }: { children: ReactNode; className?: string; muted?: boolean }) {
  return <p className={clsx("max-w-[70ch] text-[0.9375rem] leading-7", muted ? "text-ink-3" : "text-ink-2", className)}>{children}</p>;
}

/** A tidy reference table: first column reads as the row's name, numbers right-aligned in tabular figures. */
function Table({ head, rows, align }: { head: string[]; rows: ReactNode[][]; align: ("start" | "end")[] }) {
  return (
    <div tabIndex={0} role="region" aria-label={head.join(", ")} className="overflow-x-auto rounded-xl border border-line bg-panel">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-xs text-ink-3">
          <tr>{head.map((h, i) => <th key={i} scope="col" className={clsx("px-4 py-2.5 font-medium", align[i] === "end" ? "text-end" : "text-start")}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => j === 0
                ? <th key={j} scope="row" className="px-4 py-2.5 text-start font-normal text-ink">{c}</th>
                : <td key={j} className={clsx("px-4 py-2.5", align[j] === "end" ? "tnum text-end text-ink" : "text-ink-3")}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MissingCell({ v }: { v: number | null | undefined }) {
  const x = v ?? 0;
  return (
    <td className="px-1 py-2 text-center">
      <span className="tnum inline-block w-11 rounded px-1 text-xs" title={t(`${fmtPct(x)} missing`, `${fmtPct(x)} مفقود`)}
        style={{ background: `color-mix(in oklab, var(--warn-fill) ${Math.round(x * 50)}%, transparent)`, color: x > 0.6 ? "var(--ink)" : "var(--ink-2)" }}>
        {fmtPct(x, 0)}
      </span>
    </td>
  );
}
