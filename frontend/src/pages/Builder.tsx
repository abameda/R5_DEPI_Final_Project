import clsx from "clsx";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Chart, type ChartHandle } from "../components/Chart";
import { Button, Callout, ChartPanel, Guard, PageHeader, Panel, Segmented } from "../components/ui";
import { apiGet, usePost } from "../lib/api";
import { axisStyle, baseOption, categorical, esc } from "../lib/echarts";
import { filterBody } from "../lib/filters";
import { fmtInt, fmtPct, fmtUsdFull } from "../lib/format";
import { useFilters, useLabels, useMeta, useParam, useUpdateParams } from "../lib/hooks";
import { t, tv } from "../lib/i18n";

interface Options { dimensions: { key: string; label: string; skill_level: boolean }[]; metrics: { key: string; label: string; skill_level: boolean }[] }
interface Result {
  dimension: string; split_by: string | null; metric: string; metric_label: string; dimension_label: string; split_label: string | null;
  share_within: string | null;
  rows: { d0: string; d1?: string; value: number | null; postings: number; salary_n: number; small_sample: boolean }[];
  warnings: string[]; warning_codes: string[]; hidden_small_salary_groups: number; filters: Record<string, unknown>;
}

/** Arabic twins of api/queries/builder.py METRICS and warnings, by key. */
const METRIC_AR: Record<string, string> = {
  postings: "عدد الإعلانات",
  share: "نسبة الإعلانات",
  employers: "جهات توظيف مختلفة",
  median_salary: "وسيط الراتب المعلن (دولار/سنة)",
  salary_coverage: "نسبة الإعلانات براتب معلن",
  remote_share: "نسبة العمل عن بُعد",
  avg_skills: "متوسط المهارات لكل إعلان يذكر مهارات",
};
const WARNING_AR: Record<string, string> = {
  mixed_cohorts: "يمتد المحور الزمني عبر دفعتي جمع (أرشيف 2023 ومجموعة 2024–26). صفِّ على دفعة واحدة قبل قراءة أي اتجاه.",
  advertised_salary_only: "الرواتب المعلنة فقط، محوَّلة إلى قيمة سنوية بالدولار بأسعار تقريبية ثابتة؛ وتُخفى المجموعات التي لديها أقل من 10 رواتب.",
  team_added_skills: "تشمل أعداد المهارات مهارات أضافها الفريق بعد الجمع؛ اختر «مذكورة في الإعلان» لاحتساب المهارات المذكورة في الإعلانات فقط.",
};

