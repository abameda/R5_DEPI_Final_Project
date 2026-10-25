import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Chart } from "../components/Chart";
import { HBar, MonthLines, SkillBars } from "../components/charts";
import { Lattice } from "../components/Lattice";
import { Callout, ChartPanel, Guard, IconButton, PageHeader, Panel, Pill, Segmented, Select, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { axisStyle, baseOption, esc, HUE } from "../lib/echarts";
import { drillHref } from "../lib/filters";
import { fmtInt, fmtPct, fmtUsd } from "../lib/format";
import { useFilters, useLabels, useMeta, useParam } from "../lib/hooks";
import { getLang, t, tv } from "../lib/i18n";
import type { Cooc, Matrix, SkillDetail, TopSkills } from "../lib/types";

const dims = () => [
  { value: "role_category", label: t("Role", "الدور") }, { value: "market_type", label: t("Market", "السوق") }, { value: "seniority", label: t("Seniority", "مستوى الخبرة") },
  { value: "country", label: t("Country", "الدولة") }, { value: "region", label: t("Region", "المنطقة") }, { value: "job_type", label: t("Employment type", "نوع التوظيف") },
  { value: "cohort", label: t("Collection", "دفعة الجمع") },
];

export default function Skills() {
  const [tab, setTab] = useParam("tab", "demand");
  const [view, setView] = useParam("view", "");
  return (
    <>
      <PageHeader title={t("Skills intelligence", "تحليل المهارات")}
        description={t("Which skills postings ask for, how that differs by role and market, and which skills travel together. Shares use postings that list at least one skill as the denominator.",
          "ما المهارات التي تطلبها الإعلانات، وكيف يختلف ذلك حسب الدور والسوق، وأي المهارات تُطلب معًا. تُحسب النسب من الإعلانات التي تذكر مهارة واحدة على الأقل.")}>
        <Segmented label={t("Skills view", "عرض المهارات")} value={tab} onChange={setTab} options={[
          { value: "demand", label: t("Demand", "الطلب") }, { value: "by", label: t("By segment", "حسب الشريحة") }, { value: "pairs", label: t("Pairings", "الثنائيات") }]} />
      </PageHeader>
      {view && <SkillProfile skill={view} onClose={() => setView(null)} />}
      {tab === "demand" && <Demand onPick={setView} />}
      {tab === "by" && <BySegment />}
      {tab === "pairs" && <Pairings onPick={setView} />}
    </>
  );
}

function Demand({ onPick }: { onPick: (s: string) => void }) {
  const { filters } = useFilters();
  const { data: meta } = useMeta();
  const [category, setCategory] = useParam("category", "");
  const [kind, setKind] = useParam("kind", "all");
  const technical = kind === "all" ? undefined : kind === "technical";
  const q = useApi<TopSkills>("/skills/top", filters, { limit: 30, category: category || undefined, technical });
  const cats = useApi<{ denominator: number; rows: { category: string; postings: number; share: number | null; is_technical: boolean; skills: number }[] }>("/skills/categories", filters);
  const soft = useApi<TopSkills>("/skills/top", filters, { limit: 10, technical: false });
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <ChartPanel title={t("Most requested skills", "المهارات الأكثر طلبًا")}
        meta={q.data ? t(`Share of ${fmtInt(q.data.denominator)} postings with skill data${category ? ` · ${category}` : ""}`, `النسبة من ${fmtInt(q.data.denominator)} إعلان يذكر مهارات${category ? ` · ${tv(category)}` : ""}`) : undefined}
        info={t("Solid = written in the posting data as collected; hatched = added by the team afterwards. Switch 'Written in posting' in the filter bar to rank by posting-written skills only.",
          "المصمت = مذكورة في بيانات الإعلان كما جُمعت؛ المخطط = أضافها الفريق لاحقًا. اختر «مذكورة في الإعلان» في شريط التصفية للترتيب حسب المهارات المكتوبة في الإعلان فقط.")}
        extraActions={<>
          <Select label={t("Category", "الفئة")} value={category} onChange={(v) => setCategory(v || null)} className="hidden sm:inline-flex"
            options={[{ value: "", label: t("All", "الكل") }, ...(meta?.skill_categories ?? []).map((c) => ({ value: c, label: tv(c) }))]} />
        </>}
        table={q.data ? { columns: [t("Skill", "المهارة"), t("Category", "الفئة"), t("Postings", "الإعلانات"), t("Share", "النسبة"), t("Written in posting", "مذكورة في الإعلان"), t("Added by team", "أضافها الفريق")], filename: "skills",
          rows: q.data.rows.map((r) => [r.skill, r.category, r.postings, fmtPct(r.share), r.observed, r.added]) } : undefined}>
        {(h) => (<>
          <div className="mb-3"><Segmented label={t("Technical or not", "تقنية أم لا")} value={kind} onChange={setKind}
            options={[{ value: "all", label: t("All skills", "كل المهارات") }, { value: "technical", label: t("Technical", "تقنية") }, { value: "soft", label: t("Soft skills & languages", "مهارات شخصية ولغات") }]} /></div>
          <Guard q={q} h={600} empty={(d) => !d.rows.length}>
            {(d) => <SkillBars handle={h} rows={d.rows} denominator={d.denominator} observedOnly={filters.provenance === "observed"} onSelect={onPick} />}
          </Guard>
        </>)}
      </ChartPanel>
      <div className="grid content-start gap-4">
      <ChartPanel title={t("Skill categories", "فئات المهارات")} meta={t("Share of postings listing at least one skill in the category", "نسبة الإعلانات التي تذكر مهارة واحدة على الأقل من الفئة")}
        info={t("Categories come from the Kaggle dataset's own skill grouping (programming, cloud, libraries…) where it exists, otherwise from a documented curated list. 'Uncategorized' skills are not guessed.",
          "تأتي الفئات من تصنيف المهارات في مجموعة بيانات Kaggle نفسها (البرمجة، السحابة، المكتبات…) حيثما وُجد، وإلا من قائمة منسقة وموثقة. لا يُخمَّن تصنيف المهارات «غير المصنفة».")}
        table={cats.data ? { columns: [t("Category", "الفئة"), t("Postings", "الإعلانات"), t("Share", "النسبة"), t("Distinct skills", "مهارات مختلفة")], filename: "skill-categories",
          rows: cats.data.rows.map((r) => [r.category, r.postings, fmtPct(r.share), r.skills]) } : undefined}>
        {(h) => <Guard q={cats} h={500}>{(d) => <HBar handle={h} label={t("Skill categories", "فئات المهارات")} color={HUE.skill} maxLabel={30}
          data={d.rows.map((r) => ({ label: r.category, value: r.postings, share: r.share, note: t(`${r.skills} distinct skills${r.is_technical ? "" : " · non-technical"}`, `${r.skills} مهارة مختلفة${r.is_technical ? "" : " · غير تقنية"}`) }))}
          onSelect={(c) => setCategory(c)} />}</Guard>}
      </ChartPanel>
      <ChartPanel title={t("Soft skills and languages", "المهارات الشخصية واللغات")}
        meta={soft.data ? t(`Non-technical skills · share of ${fmtInt(soft.data.denominator)} postings with skill data`, `مهارات غير تقنية · النسبة من ${fmtInt(soft.data.denominator)} إعلان يذكر مهارات`) : undefined}
        info={t("Soft skills and spoken languages are mostly added by the team from descriptions and role knowledge; the hatched part shows how much.",
          "أضاف الفريق معظم المهارات الشخصية واللغات المحكية من الأوصاف ومعرفة الأدوار؛ ويبين الجزء المخطط مقدار ذلك.")}
        table={soft.data ? { columns: [t("Skill", "المهارة"), t("Postings", "الإعلانات"), t("Share", "النسبة"), t("Written in posting", "مذكورة في الإعلان")], filename: "soft-skills",
          rows: soft.data.rows.map((r) => [r.skill, r.postings, fmtPct(r.share), r.observed]) } : undefined}>
        {(h) => <Guard q={soft} h={260} empty={(d) => !d.rows.length}>
          {(d) => <SkillBars handle={h} rows={d.rows} denominator={d.denominator} observedOnly={filters.provenance === "observed"} onSelect={onPick} />}
        </Guard>}
      </ChartPanel>
      </div>
    </div>
  );
}

