import { Chart } from "../components/Chart";
import { HBar, Histogram } from "../components/charts";
import { Kpi, KpiStrip } from "../components/Kpi";
import { Callout, ChartPanel, Empty, Guard, PageHeader, Segmented, Select } from "../components/ui";
import { useApi } from "../lib/api";
import { axisStyle, baseOption, esc, HUE } from "../lib/echarts";
import { fmtInt, fmtPct, fmtUsd, fmtUsdFull } from "../lib/format";
import { useFilters, useLabels, useParam } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import type { SalarySummary } from "../lib/types";

const dims = () => [
  { value: "role_category", label: t("Role", "الدور") }, { value: "country", label: t("Country", "الدولة") }, { value: "seniority", label: t("Seniority", "مستوى الخبرة") },
  { value: "job_type", label: t("Employment type", "نوع التوظيف") }, { value: "work_mode", label: t("Work mode", "نمط العمل") }, { value: "market_type", label: t("Market", "السوق") },
  { value: "skill", label: t("Skill (top 20)", "المهارة (أعلى 20)") }, { value: "company", label: t("Employer", "جهة التوظيف") }, { value: "source_dataset", label: t("Data source", "مصدر البيانات") },
];
const PERIOD_AR: Record<string, string> = { year: "السنة", month: "الشهر", week: "الأسبوع", day: "اليوم", hour: "الساعة" };
const confidence = (c: string) => t(c, ({ ok: "جيدة", low: "منخفضة", insufficient: "غير كافية" } as Record<string, string>)[c] ?? c);

interface Coverage {
  postings: number; advertised: number; benchmark: number; advertised_unusable: number; benchmark_unusable: number;
  advertised_share: number | null; currencies: { kind: string; currency: string; n: number }[];
  periods: { kind: string; period: string; n: number }[];
  by_source: { source: string; postings: number; advertised: number; benchmark: number }[];
}

