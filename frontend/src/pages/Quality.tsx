import clsx from "clsx";
import { Kpi, KpiStrip } from "../components/Kpi";
import { Guard, PageHeader, Panel } from "../components/ui";
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

export default function Quality() {
  const q = useApi<Q>("/quality", null);
  const { data: meta } = useMeta();
  const labels = useLabels();
  return (
    <>
      <PageHeader title={t("Data & methodology", "البيانات والمنهجية")} description={t("How the dataset was built, how complete it is, and what it can and cannot tell you. Everything here covers the whole dataset; the filter bar does not apply.",
        "كيف بُنيت مجموعة البيانات، ومدى اكتمالها، وما يمكن أن تخبرك به وما لا يمكن. كل ما هنا يغطي مجموعة البيانات كاملة؛ ولا ينطبق عليه شريط التصفية.")} />
      <Guard q={q} h={500}>
        {(d) => {
          const stages = d.pipeline.stages ?? [];
          const raw = stages[0]?.rows;
          const tax = d.taxonomy.reduce((a, x) => a + x.mentions, 0);
          return (<div className="grid gap-4">
            <KpiStrip>
              <Kpi label={t("Raw rows loaded", "الصفوف الخام المحمّلة")} value={raw ? fmtInt(raw) : "—"} sub={t("7 source files", "7 ملفات مصدر")} />
              <Kpi label={t("Unique postings kept", "إعلانات فريدة محتفظ بها")} value={fmtInt(d.totals.postings)} sub={raw ? t(`${fmtPct(d.totals.postings / raw)} of raw rows`, `${fmtPct(d.totals.postings / raw)} من الصفوف الخام`) : undefined} />
              <Kpi label={t("Merged duplicates", "تكرارات مدمجة")} value={fmtInt(d.totals.merged_duplicates)} sub={t("postings found on 2+ boards", "إعلانات ظهرت في موقعين أو أكثر")} />
              <Kpi label={t("Skills written in posting", "مهارات مذكورة في الإعلان")} value={fmtPct(d.skill_provenance.observed_share)} sub={t(`of ${fmtInt(d.skill_provenance.rows)} posting–skill pairs`, `من ${fmtInt(d.skill_provenance.rows)} زوج إعلان–مهارة`)} />
              <Kpi label={t("Pipeline run", "تشغيل خط المعالجة")} value={d.pipeline.generated_at ? fmtDate(d.pipeline.generated_at.slice(0, 10)) : "—"} sub={d.pipeline.runtime_seconds ? t(`${Math.round(d.pipeline.runtime_seconds)} s end to end`, `${Math.round(d.pipeline.runtime_seconds)} ثانية من البداية للنهاية`) : undefined} />
              <Kpi label={t("Store built", "بناء قاعدة البيانات")} value={fmtDate(d.built_at.slice(0, 10))} sub={d.dataset_kind === "synthetic" ? t("SYNTHETIC demo data", "بيانات تجريبية مُولَّدة") : t("from data/processed", "من data/processed")} />
            </KpiStrip>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title={t("Pipeline stages", "مراحل خط المعالجة")} meta={t("Record counts logged by src/pipeline.py (FR-28)", "أعداد السجلات كما سجّلها src/pipeline.py (FR-28)")}>
                <ol className="space-y-2">
                  {stages.map((s, i) => (
                    <li key={s.stage}>
                      <div className="flex justify-between text-sm"><span className="text-ink-2">{pipe(s.stage)}</span><span className="tnum font-medium">{fmtInt(s.rows)}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-panel-2"><div className={clsx("h-full rounded-full", i === stages.length - 1 ? "bg-s4" : "bg-[var(--s4-soft)]")} style={{ width: `${(s.rows / (raw || 1)) * 100}%` }} /></div>
                    </li>
                  ))}
                </ol>
                {d.pipeline.dropped && <p className="mt-3 text-sm text-ink-3">{t("Dropped before de-duplication: ", "حُذف قبل إزالة التكرار: ")}{Object.entries(d.pipeline.dropped).map(([k, v]) => `${pipe(k)} ${fmtInt(v)}`).join(" · ")}</p>}
                <p className="mt-2 text-sm text-ink-3">{t("De-duplication: exact duplicates first, then the same normalized title + employer + location + country (job boards and “Confidential” also compare date and description). The most complete copy is kept and every source it appeared in is recorded.",
                  "إزالة التكرار: التكرارات المطابقة أولًا، ثم الإعلانات ذات المسمى وجهة التوظيف والموقع والدولة نفسها بعد التوحيد (ويُقارَن أيضًا التاريخ والوصف لمواقع التوظيف و«جهة سرية»). تُحفظ النسخة الأكمل ويُسجَّل كل مصدر ظهرت فيه.")}</p>
              </Panel>
              <Panel title={t("Collections (cohorts)", "دفعات الجمع")} meta={t("Why time comparisons are restricted", "لماذا تُقيَّد المقارنات الزمنية")}>
                <ul className="space-y-3 text-sm">
                  {d.cohorts.map((c) => <li key={c.key}><p className="font-medium">{t(c.label, labels.cohort(c.key))}</p><p className="text-ink-2">{t(c.note, labels.cohortNote(c.key))}</p></li>)}
                </ul>
                <p className="mt-3 text-sm text-ink-2">{t("Monthly trends are computed only inside the 2023 archive; the two collections are compared as snapshots, never as growth.", "تُحسب الاتجاهات الشهرية داخل أرشيف 2023 فقط؛ وتُقارَن الدفعتان كلقطتين منفصلتين، لا كنمو.")}</p>
              </Panel>
            </div>

            <Panel title={t("Sources", "المصادر")} meta={t("Raw rows (before cleaning) → unique postings kept · completeness of key fields (share missing)", "الصفوف الخام (قبل التنظيف) ← الإعلانات الفريدة المحتفظ بها · اكتمال الحقول الرئيسية (نسبة المفقود)")}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-start text-xs text-ink-3">
                    <tr>
                      <th scope="col" className="py-2 pe-2 text-start font-medium">{t("Source", "المصدر")}</th>
                      <th scope="col" className="px-2 py-2 text-end font-medium">{t("Raw rows", "صفوف خام")}</th>
                      <th scope="col" className="px-2 py-2 text-end font-medium">{t("Kept", "المحتفظ به")}</th>
                      <th scope="col" className="px-2 py-2 text-start font-medium">{t("Posting dates", "تواريخ النشر")}</th>
                      <th scope="col" className="px-2 py-2 text-end font-medium">{t("Advertised pay", "رواتب معلنة")}</th>
                      <th scope="col" className="px-2 py-2 text-end font-medium">{t("Benchmarks", "رواتب مرجعية")}</th>
                      <th scope="col" className="px-2 py-2 text-end font-medium" title={t("Share of posting–skill pairs that were in the data as collected", "نسبة أزواج الإعلان–المهارة الموجودة في البيانات كما جُمعت")}>{t("Skills written", "مهارات مذكورة")}</th>
                      {FIELDS.map(([k, en, ar]) => <th key={k} scope="col" className="px-1 py-2 text-center font-medium">{t(en, ar)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {d.per_source.map((s) => (
                      <tr key={s.source} className="border-t border-line">
                        <th scope="row" className="py-1.5 pe-2 text-start font-normal">{t(s.label, labels.source(s.source))}</th>
                        <td className="tnum px-2 py-1.5 text-end text-ink-3">{fmtInt(d.pipeline.raw_rows_by_source?.[s.source])}</td>
                        <td className="tnum px-2 py-1.5 text-end">{fmtInt(s.postings)}</td>
                        <td className="tnum px-2 py-1.5 whitespace-nowrap text-ink-2"><bdi>{s.first_posted ? `${s.first_posted.slice(0, 7)} – ${s.last_posted?.slice(0, 7)}` : t("no dates", "بلا تواريخ")}</bdi></td>
                        <td className="tnum px-2 py-1.5 text-end">{fmtInt(s.advertised_salary)}</td>
                        <td className="tnum px-2 py-1.5 text-end text-ink-3">{fmtInt(s.benchmark_salary)}</td>
                        <td className="tnum px-2 py-1.5 text-end">{fmtPct(s.observed_share, 0)}</td>
                        {FIELDS.map(([k]) => <MissingCell key={k} v={s.missing[k]} />)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-ink-3">{t("Cell shading = share of the source's postings missing that field (darker = more missing). Descriptions are absent from the Kaggle data and are short API snippets for Jooble/Careerjet.",
                "تظليل الخلية = نسبة إعلانات المصدر التي ينقصها ذلك الحقل (الأغمق = نقص أكبر). الأوصاف غير موجودة في بيانات Kaggle، وهي مقتطفات قصيرة من الواجهات البرمجية في Jooble/Careerjet.")}</p>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title={t("Skill provenance", "مصدر المهارات")} meta={t("Per posting × skill (job_skills.is_observed)", "لكل زوج إعلان × مهارة (job_skills.is_observed)")}>
                {getLang() === "en" ? <>
                <p className="text-sm text-ink-2">A skill is <b>written in posting</b> when it was in the posting data as collected (the Kaggle skills field, the API's original skills, the Arab file's original column). Skills the team inferred later from the title or similar postings are <b>added by team</b>.</p>
                <p className="mt-2 text-sm text-ink-2">Every skill chart shows the two parts; the “Written in posting” switch removes added skills from counts and denominators.</p>
                <p className="mt-2 text-sm text-ink-3">Check: on all 31,178 Kaggle Arab-search rows marked “Original”, the recovered original skills match the dataset's own job_type_skills exactly.</p>
                </> : <>
                <p className="text-sm text-ink-2">تكون المهارة <b>مذكورة في الإعلان</b> إذا وُجدت في بيانات الإعلان كما جُمعت (حقل المهارات في Kaggle، والمهارات الأصلية من الواجهة البرمجية، والعمود الأصلي في الملف العربي). أما المهارات التي استنتجها الفريق لاحقًا من المسمى أو من إعلانات مشابهة فهي <b>مهارات أضافها الفريق</b>.</p>
                <p className="mt-2 text-sm text-ink-2">كل رسم للمهارات يُظهر الجزأين؛ ومفتاح «مذكورة في الإعلان» يستبعد المهارات المضافة من الأعداد والمقامات.</p>
                <p className="mt-2 text-sm text-ink-3">تحقق: في كل صفوف بحث Kaggle العربية الـ31,178 الموسومة «Original»، تطابق المهارات الأصلية المستعادة حقل job_type_skills في مجموعة البيانات تمامًا.</p>
                </>}
              </Panel>
              <Panel title={t("Skill categories", "فئات المهارات")} meta={t("Where each skill's category comes from", "من أين تأتي فئة كل مهارة")}>
                <ul className="space-y-1 text-sm">
                  {d.taxonomy.map((x) => <li key={x.source} className="flex justify-between"><span className="text-ink-2">{x.source === "none" ? t("Uncategorized (not guessed)", "غير مصنفة (دون تخمين)") : x.source === "kaggle" ? "Kaggle job_type_skills" : x.source === "curated" ? t("Curated list (team-added skills)", "قائمة منتقاة (مهارات أضافها الفريق)") : t("Kaggle, documented correction", "Kaggle، مع تصحيح موثّق")}</span>
                    <span className="tnum">{fmtPct(x.mentions / tax)} · {t(`${fmtInt(x.skills)} skills`, `${fmtInt(x.skills)} مهارة`)}</span></li>)}
                </ul>
              </Panel>
              <Panel title={t("Salary provenance", "مصدر الرواتب")} meta={t("Advertised vs benchmark, by source", "المعلنة مقابل المرجعية، حسب المصدر")}>
                <ul className="space-y-1 text-sm">
                  {d.per_source.filter((s) => s.advertised_salary + s.benchmark_salary > 0).map((s) => (
                    <li key={s.source} className="flex justify-between gap-2"><span className="truncate text-ink-2">{t(s.label, labels.source(s.source))}</span>
                      <span className="tnum shrink-0">{t(`${fmtInt(s.advertised_salary)} adv. · ${fmtInt(s.benchmark_salary)} bench.`, `${fmtInt(s.advertised_salary)} معلن · ${fmtInt(s.benchmark_salary)} مرجعي`)}</span></li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-3">{t("Benchmarks (Paylab, Indeed, US BLS) describe the job title in that country, not the posting, and appear only in the Salary lab's benchmark view.",
                  "الرواتب المرجعية (Paylab وIndeed وUS BLS) تصف المسمى الوظيفي في تلك الدولة لا الإعلان نفسه، وتظهر فقط في العرض المرجعي بصفحة الرواتب.")}</p>
              </Panel>
            </div>

            <Panel title={t("Location correction: the “Sudan” rows", "تصحيح الموقع: صفوف «السودان»")} meta={t("Evidence recorded by the pipeline (reports/pipeline_stats.json)", "أدلة سجّلها خط المعالجة (reports/pipeline_stats.json)")}>
              {d.sudan_correction.before ? (
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <p className="text-ink-2">{getLang() === "en"
                      ? <>{fmtInt(d.sudan_correction.before.rows)} rows of the merged team file have <code>job_country = "Sudan"</code>: it was the Kaggle <i>search location</i>. Their country rebuilt from each posting's own location:</>
                      : <>{fmtInt(d.sudan_correction.before.rows)} صفًا في ملف الفريق المدمج تحمل <code>job_country = "Sudan"</code>: وهو <i>موقع البحث</i> في Kaggle. دولتها بعد إعادة بنائها من موقع كل إعلان:</>}</p>
                    <ul className="mt-2 space-y-0.5">{Object.entries(d.sudan_correction.before.country_from_real_location).map(([k, v]) => <li key={k} className="flex justify-between"><span>{pipe(k)}</span><span className="tnum">{fmtInt(v)}</span></li>)}</ul>
                  </div>
                  <div>
                    <p className="text-ink-2">{t("After cleaning and de-duplication those postings are counted as:", "بعد التنظيف وإزالة التكرار تُحتسب هذه الإعلانات كالتالي:")}</p>
                    <ul className="mt-2 space-y-0.5">{d.sudan_correction.after_dedup.map((r) => <li key={r.key} className="flex justify-between"><span>{pipe(r.key)}</span><span className="tnum">{fmtInt(r.n)}</span></li>)}</ul>
                    <p className="mt-2 text-ink-3">{t("“Remote (Anywhere)” rows have no single country and count as Remote.", "صفوف «عن بُعد (من أي مكان)» ليست لها دولة محددة وتُحتسب ضمن العمل عن بُعد.")}</p>
                  </div>
                </div>
              ) : <p className="text-sm text-ink-3">{t("Not available for this store.", "غير متاح لقاعدة البيانات هذه.")}</p>}
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title={t("Metric definitions", "تعريفات المقاييس")}>
                <dl className="space-y-2 text-sm">
                  {[
                    [t("Unique postings", "إعلانات فريدة"), t("Rows of the de-duplicated dataset. 'Listings' counts every board the posting appeared on.", "صفوف مجموعة البيانات بعد إزالة التكرار. أما «الظهورات» فتعدّ كل موقع ظهر فيه الإعلان.")],
                    [t("Skill share", "نسبة المهارة"), t("Postings in the population that list the skill ÷ postings in the population that list any skill (same provenance mode).", "الإعلانات التي تذكر المهارة ÷ الإعلانات التي تذكر أي مهارة، ضمن المجموعة نفسها (وبنمط المصدر نفسه).")],
                    [t("Market type", "نوع السوق"), t("Remote if marked remote or from a remote board; otherwise Arab if in an Arab League country; otherwise International.", "عن بُعد إذا وُسم كذلك أو جاء من موقع للعمل عن بُعد؛ وإلا فعربي إذا كان في دولة عضو في جامعة الدول العربية؛ وإلا فدولي.")],
                    [t("Advertised salary", "الراتب المعلن"), t("Midpoint of the posting's own range, annualized, converted to USD at fixed approximate rates; $500–$1M per year kept.", "منتصف النطاق المذكور في الإعلان، محوَّلًا إلى قيمة سنوية وإلى الدولار بأسعار تقريبية ثابتة؛ ويُحتفظ بما بين 500 دولار ومليون دولار سنويًا.")],
                    [t("Lift", "الرفع (Lift)"), t("How many times more often two skills co-occur than if independent. 1 = no association.", "كم مرة تظهر مهارتان معًا أكثر مما لو كانتا مستقلتين. 1 = لا ارتباط.")],
                    [t("Alignment (career planner)", "التوافق (مخطط المسار المهني)"), t("Share-weighted coverage of the 15 most requested skills of a role. Descriptive; not a hiring probability.", "تغطية أكثر 15 مهارة طلبًا لدور ما، موزونة بنسبها. مقياس وصفي؛ وليس احتمالًا للتوظيف.")],
                    [t("Small sample", "عينة صغيرة"), t(`Groups below ${meta?.thresholds.min_group_postings ?? 30} postings are flagged or hidden; salary statistics need ${meta?.thresholds.min_salary_n ?? 10}+ salaries.`,
                      `تُميَّز أو تُخفى المجموعات التي تقل عن ${meta?.thresholds.min_group_postings ?? 30} إعلانًا؛ وتحتاج إحصاءات الرواتب إلى ${meta?.thresholds.min_salary_n ?? 10} رواتب على الأقل.`)],
                  ].map(([k, v]) => <div key={k}><dt className="font-medium">{k}</dt><dd className="m-0 text-ink-2">{v}</dd></div>)}
                </dl>
              </Panel>
              <Panel title={t("What this data can and cannot show", "ما تُظهره هذه البيانات وما لا تُظهره")}>
                <ul className="list-disc space-y-1.5 ps-5 text-sm text-ink-2">
                  <li>{t(`It describes ${fmtInt(d.totals.postings)} collected postings, not the whole labour market or real hiring volumes.`, `تصف ${fmtInt(d.totals.postings)} إعلانًا مجمَّعًا، لا سوق العمل كله ولا أحجام التوظيف الفعلية.`)}</li>
                  <li>{t(`${labels.cohort("kaggle_2023")} is about ${fmtPct((meta?.dimensions.cohort.find((c) => c.value === "kaggle_2023")?.n ?? 0) / d.totals.postings, 0)} of the data and covers data roles only, so data skills dominate every overall ranking.`,
                    `يمثّل ${labels.cohort("kaggle_2023")} نحو ${fmtPct((meta?.dimensions.cohort.find((c) => c.value === "kaggle_2023")?.n ?? 0) / d.totals.postings, 0)} من البيانات ويغطي وظائف البيانات فقط، لذا تتصدر مهارات البيانات كل ترتيب إجمالي.`)}</li>
                  <li>{t("Arab-market postings are few compared with international ones; country comparisons carry sample-size flags.", "إعلانات السوق العربي قليلة مقارنةً بالدولية؛ لذا تحمل مقارنات الدول تنبيهات بحجم العينة.")}</li>
                  <li>{t("Role and seniority come from title keywords (a baseline, not a trained classifier); most titles state no seniority.", "يُستخلص الدور ومستوى الخبرة من كلمات المسمى الوظيفي (أساس مبدئي لا مصنِّف مدرَّب)؛ ومعظم المسميات لا تذكر مستوى الخبرة.")}</li>
                  <li>{t(`Only ${fmtPct(1 - (d.totals.missing.salary_usd_annual ?? 1), 0)} of postings carry a usable salary of either kind; pay results describe that subset.`, `${fmtPct(1 - (d.totals.missing.salary_usd_annual ?? 1), 0)} فقط من الإعلانات تحمل راتبًا صالحًا للاستخدام من أي نوع؛ ونتائج الرواتب تصف هذه المجموعة الفرعية.`)}</li>
                  <li>{t(`Employer counts are postings in this sample, not company size. ${fmtInt(d.totals.placeholder_company_postings)} postings name a job board or a hidden employer.`, `أعداد جهات التوظيف هي إعلانات في هذه العينة، لا حجم الشركات. ${fmtInt(d.totals.placeholder_company_postings)} إعلانًا تذكر موقع توظيف أو جهة توظيف مخفية.`)}</li>
                  <li>{t("Raw postings are not redistributed: exports are aggregates only (NFR-08).", "لا يُعاد نشر الإعلانات الخام: الصادرات بيانات مجمّعة فقط (NFR-08).")}</li>
                </ul>
              </Panel>
            </div>
          </div>);
        }}
      </Guard>
    </>
  );
}

function MissingCell({ v }: { v: number | null | undefined }) {
  const x = v ?? 0;
  return (
    <td className="px-1 py-1.5 text-center">
      <span className="tnum inline-block w-11 rounded px-1 text-xs" title={t(`${fmtPct(x)} missing`, `${fmtPct(x)} مفقود`)}
        style={{ background: `color-mix(in oklab, var(--s5) ${Math.round(x * 55)}%, transparent)`, color: x > 0.6 ? "var(--ink)" : "var(--ink-2)" }}>
        {fmtPct(x, 0)}
      </span>
    </td>
  );
}
