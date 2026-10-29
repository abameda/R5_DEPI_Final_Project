import clsx from "clsx";
import { Chart } from "../components/Chart";
import { HBar, Histogram } from "../components/charts";
import { Advanced, Callout, ChartPanel, Empty, ErrorState, Guard, PageHeader, Segmented, Select, Skeleton } from "../components/ui";
import { useApi } from "../lib/api";
import { axisStyle, baseOption, esc, HUE } from "../lib/echarts";
import { fmtInt, fmtPct, fmtUsd, fmtUsdFull } from "../lib/format";
import { useFilters, useLabels, useMeta, useParam } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import { useAdvanced } from "../lib/mode";
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
  const { data: meta } = useMeta();
  const [kind, setKind] = useParam("kind", "advertised");
  const [dim, setDim] = useParam("dim", "role_category");
  const [period, setPeriod] = useParam("period", "");
  const periodParam = period ? [period] : undefined;
  const advanced = useAdvanced();
  const cov = useApi<Coverage>("/salary/coverage", filters);
  const sum = useApi<SalarySummary>("/salary/summary", filters, { dim, kind, period: periodParam, limit: 20 });
  const hist = useApi<{ bins: { bin: number; n: number }[]; bin_width: number; cap: number }>("/salary/histogram", filters, { kind, period: periodParam }, advanced);
  const bench = kind === "benchmark";
  const DIMS = dims();
  const dimLabel = DIMS.find((d) => d.value === dim)?.label ?? dim;
  const reliable = meta?.thresholds.reliable_salary_n;
  // skills and employers are data; the other dimensions are categorical values
  const name = (k: string) => (dim === "source_dataset" ? labels.source(k) : dim === "skill" || dim === "company" ? k : tv(k));

  return (
    <>
      <PageHeader title={t("Salaries", "الرواتب")}
        description={t("What job postings advertise as pay, in approximate US dollars per year, by role, country, seniority and skill. Team benchmarks are a separate view and are never mixed in.",
          "ما تعلنه إعلانات الوظائف من أجور، بالدولار الأمريكي سنويًا تقريبًا، حسب الدور والدولة ومستوى الخبرة والمهارة. الرواتب المرجعية التي أرفقها الفريق عرض منفصل ولا تُخلط أبدًا.")}>
        {advanced && <>
        <Segmented label={t("Salary type", "نوع الراتب")} value={kind} onChange={setKind} options={[{ value: "advertised", label: t("Advertised pay", "رواتب معلنة") }, { value: "benchmark", label: t("Market benchmarks", "رواتب مرجعية للسوق") }]} />
        <Select label={t("Stated per", "محدد لكل")} value={period} onChange={(v) => setPeriod(v || null)}
          options={[{ value: "", label: t("Any period", "أي فترة") }, { value: "year", label: t("Year", "سنة") }, { value: "month", label: t("Month", "شهر") }, { value: "hour", label: t("Hour", "ساعة") }]} />
        </>}
      </PageHeader>

      {bench && (
        <div className="mb-4">
          <Callout tone="warn" title={t("You are viewing market benchmarks, not job-posting salaries", "أنت تعرض رواتب مرجعية للسوق، لا رواتب الإعلانات")}>
            {t(`For postings without pay information the team attached a market figure for the job title and country (Paylab, Indeed, US BLS).
            They describe the market for that title in general, not what these employers offered. Use them for context only.`,
              "للإعلانات التي لا تذكر الأجر، أرفق الفريق رقمًا من السوق للمسمى الوظيفي والدولة (Paylab وIndeed وUS BLS). وهي تصف سوق هذا المسمى عمومًا، لا ما عرضته جهات التوظيف هذه. استخدمها للسياق فقط.")}
          </Callout>
        </div>
      )}

      <Answer sum={sum} cov={cov.data} bench={bench} period={period} />

      <div className={clsx("mt-4 grid gap-4", advanced && "xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")}>
        <ChartPanel title={t(`${bench ? "Benchmark" : "Advertised"} salary by ${dimLabel.toLowerCase()}`, `${bench ? "الراتب المرجعي" : "الراتب المعلن"} حسب ${dimLabel}`)}
          meta={sum.data ? (<>
            {t(`USD per year, approx. Box = middle half (P25–P75), line = median, whiskers = P10–P90. Groups need ≥ ${sum.data.min_n} salaries${sum.data.groups_hidden_small_n ? `; ${sum.data.groups_hidden_small_n} smaller groups hidden` : ""}.`,
              `دولار أمريكي سنويًا، تقريبًا. الصندوق = النصف الأوسط (P25–P75)، الخط = الوسيط، الشعيرات = P10–P90. تحتاج كل مجموعة إلى ${sum.data.min_n} رواتب على الأقل${sum.data.groups_hidden_small_n ? `؛ أُخفيت ${sum.data.groups_hidden_small_n} مجموعات أصغر` : ""}.`)}
            {sum.data.groups.some((g) => g.confidence === "low") && <> <span className="text-warn">{reliable
              ? t(`Dashed box and amber n = small sample (under ${reliable} salaries): indicative only.`, `الصندوق المتقطع وn بالكهرماني = عينة صغيرة (أقل من ${reliable} راتبًا): للاستئناس فقط.`)
              : t("Dashed box and amber n = small sample: indicative only.", "الصندوق المتقطع وn بالكهرماني = عينة صغيرة: للاستئناس فقط.")}</span></>}
          </>) : undefined}
          extraActions={<Select label={t("Compare by", "قارن حسب")} value={dim} onChange={setDim} options={DIMS} />}
          table={sum.data ? { columns: [dimLabel, "n", "P10", "P25", t("Median", "الوسيط"), "P75", "P90", t("Confidence", "الثقة")], filename: `salary-by-${dim}`,
            rows: sum.data.groups.map((g) => [name(g.key ?? ""), g.n, g.p10, g.p25, g.median, g.p75, g.p90, confidence(g.confidence)]) } : undefined}>
          {(h) => <Guard q={sum} h={420} empty={(s) => !s.groups.length}>{(s) => {
            const g = [...s.groups].reverse();
            return (
              <Chart label={t(`Salary distribution by ${dimLabel}`, `توزيع الرواتب حسب ${dimLabel}`)} handleRef={h} height={Math.max(220, g.length * 30 + 50)} deps={[s, dim]}
                build={(tk) => ({
                  ...baseOption(tk),
                  grid: { left: 8, right: 96, top: 8, bottom: 28, containLabel: true },
                  xAxis: { type: "value", ...axisStyle(tk), axisLabel: { color: tk.ink3, fontSize: 11, formatter: (v: number) => fmtUsd(v) } },
                  yAxis: { type: "category", data: g.map((x) => name(x.key ?? "")), ...axisStyle(tk), axisLine: { show: false },
                    axisLabel: { color: tk.ink2, fontSize: 12, formatter: (v: string) => (v.length > 26 ? `${v.slice(0, 25)}…` : v) } },
                  tooltip: { ...baseOption(tk).tooltip, trigger: "item", formatter: (p: { dataIndex: number }) => {
                    const x = g[p.dataIndex];
                    return `<b>${esc(name(x.key ?? ""))}</b> · n = ${fmtInt(x.n)}${x.confidence === "low" ? ` <i style="color:${tk.warn}">${t("(small sample)", "(عينة صغيرة)")}</i>` : ""}<br/>`
                      + `${t("Median", "الوسيط")} ${fmtUsdFull(x.median)} ${t("per year", "سنويًا")}<br/>P25–P75 ${fmtUsd(x.p25)}–${fmtUsd(x.p75)}<br/>P10–P90 ${fmtUsd(x.p10)}–${fmtUsd(x.p90)}`;
                  } },
                  series: [{
                    type: "boxplot", boxWidth: [8, 16],
                    data: g.map((x) => ({ value: [x.p10, x.p25, x.median, x.p75, x.p90],
                      itemStyle: x.confidence === "low"
                        ? { color: tk.panel, borderColor: tk.series[bench ? HUE.source : HUE.pay], borderType: "dashed", borderWidth: 1.5 }
                        : { color: tk.panel2, borderColor: tk.series[bench ? HUE.source : HUE.pay], borderWidth: 1.5 } })),
                  }, {
                    type: "scatter", symbolSize: 0, silent: true, tooltip: { show: false },
                    data: g.map((x, i) => ({ value: [x.p90, i], label: { color: x.confidence === "low" ? tk.warn : tk.ink3 } })),
                    label: { show: true, position: "right", fontSize: 11,
                      formatter: (p: { dataIndex: number }) => `n=${fmtInt(g[p.dataIndex].n)}${g[p.dataIndex].confidence === "low" ? t(" · small", " · صغيرة") : ""}` },
                  }],
                })} />
            );
          }}</Guard>}
        </ChartPanel>

        <Advanced>
        <div className="grid content-start gap-4">
          <ChartPanel title={t("How salaries spread", "كيف تتوزع الرواتب")} meta={bench ? t("Benchmark annual salary, USD (approx.)", "الراتب السنوي المرجعي بالدولار الأمريكي (تقريبي)") : t("Advertised annual salary, USD (approx.)", "الراتب السنوي المعلن بالدولار الأمريكي (تقريبي)")}
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
        </Advanced>
      </div>

      <Advanced>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartPanel title={t("Which sources state pay", "أي المصادر تذكر الأجر")} meta={t("Share of each source's postings with an advertised salary", "نسبة إعلانات كل مصدر التي تذكر راتبًا معلنًا")}
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
      </Advanced>
    </>
  );
}

