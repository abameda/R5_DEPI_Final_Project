import clsx from "clsx";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chart } from "../components/Chart";
import { HBar } from "../components/charts";
import { Kpi, KpiStrip } from "../components/Kpi";
import { Callout, ChartPanel, Guard, Loading, PageHeader, Panel, Pill, Segmented, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { axisStyle, baseOption, esc, HUE } from "../lib/echarts";
import { drillHref } from "../lib/filters";
import { fmtInt, fmtPct, fmtUsd, fmtUsdFull } from "../lib/format";
import { useFilters, useParam } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import type { CountryRow, Geo } from "../lib/types";
import { loadWorld, mapName } from "../lib/world";

type Metric = "n" | "remote" | "salary";

export default function Geography() {
  const { filters } = useFilters();
  const nav = useNavigate();
  const q = useApi<Geo>("/geo/countries", filters);
  const [metric, setMetric] = useParam("metric", "n") as [Metric, (v: string | null) => void];
  const [names, setNames] = useState<Set<string> | null>(null);
  useEffect(() => { loadWorld().then(setNames); }, []);
  const cross = useApi<{ rows: { key: string; n: number }[]; cols: string[]; cells: { row: string; col: string; n: number; share: number | null }[] }>(
    "/crosstab", filters, { row: "country", col: "role_category", rows: 15, cols: 8 });
  const toExplorer = (country: string) => nav(drillHref("/explorer", filters, { country }));

  return (
    <>
      <PageHeader title={t("Geography", "الجغرافيا")}
        description={t("Where the postings are, how remote-friendly each market is and what it advertises. Countries come from each posting's own location; nothing is geocoded beyond that.",
          "أين تقع الإعلانات، ومدى انفتاح كل سوق على العمل عن بُعد، وما الذي يعلنه. تُؤخذ الدولة من موقع الإعلان نفسه، دون أي تحديد جغرافي إضافي.")} >
        <Segmented label={t("Map metric", "مقياس الخريطة")} value={metric} onChange={setMetric}
          options={[{ value: "n", label: t("Postings", "الإعلانات") }, { value: "remote", label: t("Remote share", "نسبة العمل عن بُعد") },
            { value: "salary", label: t("Median advertised pay", "وسيط الأجر المعلن") }]} />
      </PageHeader>
      <Guard q={q} h={88} empty={(g) => !g.countries.length}>
        {(g) => {
          const small = fmtInt(g.countries.filter((c) => c.small_sample).length);
          const arab = g.countries.filter((c) => c.region === "Arab");
          const arabN = fmtInt(arab.reduce((a, c) => a + c.n, 0));
          return (
            <KpiStrip>
              <Kpi label={t("Countries", "الدول")} value={fmtInt(g.countries.length)} sub={t(`${small} with fewer than 30 postings`, `${small} منها بأقل من 30 إعلانًا`)} />
              <Kpi label={t("With a country", "بدولة محددة")} value={fmtInt(g.located)} sub={t(`${fmtInt(g.no_country)} remote / unknown`, `${fmtInt(g.no_country)} عن بُعد / غير معروفة`)} />
              <Kpi label={t("Top 3 countries", "أكبر 3 دول")} value={fmtPct(g.concentration.top3_share)} sub={g.countries.slice(0, 3).map((c) => tv(c.country)).join(t(", ", "، "))} />
              <Kpi label={t("Concentration (HHI)", "التركّز (HHI)")} value={g.concentration.hhi?.toFixed(3) ?? "—"} sub={t("1 = all in one country", "1 = الكل في دولة واحدة")}
                title={t("Herfindahl–Hirschman index of country shares: sum of squared shares.", "مؤشر هيرفندال–هيرشمان لحصص الدول: مجموع مربعات الحصص.")} />
              <Kpi label={t("Arab League countries", "دول الجامعة العربية")} value={fmtInt(arab.length)} sub={t(`${arabN} postings`, `${arabN} إعلان`)} />
              <Kpi label={t("Pay reported for", "الأجر متاح لـ")} value={fmtInt(g.countries.filter((c) => c.salary_median != null).length)}
                sub={t("countries with ≥ 10 advertised salaries", "دول بها 10 رواتب معلنة أو أكثر")} />
            </KpiStrip>
          );
        }}
      </Guard>

      <ChartPanel className="mt-4"
        title={metric === "n" ? t("Postings by country", "الإعلانات حسب الدولة") : metric === "remote" ? t("Share of postings that are remote", "نسبة الإعلانات عن بُعد") : t("Median advertised salary (USD/yr, approx.)", "وسيط الراتب المعلن (دولار/سنة، تقريبًا)")}
        meta={metric === "salary" ? t("Countries with fewer than 10 advertised salaries are left blank", "الدول التي بها أقل من 10 رواتب معلنة تُترك فارغة")
          : t("Countries with fewer than 30 postings are drawn with a hatched fill", "الدول التي بها أقل من 30 إعلانًا مرسومة بتظليل مخطط")}
        info={t("Country names are matched to Natural Earth boundaries (public domain). Very small territories may not be drawn on the map; the table below lists every country.",
          "تُطابَق أسماء الدول مع حدود Natural Earth (ملكية عامة). قد لا تظهر الأقاليم الصغيرة جدًا على الخريطة؛ الجدول أدناه يضم كل الدول.")}
        table={q.data ? { columns: [t("Country", "الدولة"), t("Postings", "الإعلانات"), t("Remote share", "نسبة العمل عن بُعد"), t("Median advertised salary", "وسيط الراتب المعلن"), t("Salary n", "عدد الرواتب")], filename: "countries",
          rows: q.data.countries.map((c) => [c.country, c.n, fmtPct(c.remote / c.n), c.salary_median, c.salary_n]) } : undefined}>
        {(h) => !names || !q.data ? <Loading h={440} /> : (
          <WorldMap rows={q.data.countries} metric={metric} handle={h} onPick={toExplorer} />
        )}
      </ChartPanel>

      <Callout tone="info" title={t("Location corrections", "تصحيحات الموقع")}>
        {t("About 21,000 rows of the team's merged file listed “Sudan” as their country. That field was the Kaggle search location, not the job's location; the pipeline rebuilds the country from each posting's own location text (most are in the United States, the rest are “Anywhere”). No posting in this dashboard is attributed to Sudan for that reason. Evidence is on the ",
          "نحو 21,000 صف في ملف الفريق المدمج كانت دولتها «السودان». كان ذلك الحقل موقع البحث في Kaggle وليس موقع الوظيفة؛ لذا يعيد خط المعالجة بناء الدولة من نص موقع كل إعلان (معظمها في الولايات المتحدة، والباقي «Anywhere»). لهذا السبب لا يُنسب أي إعلان في هذه اللوحة إلى السودان. الأدلة في ")}
        <TextLink to="/quality">{t("methodology page", "صفحة المنهجية")}</TextLink>.
      </Callout>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={t("Country table", "جدول الدول")} meta={t("Select a header to sort · select a country to open its postings", "اختر عنوان عمود للترتيب · اختر دولة لفتح إعلاناتها")}>
          <Guard q={q} h={400}>{(g) => <CountryTable rows={g.countries} onPick={toExplorer} />}</Guard>
        </Panel>
        <ChartPanel title={t("Arab League countries", "دول الجامعة العربية")} meta={t("Share of the Arab-region postings located in each member state", "نسبة إعلانات المنطقة العربية في كل دولة عضو")}
          table={q.data ? { columns: [t("Country", "الدولة"), t("Postings", "الإعلانات"), t("Remote", "عن بُعد"), t("Median salary", "وسيط الراتب")], filename: "arab-countries",
            rows: q.data.countries.filter((c) => c.region === "Arab").map((c) => [c.country, c.n, c.remote, c.salary_median]) } : undefined}>
          {(h) => <Guard q={q} h={360}>{(g) => { const arab = g.countries.filter((c) => c.region === "Arab"); const tot = arab.reduce((a, c) => a + c.n, 0); return <HBar handle={h} label={t("Postings in Arab League countries", "الإعلانات في دول الجامعة العربية")} color={HUE.place}
            data={arab.map((c) => ({ label: c.country, value: c.n, share: tot ? c.n / tot : null, note: c.small_sample ? t("Small sample", "عينة صغيرة") : undefined }))}
            onSelect={toExplorer} />; }}</Guard>}
        </ChartPanel>
      </div>

      <ChartPanel className="mt-4" title={t("Role mix in the 15 largest countries", "توزيع الأدوار في أكبر 15 دولة")}
        meta={t("Share of each country's postings in each role (rows sum to the roles shown, which cover most postings)", "نسبة إعلانات كل دولة في كل دور (تجمع الصفوف الأدوار المعروضة، وهي تغطي معظم الإعلانات)")}
        table={cross.data ? { columns: [t("Country", "الدولة"), t("Role", "الدور"), t("Postings", "الإعلانات"), t("Share of country", "النسبة من الدولة")], filename: "country-role",
          rows: cross.data.cells.map((c) => [c.row, c.col, c.n, fmtPct(c.share)]) } : undefined}>
        {(h) => <Guard q={cross} h={420} empty={(d) => !d.rows.length}>{(d) => {
          const rows = d.rows.map((r) => r.key);
          const data = d.cells.map((c) => [d.cols.indexOf(c.col), rows.indexOf(c.row), c.share ?? 0, c.n]);
          const top = Math.max(0.01, ...data.map((x) => x[2] as number));
          return (
            <Chart label={t("Role mix by country", "توزيع الأدوار حسب الدولة")} handleRef={h} height={Math.max(300, rows.length * 28 + 90)} deps={[d]}
              onClick={(p) => { const [x, y] = p.value as number[]; nav(drillHref("/explorer", filters, { country: rows[y], role: d.cols[x] })); }}
              build={(tk) => ({
                ...baseOption(tk),
                grid: { left: 8, right: 8, top: 8, bottom: 56, containLabel: true },
                xAxis: { type: "category", data: d.cols, position: "top", ...axisStyle(tk), axisLabel: { color: tk.ink2, fontSize: 11, interval: 0, width: 90, overflow: "break", formatter: tv } },
                yAxis: { type: "category", data: rows, inverse: true, ...axisStyle(tk), axisLabel: { color: tk.ink2, fontSize: 12, formatter: tv } },
                visualMap: { dimension: 2, min: 0, max: top, text: [fmtPct(top, 0), "0%"], orient: "horizontal", left: "center", bottom: 0, itemHeight: 160,
                  inRange: { color: [tk.panel2, tk.series[0]] }, textStyle: { color: tk.ink2, fontSize: 11 }, formatter: (v: number) => fmtPct(v, 0) },
                tooltip: { ...baseOption(tk).tooltip, formatter: (p: { value: number[] }) =>
                  `<b>${esc(tv(rows[p.value[1]]))}</b> · ${esc(tv(d.cols[p.value[0]]))}<br/>`
                  + t(`${fmtPct(p.value[2])} of the country's postings (${fmtInt(p.value[3])})`, `${fmtPct(p.value[2])} من إعلانات الدولة (${fmtInt(p.value[3])})`) },
                series: [{ type: "heatmap", data: data.map((v) => ({ value: v, label: { color: (v[2] as number) > top * 0.55 ? "#ffffff" : tk.ink } })),
                  label: { show: true, fontSize: 10, formatter: (p: { value: number[] }) => (p.value[2] >= 0.01 ? fmtPct(p.value[2], 0) : "") },
                  itemStyle: { borderColor: tk.panel, borderWidth: 2, borderRadius: 2 } }],
              })} />
          );
        }}</Guard>}
      </ChartPanel>
    </>
  );
}

function WorldMap({ rows, metric, handle, onPick }: { rows: CountryRow[]; metric: Metric; handle: React.MutableRefObject<import("../components/Chart").ChartHandle | null>; onPick: (c: string) => void }) {
  const byMap = useMemo(() => new Map(rows.map((r) => [mapName(r.country), r])), [rows]);
  const val = (r: CountryRow) => (metric === "n" ? r.n : metric === "remote" ? r.remote / r.n : r.salary_median);
  const vals = rows.map(val).filter((v): v is number => v != null);
  return (
    <Chart label={t("World map of the selected metric", "خريطة العالم للمقياس المختار")} handleRef={handle} height={440} deps={[rows, metric]}
      onClick={(p) => { const r = byMap.get(p.name); if (r) onPick(r.country); }}
      build={(tk) => ({
        ...baseOption(tk),
        tooltip: { ...baseOption(tk).tooltip, trigger: "item", formatter: (p: { name: string }) => {
          const r = byMap.get(p.name);
          if (!r) return `${esc(tv(p.name))}<br/><span style="color:${tk.ink3}">${t("No postings in this selection", "لا إعلانات في هذا الاختيار")}</span>`;
          return `<b>${esc(tv(r.country))}</b>${r.small_sample ? ` <i>${t("(small sample)", "(عينة صغيرة)")}</i>` : ""}<br/>`
            + `${t(`${fmtInt(r.n)} postings · ${fmtPct(r.remote / r.n)} remote`, `${fmtInt(r.n)} إعلان · ${fmtPct(r.remote / r.n)} عن بُعد`)}<br/>`
            + `${t("Median advertised pay", "وسيط الأجر المعلن")}: ${r.salary_median != null ? `${fmtUsdFull(r.salary_median)} (n=${fmtInt(r.salary_n)})` : t("too few salaries", "رواتب قليلة جدًا")}<br/>`
            + `${t("Top role", "الدور الأبرز")}: ${esc(r.top_role ? tv(r.top_role) : r.top_role)}<br/>${t("Top skill", "المهارة الأبرز")}: ${esc(r.top_skill)} (${fmtPct(r.top_skill_share)})`;
        } },
        visualMap: {
          min: metric === "n" ? 0 : Math.min(...vals), max: metric === "n" ? Math.log10(Math.max(...vals, 10)) : Math.max(...vals, 1),
          left: 8, bottom: 8, itemHeight: 120, calculable: false,
          text: metric === "n" ? [t("more", "أكثر"), t("fewer (log scale)", "أقل (مقياس لوغاريتمي)")] : undefined,
          inRange: { color: [tk.place0, tk.series[HUE.place]] },
          textStyle: { color: tk.ink2, fontSize: 11 },
          formatter: (v: number) => (metric === "n" ? fmtInt(10 ** v) : metric === "remote" ? fmtPct(v, 0) : fmtUsd(v)),
        },
        series: [{
          type: "map", map: "world", roam: true, zoom: 1.15, center: [15, 25], nameProperty: "name",
          itemStyle: { areaColor: tk.panel2, borderColor: tk.lineStrong, borderWidth: 0.4 },
          emphasis: { label: { show: false }, itemStyle: { areaColor: tk.accent } },
          select: { disabled: true },
          data: rows.map((r) => ({ name: mapName(r.country), value: metric === "n" ? Math.log10(Math.max(1, r.n)) : val(r),
            itemStyle: r.small_sample ? { decal: { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 4], rotation: -Math.PI / 4, color: tk.lineStrong } } : undefined })),
        }],
      }) as Record<string, unknown>} />
  );
}

