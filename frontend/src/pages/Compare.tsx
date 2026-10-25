import clsx from "clsx";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Chart } from "../components/Chart";
import { Callout, ChartPanel, Guard, PageHeader, Panel, Pill, Segmented, Select } from "../components/ui";
import { useApi, usePost } from "../lib/api";
import { axisStyle, baseOption, categorical, esc } from "../lib/echarts";
import { EMPTY_FILTERS, filterBody, LIST_KEYS, type Filters, type ListKey } from "../lib/filters";
import { fmtInt, fmtPct, fmtPp, fmtUsd } from "../lib/format";
import { useLabels, useMeta } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import type { Count, Kpis, SalaryStats, TopSkills } from "../lib/types";

interface Segment { kpis: Kpis; salary: SalaryStats; cohorts: Count[]; sources: Count[]; roles: Count[]; seniority: Count[]; work_mode: Count[]; top_skills: TopSkills }
interface Result {
  a: Segment; b: Segment;
  skills: { skill: string; a_n: number; b_n: number; a_share: number; b_share: number; diff_pp: number; ratio: number | null; mainly: "a" | "b" | null }[];
  warnings: { level: "error" | "warn" | "info"; segment: "a" | "b" | null; code: string; text: string }[];
  rules: { dominance_ratio: number; min_gap_pp: number; min_group: number; min_salary_n: number };
}

// labels are [English, Arabic]: these tables are built once, the language is read at render
const PRESETS: { label: [string, string]; a: Partial<Filters>; b: Partial<Filters> }[] = [
  { label: ["Egypt vs United States", "مصر مقابل الولايات المتحدة"], a: { country: ["Egypt"] }, b: { country: ["United States"] } },
  { label: ["Arab market vs International", "السوق العربي مقابل الدولي"], a: { market: ["Arab"] }, b: { market: ["International"] } },
  { label: ["Data analyst vs data scientist", "محلل بيانات مقابل عالم بيانات"], a: { role: ["Data Analysis & BI"] }, b: { role: ["Data Science & AI"] } },
  { label: ["Python vs SQL postings", "إعلانات Python مقابل SQL"], a: { skill: ["Python"] }, b: { skill: ["SQL"] } },
  { label: ["Junior vs Senior", "مبتدئ مقابل خبير"], a: { seniority: ["Junior"] }, b: { seniority: ["Senior"] } },
  { label: ["Remote vs On-site", "عن بُعد مقابل من المقر"], a: { work_mode: ["Remote"] }, b: { work_mode: ["On-site"] } },
  { label: ["2023 archive vs 2024–26 collection", "أرشيف 2023 مقابل مجموعة 2024–26"], a: { cohort: ["kaggle_2023"] }, b: { cohort: ["collected_2026"] } },
];
const EDIT_DIMS: { key: ListKey; label: [string, string]; dim: string }[] = [
  { key: "market", label: ["Market", "السوق"], dim: "market_type" }, { key: "country", label: ["Country", "الدولة"], dim: "country" },
  { key: "role", label: ["Role", "الدور"], dim: "role_category" }, { key: "seniority", label: ["Seniority", "مستوى الخبرة"], dim: "seniority" },
  { key: "work_mode", label: ["Work mode", "نمط العمل"], dim: "work_mode" }, { key: "cohort", label: ["Collection", "دفعة الجمع"], dim: "cohort" },
];

/** Arabic for a compare warning, rebuilt from its code and the result's numbers. */
function warningAr(w: Result["warnings"][number], r: Result): string {
  const seg = w.segment ? r[w.segment] : null;
  const name = w.segment?.toUpperCase() ?? "";
  switch (w.code) {
    case "too_few_postings":
      return `الشريحة ${name} فيها ${fmtInt(seg?.top_skills.denominator)} إعلانًا ببيانات مهارات (الحد الأدنى ${r.rules.min_group})؛ لذا أُخفي ترتيبها.`;
    case "small_salary_sample": {
      const n = seg?.salary.n ?? 0;
      return `الشريحة ${name} فيها ${fmtInt(n)} راتبًا معلنًا فقط` + (n < r.rules.min_salary_n ? " — أُخفي الراتب." : " — اعتبر الوسيط تقريبيًا.");
    }
    case "mixed_currencies":
      return `حُوِّلت رواتب الشريحة ${name} إلى الدولار من ${fmtInt(seg?.salary.currencies)} عملات بأسعار صرف تقريبية ثابتة.`;
    case "different_provenance":
      return "تحتسب الشريحتان المهارات بطريقتين مختلفتين (كل المهارات مقابل المذكورة في الإعلان فقط)؛ نسب المهارات غير قابلة للمقارنة.";
    case "different_cohorts":
      return "تغلب على الشريحتين دفعتا جمع مختلفتان (أرشيف 2023 مقابل مجموعة 2024–26). قد تعكس الفروق الفترة الزمنية وطريقة الجمع، لا السوق وحده.";
    case "different_sources":
      return "تأتي الشريحتان غالبًا من مصادر بيانات مختلفة؛ وقد تفسر تغطية المصدر (مثل تركيز أرشيف Kaggle على وظائف البيانات) جزءًا من الفرق.";
    default:
      return w.text;
  }
}

