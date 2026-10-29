import clsx from "clsx";
import { useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Chart, type ChartHandle } from "../components/Chart";
import { Callout, ChartPanel, Guard, PageHeader, Panel, Segmented, Select } from "../components/ui";
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
type Side = "a" | "b";

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
/** A is the product blue, B the second categorical hue; used the same way in every element below. */
const SIDE_BG: Record<Side, string> = { a: "bg-s1", b: "bg-s2" };
const SIDE_TEXT: Record<Side, string> = { a: "text-s1", b: "text-s2" };

/** The API says "segment"; the page says "group", the plainer word. */
const groupWords = (s: string) => s.replace(/\bSegments\b/g, "Groups").replace(/\bsegments\b/g, "groups").replace(/\bSegment\b/g, "Group").replace(/\bsegment\b/g, "group");

/** Arabic for a compare warning, rebuilt from its code and the result's numbers. */
function warningAr(w: Result["warnings"][number], r: Result): string {
  const seg = w.segment ? r[w.segment] : null;
  const name = w.segment?.toUpperCase() ?? "";
  switch (w.code) {
    case "too_few_postings":
      return `المجموعة ${name} فيها ${fmtInt(seg?.top_skills.denominator)} إعلانًا ببيانات مهارات (الحد الأدنى ${r.rules.min_group})؛ لذا أُخفي ترتيبها.`;
    case "small_salary_sample": {
      const n = seg?.salary.n ?? 0;
      return `المجموعة ${name} فيها ${fmtInt(n)} راتبًا معلنًا فقط` + (n < r.rules.min_salary_n ? " — أُخفي الراتب." : " — اعتبر الوسيط تقريبيًا.");
    }
    case "mixed_currencies":
      return `حُوِّلت رواتب المجموعة ${name} إلى الدولار من ${fmtInt(seg?.salary.currencies)} عملات بأسعار صرف تقريبية ثابتة.`;
    case "different_provenance":
      return "تحتسب المجموعتان المهارات بطريقتين مختلفتين (كل المهارات مقابل المذكورة في الإعلان فقط)؛ نسب المهارات غير قابلة للمقارنة.";
    case "different_cohorts":
      return "تغلب على المجموعتين دفعتا جمع مختلفتان (أرشيف 2023 مقابل مجموعة 2024–26). قد تعكس الفروق الفترة الزمنية وطريقة الجمع، لا السوق وحده.";
    case "different_sources":
      return "تأتي المجموعتان غالبًا من مصادر بيانات مختلفة؛ وقد تفسر تغطية المصدر (مثل تركيز أرشيف Kaggle على وظائف البيانات) جزءًا من الفرق.";
    default:
      return w.text;
  }
}

function readSegment(sp: URLSearchParams, p: Side): Filters {
  const f: Filters = { ...EMPTY_FILTERS };
  for (const k of LIST_KEYS) f[k] = sp.getAll(`${p}.${k}`);
  if (sp.get("provenance") === "observed") f.provenance = "observed";
  return f;
}