type SortKey = "country" | "n" | "remote" | "salary_median" | "employers";

function CountryTable({ rows, onPick }: { rows: CountryRow[]; onPick: (c: string) => void }) {
  const [sort, setSort] = useState<{ k: SortKey; desc: boolean }>({ k: "n", desc: true });
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const pick = (r: CountryRow) => (sort.k === "remote" ? r.remote / r.n : sort.k === "country" ? tv(r.country) : r[sort.k]);
    const va = pick(a);
    const vb = pick(b);
    if (va == null) return 1;
    if (vb == null) return -1;
    const c = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return sort.desc ? -c : c;
  }), [rows, sort]);
  const H = ({ k, children, right }: { k: SortKey; children: string; right?: boolean }) => (
    <th scope="col" aria-sort={sort.k === k ? (sort.desc ? "descending" : "ascending") : "none"} className={clsx("px-2 py-2 font-medium", right ? "text-end" : "text-start")}>
      <button type="button" onClick={() => setSort({ k, desc: sort.k === k ? !sort.desc : k !== "country" })} className="inline-flex items-center gap-1 hover:text-ink">
        {children}{sort.k === k && (sort.desc ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
      </button>
    </th>
  );
  return (
    <div className="max-h-[520px] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-panel text-start text-xs text-ink-3">
          <tr><H k="country">{t("Country", "الدولة")}</H><H k="n" right>{t("Postings", "الإعلانات")}</H><H k="remote" right>{t("Remote", "عن بُعد")}</H>
            <H k="employers" right>{t("Employers", "جهات التوظيف")}</H><H k="salary_median" right>{t("Median pay", "وسيط الأجر")}</H>
            <th scope="col" className="px-2 py-2 text-start font-medium">{t("Top skill", "المهارة الأبرز")}</th></tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.country} className="border-t border-line hover:bg-panel-2">
              <td className="px-2 py-1.5"><button type="button" onClick={() => onPick(r.country)} className="text-start font-medium text-ink hover:underline">{tv(r.country)}</button>
                {r.small_sample && <Pill tone="warn" title={t("Fewer than 30 postings", "أقل من 30 إعلانًا")}>{t("small", "صغيرة")}</Pill>}</td>
              <td className="tnum px-2 py-1.5 text-end">{fmtInt(r.n)}</td>
              <td className="tnum px-2 py-1.5 text-end text-ink-2">{fmtPct(r.remote / r.n, 0)}</td>
              <td className="tnum px-2 py-1.5 text-end text-ink-2">{fmtInt(r.employers)}</td>
              <td className="tnum px-2 py-1.5 text-end text-ink-2" title={r.salary_median != null ? `n = ${r.salary_n}` : t("Fewer than 10 advertised salaries", "أقل من 10 رواتب معلنة")}>{r.salary_median != null ? fmtUsd(r.salary_median) : "—"}</td>
              <td className="truncate px-2 py-1.5 text-ink-2">{r.top_skill ?? "—"} {r.top_skill_share != null && <span className="text-ink-3">{fmtPct(r.top_skill_share, 0)}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