export default function Builder() {
  const { filters } = useFilters();
  const labels = useLabels();
  const { data: meta } = useMeta();
  const minGroup = meta?.thresholds.min_group_postings ?? 30;
  const opts = useQuery<Options>({ queryKey: ["builder-options"], queryFn: () => apiGet<Options>("/builder/options"), staleTime: Infinity });
  const [dimension] = useParam("dimension", "role_category");
  const update = useUpdateParams();
  const [split, setSplit] = useParam("split", "");
  const [metric, setMetric] = useParam("metric", "postings");
  const [limit, setLimit] = useParam("limit", "15");
  const [view, setView] = useParam("chart", "bar");
  const skillDim = (k: string) => opts.data?.dimensions.find((d) => d.key === k)?.skill_level ?? false;
  const metricOk = (m: string) => !(skillDim(dimension) || (split && skillDim(split))) || (opts.data?.metrics.find((x) => x.key === m)?.skill_level ?? true);
  const splitOk = (k: string) => k !== dimension && !(skillDim(k) && skillDim(dimension));
  const body = { dimension, split_by: split || null, metric, limit: +limit, sort: "metric_desc", filters: filterBody(filters) };
  const valid = metricOk(metric) && (!split || splitOk(split));
  const q = usePost<Result>("/builder", body, valid && !!opts.data);
  const fmt = (v: number | null) => v == null ? "—" : metric === "median_salary" ? fmtUsdFull(v) : ["share", "salary_coverage", "remote_share"].includes(metric) ? fmtPct(v) : metric === "avg_skills" ? v.toFixed(1) : fmtInt(v);
  const name = (dim: string, v: string) => (dim === "cohort" ? labels.cohort(v) : dim === "source_dataset" ? labels.source(v) : tv(v));
  const dimLabel = (key: string, en: string) => t(en, labels.dim(key));
  const skillJoined = (r: Result) => skillDim(r.dimension) || (!!r.split_by && skillDim(r.split_by));
  // mirrors the share-label logic in api/queries/builder.py run()
  const metricLabel = (r: Result) => t(r.metric_label, r.metric !== "share" ? METRIC_AR[r.metric] ?? r.metric_label
    : (r.share_within ? `نسبة إعلانات كل ${labels.dim(r.share_within)}` : "نسبة الإعلانات") + (skillJoined(r) ? " التي تذكر مهارات" : ""));
  const timeDim = ["posted_month", "posted_year"].includes(dimension);

  const downloadCsv = async () => {
    const res = await fetch("/api/builder.csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await res.blob());
    a.download = `jmi_${dimension}_${metric}.csv`;
    a.click();
  };
  const field = "h-9 w-full rounded-lg border border-line-strong bg-panel px-2.5 text-sm text-ink";

  return (
    <>
      <PageHeader title={t("Insight builder", "منشئ الرؤى")} description={t("Build your own summary of the postings: choose what to group by, an optional split and a measure. Combinations that would mislead are not offered.",
        "أنشئ ملخصك الخاص للإعلانات: اختر أساس التجميع، وتقسيمًا اختياريًا، ومقياسًا. لا تُعرض التركيبات التي قد تكون مضللة.")} />

      <section aria-label={t("Build a view", "أنشئ عرضًا")} className="rounded-xl border border-line bg-panel px-5 py-4">
        <div className="grid items-end gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:grid-cols-[repeat(4,minmax(0,12rem))_auto_1fr_auto]">
          <Field label={t("Group by", "تجميع حسب")}>
            <select value={dimension} onChange={(e) => update({ dimension: e.target.value, split: split === e.target.value ? null : split })} className={field}>
              {(opts.data?.dimensions ?? []).map((d) => <option key={d.key} value={d.key}>{dimLabel(d.key, d.label)}</option>)}
            </select>
          </Field>
          <Field label={t("Split by", "تقسيم حسب")}>
            <select value={split} onChange={(e) => setSplit(e.target.value || null)} className={field}>
              <option value="">{t("None", "بلا")}</option>
              {(opts.data?.dimensions ?? []).map((d) => <option key={d.key} value={d.key} disabled={!splitOk(d.key)}>{dimLabel(d.key, d.label)}{!splitOk(d.key) ? t(" (not combinable)", " (لا يمكن الجمع)") : ""}</option>)}
            </select>
          </Field>
          <Field label={t("Measure", "المقياس")}>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className={field}>
              {(opts.data?.metrics ?? []).map((m) => <option key={m.key} value={m.key} disabled={!metricOk(m.key)}>{t(m.label, METRIC_AR[m.key] ?? m.label)}{!metricOk(m.key) ? t(" (posting-level only)", " (على مستوى الإعلان فقط)") : ""}</option>)}
            </select>
          </Field>
          <Field label={t("Show top", "عرض أعلى")}>
            <select value={limit} onChange={(e) => setLimit(e.target.value)} className={field}>
              {["10", "15", "25", "50"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field group label={t("Show as", "اعرض كـ")}>
            <Segmented label={t("Show as", "اعرض كـ")} value={view === "line" || view === "table" ? view : "bar"} onChange={setView}
              options={[{ value: "bar", label: t("Bars", "أعمدة") }, ...(timeDim || view === "line" ? [{ value: "line", label: t("Line", "خط") }] : []), { value: "table", label: t("Table", "جدول") }]} />
          </Field>
          <span className="hidden xl:block" aria-hidden />
          <Button onClick={downloadCsv} disabled={!valid} className="justify-self-start xl:justify-self-end"><Download size={14} /> {t("Download CSV", "تنزيل CSV")}</Button>
        </div>
        {!valid && <p role="alert" className="mt-3 text-sm text-crit">{split && !splitOk(split)
          ? t("Only one skill dimension per view (skill × skill is the co-occurrence view on the Skills page). Choose another split.",
            "بُعد واحد للمهارات فقط في كل عرض (مهارة × مهارة هو عرض الاقتران في صفحة المهارات). اختر تقسيمًا آخر.")
          : t("This measure is defined per posting and cannot be computed per skill. Choose another measure.",
            "هذا المقياس معرَّف لكل إعلان ولا يمكن حسابه لكل مهارة. اختر مقياسًا آخر.")}</p>}
        <p className="mt-3 border-t border-line pt-3 text-xs text-ink-3">{t("Uses the filters in the bar above. A line is offered only when grouping by month or year. CSV exports contain aggregates only, never raw postings.",
          "يستخدم الفلاتر في الشريط أعلاه. لا يُتاح الخط إلا عند التجميع حسب الشهر أو السنة. ملفات CSV تحتوي بيانات مجمّعة فقط، لا إعلانات خام.")}</p>
      </section>

      <Guard q={q} h={420} empty={(r) => !r.rows.length}>
        {(r) => {
          const title = t(`${r.metric_label} by ${r.dimension_label.toLowerCase()}${r.split_label ? ` and ${r.split_label.toLowerCase()}` : ""}`,
            `${metricLabel(r)} حسب ${labels.dim(r.dimension)}${r.split_by ? ` و${labels.dim(r.split_by)}` : ""}`);
          const meta2 = t(`${r.rows.length} cells · faded with an amber outline = under ${minGroup} postings${r.hidden_small_salary_groups ? ` · ${r.hidden_small_salary_groups} groups hidden (fewer than 10 salaries)` : ""}`,
            `${r.rows.length} خلية · الباهتة بإطار كهرماني = أقل من ${minGroup} إعلانًا${r.hidden_small_salary_groups ? ` · ${r.hidden_small_salary_groups} مجموعات مخفية (أقل من 10 رواتب)` : ""}`);
          const small = r.rows.filter((x) => x.small_sample).length;
          return (<div className="mt-6 grid gap-6">
            {r.warnings.length > 0 && <div className="grid gap-2">{r.warnings.map((w, i) => <Callout key={w} tone="warn">{t(w, WARNING_AR[r.warning_codes?.[i]] ?? w)}</Callout>)}</div>}
            {/* chart and values sit side by side only when the table is narrow enough (no split column) */}
            <div className={clsx("grid items-start gap-6", view !== "table" && !r.split_by && "xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]")}>
              {view !== "table" && (
                <ChartPanel title={title} meta={meta2}>
                  {(h) => <BuilderChart r={r} handle={h} fmt={fmt} name={name} metricLabel={metricLabel(r)} dimLabel={dimLabel(r.dimension, r.dimension_label)}
                    line={view === "line" && ["posted_month", "posted_year"].includes(r.dimension)} />}
                </ChartPanel>
              )}
              <Panel title={view === "table" ? title : t("Values", "القيم")}
                meta={small ? <span className="text-warn">{t(`${small} of ${r.rows.length} groups have fewer than ${minGroup} postings: read them with care`, `${small} من ${r.rows.length} مجموعة فيها أقل من ${minGroup} إعلانًا: اقرأها بحذر`)}</span>
                  : t(`${r.rows.length} groups, each with its own n`, `${r.rows.length} مجموعة، لكلٍّ منها عددها`)}>
                <div className="max-h-[28rem] overflow-auto rounded-lg border border-line">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-panel-2 text-xs text-ink-3"><tr>
                      <th scope="col" className="px-3 py-2 text-start font-medium">{dimLabel(r.dimension, r.dimension_label)}</th>
                      {r.split_by && <th scope="col" className="px-3 py-2 text-start font-medium">{dimLabel(r.split_by, r.split_label ?? r.split_by)}</th>}
                      <th scope="col" className="px-3 py-2 text-end font-medium">{metricLabel(r)}</th>
                      <th scope="col" className="px-3 py-2 text-end font-medium">{t("Postings (n)", "الإعلانات (العدد)")}</th>
                      <th scope="col" className="px-3 py-2 text-end font-medium">{t("Advertised salaries (n)", "رواتب معلنة (العدد)")}</th>
                    </tr></thead>
                    <tbody>{r.rows.map((x, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-3 py-2" dir="auto">{name(r.dimension, x.d0)}{x.small_sample && <span className="block text-xs text-warn">{t(`small sample (under ${minGroup})`, `عينة صغيرة (أقل من ${minGroup})`)}</span>}</td>
                        {r.split_by && <td className="px-3 py-2 text-ink-2" dir="auto">{name(r.split_by, x.d1 ?? "")}</td>}
                        <td className="tnum px-3 py-2 text-end font-medium text-ink">{fmt(x.value)}</td>
                        <td className="tnum px-3 py-2 text-end text-ink-2">{fmtInt(x.postings)}</td>
                        <td className="tnum px-3 py-2 text-end text-ink-3">{fmtInt(x.salary_n)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </Panel>
            </div>
          </div>);
        }}
      </Guard>
    </>
  );
}

function Field({ label, children, group }: { label: string; children: ReactNode; group?: boolean }) {
  // native selects are wrapped in a <label>; a radiogroup carries its own aria-label
  const inner = <><span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>{children}</>;
  return group ? <div className="min-w-0">{inner}</div> : <label className="block min-w-0">{inner}</label>;
}

function BuilderChart({ r, handle, line, fmt, name, metricLabel, dimLabel }: { r: Result; handle: React.MutableRefObject<ChartHandle | null>; line: boolean;
  fmt: (v: number | null) => string; name: (dim: string, v: string) => string; metricLabel: string; dimLabel: string }) {
  const cats = [...new Set(r.rows.map((x) => x.d0))];
  const splits = r.split_by ? [...new Set(r.rows.map((x) => x.d1 ?? ""))] : [""];
  const val = (c: string, s: string) => r.rows.find((x) => x.d0 === c && (x.d1 ?? "") === s)?.value ?? null;
  const horizontal = !line;
  const shown = horizontal ? [...cats].reverse() : cats;
  return (
    <Chart label={t(`${r.metric_label} by ${r.dimension_label}`, `${metricLabel} حسب ${dimLabel}`)} handleRef={handle} deps={[r, line]}
      height={horizontal ? Math.max(220, shown.length * (r.split_by ? 14 * splits.length + 10 : 26) + 50) : 320}
      build={(tk) => {
        const catAxis = { type: "category", data: shown.map((c) => name(r.dimension, c)), ...axisStyle(tk), axisLabel: { color: tk.ink2, fontSize: 11, formatter: (v: string) => (v.length > 28 ? `${v.slice(0, 27)}…` : v) } };
        const valAxis = { type: "value", ...axisStyle(tk), axisLabel: { color: tk.ink3, fontSize: 11, formatter: (v: number) => fmt(v) } };
        return {
          ...baseOption(tk),
          color: categorical(tk),
          grid: { left: 8, right: 60, top: splits.length > 1 ? 34 : 10, bottom: 8, containLabel: true },
          legend: splits.length > 1 ? { top: 0, left: 0, textStyle: { color: tk.ink2, fontSize: 11 }, itemWidth: 12, itemHeight: 10 } : undefined,
          xAxis: horizontal ? valAxis : catAxis,
          yAxis: horizontal ? catAxis : valAxis,
          tooltip: { ...baseOption(tk).tooltip, trigger: "axis", formatter: (ps: { seriesName: string; seriesIndex: number; dataIndex: number; value: number | null }[]) => {
            const c = shown[ps[0].dataIndex];
            return `<b>${esc(name(r.dimension, c))}</b><br/>` + ps.map((p) => {
              const row = r.rows.find((x) => x.d0 === c && (x.d1 ?? "") === (splits[p.seriesIndex] ?? ""));
              return `${splits.length > 1 ? `${esc(p.seriesName)}: ` : ""}<b>${fmt(p.value)}</b>${row ? ` <span style="color:${tk.ink3}">n=${fmtInt(row.postings)}</span>` : ""}${row?.small_sample ? ` <span style="color:${tk.warn}">${t("small sample", "عينة صغيرة")}</span>` : ""}`;
            }).join("<br/>");
          } },
          series: splits.map((s) => ({
            name: r.split_by ? name(r.split_by, s) : metricLabel, type: line ? "line" : "bar",
            barMaxWidth: 14, emphasis: { focus: "series" }, showSymbol: true,
            itemStyle: horizontal ? { borderRadius: [0, 3, 3, 0] } : undefined,
            label: splits.length === 1 && horizontal ? { show: true, position: "right", color: tk.ink2, fontSize: 11, formatter: (p: { value: number | null }) => fmt(p.value) } : undefined,
            data: shown.map((c) => {
              const row = r.rows.find((x) => x.d0 === c && (x.d1 ?? "") === s);
              // small groups stay visible but recede, outlined in the caution colour
              return row?.small_sample
                ? { value: val(c, s), itemStyle: { opacity: 0.45, borderColor: tk.warn, borderWidth: 1.5 } }
                : val(c, s);
            }),
          })),
        };
      }} />
  );
}