function BySegment() {
  const { filters } = useFilters();
  const nav = useNavigate();
  const labels = useLabels();
  const [dim, setDim] = useParam("dim", "role_category");
  const q = useApi<Matrix>("/skills/matrix", filters, { dim, groups: dim === "country" ? 15 : 12, top: 18 });
  const DIMS = dims();
  const label = DIMS.find((d) => d.value === dim)?.label ?? dim;
  const keyOf: Record<string, string> = { role_category: "role", market_type: "market", seniority: "seniority", country: "country", region: "region", job_type: "job_type", cohort: "cohort" };
  return (
    <Panel title={t(`Skill demand by ${label.toLowerCase()}`, `الطلب على المهارات حسب ${label}`)}
      meta={t("Each row's share uses that row's own postings with skill data, so small and large groups compare fairly. Select an opening to list the postings.",
        "تُحسب نسبة كل صف من إعلاناته التي تذكر مهارات، فتُقارن المجموعات الصغيرة والكبيرة بإنصاف. اختر خلية لعرض إعلاناتها.")}
      info={t("Rows with fewer than 30 postings that list skills get a dashed frame: treat their shares as indicative only.",
        "الصفوف التي بها أقل من 30 إعلانًا يذكر مهارات لها إطار متقطع: تعامل مع نسبها كمؤشر فقط.")}
      actions={<Select label={t("Rows", "الصفوف")} value={dim} onChange={(v) => setDim(v)} options={DIMS} />}>
      <Guard q={q} h={460} empty={(m) => !m.groups.length}>
        {(m) => <Lattice matrix={m} rowLabel={label} rowName={dim === "cohort" ? labels.cohort : undefined}
          caption={t(`Share of each ${label.toLowerCase()}'s postings that list each skill`, `نسبة إعلانات كل ${label} التي تذكر كل مهارة`)}
          onSelect={(row, skill) => nav(drillHref("/explorer", filters, { [keyOf[dim]]: row, skill }))} />}
      </Guard>
      {dim === "cohort" && <p className="mt-2 text-xs text-ink-3">{t(`Rows: ${labels.cohort("kaggle_2023")} vs ${labels.cohort("collected_2026")} — different sources and methods; this is a side-by-side, not a trend.`, `الصفوف: ${labels.cohort("kaggle_2023")} مقابل ${labels.cohort("collected_2026")} — مصادر وطرق مختلفة؛ هذه مقارنة جنبًا إلى جنب، لا اتجاه زمني.`)}</p>}
    </Panel>
  );
}