export default function Salary() {
  const { filters } = useFilters();
  const labels = useLabels();
  const [kind, setKind] = useParam("kind", "advertised");
  const [dim, setDim] = useParam("dim", "role_category");
  const [period, setPeriod] = useParam("period", "");
  const periodParam = period ? [period] : undefined;
  const cov = useApi<Coverage>("/salary/coverage", filters);
  const sum = useApi<SalarySummary>("/salary/summary", filters, { dim, kind, period: periodParam, limit: 20 });
  const hist = useApi<{ bins: { bin: number; n: number }[]; bin_width: number; cap: number }>("/salary/histogram", filters, { kind, period: periodParam });
  const bench = kind === "benchmark";
  const DIMS = dims();
  const dimLabel = DIMS.find((d) => d.value === dim)?.label ?? dim;
  // skills and employers are data; the other dimensions are categorical values
  const name = (k: string) => (dim === "source_dataset" ? labels.source(k) : dim === "skill" || dim === "company" ? k : tv(k));

  return (
    <>
      <PageHeader title={t("Salary lab", "مختبر الرواتب")} description={t("What postings actually advertise, by role, place, seniority and skill. Benchmarks the team attached are a separate view and are never mixed in.", "ما تعلنه الإعلانات فعلًا حسب الدور والمكان ومستوى الخبرة والمهارة. الرواتب المرجعية التي أرفقها الفريق تُعرض منفصلة ولا تُخلط أبدًا.")}>
        <Segmented label={t("Salary type", "نوع الراتب")} value={kind} onChange={setKind} options={[{ value: "advertised", label: t("Advertised pay", "رواتب معلنة") }, { value: "benchmark", label: t("Market benchmarks", "رواتب مرجعية للسوق") }]} />
        <Select label={t("Stated per", "محدد لكل")} value={period} onChange={(v) => setPeriod(v || null)}
          options={[{ value: "", label: t("Any period", "أي فترة") }, { value: "year", label: t("Year", "سنة") }, { value: "month", label: t("Month", "شهر") }, { value: "hour", label: t("Hour", "ساعة") }]} />
      </PageHeader>

      {bench ? (
        <Callout tone="warn" title={t("You are viewing market benchmarks, not job-posting salaries", "أنت تعرض رواتب مرجعية للسوق، لا رواتب الإعلانات")}>
          {t(`For postings without pay information the team attached a market figure for the job title and country (Paylab, Indeed, US BLS).
          They describe the market for that title in general, not what these employers offered. Use them for context only.`,
            "للإعلانات التي لا تذكر الأجر، أرفق الفريق رقمًا من السوق للمسمى الوظيفي والدولة (Paylab وIndeed وUS BLS). وهي تصف سوق هذا المسمى عمومًا، لا ما عرضته جهات التوظيف هذه. استخدمها للسياق فقط.")}
        </Callout>
      ) : (
        <Callout tone="info" title={t("How amounts are made comparable", "كيف تصبح المبالغ قابلة للمقارنة")}>
          {t(`The midpoint of the advertised range is annualized (hourly × 2080, daily × 260, weekly × 52, monthly × 12) and converted to USD at
          fixed approximate exchange rates — good for orders of magnitude, not exact historical values. Values outside $500–$1,000,000 per year are treated as parsing errors.
          Hourly 2023 Kaggle pay is a large share; use “Stated per: Year” to compare only salaries quoted annually.`,
            "يُحوَّل منتصف النطاق المعلن إلى قيمة سنوية (بالساعة × 2080، باليوم × 260، بالأسبوع × 52، بالشهر × 12) ثم إلى الدولار الأمريكي بأسعار صرف تقريبية ثابتة — مناسب لمعرفة رتبة المقدار، لا للقيم التاريخية الدقيقة. تُعامل القيم خارج نطاق $500–$1,000,000 سنويًا كأخطاء في القراءة. نسبة كبيرة من رواتب Kaggle لعام 2023 بالساعة؛ استخدم «محدد لكل: سنة» لمقارنة الرواتب المعلنة سنويًا فقط.")}
        </Callout>
      )}

      <Guard q={cov} h={88}>
        {(c) => (
          <div className="mt-4"><KpiStrip>
            <Kpi label={t("Postings in selection", "الإعلانات في الاختيار")} value={fmtInt(c.postings)} />
            <Kpi label={t("Advertise a salary", "تعلن راتبًا")} value={fmtInt(c.advertised)} sub={t(`${fmtPct(c.advertised_share)} of postings`, `${fmtPct(c.advertised_share)} من الإعلانات`)} />
            <Kpi label={t("Benchmark attached", "مرفق براتب مرجعي")} value={fmtInt(c.benchmark)} sub={t("kept apart", "تُعرض منفصلة")} />
            <Kpi label={t("Unusable values", "قيم غير صالحة")} value={fmtInt(c.advertised_unusable + c.benchmark_unusable)} sub={t("unknown currency or out of range", "عملة غير معروفة أو خارج النطاق")} />
            <Kpi label={bench ? t("Median (benchmark)", "الوسيط (مرجعي)") : t("Median (advertised)", "الوسيط (معلن)")} value={sum.data?.overall.median != null && sum.data.overall.confidence !== "insufficient" ? fmtUsdFull(sum.data.overall.median) : "—"}
              sub={sum.data ? t(`n = ${fmtInt(sum.data.overall.n)} · USD per year`, `n = ${fmtInt(sum.data.overall.n)} · دولار أمريكي سنويًا`) : undefined} />
            <Kpi label={t("Middle half (P25–P75)", "النصف الأوسط (P25–P75)")} value={sum.data?.overall.p25 != null && sum.data.overall.confidence !== "insufficient" ? `${fmtUsd(sum.data.overall.p25)}–${fmtUsd(sum.data.overall.p75)}` : "—"}
              sub={sum.data && sum.data.overall.currencies > 1 ? t(`from ${sum.data.overall.currencies} currencies`, `من ${sum.data.overall.currencies} عملات`) : t("single currency", "عملة واحدة")} />
          </KpiStrip></div>
        )}
      </Guard>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ChartPanel title={t(`${bench ? "Benchmark" : "Advertised"} salary by ${dimLabel.toLowerCase()}`, `${bench ? "الراتب المرجعي" : "الراتب المعلن"} حسب ${dimLabel}`)}
          meta={sum.data ? t(`Box = middle half (P25–P75), line = median, whiskers = P10–P90. Groups need ≥ ${sum.data.min_n} salaries${sum.data.groups_hidden_small_n ? `; ${sum.data.groups_hidden_small_n} smaller groups hidden` : ""}.`,
            `الصندوق = النصف الأوسط (P25–P75)، الخط = الوسيط، الشعيرات = P10–P90. تحتاج كل مجموعة إلى ${sum.data.min_n} رواتب على الأقل${sum.data.groups_hidden_small_n ? `؛ أُخفيت ${sum.data.groups_hidden_small_n} مجموعات أصغر` : ""}.`) : undefined}
          extraActions={<Select label={t("Group by", "التجميع حسب")} value={dim} onChange={setDim} options={DIMS} />}
          table={sum.data ? { columns: [dimLabel, "n", "P10", "P25", t("Median", "الوسيط"), "P75", "P90", t("Confidence", "الثقة")], filename: `salary-by-${dim}`,
            rows: sum.data.groups.map((g) => [name(g.key ?? ""), g.n, g.p10, g.p25, g.median, g.p75, g.p90, confidence(g.confidence)]) } : undefined}>
          {(h) => <Guard q={sum} h={420} empty={(s) => !s.groups.length}>{(s) => {
            const g = [...s.groups].reverse();
            return (
              <Chart label={t(`Salary distribution by ${dimLabel}`, `توزيع الرواتب حسب ${dimLabel}`)} handleRef={h} height={Math.max(220, g.length * 30 + 50)} deps={[s, dim]}
                build={(tk) => ({
                  ...baseOption(tk),
                  grid: { left: 8, right: 70, top: 8, bottom: 28, containLabel: true },
                  xAxis: { type: "value", ...axisStyle(tk), axisLabel: { color: tk.ink3, fontSize: 11, formatter: (v: number) => fmtUsd(v) } },
                  yAxis: { type: "category", data: g.map((x) => name(x.key ?? "")), ...axisStyle(tk), axisLine: { show: false },
                    axisLabel: { color: tk.ink2, fontSize: 12, formatter: (v: string) => (v.length > 26 ? `${v.slice(0, 25)}…` : v) } },
                  tooltip: { ...baseOption(tk).tooltip, trigger: "item", formatter: (p: { dataIndex: number }) => {
                    const x = g[p.dataIndex];
                    return `<b>${esc(name(x.key ?? ""))}</b> · n = ${fmtInt(x.n)}${x.confidence === "low" ? ` <i>${t("(small sample)", "(عينة صغيرة)")}</i>` : ""}<br/>`
                      + `${t("Median", "الوسيط")} ${fmtUsdFull(x.median)}<br/>P25–P75 ${fmtUsd(x.p25)}–${fmtUsd(x.p75)}<br/>P10–P90 ${fmtUsd(x.p10)}–${fmtUsd(x.p90)}`;
                  } },
                  series: [{
                    type: "boxplot", boxWidth: [8, 16],
                    data: g.map((x) => ({ value: [x.p10, x.p25, x.median, x.p75, x.p90],
                      itemStyle: x.confidence === "low"
                        ? { color: tk.panel, borderColor: tk.series[bench ? HUE.source : HUE.pay], borderType: "dashed", borderWidth: 1.5 }
                        : { color: tk.panel2, borderColor: tk.series[bench ? HUE.source : HUE.pay], borderWidth: 1.5 } })),
                  }, {
                    type: "scatter", symbolSize: 0, data: g.map((x) => [x.p90, g.indexOf(x)]),
                    label: { show: true, position: "right", color: tk.ink3, fontSize: 11, formatter: (p: { dataIndex: number }) => `n=${fmtInt(g[p.dataIndex].n)}` },
                    silent: true, tooltip: { show: false },
                  }],
                })} />
            );
          }}</Guard>}
        </ChartPanel>

        <div className="grid gap-4">
          <ChartPanel title={t("Distribution", "التوزيع")} meta={bench ? t("Benchmark annual salary, USD (approx.)", "الراتب السنوي المرجعي بالدولار الأمريكي (تقريبي)") : t("Advertised annual salary, USD (approx.)", "الراتب السنوي المعلن بالدولار الأمريكي (تقريبي)")}
            table={hist.data ? { columns: [t("From (USD/yr)", "من (دولار/سنة)"), t("Postings", "الإعلانات")], filename: "salary-distribution", rows: hist.data.bins.map((b) => [b.bin, b.n]) } : undefined}>
            {(h) => <Guard q={hist} h={240} empty={(d) => !d.bins.length}>{(d) => <Histogram handle={h} label={t("Salary distribution", "توزيع الرواتب")} bins={d.bins} binWidth={d.bin_width} cap={d.cap} color={bench ? HUE.source : HUE.pay} />}</Guard>}
          </ChartPanel>
          <ChartPanel title={t("Original currencies", "العملات الأصلية")} meta={t("Before conversion to USD", "قبل التحويل إلى الدولار الأمريكي")} table={cov.data ? { columns: [t("Currency", "العملة"), t("Postings", "الإعلانات")], filename: "salary-currencies",
            rows: cov.data.currencies.filter((c) => c.kind === kind).map((c) => [c.currency, c.n]) } : undefined}>
            {(h) => <Guard q={cov} h={200}>{(c) => {
              const rows = c.currencies.filter((x) => x.kind === kind);
              const tot = rows.reduce((a, r) => a + r.n, 0);
              return rows.length ? <HBar handle={h} label={t("Salaries by original currency", "الرواتب حسب العملة الأصلية")} color={bench ? HUE.source : HUE.pay}
                data={rows.slice(0, 10).map((r) => ({ label: r.currency, value: r.n, share: r.n / tot }))} /> : <Empty title={t("No salaries", "لا توجد رواتب")} hint={t("No postings in this selection carry this kind of salary.", "لا يحمل أي إعلان في هذا الاختيار هذا النوع من الرواتب.")} />;
            }}</Guard>}
          </ChartPanel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartPanel title={t("Salary coverage by source", "تغطية الرواتب حسب المصدر")} meta={t("Share of each source's postings with an advertised salary", "نسبة إعلانات كل مصدر التي تذكر راتبًا معلنًا")}
          table={cov.data ? { columns: [t("Source", "المصدر"), t("Postings", "الإعلانات"), t("Advertised", "معلن"), t("Benchmark", "مرجعي")], filename: "salary-coverage",
            rows: cov.data.by_source.map((s) => [labels.source(s.source), s.postings, s.advertised, s.benchmark]) } : undefined}>
          {(h) => <Guard q={cov} h={240}>{(c) => <HBar handle={h} by="share" label={t("Advertised salary coverage by source", "تغطية الرواتب المعلنة حسب المصدر")} color={HUE.source} maxLabel={34}
            data={c.by_source.map((s) => ({ label: labels.source(s.source), value: s.advertised, share: s.postings ? s.advertised / s.postings : 0, note: t(`${fmtInt(s.postings)} postings · ${fmtInt(s.benchmark)} benchmarks`, `${fmtInt(s.postings)} إعلان · ${fmtInt(s.benchmark)} راتب مرجعي`) }))} />}</Guard>}
        </ChartPanel>
        <ChartPanel title={t("How salaries were stated", "كيف ذُكرت الرواتب")} meta={t("Pay period in the original posting", "فترة الأجر في الإعلان الأصلي")}
          table={cov.data ? { columns: [t("Period", "الفترة"), t("Postings", "الإعلانات")], filename: "salary-periods", rows: cov.data.periods.filter((p) => p.kind === kind).map((p) => [t(p.period, PERIOD_AR[p.period] ?? p.period), p.n]) } : undefined}>
          {(h) => <Guard q={cov} h={200}>{(c) => {
            const rows = c.periods.filter((x) => x.kind === kind);
            const tot = rows.reduce((a, r) => a + r.n, 0);
            return <HBar handle={h} label={t("Salaries by stated period", "الرواتب حسب الفترة المذكورة")} color={HUE.pay} data={rows.map((r) => ({ label: t(`per ${r.period}`, `لكل ${PERIOD_AR[r.period] ?? r.period}`), value: r.n, share: r.n / tot }))} />;
          }}</Guard>}
        </ChartPanel>
      </div>
    </>
  );
}