function readSegment(sp: URLSearchParams, p: "a" | "b"): Filters {
  const f: Filters = { ...EMPTY_FILTERS };
  for (const k of LIST_KEYS) f[k] = sp.getAll(`${p}.${k}`);
  if (sp.get("provenance") === "observed") f.provenance = "observed";
  return f;
}

export default function Compare() {
  const [sp, setSp] = useSearchParams();
  const fresh = !sp.has("cmp");  // explicit marker: two empty segments mean "all vs all", not "start over"
  const a = fresh ? { ...EMPTY_FILTERS, ...PRESETS[0].a } : readSegment(sp, "a");
  const b = fresh ? { ...EMPTY_FILTERS, ...PRESETS[0].b } : readSegment(sp, "b");
  const body = useMemo(() => ({ a: filterBody(a), b: filterBody(b) }), [JSON.stringify(a), JSON.stringify(b)]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = usePost<Result>("/compare", body);
  const labels = useLabels();
  const describe = (f: Filters) => {
    const parts = LIST_KEYS.flatMap((k) => f[k].map((v) => (k === "cohort" ? labels.cohort(v) : k === "source" ? labels.source(v)
      : k === "skill" ? t(`lists ${v}`, `يذكر ${v}`) : k === "company" ? v : tv(v))));
    return parts.length ? parts.join(" · ") : t("All postings", "كل الإعلانات");
  };
  // Segments live under a./b.; the global filters stay in the URL untouched
  // (ignored here) so they are still there when the visitor goes back.
  const write = (na: Partial<Filters>, nb: Partial<Filters>) => setSp((prev) => {
    const next = new URLSearchParams();
    prev.forEach((v, k) => { if (!k.startsWith("a.") && !k.startsWith("b.") && k !== "cmp") next.append(k, v); });
    next.set("cmp", "1");
    for (const [p, seg] of [["a", na], ["b", nb]] as const) LIST_KEYS.forEach((k) => (seg[k] ?? []).forEach((v) => next.append(`${p}.${k}`, v)));
    return next;
  });
  const setSeg = (p: "a" | "b", f: Partial<Filters>) => (p === "a" ? write(f, b) : write(a, f));
  const nameA = describe(a);
  const nameB = describe(b);

  return (
    <>
      <PageHeader title={t("Compare markets", "مقارنة الأسواق")} description={t("Put two segments side by side. Every figure is normalized within its own segment, and the comparison flags small samples and mismatched collections.",
        "ضع شريحتين جنبًا إلى جنب. كل رقم محسوب نسبةً إلى شريحته، وتنبّه المقارنة إلى العينات الصغيرة ودفعات الجمع غير المتطابقة.")}>
        <Segmented label={t("Which skills to count", "المهارات المحتسبة")} value={sp.get("provenance") === "observed" ? "observed" : "all"}
          onChange={(v) => setSp((prev) => { const n = new URLSearchParams(prev); if (v === "all") n.delete("provenance"); else n.set("provenance", v); return n; })}
          options={[{ value: "all", label: t("All skills", "كل المهارات") }, { value: "observed", label: t("Written in posting", "مذكورة في الإعلان") }]} />
        <Select label={t("Preset", "مقارنة جاهزة")} value="" onChange={(v) => { const p = PRESETS[+v]; if (p) write(p.a, p.b); }}
          options={[{ value: "", label: t("Choose a comparison…", "اختر مقارنة…") }, ...PRESETS.map((p, i) => ({ value: String(i), label: t(...p.label) }))]} />
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2">
        <SegmentEditor which="a" f={a} name={nameA} onChange={(f) => setSeg("a", f)} />
        <SegmentEditor which="b" f={b} name={nameB} onChange={(f) => setSeg("b", f)} />
      </div>
      <Guard q={q} h={480}>
        {(r) => (<>
          {r.warnings.length > 0 && (
            <div className="mt-4 grid gap-2">
              {r.warnings.map((w, i) => <Callout key={i} tone={w.level === "error" ? "crit" : w.level === "warn" ? "warn" : "info"}>{t(w.text, warningAr(w, r))}</Callout>)}
            </div>
          )}
          <Panel className="mt-4" title={t("Side by side", "جنبًا إلى جنب")} meta={t("Shares are within each segment", "النسب محسوبة داخل كل شريحة")}>
            <MetricsTable r={r} nameA={nameA} nameB={nameB} />
          </Panel>
          <ChartPanel className="mt-4" title={t("Skill demand, A vs B", "الطلب على المهارات، A مقابل B")}
            meta={t("Share of each segment's postings that list skills · union of both top-15 lists · sorted by the size of the gap",
              "نسبة إعلانات كل شريحة التي تذكر مهارات · اتحاد قائمتي أعلى 15 مهارة · مرتبة حسب حجم الفرق")}
            info={t(`“Mainly in” marks skills whose share in one segment is at least ${r.rules.dominance_ratio}× the other's and at least ${r.rules.min_gap_pp} percentage points higher.`,
              `تُميِّز «غالبًا في» المهارات التي تبلغ نسبتها في إحدى الشريحتين ${r.rules.dominance_ratio} أضعاف نسبتها في الأخرى على الأقل، وتزيد عليها بـ${r.rules.min_gap_pp} نقطة مئوية على الأقل.`)}
            table={{ columns: [t("Skill", "المهارة"), t("A share", "نسبة A"), t("B share", "نسبة B"), t("Difference (pp)", "الفرق (نقطة مئوية)"), t("A postings", "إعلانات A"), t("B postings", "إعلانات B"), t("Mainly in", "غالبًا في")], filename: "compare-skills",
              rows: r.skills.map((s) => [s.skill, fmtPct(s.a_share), fmtPct(s.b_share), s.diff_pp, s.a_n, s.b_n, s.mainly?.toUpperCase() ?? ""]) }}>
            {(h) => r.a.top_skills.rows.length === 0 && r.b.top_skills.rows.length === 0
              ? <p className="text-sm text-ink-3">{t("Both segments are too small to rank skills.", "الشريحتان أصغر من أن تُرتَّب مهاراتهما.")}</p>
              : <Dumbbell handle={h} rows={r.skills} />}
          </ChartPanel>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <MixPanel title={t("Role mix", "توزيع الأدوار")} a={r.a.roles} b={r.b.roles} />
            <MixPanel title={t("Seniority mix", "توزيع مستويات الخبرة")} a={r.a.seniority} b={r.b.seniority} />
          </div>
        </>)}
      </Guard>
    </>
  );
}

function SegmentEditor({ which, f, name, onChange }: { which: "a" | "b"; f: Filters; name: string; onChange: (f: Filters) => void }) {
  const { data: meta } = useMeta();
  const labels = useLabels();
  const skills = useApi<TopSkills>("/skills/top", null, { limit: 60 });
  return (
    <section aria-label={t(`Segment ${which.toUpperCase()}`, `الشريحة ${which.toUpperCase()}`)} className={clsx("rounded-lg border bg-panel p-4", which === "a" ? "border-s1" : "border-s3")}>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span className={clsx("grid size-6 place-items-center rounded text-xs font-bold text-white", which === "a" ? "bg-s1" : "bg-s3")}>{which.toUpperCase()}</span>
        <span className="truncate" dir="auto">{name}</span>
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {EDIT_DIMS.map((d) => (
          <label key={d.key} className="text-xs text-ink-3">{t(...d.label)}
            <select value={f[d.key][0] ?? ""} onChange={(e) => onChange({ ...f, [d.key]: e.target.value ? [e.target.value] : [] })}
              className="mt-0.5 h-8 w-full rounded-md border border-line-strong bg-panel px-1.5 text-sm text-ink">
              <option value="">{t("Any", "الكل")}</option>
              {(meta?.dimensions[d.dim] ?? []).slice(0, d.key === "country" ? 80 : undefined).map((o) =>
                <option key={o.value} value={o.value}>{d.key === "cohort" ? labels.cohort(o.value) : tv(o.value)}</option>)}
            </select>
          </label>
        ))}
        <label className="text-xs text-ink-3">{t("Lists skill", "يذكر مهارة")}
          <select value={f.skill[0] ?? ""} onChange={(e) => onChange({ ...f, skill: e.target.value ? [e.target.value] : [] })}
            className="mt-0.5 h-8 w-full rounded-md border border-line-strong bg-panel px-1.5 text-sm text-ink">
            <option value="">{t("Any", "الكل")}</option>
            {(skills.data?.rows ?? []).map((s) => <option key={s.skill} value={s.skill}>{s.skill}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

function MetricsTable({ r, nameA, nameB }: { r: Result; nameA: string; nameB: string }) {
  const labels = useLabels();
  const share = (s: Segment, v: number) => (s.kpis.postings ? v / s.kpis.postings : null);
  const kag = (s: Segment) => s.cohorts.find((c) => c.key === "kaggle_2023")?.share ?? 0;
  const rows: [string, string, string, string?][] = [
    [t("Unique postings", "إعلانات فريدة"), fmtInt(r.a.kpis.postings), fmtInt(r.b.kpis.postings)],
    [t("Postings that list skills", "إعلانات تذكر مهارات"), fmtInt(r.a.top_skills.denominator), fmtInt(r.b.top_skills.denominator)],
    [t("Named employers", "جهات توظيف مسماة"), fmtInt(r.a.kpis.employers), fmtInt(r.b.kpis.employers)],
    [t("Countries", "الدول"), fmtInt(r.a.kpis.countries), fmtInt(r.b.kpis.countries)],
    [t("Remote share", "نسبة العمل عن بُعد"), fmtPct(share(r.a, r.a.kpis.remote)), fmtPct(share(r.b, r.b.kpis.remote)),
      fmtPp(100 * ((share(r.a, r.a.kpis.remote) ?? 0) - (share(r.b, r.b.kpis.remote) ?? 0)))],
    [t("Advertised salaries (n)", "رواتب معلنة (العدد)"), fmtInt(r.a.salary.n), fmtInt(r.b.salary.n)],
    [t("Median advertised salary (USD/yr)", "وسيط الراتب المعلن (دولار/سنة)"), r.a.salary.median != null ? fmtUsd(r.a.salary.median) : t("too few", "قليلة جدًا"), r.b.salary.median != null ? fmtUsd(r.b.salary.median) : t("too few", "قليلة جدًا"),
      r.a.salary.median != null && r.b.salary.median != null ? t(`${(((r.a.salary.median - r.b.salary.median) / r.b.salary.median) * 100).toFixed(0)}% vs B`, `${(((r.a.salary.median - r.b.salary.median) / r.b.salary.median) * 100).toFixed(0)}% مقارنة بـB`) : undefined],
    [t("Middle half (P25–P75)", "النصف الأوسط (P25–P75)"), r.a.salary.p25 != null ? `${fmtUsd(r.a.salary.p25)}–${fmtUsd(r.a.salary.p75)}` : "—", r.b.salary.p25 != null ? `${fmtUsd(r.b.salary.p25)}–${fmtUsd(r.b.salary.p75)}` : "—"],
    [t(`From the ${labels.cohort("kaggle_2023")}`, `من ${labels.cohort("kaggle_2023")}`), fmtPct(kag(r.a)), fmtPct(kag(r.b))],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-start text-xs text-ink-3">
          <tr><th scope="col" className="py-1.5 text-start font-medium">{t("Measure", "المقياس")}</th>
            <th scope="col" className="py-1.5 text-end font-medium"><span className="text-s1">A</span> <span className="hidden sm:inline" dir="auto">{nameA}</span></th>
            <th scope="col" className="py-1.5 text-end font-medium"><span className="text-s3">B</span> <span className="hidden sm:inline" dir="auto">{nameB}</span></th>
            <th scope="col" className="py-1.5 text-end font-medium">{t("Difference", "الفرق")}</th></tr>
        </thead>
        <tbody>
          {rows.map(([k, va, vb, d]) => (
            <tr key={k} className="border-t border-line">
              <th scope="row" className="py-1.5 text-start font-normal text-ink-2">{k}</th>
              <td className="tnum py-1.5 text-end text-ink">{va}</td>
              <td className="tnum py-1.5 text-end text-ink">{vb}</td>
              <td className="tnum py-1.5 text-end text-ink-3">{d ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dumbbell({ rows, handle }: { rows: Result["skills"]; handle: React.MutableRefObject<import("../components/Chart").ChartHandle | null> }) {
  const r = [...rows].slice(0, 22).reverse();
  return (
    <Chart label={t("Skill share in segment A and segment B", "نسبة المهارات في الشريحتين A وB")} handleRef={handle} height={Math.max(220, r.length * 26 + 50)} deps={[rows]}
      build={(tk) => ({
        ...baseOption(tk),
        grid: { left: 8, right: 8, top: 30, bottom: 8, containLabel: true },
        legend: { top: 0, left: 0, data: ["A", "B"], itemWidth: 10, itemHeight: 10, textStyle: { color: tk.ink2, fontSize: 11 } },
        xAxis: { type: "value", min: 0, max: (v: { max: number }) => Math.min(1, Math.ceil(v.max * 10 + 0.5) / 10), ...axisStyle(tk), axisLabel: { color: tk.ink3, fontSize: 11, formatter: (v: number) => fmtPct(v, 0) } },
        yAxis: [
          { type: "category", data: r.map((x) => x.skill), ...axisStyle(tk), axisLine: { show: false }, axisLabel: { color: tk.ink2, fontSize: 12 } },
          // gap labels in their own right-hand column so they never sit on the marks
          { type: "category", position: "right", data: r.map((x) => `${fmtPp(x.diff_pp)}${x.mainly ? t(`  mainly ${x.mainly.toUpperCase()}`, `  غالبًا في ${x.mainly.toUpperCase()}`) : ""}`),
            axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: tk.ink2, fontSize: 11 } },
        ],
        tooltip: { ...baseOption(tk).tooltip, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: tk.accentSoft, opacity: 0.4 } },
          formatter: (ps: { dataIndex: number }[]) => {
            const x = r[ps[0].dataIndex];
            return `<b>${esc(x.skill)}</b><br/>A: ${fmtPct(x.a_share)} (${fmtInt(x.a_n)})<br/>B: ${fmtPct(x.b_share)} (${fmtInt(x.b_n)})<br/>${t("Gap", "الفرق")}: ${fmtPp(x.diff_pp)}`;
          } },
        series: [
          { type: "custom", silent: true, data: r.map((x, i) => [x.a_share, x.b_share, i]),
            renderItem: (_: unknown, api: { value: (i: number) => number; coord: (v: number[]) => number[] }) => {
              const p1 = api.coord([api.value(0), api.value(2)]);
              const p2 = api.coord([api.value(1), api.value(2)]);
              return { type: "line", shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] }, style: { stroke: tk.lineStrong, lineWidth: 2 } };
            } },
          { name: "A", type: "scatter", symbolSize: 10, data: r.map((x) => x.a_share), itemStyle: { color: tk.series[0], borderColor: tk.panel, borderWidth: 2 } },
          { name: "B", type: "scatter", symbol: "diamond", symbolSize: 11, data: r.map((x) => x.b_share), itemStyle: { color: categorical(tk)[1], borderColor: tk.panel, borderWidth: 2 } },
        ],
      })} />
  );
}

function MixPanel({ title, a, b }: { title: string; a: Count[]; b: Count[] }) {
  const keys = [...new Set([...a.map((x) => x.key), ...b.map((x) => x.key)])];
  const sa = (k: string) => a.find((x) => x.key === k)?.share ?? 0;
  const sb = (k: string) => b.find((x) => x.key === k)?.share ?? 0;
  return (
    <Panel title={title} meta={t("Share of each segment's postings", "النسبة من إعلانات كل شريحة")}>
      <ul className="space-y-2 text-sm">
        {keys.map((k) => (
          <li key={k}>
            <div className="flex justify-between"><span className="text-ink-2">{tv(k)}</span>
              <span className="tnum text-ink-3"><span className="text-s1">A</span> {fmtPct(sa(k), 0)} · <span className="text-s3">B</span> {fmtPct(sb(k), 0)}
                {Math.abs(sa(k) - sb(k)) >= 0.1 && <> <Pill>{fmtPp(100 * (sa(k) - sb(k)))}</Pill></>}</span></div>
            <div className="mt-1 grid gap-0.5">
              <span className="block h-1.5 rounded-full bg-s1" style={{ width: `${sa(k) * 100}%` }} />
              <span className="block h-1.5 rounded-full bg-s3" style={{ width: `${sb(k) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
