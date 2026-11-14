import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Guard, PageHeader } from "../components/ui";
import { useApi } from "../lib/api";
import { filterParams } from "../lib/filters";
import { fmtInt, fmtPct, fmtUsd } from "../lib/format";
import { useFilters, useLabels } from "../lib/hooks";
import { getLang, t, tv } from "../lib/i18n";
import type { Insight } from "../lib/types";

const kindLabel = (k: string) => ({
  skills: t("Skills", "المهارات"), roles: t("Roles", "الأدوار"), market: t("Market", "السوق"), salary: t("Salary", "الرواتب"),
  geography: t("Geography", "الجغرافيا"), provenance: t("Data provenance", "مصدر البيانات"),
} as Record<string, string>)[k] ?? k;

/** What the drill link opens, named for the page it lands on. */
const drillLabel = (path: string) => ({
  "/explorer": t("See these jobs", "اعرض هذه الوظائف"), "/skills": t("Open the skill profile", "افتح ملف المهارة"),
  "/salary": t("Open salaries", "افتح الرواتب"), "/geography": t("Open locations", "افتح المواقع"),
  "/compare": t("Compare the two", "قارن بينهما"), "/quality": t("Read how skills were counted", "اقرأ كيف احتُسبت المهارات"),
  "/trends": t("Open over time", "افتح عبر الزمن"), "/market": t("Open the market overview", "افتح نظرة السوق"),
} as Record<string, string>)[path] ?? t("See the data", "اعرض البيانات");

/** Filter names as the filter bar shows them. */
const filterName = (k: string) => ({
  country: t("Country", "الدولة"), region: t("Region", "المنطقة"), market: t("Market", "السوق"), role: t("Role", "الدور"),
  seniority: t("Seniority", "مستوى الخبرة"), job_type: t("Job type", "نوع التوظيف"), work_mode: t("Work mode", "نمط العمل"),
  source: t("Source", "المصدر"), cohort: t("Collection", "دفعة الجمع"), company: t("Employer", "جهة التوظيف"), skill: t("Lists skill", "يذكر مهارة"),
  q: t("Search", "البحث"), date_from: t("From", "من"), date_to: t("To", "إلى"), salary: t("Salary", "الراتب"), provenance: t("Skills counted", "المهارات المحتسبة"),
} as Record<string, string>)[k] ?? k;

/** The API writes each finding in English; the Arabic sentence is rebuilt from the same values. */
function sentence(i: Insight): string {
  const a = i.args;
  if (getLang() !== "ar" || !a) return i.text;
  const num = (k: string) => a[k] as number | null;
  const str = (k: string) => String(a[k] ?? "");
  const prov = i.provenance === "observed" ? "المذكورة في الإعلان فقط" : "بما فيها المهارات التي أضافها الفريق";
  switch (i.id) {
    case "top_skill":
      return `تظهر ${str("skill")} في ${fmtPct(num("share"))} من ${fmtInt(num("denominator"))} إعلان مختارًا تذكر مهارات (${prov}).`;
    case "top_two":
      return `يُطلب ${str("a")} أكثر من ${str("b")} (${fmtPct(num("a_share"))} مقابل ${fmtPct(num("b_share"))}).`;
    case "enrichment":
      return `${fmtPct(num("share"))} من مرات ظهور هذه المهارات العشر أضافها الفريق بعد الجمع، ولم تُكتب في بيانات الإعلانات.`;
    case "top_role":
      return `${tv(str("role"))} هو الدور الأكثر شيوعًا: ${fmtInt(num("n"))} من ${fmtInt(num("total"))} إعلان (${fmtPct(num("share"))}).`;
    case "remote":
      return `${fmtPct(num("share"))} من الإعلانات المختارة عن بُعد (${fmtInt(num("n"))} من ${fmtInt(num("total"))}).`;
    case "salary":
      if (a.median == null) {
        return `${fmtInt(num("n"))} إعلان مختارًا فقط تذكر راتبًا — وهو عدد قليل لا يكفي لوسيط موثوق (الحد الأدنى ${fmtInt(num("min"))}).`;
      }
      return `${fmtInt(num("n"))} إعلان مختارًا تذكر راتبًا معلنًا، ووسيطها نحو ${fmtUsd(num("median"))} سنويًا (محسوب سنويًا بالدولار الأمريكي تقريبًا`
        + ((num("currencies") ?? 0) > 1 ? `، بعد التحويل من ${fmtInt(num("currencies"))} عملات بأسعار ثابتة` : "") + ").";
    case "concentration":
      return `تضم أعلى 3 دول (${(a.countries as string[]).map(tv).join("، ")}) ${fmtPct(num("share"))} من الإعلانات المعروفة الدولة — العينة مركّزة جغرافيًا.`;
    case "pairing":
      return `تُذكر ${str("a")} و${str("b")} معًا أكثر بـ ${(num("lift") ?? 0).toFixed(1)}× مما لو كانتا مستقلتين (${fmtInt(num("together"))} إعلان؛ المهارات المذكورة في الإعلان فقط).`;
    case "cohort_mix":
      return `${fmtPct(num("share"))} من الإعلانات المختارة من أرشيف Kaggle لعام 2023، والباقي جُمع في 2024–26. اقرأ الفروق الزمنية بحذر.`;
    default:
      return i.text;
  }
}