type Q<T> = { data: T | undefined; isLoading: boolean; isFetching: boolean; error: Error | null; refetch: () => unknown };

/**
 * The page's answer, on its one navy surface: the median for the current
 * selection with its sample size, units and caveats, before any comparison.
 */
function Answer({ sum, cov, bench, period }: { sum: Q<SalarySummary>; cov?: Coverage; bench: boolean; period: string }) {
  const o = sum.data?.overall;
  const enough = o && o.median != null && o.confidence !== "insufficient";
  const per = period ? t(`, quoted per ${period}`, `، محدد لكل ${PERIOD_AR[period] ?? period}`) : "";
  return (
    <section aria-labelledby="salary-answer-h" className="rounded-2xl bg-rail p-6 text-rail-ink sm:p-7">
      <h2 id="salary-answer-h" className="sr-only">
        {bench ? t("Median market benchmark for your selection", "وسيط الراتب المرجعي للسوق في اختيارك") : t("Median advertised salary for your selection", "وسيط الراتب المعلن في اختيارك")}
      </h2>
      {sum.error && !sum.data ? <div className="mt-4"><ErrorState error={sum.error} retry={() => sum.refetch()} /></div>
        : !o ? <div className="mt-5 space-y-3 opacity-30" role="status" aria-label={t("Loading", "جارٍ التحميل")}><Skeleton h={52} /><Skeleton h={20} /></div>
        : (
          <div className={clsx("flex flex-wrap items-end justify-between gap-x-10 gap-y-6 transition-opacity", sum.isFetching && "opacity-60")} aria-busy={sum.isFetching}>
            <div className="max-w-2xl">
              {enough ? (<>
                <p className="text-xl leading-8 font-semibold tracking-[-0.015em] text-balance sm:text-2xl sm:leading-9">
                  {bench ? t("Half the benchmarks are above ", "نصف القيم المرجعية أعلى من ") : t("Half advertise more than ", "النصف يعلن أكثر من ")}
                  <span className="kpi whitespace-nowrap">{fmtUsdFull(o.median)}{t(" a year", " سنويًا")}</span>
                </p>
                <p className="mt-1 text-sm text-rail-ink-2">{bench ? t("Median market benchmark, US dollars, approximate", "وسيط الراتب المرجعي، بالدولار الأمريكي تقريبًا") : t("Median advertised salary for your selection, US dollars, approximate", "وسيط الراتب المعلن في اختيارك، بالدولار الأمريكي تقريبًا")}</p>
                <p className="mt-3 text-sm leading-6 text-rail-ink-2">
                  {t(`The middle half sits between ${fmtUsd(o.p25)} and ${fmtUsd(o.p75)}. Based on n = ${fmtInt(o.n)} ${bench ? "benchmarks" : "postings that state a salary"}${per}${o.currencies > 1 ? `, converted from ${o.currencies} currencies` : ""}.`,
                    `يقع النصف الأوسط بين ${fmtUsd(o.p25)} و${fmtUsd(o.p75)}. استنادًا إلى n = ${fmtInt(o.n)} ${bench ? "راتبًا مرجعيًا" : "إعلانًا يذكر الراتب"}${per}${o.currencies > 1 ? `، محوَّلة من ${o.currencies} عملات` : ""}.`)}
                </p>
                {o.confidence === "low" && (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-rail-ink-2">
                    <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">{t("Small sample", "عينة صغيرة")}</span>
                    {t("Treat this median as indicative only.", "تعامل مع هذا الوسيط كمؤشر فقط.")}
                  </p>
                )}
              </>) : (<>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.01em]">{t("Too few salaries to give a median", "الرواتب قليلة جدًا لحساب وسيط")}</p>
                <p className="mt-2 text-sm leading-6 text-rail-ink-2">
                  <span className="me-2 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">{t("Insufficient", "غير كافية")}</span>
                  {t(`Only n = ${fmtInt(o.n)} ${bench ? "benchmarks" : "advertised salaries"} match this selection${per}; at least ${sum.data?.min_n ?? 10} are needed. Remove a filter or choose “Any period”.`,
                    `n = ${fmtInt(o.n)} فقط من ${bench ? "الرواتب المرجعية" : "الرواتب المعلنة"} تطابق هذا الاختيار${per}؛ ويلزم ${sum.data?.min_n ?? 10} على الأقل. أزِل أحد الفلاتر أو اختر «أي فترة».`)}
                </p>
              </>)}
            </div>
            {cov && (
              <dl className="grid grid-cols-3 gap-6 text-sm">
                <div><dt className="text-xs text-rail-ink-2">{t("State a salary", "تذكر راتبًا")}</dt>
                  <dd className="m-0 mt-0.5"><span className="kpi text-base font-semibold">{fmtInt(cov.advertised)}</span>
                    <span className="tnum block text-xs text-rail-ink-2">{t(`${fmtPct(cov.advertised_share)} of ${fmtInt(cov.postings)} postings`, `${fmtPct(cov.advertised_share)} من ${fmtInt(cov.postings)} إعلان`)}</span></dd></div>
                <div><dt className="text-xs text-rail-ink-2">{t("Benchmark attached", "مرفق براتب مرجعي")}</dt>
                  <dd className="m-0 mt-0.5"><span className="kpi text-base font-semibold">{fmtInt(cov.benchmark)}</span>
                    <span className="block text-xs text-rail-ink-2">{t("kept apart", "تُعرض منفصلة")}</span></dd></div>
                <div><dt className="text-xs text-rail-ink-2">{t("Unusable values", "قيم غير صالحة")}</dt>
                  <dd className="m-0 mt-0.5"><span className="kpi text-base font-semibold">{fmtInt(cov.advertised_unusable + cov.benchmark_unusable)}</span>
                    <span className="block text-xs text-rail-ink-2">{t("unknown currency or out of range", "عملة غير معروفة أو خارج النطاق")}</span></dd></div>
              </dl>
            )}
          </div>
        )}
      <p className="mt-6 border-t border-rail-line pt-4 text-xs leading-5 text-rail-ink-2">
        {bench
          ? t("Benchmarks describe pay for a job title and country in general (Paylab, Indeed, US BLS), not what these employers offered. They are never combined with advertised pay.",
            "تصف الرواتب المرجعية أجر المسمى الوظيفي والدولة عمومًا (Paylab وIndeed وUS BLS)، لا ما عرضته جهات التوظيف هذه. ولا تُجمع أبدًا مع الرواتب المعلنة.")
          : t(`How amounts are made comparable: the midpoint of the advertised range is annualized (hourly × 2080, daily × 260, weekly × 52, monthly × 12) and converted to USD at fixed approximate exchange rates — good for orders of magnitude, not exact historical values. Values outside $500–$1,000,000 per year are treated as parsing errors. Much of the 2023 Kaggle pay is hourly; choose “Stated per: Year” to compare only salaries quoted annually.`,
            "كيف تصبح المبالغ قابلة للمقارنة: يُحوَّل منتصف النطاق المعلن إلى قيمة سنوية (بالساعة × 2080، باليوم × 260، بالأسبوع × 52، بالشهر × 12) ثم إلى الدولار الأمريكي بأسعار صرف تقريبية ثابتة — مناسب لمعرفة رتبة المقدار، لا للقيم التاريخية الدقيقة. تُعامل القيم خارج نطاق $500–$1,000,000 سنويًا كأخطاء في القراءة. نسبة كبيرة من رواتب Kaggle لعام 2023 بالساعة؛ اختر «محدد لكل: سنة» لمقارنة الرواتب المعلنة سنويًا فقط.")}
      </p>
    </section>
  );
}
