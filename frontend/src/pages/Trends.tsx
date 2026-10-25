import { X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Chart } from "../components/Chart";
import { MonthLines } from "../components/charts";
import { Callout, ChartPanel, Guard, PageHeader, Panel, Select } from "../components/ui";
import { useApi } from "../lib/api";
import { axisStyle, baseOption, esc } from "../lib/echarts";
import { fmtInt, fmtPct, fmtPp } from "../lib/format";
import { useFilters, useLabels, useMeta } from "../lib/hooks";
import { t } from "../lib/i18n";
import type { SkillTrend, TopSkills } from "../lib/types";

interface Trends {
  skills: string[]; skill_trend: SkillTrend; roles_2023: { month: string; role: string; n: number }[];
  half_year_2023: { skill: string; h1_share: number; h2_share: number; change_pp: number; h1_denominator: number; h2_denominator: number }[];
  snapshot: Record<string, TopSkills>; min_group: number;
}

export default function TrendsPage() {
  const { filters } = useFilters();
  const labels = useLabels();
  const { data: meta } = useMeta();
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
      <PageHeader title={t("Time & cohorts", "الزمن ودفعات الجمع")} description={t("How demand moves within each collection, and how the two collections differ. They are never joined into one time series.", "كيف يتغير الطلب داخل كل دفعة جمع، وكيف تختلف الدفعتان. لا تُدمجان أبدًا في سلسلة زمنية واحدة.")} />
      <div className="grid gap-4 md:grid-cols-2">
        {["kaggle_2023", "collected_2026"].map((c) => (
          <div key={c} className="rounded-lg border border-line bg-panel p-4">
            <h2 className="text-base font-semibold">{labels.cohort(c)}</h2>
            <p className="mt-1 text-sm text-ink-2">{labels.cohortNote(c)}</p>
            <p className="mt-2 text-sm text-ink-3">{fmtInt(meta?.dimensions.cohort.find((x) => x.value === c)?.n)} {t("postings in the whole dataset", "إعلان في مجموعة البيانات كلها")}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Callout tone="warn" title={t("What this page will not show", "ما لن تعرضه هذه الصفحة")}>
          {t(`Growth rates between 2023 and 2026, and forecasts. The two collections differ in sources, roles covered and collection method, and the 2024–26
          collection spans only a few months — a difference between them cannot be separated from those changes, and there is not enough history to validate a forecast.`,
            "معدلات النمو بين 2023 و2026، والتوقعات. تختلف الدفعتان في المصادر والأدوار المشمولة وطريقة الجمع، ولا تغطي دفعة 2024–26 سوى بضعة أشهر — فلا يمكن فصل أي فرق بينهما عن هذه التغييرات، ولا يوجد تاريخ كافٍ للتحقق من أي توقع.")}
        </Callout>
      </div>

      <Guard q={q} h={480}>
        {(d) => {
          const lines = d.skill_trend.series.map((s) => ({ name: s.skill,
            points: s.points.filter((p) => p.cohort === "kaggle_2023" && p.reliable).map((p) => ({ x: p.month.slice(0, 7), y: p.share, n: p.denominator })) }));
          const months2026 = d.skill_trend.months.filter((m) => m.cohort === "collected_2026");
          return (<>
            <ChartPanel className="mt-4" title={t(`Monthly skill share in the ${labels.cohort("kaggle_2023")}`, `النسبة الشهرية للمهارات في ${labels.cohort("kaggle_2023")}`)}
              meta={t(`Share of each month's postings with skill data · months with fewer than ${d.min_group} such postings are left out`, `نسبة إعلانات كل شهر التي تذكر مهارات · تُستبعد الأشهر التي بها أقل من ${d.min_group} إعلان من هذا النوع`)}
              extraActions={<Select label={t("Add skill", "أضف مهارة")} value="" onChange={(v) => v && setSeries([...(series.length ? series : d.skills).filter((x) => x !== v).slice(-5), v])}
                options={[{ value: "", label: t("Choose…", "اختر…") }, ...(pool.data?.rows ?? []).filter((r) => !d.skills.includes(r.skill)).map((r) => ({ value: r.skill, label: r.skill }))]} />}
              table={{ columns: [t("Skill", "المهارة"), t("Month", "الشهر"), t("Share", "النسبة"), t("Postings with skills", "إعلانات تذكر مهارات")], filename: "skill-trend-2023",
                rows: lines.flatMap((l) => l.points.map((p) => [l.name, p.x, fmtPct(p.y), p.n ?? null])) }}>
              {(h) => (<>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {d.skills.map((s) => (
                    <button key={s} type="button" onClick={() => setSeries(d.skills.filter((x) => x !== s))} aria-label={t(`Remove ${s} from the chart`, `إزالة ${s} من الرسم`)}
                      className="inline-flex items-center gap-1 rounded-md bg-panel-2 py-0.5 ps-2 pe-1 text-sm text-ink-2 ring-1 ring-line hover:text-ink">{s} <X size={13} aria-hidden /></button>
                  ))}
                </div>
                {lines.some((l) => l.points.length) ? <MonthLines handle={h} label={t("Monthly share of postings listing each skill, 2023", "النسبة الشهرية للإعلانات التي تذكر كل مهارة، 2023")} series={lines} yName="" yFmt={(v) => fmtPct(v, 0)} height={300} />
                  : <p className="text-sm text-ink-3">{t("No month of the 2023 archive has enough postings in this selection.", "لا يحتوي أي شهر من أرشيف 2023 على إعلانات كافية في هذا الاختيار.")}</p>}
              </>)}
            </ChartPanel>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <ChartPanel title={t("Change within 2023: Jan–Jun vs Jul–Dec", "التغير خلال 2023: يناير–يونيو مقابل يوليو–ديسمبر")}
                meta={d.half_year_2023[0] ? t(`Top 30 skills · ${fmtInt(d.half_year_2023[0].h1_denominator)} vs ${fmtInt(d.half_year_2023[0].h2_denominator)} postings with skills`, `أعلى 30 مهارة · ${fmtInt(d.half_year_2023[0].h1_denominator)} مقابل ${fmtInt(d.half_year_2023[0].h2_denominator)} إعلان يذكر مهارات`) : t("Not enough dated 2023 postings", "لا توجد إعلانات مؤرخة كافية من 2023")}
                info={t("Same dataset, same collection method, so the comparison is like for like. Shares are of each half's postings that list skills; differences are in percentage points. Descriptive only, no forecast.", "نفس مجموعة البيانات ونفس طريقة الجمع، فالمقارنة متكافئة. النسب محسوبة من إعلانات كل نصف التي تذكر مهارات، والفروق بالنقاط المئوية. وصفية فقط، دون توقعات.")}
                table={{ columns: [t("Skill", "المهارة"), t("Jan–Jun", "يناير–يونيو"), t("Jul–Dec", "يوليو–ديسمبر"), t("Change (pp)", "التغير (نقطة)")], filename: "half-year-2023",
                  rows: d.half_year_2023.map((r) => [r.skill, fmtPct(r.h1_share), fmtPct(r.h2_share), r.change_pp]) }}>
                {(h) => {
                  const r = [...d.half_year_2023].sort((a, b) => a.change_pp - b.change_pp);
                  return r.length ? (
                    <Chart label={t("Change in skill share between the two halves of 2023", "التغير في نسبة المهارات بين نصفي 2023")} handleRef={h} height={Math.max(240, r.length * 22 + 30)} deps={[r]}
                      build={(tk) => ({
                        ...baseOption(tk),
                        grid: { left: 8, right: 50, top: 8, bottom: 8, containLabel: true },
                        xAxis: { type: "value", ...axisStyle(tk), axisLabel: { color: tk.ink3, fontSize: 11, formatter: (v: number) => `${v > 0 ? "+" : ""}${v} ${t("pp", "نقطة")}` } },
                        yAxis: { type: "category", data: r.map((x) => x.skill), ...axisStyle(tk), axisLine: { show: false }, axisLabel: { color: tk.ink2, fontSize: 11 } },
                        tooltip: { ...baseOption(tk).tooltip, trigger: "item", formatter: (p: { dataIndex: number }) => {
                          const x = r[p.dataIndex];
                          return `<b>${esc(x.skill)}</b><br/>${t("Jan–Jun", "يناير–يونيو")} ${fmtPct(x.h1_share)} ${t("→", "←")} ${t("Jul–Dec", "يوليو–ديسمبر")} ${fmtPct(x.h2_share)}<br/>${fmtPp(x.change_pp)}`;
                        } },
                        series: [{ type: "bar", barMaxWidth: 12, data: r.map((x) => ({ value: x.change_pp,
                          itemStyle: { color: x.change_pp >= 0 ? tk.series[0] : tk.series[4], borderRadius: x.change_pp >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3] } })),
                          label: { show: true, position: "right", color: tk.ink3, fontSize: 10, formatter: (p: { value: number }) => fmtPp(p.value) } }],
                      })} />
                  ) : <p className="text-sm text-ink-3">{t("Not enough dated 2023 postings in this selection.", "لا توجد إعلانات مؤرخة كافية من 2023 في هذا الاختيار.")}</p>;
                }}
              </ChartPanel>
              <Panel title={t(`${labels.cohort("collected_2026")}: postings by month`, `${labels.cohort("collected_2026")}: الإعلانات حسب الشهر`)} meta={t("Most were collected in September–October 2026; earlier dates are older adverts still online", "جُمع معظمها في سبتمبر–أكتوبر 2026؛ التواريخ الأقدم لإعلانات قديمة ما زالت منشورة")}>
                {months2026.length ? (
                  <table className="w-full text-sm">
                    <thead className="text-start text-xs text-ink-3"><tr><th scope="col" className="py-1.5 text-start font-medium">{t("Month", "الشهر")}</th><th scope="col" className="py-1.5 text-end font-medium">{t("Postings", "الإعلانات")}</th><th scope="col" className="py-1.5 text-end font-medium">{t("Used for trends", "مستخدم في الاتجاهات")}</th></tr></thead>
                    <tbody>
                      {months2026.slice(-10).reverse().map((m) => (
                        <tr key={m.month} className="border-t border-line">
                          <td className="py-1.5">{m.month.slice(0, 7)}</td>
                          <td className="tnum py-1.5 text-end">{fmtInt(m.postings)}</td>
                          <td className="py-1.5 text-end text-ink-3">{m.reliable ? t("yes", "نعم") : t(`no (< ${d.min_group})`, `لا (< ${d.min_group})`)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-sm text-ink-3">{t("No dated postings from this collection in the selection.", "لا توجد إعلانات مؤرخة من هذه الدفعة في الاختيار.")}</p>}
              </Panel>
            </div>

            <Panel className="mt-4" title={t("Top skills in each collection, side by side", "أبرز المهارات في كل دفعة، جنبًا إلى جنب")} meta={t("Snapshots — the difference reflects period, sources and roles covered together", "لقطات — يعكس الفرق الفترة والمصادر والأدوار المشمولة معًا")}>
              <div className="grid gap-6 md:grid-cols-2">
                {(["kaggle_2023", "collected_2026"] as const).map((c) => {
                  const s = d.snapshot[c];
                  return (
                    <div key={c}>
                      <h3 className="text-sm font-medium">{labels.cohort(c)} <span className="font-normal text-ink-3">· {fmtInt(s?.denominator)} {t("postings with skills", "إعلان يذكر مهارات")}</span></h3>
                      {s && s.denominator >= d.min_group ? (
                        <ol className="mt-2 space-y-1">
                          {s.rows.map((r, i) => (
                            <li key={r.skill} className="flex items-center gap-2 text-sm">
                              <span className="tnum w-5 text-ink-3">{i + 1}</span>
                              <span className="w-32 truncate">{r.skill}</span>
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2"><span className="block h-full" style={{ width: `${(r.share ?? 0) * 100}%`, background: c === "kaggle_2023" ? "var(--s4)" : "var(--s4-soft)" }} /></span>
                              <span className="tnum w-12 text-end text-ink-2">{fmtPct(r.share, 0)}</span>
                            </li>
                          ))}
                        </ol>
                      ) : <p className="mt-2 text-sm text-ink-3">{t("Too few postings with skills in this selection.", "عدد الإعلانات التي تذكر مهارات قليل جدًا في هذا الاختيار.")}</p>}
                    </div>
                  );
                })}
              </div>
            </Panel>
          </>);
        }}
      </Guard>
    </>
  );
}