export default function Insights() {
  const { filters } = useFilters();
  const labels = useLabels();
  const q = useApi<Insight[]>("/insights", filters);
  const base = filterParams(filters);
  const value = (k: string, v: string) => (k === "cohort" ? labels.cohort(v) : k === "source" ? labels.source(v) : k === "company" || k === "skill" || k === "q" || k.startsWith("date") ? v : tv(v));
  const population = (f: Insight["filters"]) => {
    const parts = Object.entries(f).map(([k, v]) => `${filterName(k)}: ${(Array.isArray(v) ? v.map(String) : [String(v)]).map((x) => value(k, x)).join(t(" or ", " أو "))}`);
    return parts.length ? parts.join(" · ") : t("all postings, no filters", "كل الإعلانات، بلا فلاتر");
  };
  const href = (i: Insight) => {
    const sp = new URLSearchParams(base);
    for (const [k, v] of Object.entries(i.drill.params)) sp.append(k, v);
    // the overview moved from "/" to "/market"; anything that is not a local path also lands there
    const raw = /^\/(?![/\\])/.test(i.drill.path) ? i.drill.path : "/market";
    const path = raw === "/" ? "/market" : raw;
    return path === "/skills" && i.drill.params.skill
      ? { path, to: `/skills?${new URLSearchParams([...base, ["view", i.drill.params.skill]]).toString()}` }
      : { path, to: `${path}${sp.toString() ? `?${sp}` : ""}` };
  };

  return (
    <>
      <PageHeader title={t("Guided insights", "رؤى موجّهة")}
        description={t("Plain-language findings for your current filters. Each sentence is computed by a database query (no language model writes the numbers) and states how many postings it describes.",
          "نتائج بلغة واضحة وفق الفلاتر الحالية. تُحسب كل جملة باستعلام على قاعدة البيانات (لا يكتب نموذج لغوي أي رقم)، وتذكر عدد الإعلانات التي تصفها.")} />
      <Guard q={q} h={420} empty={(d) => !d.length}>
        {(items) => {
          const shared = items.every((i) => JSON.stringify(i.filters) === JSON.stringify(items[0].filters));
          return (
            <section aria-labelledby="ins-h" className="overflow-hidden rounded-xl border border-line bg-panel">
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <h2 id="ins-h" className="text-[0.9375rem] font-semibold text-ink">{t(`${items.length} findings`, `${items.length} نتائج`)}</h2>
                {shared && <p className="mt-0.5 text-sm text-ink-3">{t("Population: ", "المجموعة: ")}<span dir="auto">{population(items[0].filters)}</span></p>}
              </div>
              <ol className="divide-y divide-line">
                {items.map((i) => {
                  const { path, to } = href(i);
                  return (
                    <li key={i.id} className="grid gap-x-8 gap-y-2 px-5 py-5 sm:px-6 md:grid-cols-[8rem_minmax(0,1fr)]">
                      <p className="text-xs font-medium text-ink-3 md:pt-1">{kindLabel(i.kind)}</p>
                      <div className="min-w-0">
                        <p className="max-w-[65ch] text-lg leading-7 text-ink">{sentence(i)}</p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-3">
                          <span className="tnum">n = <span className="font-medium text-ink-2">{fmtInt(i.n)}</span>{i.denominator !== i.n && <> {t("of", "من")} {fmtInt(i.denominator)}</>}</span>
                          <span>{t("Skills counted: ", "المهارات المحتسبة: ")}{i.provenance === "observed" ? t("written in posting only", "المذكورة في الإعلان فقط") : t("including team-added", "بما فيها ما أضافه الفريق")}</span>
                          {!shared && <span>{t("Population: ", "المجموعة: ")}<span dir="auto">{population(i.filters)}</span></span>}
                          <Link to={to} className="inline-flex items-center gap-1 font-medium text-accent-ink no-underline hover:underline md:ms-auto">
                            {drillLabel(path)} <ArrowRight size={13} className="rtl:rotate-180" />
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        }}
      </Guard>
    </>
  );
}
