import { ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Guard, PageHeader, Pill } from "../components/ui";
import { useApi } from "../lib/api";
import { filterParams } from "../lib/filters";
import { fmtInt, fmtPct, fmtUsd } from "../lib/format";
import { useFilters } from "../lib/hooks";
import { getLang, t, tv } from "../lib/i18n";
import type { Insight } from "../lib/types";

const kindLabel = (k: string) => ({
  skills: t("Skills", "المهارات"), roles: t("Roles", "الأدوار"), market: t("Market", "السوق"), salary: t("Salary", "الرواتب"),
  geography: t("Geography", "الجغرافيا"), provenance: t("Data provenance", "مصدر البيانات"),
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
  const q = useApi<Insight[]>("/insights", filters);
  const base = filterParams(filters);
  return (
    <>
      <PageHeader title={t("Guided insights", "رؤى موجّهة")}
        description={t("Plain-language findings computed for your current filters. Each sentence is generated from a database query — no language model writes the numbers — and shows its population.",
          "نتائج بلغة واضحة محسوبة وفق عوامل التصفية الحالية. تُولَّد كل جملة من استعلام على قاعدة البيانات — لا يكتب نموذج لغوي أي رقم — وتوضح المجموعة التي تصفها.")} />
      <Guard q={q} h={420} empty={(d) => !d.length}>
        {(items) => (
          <ol className="grid gap-3">
            {items.map((i) => {
              const sp = new URLSearchParams(base);
              for (const [k, v] of Object.entries(i.drill.params)) sp.append(k, v);
              const path = /^\/(?![/\\])/.test(i.drill.path) ? i.drill.path : "/";
              const to = path === "/skills" && i.drill.params.skill
                ? `/skills?${new URLSearchParams([...base, ["view", i.drill.params.skill]]).toString()}`
                : `${path}${sp.toString() ? `?${sp}` : ""}`;
              return (
                <li key={i.id} className="rounded-lg border border-line bg-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="max-w-3xl text-lg text-ink">{sentence(i)}</p>
                    <Pill>{kindLabel(i.kind)}</Pill>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
                    <span className="inline-flex items-center gap-1"><Info size={12} /> n = {fmtInt(i.n)}{i.denominator !== i.n && <> {t("of", "من")} {fmtInt(i.denominator)}</>}</span>
                    <span>{t("Filters:", "عوامل التصفية:")} <span dir="auto">{Object.keys(i.filters).length ? Object.entries(i.filters).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("|") : v}`).join(", ") : t("none", "لا يوجد")}</span></span>
                    <span>{t("Skills counted:", "المهارات المحتسبة:")} {i.provenance === "observed" ? t("written in posting", "المذكورة في الإعلان") : t("including team-added", "بما فيها ما أضافه الفريق")}</span>
                    <Link to={to} className="ms-auto inline-flex items-center gap-1 font-medium text-accent-ink hover:underline">{t("Investigate", "تعمّق")} <ArrowRight size={13} className="rtl:rotate-180" /></Link>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Guard>
    </>
  );
}
