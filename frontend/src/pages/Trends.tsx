import clsx from "clsx";
import { X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Chart } from "../components/Chart";
import { CohortMonths, MonthLines } from "../components/charts";
import { ChartPanel, Guard, PageHeader, Panel, Select } from "../components/ui";
import { useApi } from "../lib/api";
import { axisStyle, baseOption, esc } from "../lib/echarts";
import { fmtInt, fmtPct, fmtPp } from "../lib/format";
import { useFilters, useLabels, useMeta } from "../lib/hooks";
import { t } from "../lib/i18n";
import { haveSet, useProfile } from "../lib/profile";
import type { SkillTrend, TopSkills } from "../lib/types";

interface Trends {
  skills: string[]; skill_trend: SkillTrend; roles_2023: { month: string; role: string; n: number }[];
  half_year_2023: { skill: string; h1_share: number; h2_share: number; change_pp: number; h1_denominator: number; h2_denominator: number }[];
  snapshot: Record<string, TopSkills>; min_group: number;
}

const COHORTS = ["kaggle_2023", "collected_2026"] as const;

export default function TrendsPage() {
  const { filters } = useFilters();
  const labels = useLabels();
  const { data: meta } = useMeta();
  const { profile } = useProfile();
  const has = haveSet(profile.skills);
  const [sp, setSp] = useSearchParams();
  const series = sp.getAll("series");
  const q = useApi<Trends>("/trends", filters, { series });
  const pool = useApi<TopSkills>("/skills/top", filters, { limit: 40 });
  const setSeries = (next: string[]) => setSp((prev) => {
    const s = new URLSearchParams(prev);
    s.delete("series");
    next.slice(0, 6).forEach((x) => s.append("series", x));
    return s;
  }, { replace: true });

  return (
    <>
      <PageHeader title={t("Over time", "عبر الزمن")}
        description={t("How demand moves inside each of the two collections. The collections are never joined into one timeline.",
          "كيف يتغير الطلب داخل كل دفعة من دفعتي الجمع. لا تُدمج الدفعتان أبدًا في خط زمني واحد.")} />

      <section aria-labelledby="rule-h" className="rounded-xl border border-line bg-panel">
        <div className="px-5 pt-4 pb-3">
          <h2 id="rule-h" className="text-[0.9375rem] font-semibold text-ink">{t("Two separate collections, never one line", "دفعتا جمع منفصلتان، لا خط واحد")}</h2>
          <p className="mt-1 max-w-[70ch] text-sm leading-6 text-ink-2">
            {t("The postings come from two collections gathered years apart, from different sources, covering different roles, collected in different ways. A rise or fall between them could come from any of those changes, not from the market. So every chart here keeps them apart, and this page shows no growth rate between 2023 and 2026 and no forecast: the 2024–26 collection spans only a few months, too little history to test one.",
              "تأتي الإعلانات من دفعتين جُمعتا بفارق سنوات، من مصادر مختلفة، وتغطيان أدوارًا مختلفة، وبطرق جمع مختلفة. أي ارتفاع أو انخفاض بينهما قد يعود إلى أي من هذه الاختلافات لا إلى السوق. لذلك يفصل كل رسم هنا بينهما، ولا تعرض هذه الصفحة معدل نمو بين 2023 و2026 ولا أي توقع: دفعة 2024–26 لا تغطي سوى بضعة أشهر، وهو تاريخ أقصر من أن يُختبر به توقع.")}
          </p>
        </div>
        <dl className="m-0 grid border-t border-line md:grid-cols-2">
          {COHORTS.map((c, i) => (
            <div key={c} className={clsx("px-5 py-4", i > 0 && "border-line max-md:border-t md:border-s")}>
              <dt className="font-medium text-ink">{labels.cohort(c)}</dt>
              <dd className="m-0 mt-1 text-sm text-ink-2">{labels.cohortNote(c)}</dd>
              <dd className="m-0 mt-2 text-sm text-ink-3">
                <span className="tnum font-medium text-ink">{fmtInt(meta?.dimensions.cohort.find((x) => x.value === c)?.n)}</span> {t("postings in the whole dataset", "إعلانًا في مجموعة البيانات كلها")}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <Guard q={q} h={480}>
        {(d) => {
          const lines = d.skill_trend.series.map((s) => ({ name: s.skill,
            points: s.points.filter((p) => p.cohort === "kaggle_2023" && p.reliable).map((p) => ({ x: p.month.slice(0, 7), y: p.share, n: p.denominator })) }));
          const months = d.skill_trend.months;
          const half = d.half_year_2023;
          return (<div className="mt-6 grid gap-6">
            <ChartPanel title={t("Postings per month, one chart per collection", "الإعلانات شهريًا، رسم لكل دفعة")}
              meta={t(`Each chart has its own scale, so their heights cannot be compared. Months with fewer than ${d.min_group} postings are counted in text, not plotted.`,
                `لكل رسم مقياسه الخاص، فلا تُقارَن ارتفاعاتهما. الأشهر التي فيها أقل من ${d.min_group} إعلانًا تُذكر نصًا ولا تُرسم.`)}
              info={t("The 2024–26 collection was mostly gathered in September–October 2026; earlier dates are older adverts that were still online.",
                "جُمعت معظم دفعة 2024–26 في سبتمبر–أكتوبر 2026؛ والتواريخ الأقدم لإعلانات قديمة كانت ما زالت منشورة.")}
              table={{ columns: [t("Collection", "دفعة الجمع"), t("Month", "الشهر"), t("Postings", "الإعلانات"), t("Postings with skills", "إعلانات تذكر مهارات"), t("Used for skill trends", "مستخدم في اتجاهات المهارات")], filename: "postings-per-month",
                rows: months.map((m) => [labels.cohort(m.cohort), m.month.slice(0, 7), m.postings, m.denominator, m.reliable ? t("yes", "نعم") : t(`no (< ${d.min_group})`, `لا (< ${d.min_group})`)]) }}>
              {(h) => months.length
                ? <CohortMonths handle={h} min={d.min_group} cohortLabel={labels.cohort} months={months.map((m) => ({ cohort: m.cohort, month: m.month, n: m.postings }))} />
                : <p className="text-sm text-ink-3">{t("No dated postings in this selection.", "لا توجد إعلانات مؤرخة في هذا الاختيار.")}</p>}
            </ChartPanel>

            <ChartPanel title={t("Monthly skill share, 2023 archive only", "النسبة الشهرية للمهارات، أرشيف 2023 فقط")}
              meta={t(`Share of each month's postings that list skills. Months with fewer than ${d.min_group} such postings are left out. The 2024–26 collection has too few months to draw a line.`,
                `نسبة إعلانات كل شهر التي تذكر مهارات. تُستبعد الأشهر التي فيها أقل من ${d.min_group} إعلانًا من هذا النوع. ودفعة 2024–26 أشهرها أقل من أن يُرسم لها خط.`)}
              extraActions={<Select label={t("Add skill", "أضف مهارة")} value="" onChange={(v) => v && setSeries([...(series.length ? series : d.skills).filter((x) => x !== v).slice(-5), v])}
                options={[{ value: "", label: t("Choose…", "اختر…") }, ...(pool.data?.rows ?? []).filter((r) => !d.skills.includes(r.skill)).map((r) => ({ value: r.skill, label: r.skill }))]} />}
              table={{ columns: [t("Skill", "المهارة"), t("Month", "الشهر"), t("Share", "النسبة"), t("Postings with skills", "إعلانات تذكر مهارات")], filename: "skill-trend-2023",
                rows: lines.flatMap((l) => l.points.map((p) => [l.name, p.x, fmtPct(p.y), p.n ?? null])) }}>
              {(h) => (<>
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <span className="me-1 text-xs text-ink-3">{t("Shown (up to 6):", "المعروضة (حتى 6):")}</span>
                  {d.skills.map((s) => (
                    <button key={s} type="button" onClick={() => setSeries(d.skills.filter((x) => x !== s))} aria-label={t(`Remove ${s} from the chart`, `إزالة ${s} من الرسم`)}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-panel-2 ps-2 pe-1 text-sm text-ink-2 ring-1 ring-line ring-inset hover:text-ink">{s} <X size={13} aria-hidden /></button>
                  ))}
                </div>
                {lines.some((l) => l.points.length) ? <MonthLines handle={h} label={t("Monthly share of postings listing each skill, 2023", "النسبة الشهرية للإعلانات التي تذكر كل مهارة، 2023")} series={lines} yName="" yFmt={(v) => fmtPct(v, 0)} height={300} />
                  : <p className="text-sm text-ink-3">{t("No month of the 2023 archive has enough postings in this selection.", "لا يحتوي أي شهر من أرشيف 2023 على إعلانات كافية في هذا الاختيار.")}</p>}
              </>)}
            </ChartPanel>

            <ChartPanel title={t("What changed within 2023: January–June vs July–December", "ما تغيّر خلال 2023: يناير–يونيو مقابل يوليو–ديسمبر")}
              meta={half[0] ? t(`Top 30 skills · ${fmtInt(half[0].h1_denominator)} vs ${fmtInt(half[0].h2_denominator)} postings with skills · change in percentage points`, `أعلى 30 مهارة · ${fmtInt(half[0].h1_denominator)} مقابل ${fmtInt(half[0].h2_denominator)} إعلانًا يذكر مهارات · التغير بالنقاط المئوية`) : t("Not enough dated 2023 postings", "لا توجد إعلانات مؤرخة كافية من 2023")}
              info={t("Same dataset, same collection method, so the comparison is like for like. Shares are of each half's postings that list skills; differences are in percentage points. Descriptive only, no forecast.", "نفس مجموعة البيانات ونفس طريقة الجمع، فالمقارنة متكافئة. النسب محسوبة من إعلانات كل نصف التي تذكر مهارات، والفروق بالنقاط المئوية. وصفية فقط، دون توقعات.")}
              table={{ columns: [t("Skill", "المهارة"), t("Jan–Jun", "يناير–يونيو"), t("Jul–Dec", "يوليو–ديسمبر"), t("Change (pp)", "التغير (نقطة)")], filename: "half-year-2023",
                rows: half.map((r) => [r.skill, fmtPct(r.h1_share), fmtPct(r.h2_share), r.change_pp]) }}>
              {(h) => {
                const r = [...half].sort((a, b) => a.change_pp - b.change_pp);
                return r.length ? (<>
                  <p className="mb-2 text-xs text-ink-3">{t("Blue = asked for more often in the second half; grey = less often.", "الأزرق = طُلبت أكثر في النصف الثاني؛ الرمادي = أقل.")}</p>
                  <Chart label={t("Change in skill share between the two halves of 2023", "التغير في نسبة المهارات بين نصفي 2023")} handleRef={h} height={Math.max(240, r.length * 22 + 30)} deps={[r]}
                    build={(tk) => ({
                      ...baseOption(tk),
                      grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
                      xAxis: { type: "value", ...axisStyle(tk), axisLabel: { color: tk.ink3, fontSize: 11, formatter: (v: number) => `${v > 0 ? "+" : ""}${v} ${t("pp", "نقطة")}` } },
                      yAxis: { type: "category", data: r.map((x) => x.skill), ...axisStyle(tk), axisLine: { show: false }, axisLabel: { color: tk.ink2, fontSize: 11 } },
                      tooltip: { ...baseOption(tk).tooltip, trigger: "item", formatter: (p: { dataIndex: number }) => {
                        const x = r[p.dataIndex];
                        return `<b>${esc(x.skill)}</b><br/>${t("Jan–Jun", "يناير–يونيو")} ${fmtPct(x.h1_share)} ${t("→", "←")} ${t("Jul–Dec", "يوليو–ديسمبر")} ${fmtPct(x.h2_share)}<br/>${fmtPp(x.change_pp)}`;
                      } },
                      series: [{ type: "bar", barMaxWidth: 12, data: r.map((x) => ({ value: x.change_pp,
                        itemStyle: { color: x.change_pp >= 0 ? tk.series[0] : tk.series[5], borderRadius: x.change_pp >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3] } })),
                        label: { show: true, position: "right", color: tk.ink3, fontSize: 10, formatter: (p: { value: number }) => fmtPp(p.value) } }],
                    })} />
                </>) : <p className="text-sm text-ink-3">{t("Not enough dated 2023 postings in this selection.", "لا توجد إعلانات مؤرخة كافية من 2023 في هذا الاختيار.")}</p>;
              }}
            </ChartPanel>

            <Panel title={t("Top skills in each collection, as separate snapshots", "أبرز المهارات في كل دفعة، كلقطتين منفصلتين")}
              meta={t("Read each list on its own. A skill ranking differently in the two lists reflects period, sources and roles covered together, not growth.",
                "اقرأ كل قائمة وحدها. اختلاف ترتيب مهارة بين القائمتين يعكس الفترة والمصادر والأدوار المشمولة معًا، لا النمو.")}>
              <div className="grid gap-8 md:grid-cols-2">
                {COHORTS.map((c) => {
                  const s = d.snapshot[c];
                  return (
                    <div key={c} className="min-w-0">
                      <h3 className="text-sm font-medium text-ink">{labels.cohort(c)}</h3>
                      <p className="tnum text-xs text-ink-3">{t(`Share of ${fmtInt(s?.denominator)} postings with skills`, `النسبة من ${fmtInt(s?.denominator)} إعلانًا يذكر مهارات`)}</p>
                      {s && s.denominator >= d.min_group ? (
                        <ol className="mt-3 space-y-1.5">
                          {s.rows.map((r, i) => {
                            const mine = has(r.skill);
                            return (
                              <li key={r.skill} className="grid grid-cols-[1.25rem_8rem_minmax(0,1fr)_3rem] items-center gap-2 text-sm">
                                <span className="tnum text-ink-3">{i + 1}</span>
                                <span className={clsx("truncate", mine ? "font-medium text-good" : "text-ink")}>{r.skill}{mine && <span className="sr-only">{t(" (you have it)", " (لديك)")}</span>}</span>
                                <span className="h-1.5 overflow-hidden rounded-full bg-panel-2"><span className={clsx("block h-full rounded-full", mine ? "bg-good-fill" : "bg-accent")} style={{ width: `${(r.share ?? 0) * 100}%` }} /></span>
                                <span className="tnum text-end text-ink-2">{fmtPct(r.share, 0)}</span>
                              </li>
                            );
                          })}
                        </ol>
                      ) : <p className="mt-3 text-sm text-warn">{t(`Too few postings with skills in this selection (under ${d.min_group}) to rank them.`, `عدد الإعلانات التي تذكر مهارات في هذا الاختيار أقل من ${d.min_group}، فلا يمكن ترتيبها.`)}</p>}
                    </div>
                  );
                })}
              </div>
              {profile.skills.length > 0 && <p className="mt-4 text-xs text-ink-3">{t("Teal = a skill you have.", "الأخضر = مهارة لديك.")}</p>}
            </Panel>
          </div>);
        }}
      </Guard>
    </>
  );
}