function Pairings({ onPick }: { onPick: (s: string) => void }) {
  const { filters } = useFilters();
  const [metric, setMetric] = useParam("metric", "lift");
  const q = useApi<Cooc>("/skills/cooccurrence", filters, { limit: 18 });
  const metricLabel = metric === "lift" ? t("Lift", "معامل الرفع") : metric === "cond" ? t("P(column | row)", "P(العمود | الصف)") : "Jaccard";
  return (
    <div className="grid gap-4">
      <Callout tone="info">
        {getLang() === "ar" ? (<>
          <b>معامل الرفع</b> = كم مرة تظهر المهارتان معًا أكثر مما لو كانتا غير مرتبطتين (1.0 = لا ارتباط).
          {" "}<b>P(العمود | الصف)</b> = نسبة الإعلانات التي تذكر مهارة الصف وتذكر أيضًا مهارة العمود. <b>Jaccard</b> = معًا ÷ أيٌّ منهما.
        </>) : (<>
        <b>Lift</b> = how many times more often two skills appear together than if they were unrelated (1.0 = no association).
        {" "}<b>P(column | row)</b> = share of postings listing the row skill that also list the column skill. <b>Jaccard</b> = together ÷ either.
        </>)}
      </Callout>
      <ChartPanel title={t("Skills that appear together", "مهارات تظهر معًا")} meta={q.data ? t(`The 18 most requested skills · ${fmtInt(q.data.denominator)} postings with skill data`, `أكثر 18 مهارة طلبًا · ${fmtInt(q.data.denominator)} إعلان يذكر مهارات`) : undefined}
        extraActions={<Segmented label={t("Association measure", "مقياس الارتباط")} value={metric} onChange={setMetric}
          options={[{ value: "lift", label: t("Lift", "معامل الرفع") }, { value: "cond", label: t("P(col | row)", "P(العمود | الصف)") }, { value: "jaccard", label: "Jaccard" }]} />}
        table={q.data ? { columns: [t("Skill A", "المهارة أ"), t("Skill B", "المهارة ب"), t("Together", "معًا"), t("Lift", "معامل الرفع"), "P(B|A)", "P(A|B)", "Jaccard"], filename: "skill-pairs",
          rows: q.data.links.map((l) => [l.a, l.b, l.together, l.lift, fmtPct(l.p_b_given_a), fmtPct(l.p_a_given_b), l.jaccard]) } : undefined}>
        {(h) => <Guard q={q} h={520} empty={(d) => d.nodes.length < 2}>{(d) => {
          const names = d.nodes.map((n) => n.skill);
          const cell = (a: string, b: string) => {
            const l = d.links.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
            if (!l) return null;
            if (metric === "lift") return l.lift;
            if (metric === "jaccard") return l.jaccard;
            return l.a === a ? l.p_b_given_a : l.p_a_given_b;
          };
          const data: [number, number, number | null][] = [];
          names.forEach((a, i) => names.forEach((b, j) => { if (i !== j) data.push([j, i, cell(a, b)]); }));
          const vals = data.map((x) => x[2] ?? 0);
          const diverging = metric === "lift";
          return (
            <Chart label={t(`${metricLabel} between pairs of top skills`, `${metricLabel} بين أزواج أبرز المهارات`)} handleRef={h} height={560} deps={[d, metric]}
              onClick={(p) => onPick(names[(p.data as number[])[1]])}
              build={(tk) => ({
                ...baseOption(tk),
                grid: { left: 8, right: 8, top: 8, bottom: 70, containLabel: true },
                xAxis: { type: "category", data: names, ...axisStyle(tk), axisLabel: { color: tk.ink2, fontSize: 11, rotate: 50 }, splitArea: { show: false } },
                yAxis: { type: "category", data: names, inverse: true, ...axisStyle(tk), axisLabel: { color: tk.ink2, fontSize: 11 } },
                visualMap: diverging
                  ? { type: "piecewise", orient: "horizontal", left: "center", bottom: 0, itemWidth: 14, textStyle: { color: tk.ink2, fontSize: 11 },
                      pieces: [{ lt: 0.8, color: tk.series[4], label: t("< 0.8 (avoid each other)", "< 0.8 (تتجنب إحداهما الأخرى)") }, { gte: 0.8, lt: 1.25, color: tk.panel2, label: t("0.8–1.25 (no link)", "0.8–1.25 (لا ارتباط)") },
                        { gte: 1.25, lt: 2, color: tk.s3Soft, label: "1.25–2" }, { gte: 2, color: tk.series[HUE.skill], label: t("≥ 2 (strong pair)", "≥ 2 (ثنائي قوي)") }] }
                  : { min: 0, max: Math.max(...vals, 0.01), orient: "horizontal", left: "center", bottom: 0, itemHeight: 140, calculable: false,
                      inRange: { color: [tk.panel2, tk.series[HUE.skill]] }, textStyle: { color: tk.ink2, fontSize: 11 }, formatter: (v: number) => fmtPct(v, 0) },
                tooltip: { ...baseOption(tk).tooltip, formatter: (p: { data: [number, number, number | null] }) => {
                  const [x, y, v] = p.data;
                  const l = d.links.find((k) => (k.a === names[y] && k.b === names[x]) || (k.a === names[x] && k.b === names[y]));
                  return `<b>${esc(names[y])} + ${esc(names[x])}</b><br/>${t(`${fmtInt(l?.together)} postings together`, `${fmtInt(l?.together)} إعلان معًا`)}<br/>${metricLabel}: <b>${v == null ? "—" : metric === "lift" ? v.toFixed(2) : fmtPct(v)}</b>`;
                } },
                series: [{ type: "heatmap", data, itemStyle: { borderColor: tk.panel, borderWidth: 2, borderRadius: 2 }, emphasis: { itemStyle: { borderColor: tk.accent, borderWidth: 2 } } }],
              })} />
          );
        }}</Guard>}
      </ChartPanel>
      <ChartPanel title={t("Pairing network", "شبكة الثنائيات")} meta={t("Lines join pairs with lift ≥ 1.5 and at least 1% of postings together; circle area = postings listing the skill. Drag to rearrange, scroll to zoom.",
          "تصل الخطوط بين الأزواج ذات معامل رفع ≥ 1.5 والتي تظهر معًا في 1% على الأقل من الإعلانات؛ مساحة الدائرة = الإعلانات التي تذكر المهارة. اسحب لإعادة الترتيب، ومرّر للتكبير.")}
        info={t("A force layout places strongly related skills near each other. Only meaningful associations are drawn so the network stays readable.",
          "يضع التخطيط بالقوى المهارات المرتبطة بقوة قرب بعضها. لا تُرسم إلا الارتباطات المهمة لتبقى الشبكة مقروءة.")}>
        {(h) => <Guard q={q} h={460}>{(d) => {
          const edges = d.links.filter((l) => (l.lift ?? 0) >= 1.5 && l.together >= 0.01 * d.denominator);
          const maxN = Math.max(...d.nodes.map((n) => n.postings));
          return (
            <Chart label={t("Network of strongly associated skills", "شبكة المهارات شديدة الارتباط")} handleRef={h} height={480} deps={[d]}
              onClick={(p) => p.data && (p.data as { name?: string }).name && onPick((p.data as { name: string }).name)}
              build={(tk) => ({
                ...baseOption(tk),
                tooltip: { ...baseOption(tk).tooltip, formatter: (p: { dataType: string; data: { name?: string; value?: number; source?: string; target?: string; lift?: number; together?: number } }) =>
                  p.dataType === "edge" ? `<b>${esc(p.data.source)} + ${esc(p.data.target)}</b><br/>${t("Lift", "معامل الرفع")} ${p.data.lift?.toFixed(2)} · ${fmtInt(p.data.together)} ${t("postings", "إعلان")}`
                    : `<b>${esc(p.data.name)}</b><br/>${fmtInt(p.data.value)} ${t("postings", "إعلان")}` },
                series: [{
                  type: "graph", layout: "force", roam: true, draggable: true,
                  force: { repulsion: 1100, edgeLength: [90, 230], gravity: 0.05, layoutAnimation: false },
                  label: { show: true, position: "right", color: tk.ink, fontSize: 11 },
                  emphasis: { focus: "adjacency", lineStyle: { width: 3 } },
                  blur: { itemStyle: { opacity: 0.25 }, lineStyle: { opacity: 0.08 } },
                  lineStyle: { color: tk.lineStrong, curveness: 0.1 },
                  data: d.nodes.map((n) => ({ name: n.skill, value: n.postings, symbolSize: 10 + 34 * Math.sqrt(n.postings / maxN),
                    itemStyle: { color: n.is_technical ? tk.series[HUE.skill] : tk.series[HUE.source], borderColor: tk.panel, borderWidth: 2 } })),
                  links: edges.map((l) => ({ source: l.a, target: l.b, lift: l.lift, together: l.together,
                    lineStyle: { width: Math.min(6, 0.6 + (l.lift ?? 1)), opacity: 0.55 } })),
                }],
              })} />
          );
        }}</Guard>}
      </ChartPanel>
    </div>
  );
}