export default function Compare() {
  const [sp, setSp] = useSearchParams();
  // explicit marker: two empty segments mean "all vs all", not "start over"; a link that
  // already carries a./b. parameters (e.g. from Guided insights) is read as given
  const fresh = !sp.has("cmp") && ![...sp.keys()].some((k) => k.startsWith("a.") || k.startsWith("b."));
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
  const setSeg = (p: Side, f: Partial<Filters>) => (p === "a" ? write(f, b) : write(a, f));
  const names: Record<Side, string> = { a: describe(a), b: describe(b) };
  const tone = (w: Result["warnings"][number]) => (w.level === "error" ? "crit" : w.level === "warn" ? "warn" : "info") as "crit" | "warn" | "info";

  return (
    <>
      <PageHeader title={t("Compare markets", "مقارنة الأسواق")} description={t("Put two groups of postings side by side. Every share is computed within its own group, so groups of different sizes compare fairly, and small samples are flagged.",
        "ضع مجموعتين من الإعلانات جنبًا إلى جنب. كل نسبة محسوبة داخل مجموعتها، فتُقارَن المجموعات المختلفة الحجم بإنصاف، وتُميَّز العينات الصغيرة.")}>
        <Segmented label={t("Which skills to count", "المهارات المحتسبة")} value={sp.get("provenance") === "observed" ? "observed" : "all"}
          onChange={(v) => setSp((prev) => { const n = new URLSearchParams(prev); if (v === "all") n.delete("provenance"); else n.set("provenance", v); return n; })}
          options={[{ value: "all", label: t("All skills", "كل المهارات") }, { value: "observed", label: t("Written in posting", "مذكورة في الإعلان") }]} />
        <Select label={t("Preset", "مقارنة جاهزة")} value="" onChange={(v) => { const p = PRESETS[+v]; if (p) write(p.a, p.b); }}
          options={[{ value: "", label: t("Choose a comparison…", "اختر مقارنة…") }, ...PRESETS.map((p, i) => ({ value: String(i), label: t(...p.label) }))]} />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        {(["a", "b"] as const).map((s) => (
          <div key={s} className="grid content-start gap-2">
            <SegmentEditor which={s} f={s === "a" ? a : b} name={names[s]} onChange={(f) => setSeg(s, f)} />
            {q.data?.warnings.filter((w) => w.segment === s).map((w, i) => <Callout key={i} tone={tone(w)}>{t(groupWords(w.text), warningAr(w, q.data!))}</Callout>)}
          </div>
        ))}
      </div>

      <Guard q={q} h={480}>
        {(r) => {
          const general = r.warnings.filter((w) => !w.segment);
          return (<div className="mt-6 grid gap-6">
            {general.length > 0 && <div className="grid gap-2">{general.map((w, i) => <Callout key={i} tone={tone(w)}>{t(groupWords(w.text), warningAr(w, r))}</Callout>)}</div>}

            <Panel title={t("Side by side", "جنبًا إلى جنب")} meta={t("Shares are within each group. Differences are A minus B, in percentage points (pp) for shares.", "النسب داخل كل مجموعة. الفروق هي A ناقص B، وبالنقاط المئوية للنسب.")}>
              <MetricsTable r={r} names={names} />
            </Panel>

            <ChartPanel title={t("Skills asked for, A vs B", "المهارات المطلوبة، A مقابل B")}
              meta={t("Share of each group's postings that list skills · both top-15 lists combined · largest gap first",
                "نسبة إعلانات كل مجموعة التي تذكر مهارات · قائمتا أعلى 15 مهارة مجتمعتين · الفرق الأكبر أولًا")}
              info={t(`“Mainly in” marks skills whose share in one group is at least ${r.rules.dominance_ratio}× the other's and at least ${r.rules.min_gap_pp} percentage points higher.`,
                `تُميِّز «غالبًا في» المهارات التي تبلغ نسبتها في إحدى المجموعتين ${r.rules.dominance_ratio} أضعاف نسبتها في الأخرى على الأقل، وتزيد عليها بـ${r.rules.min_gap_pp} نقطة مئوية على الأقل.`)}
              table={{ columns: [t("Skill", "المهارة"), t("A share", "نسبة A"), t("B share", "نسبة B"), t("Difference (pp)", "الفرق (نقطة مئوية)"), t("A postings", "إعلانات A"), t("B postings", "إعلانات B"), t("Mainly in", "غالبًا في")], filename: "compare-skills",
                rows: r.skills.map((s) => [s.skill, fmtPct(s.a_share), fmtPct(s.b_share), s.diff_pp, s.a_n, s.b_n, s.mainly?.toUpperCase() ?? ""]) }}>
              {(h) => r.a.top_skills.rows.length === 0 && r.b.top_skills.rows.length === 0
                ? <p className="text-sm text-warn">{t("Both groups are too small to rank skills.", "المجموعتان أصغر من أن تُرتَّب مهاراتهما.")}</p>
                : (<>
                  <Legend names={names} />
                  <Dumbbell handle={h} rows={r.skills} />
                </>)}
            </ChartPanel>

            <div className="grid gap-6 xl:grid-cols-2">
              <MixPanel title={t("Role mix", "توزيع الأدوار")} a={r.a.roles} b={r.b.roles} na={r.a.kpis.postings} nb={r.b.kpis.postings} />
              <MixPanel title={t("Seniority mix", "توزيع مستويات الخبرة")} a={r.a.seniority} b={r.b.seniority} na={r.a.kpis.postings} nb={r.b.kpis.postings} />
            </div>
          </div>);
        }}
      </Guard>
    </>
  );
}

