import clsx from "clsx";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Chart } from "../components/Chart";
import { HBar } from "../components/charts";
import { Callout, ChartPanel, ErrorState, Guard, InfoTip, Loading, PageHeader, Panel, Pill, Segmented, Skeleton, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { axisStyle, baseOption, esc, HUE } from "../lib/echarts";
import { drillHref } from "../lib/filters";
import { fmtCompact, fmtInt, fmtPct, fmtUsd, fmtUsdFull } from "../lib/format";
import { useFilters, useParam } from "../lib/hooks";
import { getLang, t, tv } from "../lib/i18n";
import type { CountryRow, Geo, Overview } from "../lib/types";
import { loadWorld, mapName } from "../lib/world";

type Metric = "n" | "remote" | "salary";

export default function Geography() {
  const { filters } = useFilters();
  const nav = useNavigate();
  const q = useApi<Geo>("/geo/countries", filters);
  // market type (Arab / International / Remote) comes from the overview aggregate
  const ov = useApi<Overview>("/overview", filters);
  const [metric, setMetric] = useParam("metric", "n") as [Metric, (v: string | null) => void];
  const [names, setNames] = useState<Set<string> | null>(null);
  useEffect(() => { loadWorld().then(setNames); }, []);
  const cross = useApi<{ rows: { key: string; n: number }[]; cols: string[]; cells: { row: string; col: string; n: number; share: number | null }[] }>(
    "/crosstab", filters, { row: "country", col: "role_category", rows: 15, cols: 8 });
  const toExplorer = (country: string) => nav(drillHref("/explorer", filters, { country }));

  return (
    <>
      <PageHeader title={t("Locations", "المواقع")}
        description={t("Where the postings are, how many are in the Arab world, abroad or remote, and what each country advertises. Each posting's country comes from its own location text; nothing is geocoded beyond that.",
          "أين تقع الإعلانات، وكم منها في العالم العربي أو في الخارج أو عن بُعد، وما تعلنه كل دولة. تُؤخذ دولة كل إعلان من نص موقعه نفسه، دون أي تحديد جغرافي إضافي.")}>
        <Segmented label={t("Map shows", "تعرض الخريطة")} value={metric} onChange={setMetric}
          options={[{ value: "n", label: t("Postings", "الإعلانات") }, { value: "remote", label: t("Remote share", "نسبة العمل عن بُعد") },
            { value: "salary", label: t("Median advertised pay", "وسيط الأجر المعلن") }]} />
      </PageHeader>

      <Guard q={q} h={180} empty={(g) => !g.countries.length}>
        {(g) => <WhereSummary g={g} markets={ov.data?.markets} />}
      </Guard>

      <ChartPanel className="mt-4"
        title={metric === "n" ? t("Postings by country", "الإعلانات حسب الدولة") : metric === "remote" ? t("Share of postings that are remote", "نسبة الإعلانات عن بُعد") : t("Median advertised salary (USD/yr, approx.)", "وسيط الراتب المعلن (دولار/سنة، تقريبًا)")}
        meta={metric === "salary" ? t("Countries with fewer than 10 advertised salaries are left blank. Select a country to see its postings.", "الدول التي بها أقل من 10 رواتب معلنة تُترك فارغة. اختر دولة لعرض إعلاناتها.")
          : t("Countries with fewer than 30 postings are drawn with a hatched fill. Select a country to see its postings.", "الدول التي بها أقل من 30 إعلانًا مرسومة بتظليل مخطط. اختر دولة لعرض إعلاناتها.")}
        info={t("Country names are matched to Natural Earth boundaries (public domain). Very small territories may not be drawn on the map; the table below lists every country.",
          "تُطابَق أسماء الدول مع حدود Natural Earth (ملكية عامة). قد لا تظهر الأقاليم الصغيرة جدًا على الخريطة؛ الجدول أدناه يضم كل الدول.")}
        table={q.data ? { columns: [t("Country", "الدولة"), t("Postings", "الإعلانات"), t("Remote share", "نسبة العمل عن بُعد"), t("Median advertised salary", "وسيط الراتب المعلن"), t("Salary n", "عدد الرواتب")], filename: "countries",
          rows: q.data.countries.map((c) => [c.country, c.n, fmtPct(c.remote / c.n), c.salary_median, c.salary_n]) } : undefined}>
        {(h) => q.error && !q.data ? <ErrorState error={q.error} retry={() => q.refetch()} /> : !names || !q.data ? <Loading h={440} /> : (
          <WorldMap rows={q.data.countries} metric={metric} handle={h} onPick={toExplorer} />
        )}
      </ChartPanel>

      <div className="mt-4">
        <Callout tone="info" title={t("Location corrections", "تصحيحات الموقع")}>
          {t("About 21,000 rows of the team's merged file listed “Sudan” as their country. That field was the Kaggle search location, not the job's location; the pipeline rebuilds the country from each posting's own location text (most are in the United States, the rest are “Anywhere”). No posting in this dashboard is attributed to Sudan for that reason. Evidence is on the ",
            "نحو 21,000 صف في ملف الفريق المدمج كانت دولتها «السودان». كان ذلك الحقل موقع البحث في Kaggle وليس موقع الوظيفة؛ لذا يعيد خط المعالجة بناء الدولة من نص موقع كل إعلان (معظمها في الولايات المتحدة، والباقي «Anywhere»). لهذا السبب لا يُنسب أي إعلان في هذه اللوحة إلى السودان. الأدلة في ")}
          <TextLink to="/quality">{t("methodology page", "صفحة المنهجية")}</TextLink>.
        </Callout>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={t("Every country", "كل الدول")} meta={t("Select a header to sort · select a country to open its postings", "اختر عنوان عمود للترتيب · اختر دولة لفتح إعلاناتها")}>
          <Guard q={q} h={400}>{(g) => <CountryTable rows={g.countries} onPick={toExplorer} />}</Guard>
        </Panel>
        <ChartPanel title={t("Arab League countries", "دول الجامعة العربية")} meta={t("Share of the Arab-region postings located in each member state", "نسبة إعلانات المنطقة العربية في كل دولة عضو")}
          table={q.data ? { columns: [t("Country", "الدولة"), t("Postings", "الإعلانات"), t("Remote", "عن بُعد"), t("Median salary", "وسيط الراتب")], filename: "arab-countries",
            rows: q.data.countries.filter((c) => c.region === "Arab").map((c) => [c.country, c.n, c.remote, c.salary_median]) } : undefined}>
          {(h) => <Guard q={q} h={360}>{(g) => {
            const arab = g.countries.filter((c) => c.region === "Arab");
            const tot = arab.reduce((a, c) => a + c.n, 0);
            const small = arab.filter((c) => c.small_sample);
            if (!arab.length) return <p className="py-6 text-sm text-ink-3">{t("No postings in Arab League countries match this selection.", "لا توجد إعلانات في دول الجامعة العربية تطابق هذا الاختيار.")}</p>;
            return (<>
              <HBar handle={h} label={t("Postings in Arab League countries", "الإعلانات في دول الجامعة العربية")} color={HUE.place}
                data={arab.map((c) => ({ label: c.country, value: c.n, share: tot ? c.n / tot : null, muted: c.small_sample, note: c.small_sample ? t("Small sample: fewer than 30 postings", "عينة صغيرة: أقل من 30 إعلانًا") : undefined }))}
                onSelect={toExplorer} />
              {small.length > 0 && (
                <p className="mt-2 text-xs leading-5 text-warn">
                  {t(`Grey bars, small samples (fewer than 30 postings each): ${small.map((c) => tv(c.country)).join(", ")}. Read their shares as indicative only.`,
                    `الأشرطة الرمادية عينات صغيرة (أقل من 30 إعلانًا لكل منها): ${small.map((c) => tv(c.country)).join("، ")}. تعامل مع نسبها كمؤشر فقط.`)}
                </p>
              )}
            </>);
          }}</Guard>}
        </ChartPanel>
      </div>

      <ChartPanel className="mt-4" title={t("Which roles each country hires for", "الأدوار التي توظّف لها كل دولة")}
        meta={t("The 15 largest countries · share of each country's postings in each role (the roles shown cover most postings). Select a cell to see those postings.", "أكبر 15 دولة · نسبة إعلانات كل دولة في كل دور (تغطي الأدوار المعروضة معظم الإعلانات). اختر خلية لعرض تلك الإعلانات.")}
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

const MARKET_ORDER = ["Arab", "International", "Remote"];
// same hue per market as the home page, so the split reads the same everywhere
const MARKET_TONE: Record<string, string> = { International: "bg-accent", Remote: "bg-s4", Arab: "bg-s6" };

/** Where the postings are, in one panel: the located population, its concentration, and the Arab / international / remote split. */
function WhereSummary({ g, markets }: { g: Geo; markets?: Overview["markets"] }) {
  const { filters } = useFilters();
  const B = ({ children }: { children: ReactNode }) => <b className="tnum font-semibold text-ink">{children}</b>;
  const total = g.located + g.no_country;
  const top3 = g.countries.slice(0, 3).map((c) => tv(c.country));
  const arab = g.countries.filter((c) => c.region === "Arab");
  const arabN = arab.reduce((a, c) => a + c.n, 0);
  const small = g.countries.filter((c) => c.small_sample).length;
  const withPay = g.countries.filter((c) => c.salary_median != null).length;
  const rows = markets
    ? [...markets].filter((m) => m.n > 0).sort((a, b) => {
      const ia = MARKET_ORDER.indexOf(a.key);
      const ib = MARKET_ORDER.indexOf(b.key);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })
    : null;
  const mTotal = rows?.reduce((a, r) => a + r.n, 0) || 1;
  const list = (xs: string[]) => (getLang() === "ar" ? xs.join("، ") : xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs.join(""));
  const hhi = (
    <span className="inline-flex align-middle"><InfoTip>
      {t(`Concentration index (Herfindahl–Hirschman, sum of squared country shares): ${g.concentration.hhi?.toFixed(3) ?? "—"}. 1 would mean every posting is in one country.`,
        `مؤشر التركّز (هيرفندال–هيرشمان، مجموع مربعات حصص الدول): ${g.concentration.hhi?.toFixed(3) ?? "—"}. القيمة 1 تعني أن كل الإعلانات في دولة واحدة.`)}
    </InfoTip></span>
  );
  return (
    <section aria-labelledby="where-h" className="rounded-xl border border-line bg-panel px-5 py-5 sm:px-6">
      <h2 id="where-h" className="text-[0.9375rem] font-semibold text-ink">{t("Where the postings are", "أين الإعلانات")}</h2>
      <p className="mt-2 max-w-4xl text-lg leading-7 text-ink-2">
        {getLang() === "ar" ? (<>
          <B>{fmtInt(g.located)}</B> من أصل <B>{fmtInt(total)}</B> إعلان تذكر دولة، موزعة على <B>{fmtInt(g.countries.length)}</B> دولة.
          {top3.length > 0 && <> تضم أكبر الدول — {list(top3)} — <B>{fmtPct(g.concentration.top3_share)}</B> منها{hhi}.</>}
        </>) : (<>
          <B>{fmtInt(g.located)}</B> of <B>{fmtInt(total)}</B> postings name a country, spread over <B>{fmtInt(g.countries.length)}</B> countries.
          {top3.length > 0 && <> The largest — {list(top3)} — hold <B>{fmtPct(g.concentration.top3_share)}</B> of them{hhi}.</>}
        </>)}
      </p>

      <div className="mt-5">
        <h3 className="text-sm font-medium text-ink">{t("Arab world, international or remote", "العالم العربي أم الخارج أم عن بُعد")}</h3>
        {!rows ? <div className="mt-2"><Skeleton h={56} /></div> : (<>
          <div className="mt-2 flex h-3 gap-[3px] overflow-hidden rounded-full" role="img"
            aria-label={rows.map((r) => `${tv(r.key)} ${fmtPct(r.n / mTotal, 0)}`).join(t(", ", "، "))}>
            {rows.map((r) => <span key={r.key} className={MARKET_TONE[r.key] ?? "bg-s6"} style={{ flexGrow: r.n / mTotal, flexBasis: 0, minWidth: 4 }} />)}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {rows.map((r) => (
              <li key={r.key}>
                <Link to={drillHref("/explorer", filters, { market: r.key })} className="block rounded-lg text-ink no-underline hover:underline">
                  <span className="flex items-center gap-1.5 text-ink-2"><span className={clsx("size-2 rounded-full", MARKET_TONE[r.key] ?? "bg-s6")} aria-hidden />{tv(r.key)}</span>
                  <span className="mt-0.5 block"><span className="tnum font-semibold">{fmtCompact(r.n)}</span> <span className="tnum text-ink-3">{fmtPct(r.n / mTotal, 0)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </>)}
      </div>

      <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm leading-6 text-ink-3">
        <p>{t(`Arab = located in an Arab League country (${fmtInt(arab.length)} countries here, ${fmtInt(arabN)} postings). Remote = marked remote or from a remote-jobs board. International = any other country. Advertised pay is reported for ${fmtInt(withPay)} countries with at least 10 salaries.`,
          `عربي = في دولة من الجامعة العربية (${fmtInt(arab.length)} دولة هنا، ${fmtInt(arabN)} إعلان). عن بُعد = موسوم بذلك أو من موقع وظائف عن بُعد. دولي = أي دولة أخرى. الأجر المعلن متاح لـ${fmtInt(withPay)} دولة بها 10 رواتب على الأقل.`)}</p>
        {small > 0 && <p className="text-warn">{t(`${fmtInt(small)} countries have fewer than 30 postings: they are hatched on the map and marked “Under 30” in the table. Treat their figures as indicative only.`,
          `${fmtInt(small)} دولة بها أقل من 30 إعلانًا: مرسومة بتظليل مخطط على الخريطة ومعلَّمة «أقل من 30» في الجدول. تعامل مع أرقامها كمؤشر فقط.`)}</p>}
      </div>
    </section>
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
          return `<b>${esc(tv(r.country))}</b>${r.small_sample ? ` <i style="color:${tk.warn}">${t("(small sample: under 30 postings)", "(عينة صغيرة: أقل من 30 إعلانًا)")}</i>` : ""}<br/>`
            + `${t(`${fmtInt(r.n)} postings · ${fmtPct(r.remote / r.n)} remote`, `${fmtInt(r.n)} إعلان · ${fmtPct(r.remote / r.n)} عن بُعد`)}<br/>`
            + `${t("Median advertised pay", "وسيط الأجر المعلن")}: ${r.salary_median != null ? `${fmtUsdFull(r.salary_median)} ${t("per year", "سنويًا")} (n=${fmtInt(r.salary_n)})` : t("too few salaries", "رواتب قليلة جدًا")}<br/>`
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
            <H k="employers" right>{t("Employers", "جهات التوظيف")}</H><H k="salary_median" right>{t("Median pay (USD/yr)", "وسيط الأجر (دولار/سنة)")}</H>
            <th scope="col" className="px-2 py-2 text-start font-medium">{t("Top skill", "المهارة الأبرز")}</th></tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.country} className="border-t border-line hover:bg-panel-2">
              <td className="px-2 py-1.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <button type="button" onClick={() => onPick(r.country)} className="text-start font-medium text-ink hover:underline">{tv(r.country)}</button>
                  {r.small_sample && <Pill tone="warn" title={t("Small sample: fewer than 30 postings", "عينة صغيرة: أقل من 30 إعلانًا")}>{t("Under 30", "أقل من 30")}</Pill>}
                </span>
              </td>
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