export function SkillProfile({ skill, onClose }: { skill: string; onClose: () => void }) {
  const { filters } = useFilters();
  const nav = useNavigate();
  const labels = useLabels();
  const q = useApi<SkillDetail>("/skills/detail", filters, { name: skill });
  return (
    <Panel className="mb-4 border-accent-line" title={<>{t("Skill profile:", "ملف المهارة:")} <span dir="auto">{skill}</span></>}
      meta={q.data ? t(`${q.data.category} · category from ${q.data.category_source === "none" ? "no source (uncategorized)" : q.data.category_source}`,
        `${tv(q.data.category)} · مصدر الفئة: ${q.data.category_source === "none" ? "لا يوجد (غير مصنفة)" : q.data.category_source}`) : undefined}
      actions={<IconButton label={t("Close skill profile", "إغلاق ملف المهارة")} onClick={onClose}><X size={16} /></IconButton>}>
      <Guard q={q} h={360}>
        {(d) => {
          const added = d.postings - d.observed_postings;
          const sal = (w: boolean) => d.salary.find((s) => s.with_skill === w);
          const s1 = sal(true);
          const s0 = sal(false);
          const trend = d.trend.series[0]?.points.filter((p) => p.cohort === "kaggle_2023" && p.reliable) ?? [];
          return (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
                <p><span className="kpi text-2xl font-semibold text-ink">{fmtPct(d.share)}</span> <span className="text-ink-2">{t(`of ${fmtInt(d.denominator)} postings with skill data list ${skill}`, `من ${fmtInt(d.denominator)} إعلان يذكر مهارات تذكر ${skill}`)}</span></p>
                <p className="text-sm text-ink-2">{t(`${fmtInt(d.observed_postings)} written in the posting · ${fmtInt(added)} added by the team`, `${fmtInt(d.observed_postings)} مذكورة في الإعلان · ${fmtInt(added)} أضافها الفريق`)}
                  {d.postings > 0 && added / d.postings > 0.5 && <Pill tone="added" title={t("Most mentions of this skill were added after collection", "أُضيف معظم ذكر هذه المهارة بعد الجمع")}>{t("mostly team-added", "أضافها الفريق غالبًا")}</Pill>}</p>
                <TextLink to={drillHref("/explorer", filters, { skill })}>{t(`See the ${fmtInt(d.postings)} postings`, `اعرض ${fmtInt(d.postings)} إعلان`)}</TextLink>
                <TextLink to={drillHref("/career", filters, {}, { have: skill })}>{t("Plan a career with it", "خطط مسارًا مهنيًا بها")}</TextLink>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div><h3 className="mb-1 text-sm font-medium">{t("By role", "حسب الدور")} <span className="font-normal text-ink-3">{t("share within the role", "النسبة داخل الدور")}</span></h3>
                  <HBar by="share" label={t(`${skill} share by role`, `نسبة ${skill} حسب الدور`)} data={d.by_role.slice(0, 10).map((r) => ({ label: r.key, value: r.n, share: r.share }))}
                    onSelect={(role) => nav(drillHref("/explorer", filters, { role, skill }))} /></div>
                <div><h3 className="mb-1 text-sm font-medium">{t("By country", "حسب الدولة")} <span className="font-normal text-ink-3">{t("share within the 12 largest countries", "النسبة داخل أكبر 12 دولة")}</span></h3>
                  <HBar by="share" label={t(`${skill} share by country`, `نسبة ${skill} حسب الدولة`)} color={HUE.place} data={d.by_country.map((r) => ({ label: r.key, value: r.n, share: r.share }))}
                    onSelect={(country) => nav(drillHref("/explorer", filters, { country, skill }))} /></div>
                <div><h3 className="mb-1 text-sm font-medium">{t("Most often paired with", "تُطلب معها غالبًا")} <span className="font-normal text-ink-3">{t(`share of ${skill} postings`, `النسبة من إعلانات ${skill}`)}</span></h3>
                  <HBar by="share" label={t(`Skills paired with ${skill}`, `مهارات تُطلب مع ${skill}`)} color={HUE.skill} data={d.co_skills.slice(0, 10).map((c) => ({ label: c.skill, value: c.together, share: c.p_given_skill, note: c.lift ? `${t("Lift", "معامل الرفع")} ${c.lift.toFixed(2)}` : undefined }))} /></div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div><h3 className="mb-1 text-sm font-medium">{t("By seniority", "حسب مستوى الخبرة")}</h3>
                  <HBar by="share" label={t(`${skill} share by seniority`, `نسبة ${skill} حسب مستوى الخبرة`)} data={d.by_seniority.map((r) => ({ label: r.key, value: r.n, share: r.share }))} /></div>
                <div>
                  <h3 className="mb-1 text-sm font-medium">{t("Monthly share in the 2023 archive", "النسبة الشهرية في أرشيف 2023")}</h3>
                  {trend.length >= 3 ? <MonthLines label={t(`${skill} monthly share, 2023 archive`, `النسبة الشهرية لـ ${skill}، أرشيف 2023`)} height={200} yName="" yFmt={(v) => fmtPct(v, 0)}
                    series={[{ name: skill, points: trend.map((p) => ({ x: p.month.slice(0, 7), y: p.share, n: p.denominator })) }]} />
                    : <p className="text-sm text-ink-3">{t("Not enough dated 2023 postings in this selection.", "لا توجد إعلانات مؤرخة كافية من 2023 في هذا الاختيار.")}</p>}
                  <p className="text-xs text-ink-3">{t(`Within one collection only; ${labels.cohort("collected_2026")} is not joined to this line.`, `داخل دفعة واحدة فقط؛ لا تُضم ${labels.cohort("collected_2026")} إلى هذا الخط.`)}</p>
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-medium">{t(`Advertised pay, with vs without ${skill}`, `الأجر المعلن، مع ${skill} ودونها`)}</h3>
                  {s1 && s1.median != null && s0 && s0.median != null ? (
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-ink-3">{t("With", "مع")}</dt><dd className="m-0"><span className="kpi text-lg font-semibold">{fmtUsd(s1.median)}</span> <span className="text-ink-3">n = {fmtInt(s1.n)}</span></dd></div>
                      <div><dt className="text-ink-3">{t("Without", "دون")}</dt><dd className="m-0"><span className="kpi text-lg font-semibold">{fmtUsd(s0.median)}</span> <span className="text-ink-3">n = {fmtInt(s0.n)}</span></dd></div>
                      <p className="col-span-2 text-xs text-ink-3">{t("Median annual USD (approx.) among postings that list skills and advertise pay. A difference here is an association in this sample — role, country and seniority mix also differ — not the value of learning the skill.", "الوسيط السنوي بالدولار الأمريكي (تقريبي) بين الإعلانات التي تذكر مهارات وتعلن الأجر. أي فرق هنا ارتباط في هذه العينة — إذ يختلف أيضًا مزيج الأدوار والدول ومستويات الخبرة — وليس قيمة تعلّم المهارة.")}</p>
                    </dl>
                  ) : <p className="text-sm text-ink-3">{t("Fewer than 10 advertised salaries on one side — not shown.", "أقل من 10 رواتب معلنة في أحد الجانبين — لا تُعرض.")}</p>}
                  {d.employers.length > 0 && <>
                    <h3 className="mt-3 mb-1 text-sm font-medium">{t("Employers asking for it most", "أكثر جهات التوظيف طلبًا لها")}</h3>
                    <p className="text-sm text-ink-2" dir="auto">{d.employers.slice(0, 6).map((e) => `${e.key} (${fmtInt(e.n)})`).join(" · ")}</p>
                  </>}
                </div>
              </div>
            </div>
          );
        }}
      </Guard>
    </Panel>
  );
}