function SideBadge({ s }: { s: Side }) {
  return <span className={clsx("grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold text-panel", SIDE_BG[s])} aria-hidden>{s.toUpperCase()}</span>;
}

function Legend({ names }: { names: Record<Side, string> }) {
  return (
    <p className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-2">
      <span className="inline-flex min-w-0 items-center gap-1.5"><span className="size-2.5 shrink-0 rounded-full bg-s1" aria-hidden /><b className="font-semibold">A</b> <span className="truncate" dir="auto">{names.a}</span></span>
      <span className="inline-flex min-w-0 items-center gap-1.5"><span className="size-2.5 shrink-0 rotate-45 bg-s2" aria-hidden /><b className="font-semibold">B</b> <span className="truncate" dir="auto">{names.b}</span></span>
    </p>
  );
}

function SegmentEditor({ which, f, name, onChange }: { which: Side; f: Filters; name: string; onChange: (f: Filters) => void }) {
  const { data: meta } = useMeta();
  const labels = useLabels();
  const skills = useApi<TopSkills>("/skills/top", null, { limit: 60 });
  const field = "mt-1 h-9 w-full rounded-lg border border-line-strong bg-panel px-2 text-sm text-ink";
  return (
    <section aria-label={t(`Group ${which.toUpperCase()}`, `المجموعة ${which.toUpperCase()}`)} className="rounded-xl border border-line bg-panel p-5">
      <div className="flex items-start gap-2.5">
        <SideBadge s={which} />
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-ink">{t(`Group ${which.toUpperCase()}`, `المجموعة ${which.toUpperCase()}`)}</h2>
          <p className="truncate text-sm text-ink-2" dir="auto" title={name}>{name}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-3">
        {EDIT_DIMS.map((d) => (
          <label key={d.key} className="min-w-0 text-xs font-medium text-ink-2">{t(...d.label)}
            <select value={f[d.key][0] ?? ""} onChange={(e) => onChange({ ...f, [d.key]: e.target.value ? [e.target.value] : [] })} className={field}>
              <option value="">{t("Any", "الكل")}</option>
              {(meta?.dimensions[d.dim] ?? []).slice(0, d.key === "country" ? 80 : undefined).map((o) =>
                <option key={o.value} value={o.value}>{d.key === "cohort" ? labels.cohort(o.value) : tv(o.value)}</option>)}
            </select>
          </label>
        ))}
        <label className="min-w-0 text-xs font-medium text-ink-2">{t("Lists skill", "يذكر مهارة")}
          <select value={f.skill[0] ?? ""} onChange={(e) => onChange({ ...f, skill: e.target.value ? [e.target.value] : [] })} className={field}>
            <option value="">{t("Any", "الكل")}</option>
            {(skills.data?.rows ?? []).map((s) => <option key={s.skill} value={s.skill}>{s.skill}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

interface MetricRow { label: string; a: string; b: string; diff?: string; flagA?: string; flagB?: string }

function MetricsTable({ r, names }: { r: Result; names: Record<Side, string> }) {
  const labels = useLabels();
  const share = (s: Segment, v: number) => (s.kpis.postings ? v / s.kpis.postings : null);
  const kag = (s: Segment) => s.cohorts.find((c) => c.key === "kaggle_2023")?.share ?? 0;
  const pp = (x: number | null, y: number | null) => (x == null || y == null ? undefined : fmtPp(100 * (x - y)));
  const smallSkills = (s: Segment) => (s.top_skills.denominator < r.rules.min_group ? t(`small sample: under ${r.rules.min_group}`, `عينة صغيرة: أقل من ${r.rules.min_group}`) : undefined);
  const salaryFlag = (s: Side) => {
    const n = r[s].salary.n;
    if (n < r.rules.min_salary_n) return t(`too few to show (under ${r.rules.min_salary_n})`, `أقل من أن تُعرض (أقل من ${r.rules.min_salary_n})`);
    return r.warnings.some((w) => w.segment === s && w.code === "small_salary_sample") ? t("small sample: approximate", "عينة صغيرة: تقريبي") : undefined;
  };
  const med = (s: Segment) => (s.salary.median != null ? fmtUsd(s.salary.median) : "—");
  const rows: MetricRow[] = [
    { label: t("Unique postings", "إعلانات فريدة"), a: fmtInt(r.a.kpis.postings), b: fmtInt(r.b.kpis.postings) },
    { label: t("Postings that list skills", "إعلانات تذكر مهارات"), a: fmtInt(r.a.top_skills.denominator), b: fmtInt(r.b.top_skills.denominator), flagA: smallSkills(r.a), flagB: smallSkills(r.b) },
    { label: t("Named employers", "جهات توظيف مسماة"), a: fmtInt(r.a.kpis.employers), b: fmtInt(r.b.kpis.employers) },
    { label: t("Countries", "الدول"), a: fmtInt(r.a.kpis.countries), b: fmtInt(r.b.kpis.countries) },
    { label: t("Remote share", "نسبة العمل عن بُعد"), a: fmtPct(share(r.a, r.a.kpis.remote)), b: fmtPct(share(r.b, r.b.kpis.remote)),
      diff: pp(share(r.a, r.a.kpis.remote), share(r.b, r.b.kpis.remote)) },
    { label: t("Advertised salaries (n)", "رواتب معلنة (العدد)"), a: fmtInt(r.a.salary.n), b: fmtInt(r.b.salary.n), flagA: salaryFlag("a"), flagB: salaryFlag("b") },
    { label: t("Median advertised salary (USD a year)", "وسيط الراتب المعلن (دولار سنويًا)"), a: med(r.a), b: med(r.b),
      diff: r.a.salary.median != null && r.b.salary.median != null
        ? t(`${(((r.a.salary.median - r.b.salary.median) / r.b.salary.median) * 100).toFixed(0)}% vs B`, `${(((r.a.salary.median - r.b.salary.median) / r.b.salary.median) * 100).toFixed(0)}% مقارنة بـB`) : undefined },
    { label: t("Middle half of salaries (P25–P75)", "النصف الأوسط من الرواتب (P25–P75)"), a: r.a.salary.p25 != null ? `${fmtUsd(r.a.salary.p25)}–${fmtUsd(r.a.salary.p75)}` : "—", b: r.b.salary.p25 != null ? `${fmtUsd(r.b.salary.p25)}–${fmtUsd(r.b.salary.p75)}` : "—" },
    { label: t(`From the ${labels.cohort("kaggle_2023")}`, `من ${labels.cohort("kaggle_2023")}`), a: fmtPct(kag(r.a)), b: fmtPct(kag(r.b)), diff: pp(kag(r.a), kag(r.b)) },
  ];
  const cell = (v: string, flag?: string): ReactNode => (<>
    <span className="tnum block text-ink">{v}</span>
    {flag && <span className="block text-xs text-warn">{flag}</span>}
  </>);
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-sm">
        <colgroup><col className="w-[34%]" /><col className="w-[24%]" /><col className="w-[24%]" /><col className="w-[18%]" /></colgroup>
        <thead className="text-xs text-ink-3">
          <tr className="align-bottom">
            <th scope="col" className="py-2 pe-3 text-start font-medium">{t("Measure", "المقياس")}</th>
            {(["a", "b"] as const).map((s) => (
              <th key={s} scope="col" className="px-3 py-2 text-end font-medium">
                <span className="inline-flex max-w-full items-center justify-end gap-1.5">
                  <span className={clsx("font-semibold", SIDE_TEXT[s])}>{s.toUpperCase()}</span>
                  <span className="hidden truncate text-ink-2 sm:inline" dir="auto" title={names[s]}>{names[s]}</span>
                </span>
              </th>
            ))}
            <th scope="col" className="py-2 ps-3 text-end font-medium">{t("A − B", "A − B")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.label} className="border-t border-line align-top">
              <th scope="row" className="py-2.5 pe-3 text-start font-normal text-ink-2">{x.label}</th>
              <td className="px-3 py-2.5 text-end">{cell(x.a, x.flagA)}</td>
              <td className="px-3 py-2.5 text-end">{cell(x.b, x.flagB)}</td>
              <td className="tnum py-2.5 ps-3 text-end font-medium text-ink-2">{x.diff ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dumbbell({ rows, handle }: { rows: Result["skills"]; handle: React.MutableRefObject<ChartHandle | null> }) {
  const r = [...rows].slice(0, 22).reverse();
  return (
    <Chart label={t("Skill share in group A and group B", "نسبة المهارات في المجموعتين A وB")} handleRef={handle} height={Math.max(220, r.length * 26 + 24)} deps={[rows]}
      build={(tk) => ({
        ...baseOption(tk),
        grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
        xAxis: { type: "value", min: 0, max: (v: { max: number }) => Math.min(1, Math.ceil(v.max * 10 + 0.5) / 10), ...axisStyle(tk), axisLabel: { color: tk.ink3, fontSize: 11, formatter: (v: number) => fmtPct(v, 0) } },
        yAxis: [
          { type: "category", data: r.map((x) => x.skill), ...axisStyle(tk), axisLine: { show: false }, axisLabel: { color: tk.ink2, fontSize: 12 } },
          // gap labels in their own end column so they never sit on the marks
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
          { name: "A", type: "scatter", symbolSize: 10, data: r.map((x) => x.a_share), itemStyle: { color: categorical(tk)[0], borderColor: tk.panel, borderWidth: 2 } },
          { name: "B", type: "scatter", symbol: "diamond", symbolSize: 11, data: r.map((x) => x.b_share), itemStyle: { color: categorical(tk)[1], borderColor: tk.panel, borderWidth: 2 } },
        ],
      })} />
  );
}

function MixPanel({ title, a, b, na, nb }: { title: string; a: Count[]; b: Count[]; na: number; nb: number }) {
  const keys = [...new Set([...a.map((x) => x.key), ...b.map((x) => x.key)])];
  const sa = (k: string) => a.find((x) => x.key === k)?.share ?? 0;
  const sb = (k: string) => b.find((x) => x.key === k)?.share ?? 0;
  return (
    <Panel title={title} meta={t(`Share of each group's postings (A: ${fmtInt(na)}, B: ${fmtInt(nb)}) · gaps of 10 pp or more in bold`, `النسبة من إعلانات كل مجموعة (A: ${fmtInt(na)}، B: ${fmtInt(nb)}) · الفروق من 10 نقاط فأكثر بخط عريض`)}>
      <ul className="divide-y divide-line">
        {keys.map((k) => {
          const d = sa(k) - sb(k);
          const big = Math.abs(d) >= 0.1;
          return (
            <li key={k} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_4.5rem] items-center gap-x-4 py-2 text-sm">
              <span className="truncate text-ink-2" title={tv(k)}>{tv(k)}</span>
              <span className="grid gap-1">
                {(["a", "b"] as const).map((s) => {
                  const v = s === "a" ? sa(k) : sb(k);
                  return (
                    <span key={s} className="flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2"><span className={clsx("block h-full rounded-full", SIDE_BG[s])} style={{ width: `${v * 100}%` }} /></span>
                      <span className="tnum w-14 shrink-0 text-end text-xs text-ink-3"><span className={SIDE_TEXT[s]}>{s.toUpperCase()}</span> {fmtPct(v, 0)}</span>
                    </span>
                  );
                })}
              </span>
              <span className={clsx("tnum text-end text-xs", big ? "font-semibold text-ink" : "text-ink-3")}>{fmtPp(100 * d)}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
