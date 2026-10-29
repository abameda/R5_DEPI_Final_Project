import clsx from "clsx";
import { ArrowRight, Check, ChevronDown, Plus, X } from "lucide-react";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CoverageStrip } from "../components/Coverage";
import { SkillPicker } from "../components/SkillPicker";
import { Advanced, Callout, Empty, Guard, InfoTip, PageHeader, Panel, Segmented, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { drillHref } from "../lib/filters";
import { fmtDate, fmtInt, fmtPct } from "../lib/format";
import { useFilters, useLabels, useMeta } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import { haveSet, useProfile } from "../lib/profile";
import type { CareerGap } from "../lib/types";

export default function Career() {
  const { filters, set } = useFilters();
  const { data: meta } = useMeta();
  const labels = useLabels();
  const { profile, setRole, setSkills, addSkill, removeSkill, replace } = useProfile();
  const [params, setParams] = useSearchParams();
  const roles = meta?.dimensions.role_category.map((r) => r.value).filter((r) => r !== "Other / Unclassified") ?? [];
  const target = profile.role && roles.includes(profile.role) ? profile.role : roles[0] ?? "";
  const q = useApi<CareerGap>("/career/gap", { ...filters, role: [] }, { target_role: target, have: profile.skills }, !!target);

  // shared links (?target=…&have=…) seed the profile once, then the URL is tidied
  useEffect(() => {
    const urlRole = params.get("target");
    const urlHave = params.getAll("have");
    if (!urlRole && !urlHave.length) return;
    replace({ role: urlRole ?? profile.role, skills: urlHave.length ? [...profile.skills, ...urlHave] : profile.skills });
    setParams((prev) => { const sp = new URLSearchParams(prev); sp.delete("target"); sp.delete("have"); return sp; }, { replace: true });
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const roleSkills = new Set(q.data?.skills.map((s) => s.skill.toLowerCase()) ?? []);
  const relevant = profile.skills.filter((s) => roleSkills.has(s.toLowerCase()));
  const other = profile.skills.filter((s) => !roleSkills.has(s.toLowerCase()));
  const extra = [filters.country, filters.region, filters.seniority, filters.job_type, filters.work_mode, filters.source, filters.cohort, filters.company, filters.skill].some((x) => x.length > 0) || filters.q;

  return (
    <>
      <PageHeader title={t("My skills & plan", "مهاراتي وخطتي")}
        description={t("Choose the role you want and the skills you have. See where you stand, what to learn next, and which postings already fit, ranked from the postings themselves.",
          "اختر الدور الذي تريده والمهارات التي لديك. اعرف موقعك، وما تتعلمه بعد ذلك، والإعلانات التي تناسبك الآن، مرتبة من الإعلانات نفسها.")} />
      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section aria-labelledby="profile-h" className="rounded-xl border border-line bg-panel p-5 lg:sticky lg:top-[calc(var(--filters-h,0px)+1.5rem)]">
          <h2 id="profile-h" className="text-[0.9375rem] font-semibold text-ink">{t("Your profile", "ملفك")}</h2>
          <p className="mt-0.5 text-xs text-ink-3">{t("Saved in this browser only.", "محفوظ في هذا المتصفح فقط.")}</p>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{t("Role you want", "الدور الذي تريده")}</span>
            <select value={target} onChange={(e) => setRole(e.target.value)} className="h-10 w-full rounded-lg border border-line-strong bg-panel px-3 text-sm text-ink">
              {roles.map((r) => <option key={r} value={r}>{tv(r)}</option>)}
            </select>
          </label>
          <div className="mt-4">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{t("Where you want to work", "أين تريد أن تعمل")}</span>
            <Segmented label={t("Market", "السوق")} value={filters.market.length === 1 ? filters.market[0] : "any"}
              onChange={(v) => set("market", v === "any" ? [] : [v])}
              options={[{ value: "any", label: t("Anywhere", "أي مكان") }, { value: "Arab", label: t("Arab", "عربي") }, { value: "International", label: t("Int’l", "دولي") }, { value: "Remote", label: t("Remote", "عن بُعد") }]} />
            {extra ? <p className="mt-1.5 text-xs text-ink-3">{t("Also using filters from other pages: ", "يستخدم أيضًا فلاتر من صفحات أخرى: ")}{[...filters.country.map(tv), ...filters.region.map(tv), ...filters.seniority.map(tv), ...filters.job_type.map(tv), ...filters.work_mode.map(tv), ...filters.source.map(labels.source), ...filters.cohort.map(labels.cohort), ...filters.company, ...filters.skill.map((s) => t(`lists ${s}`, `يذكر ${s}`)), ...(filters.q ? [`“${filters.q}”`] : [])].join(t(", ", "، "))}</p> : null}
          </div>
          <div className="mt-5 border-t border-line pt-5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-ink-2">{t(`Skills you have (${profile.skills.length})`, `مهاراتك (${profile.skills.length})`)}</span>
              {profile.skills.length > 0 && <button type="button" onClick={() => setSkills([])} className="text-xs font-medium text-ink-3 hover:text-crit">{t("Clear all", "مسح الكل")}</button>}
            </div>
            {profile.skills.length === 0 && <p className="mt-2 text-sm text-ink-2">{t("Add what you already know. Start with the role’s most requested skills.", "أضف ما تعرفه بالفعل. ابدأ بأكثر المهارات طلبًا لهذا الدور.")}</p>}
            <SkillGroup title={t(`Asked for in ${tv(target)}`, `مطلوبة في ${tv(target)}`)} skills={relevant} onRemove={removeSkill} tone="good" />
            <SkillGroup title={t("Other skills", "مهارات أخرى")} skills={other} onRemove={removeSkill} tone="neutral" />
            <div className="mt-3">
              <SkillPicker selected={profile.skills} onAdd={addSkill} suggestions={q.data?.skills.filter((s) => !s.have).slice(0, 12).map((s) => s.skill) ?? []}
                suggestionsTitle={t(`Most requested for ${tv(target)}`, `الأكثر طلبًا لدور ${tv(target)}`)} />
            </div>
          </div>
          <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-ink-3">
            {filters.provenance === "observed"
              ? t("Counting only skills written in the postings.", "تُحتسب المهارات المذكورة في الإعلانات فقط.")
              : t("Counting skills written in postings and skills the team added after collection.", "تُحتسب المهارات المذكورة في الإعلانات والمهارات التي أضافها الفريق بعد الجمع.")}
          </p>
        </section>

        <div className="min-w-0 space-y-6">
          <Guard q={q} h={420}>
            {(g) => g.status === "too_few_postings" ? (
              <Empty title={t(`Only ${fmtInt(g.denominator)} ${tv(g.role)} postings list skills here`, `${fmtInt(g.denominator)} إعلانًا فقط لدور ${tv(g.role)} تذكر مهارات هنا`)}
                hint={t(`At least ${g.min_group} are needed for a reliable ranking. Choose “Anywhere”, or pick a broader role.`,
                  `يلزم ${g.min_group} إعلانًا على الأقل لترتيب موثوق. اختر «أي مكان» أو دورًا أشمل.`)} />
            ) : <Results g={g} onRole={setRole} onHave={addSkill} />}
          </Guard>
        </div>
      </div>
    </>
  );
}

function SkillGroup({ title, skills, onRemove, tone }: { title: string; skills: string[]; onRemove: (s: string) => void; tone: "good" | "neutral" }) {
  if (!skills.length) return null;
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs text-ink-3">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {skills.map((s) => (
          <li key={s} className={clsx("inline-flex h-8 items-center gap-1 rounded-lg ps-2.5 pe-1 text-sm font-medium",
            tone === "good" ? "bg-good-soft text-good" : "bg-panel-2 text-ink-2")}>
            {s}
            <button type="button" aria-label={t(`Remove ${s}`, `إزالة ${s}`)} onClick={() => onRemove(s)} className="grid size-6 place-items-center rounded-md hover:bg-panel/70"><X size={13} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Results({ g, onRole, onHave }: { g: CareerGap; onRole: (r: string) => void; onHave: (s: string) => void }) {
  const { filters } = useFilters();
  const { profile } = useProfile();
  const a = g.alignment!;
  const m = g.posting_match;
  const top = g.skills.slice(0, a.top_k);
  const share = new Map(g.skills.map((s) => [s.skill, s.share]));
  const has = haveSet(profile.skills);
  const haveTop = top.filter((s) => s.have || has(s.skill)).length;
  // more listed skills you have wins; share breaks ties, so a one-skill posting never outranks a richer match
  const postings = [...g.postings].sort((x, y) => y.matched - x.matched || y.matched / y.listed - x.matched / x.listed);
  return (<div className="space-y-6">
    <section aria-label={t("Where you stand", "موقعك")} className="rounded-2xl bg-rail p-6 text-rail-ink sm:p-7">
      <h2 className="max-w-3xl text-xl leading-8 font-semibold tracking-[-0.015em] sm:text-2xl sm:leading-9">
        {t(`You have ${haveTop} of the ${top.length} skills ${tv(g.role)} postings ask for most, about ${fmtPct(a.score, 0)} of the demand.`,
          `لديك ${haveTop} من أكثر ${top.length} مهارة تطلبها إعلانات ${tv(g.role)}، أي نحو ${fmtPct(a.score, 0)} من الطلب.`)}
      </h2>
      <Advanced>
      <p className="mt-2 flex flex-wrap items-center gap-x-1 text-sm leading-6 text-rail-ink-2">
        {m ? t(`Of ${fmtInt(m.postings)} postings in this role, you have every listed skill for ${fmtPct(m.full_match / m.postings, 0)}, half or more for ${fmtPct(m.half_match / m.postings, 0)}, and at least one for ${fmtPct(m.any_match / m.postings, 0)}.`,
          `من ${fmtInt(m.postings)} إعلانًا لهذا الدور، لديك كل المهارات المذكورة في ${fmtPct(m.full_match / m.postings, 0)}، والنصف فأكثر في ${fmtPct(m.half_match / m.postings, 0)}، وواحدة على الأقل في ${fmtPct(m.any_match / m.postings, 0)}.`)
          : t("Add your skills to compare them with each posting’s list.", "أضف مهاراتك لمقارنتها بقائمة كل إعلان.")}
        <span className="text-rail-ink [&_button]:text-rail-ink-2 [&_button:hover]:text-rail-ink"><InfoTip>
          {t(`Each of the ${a.top_k} most requested skills counts by how often it is requested. Match = the shares of the ones you have ÷ the shares of all ${a.top_k}. It describes overlap with this sample of postings; it is not a probability of being hired.`,
            `تُوزن كل مهارة من أكثر ${a.top_k} مهارة طلبًا بمدى تكرار طلبها. التوافق = نسب المهارات التي لديك ÷ نسب المهارات الـ${a.top_k} كلها. يصف التداخل مع عينة الإعلانات هذه؛ وليس احتمالًا للتوظيف.`)}
        </InfoTip></span>
      </p>
      </Advanced>
      <div className="mt-5 rounded-xl bg-panel p-4 text-ink">
        <CoverageStrip label={t(`The ${top.length} skills ${tv(g.role)} postings ask for most`, `أكثر ${top.length} مهارة تطلبها إعلانات ${tv(g.role)}`)}
          context={t(`${tv(g.role)} postings`, `إعلانات ${tv(g.role)}`)}
          items={top.map((s) => ({ skill: s.skill, weight: s.share, have: s.have || has(s.skill), added: s.added > s.observed }))}
          onSelect={(s) => !has(s) && onHave(s)} />
      </div>
    </section>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <Panel title={t("What to learn next", "ماذا تتعلم بعد ذلك")} meta={t("Skills you lack, most reliably requested first", "مهارات تنقصك، الأكثر طلبًا بثبات أولًا")}
        info={t("Ranked by the lower bound of the 95% Wilson interval of the share of this role's postings that list the skill, so small samples do not jump the queue.",
          "مرتبة حسب الحد الأدنى لفترة ويلسون بثقة 95% لنسبة إعلانات الدور التي تذكر المهارة، حتى لا تتقدم العينات الصغيرة.")}>
        {g.priorities.length === 0 ? <p className="text-sm text-ink-2">{t("You already have every skill in the top 40 for this role.", "لديك بالفعل كل المهارات ضمن أكثر 40 مهارة طلبًا لهذا الدور.")}</p> : (
          <ol className="divide-y divide-line">
            {g.priorities.slice(0, 8).map((s, i) => {
              const addedShare = s.postings ? s.added / s.postings : 0;
              return (
                <li key={s.skill} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-3">
                  <span className="tnum text-sm text-ink-3">{i + 1}</span>
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-ink">{s.skill}</span>
                    <span className="text-xs text-ink-3">{tv(s.category)}</span>
                    {addedShare > 0.5 && <span className="text-xs text-ink-3" title={t(`${fmtPct(addedShare, 0)} of these mentions were added by the team`, `${fmtPct(addedShare, 0)} من هذه الإشارات أضافها الفريق`)}>{t("· mostly team-added", "· أضافها الفريق غالبًا")}</span>}
                  </span>
                  <span className="flex items-center gap-1">
                    <Link to={drillHref("/explorer", filters, { role: g.role, skill: s.skill })} className="rounded-md px-2 py-1 text-xs font-medium text-accent-ink no-underline hover:bg-accent-soft">{t("Jobs", "وظائف")}</Link>
                    <button type="button" onClick={() => onHave(s.skill)} title={t("I have this", "لدي هذه المهارة")} aria-label={t(`I have ${s.skill}`, `لدي ${s.skill}`)}
                      className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink"><Plus size={15} /></button>
                  </span>
                  <span className="col-start-2 col-end-4 flex items-center gap-3">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2"><span className="block h-full rounded-full bg-warn-fill" style={{ width: `${(s.share ?? 0) * 100}%` }} /></span>
                    <span className="tnum w-24 text-end text-xs text-ink-2" title={t(`at least ${fmtPct(s.wilson_lower, 0)} with 95% confidence · ${fmtInt(s.postings)} postings`, `${fmtPct(s.wilson_lower, 0)} على الأقل بثقة 95% · ${fmtInt(s.postings)} إعلانًا`)}>
                      {t(`${fmtPct(s.share, 0)} of jobs`, `${fmtPct(s.share, 0)} من الوظائف`)}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-3 text-xs text-ink-3">{t("Learning a skill raises your overlap with these postings; it does not guarantee interviews or a job.", "تعلّم مهارة يزيد تداخلك مع هذه الإعلانات، لكنه لا يضمن مقابلات أو وظيفة.")}</p>
      </Panel>

      <Panel title={t("Where else you fit", "أين تناسب أيضًا")} meta={t("Roles that ask for a similar mix of skills", "أدوار تطلب مزيجًا مشابهًا من المهارات")}
        info={t("Each role is a vector of the shares of the 60 most requested skills; similarity is the cosine between them (1 = identical mix). Your match uses the same formula as above.",
          "يُمثَّل كل دور بمتجه من نسب أكثر 60 مهارة طلبًا؛ والتشابه هو جيب التمام بينها (1 = مزيج متطابق). ويُحسب توافقك بالمعادلة نفسها أعلاه.")}>
        {g.related_roles.length === 0 ? <p className="text-sm text-ink-3">{t("No other role has enough postings in this selection.", "لا يوجد دور آخر لديه إعلانات كافية ضمن هذا الاختيار.")}</p> : (
          <ul className="divide-y divide-line">
            {g.related_roles.filter((r) => r.role !== "Other / Unclassified").slice(0, 6).map((r) => (
              <li key={r.role}>
                <button type="button" onClick={() => onRole(r.role)} className="group grid w-full grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-x-4 gap-y-1 py-3 text-start">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 font-medium text-ink group-hover:text-accent-ink">{tv(r.role)} <ArrowRight size={13} className="opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" /></span>
                    <span className="block truncate text-xs text-ink-3">{r.top_skills.join(" · ")}</span>
                  </span>
                  <span className="text-end">
                    <span className="tnum block text-sm font-medium text-ink">{fmtPct(r.alignment, 0)}</span>
                    <span className="tnum block text-xs text-ink-3">{t(`similarity ${r.similarity.toFixed(2)}`, `تشابه ${r.similarity.toFixed(2)}`)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-3">{t("Percent = your match with that role. Select a role to plan for it.", "النسبة = توافقك مع ذلك الدور. اختر دورًا لتخطط له.")}</p>
      </Panel>
    </div>

    <Panel title={t("Jobs that fit you best", "الوظائف الأنسب لك")} meta={t("Postings in this role and market that list the most of your skills; ties go to the larger share of their list, then the newest", "إعلانات هذا الدور والسوق التي تذكر أكبر عدد من مهاراتك؛ وعند التساوي الأعلى نسبةً من قائمتها ثم الأحدث")}
      actions={<TextLink to={drillHref("/explorer", filters, { role: g.role })}>{t(`All ${tv(g.role)} jobs`, `كل وظائف ${tv(g.role)}`)}</TextLink>}>
      <ul className="divide-y divide-line">
        {postings.map((p) => (
          <li key={p.job_id}>
            <Link to={`/explorer?job=${encodeURIComponent(p.job_id)}`} className="grid gap-x-6 gap-y-1 py-3 text-ink no-underline sm:grid-cols-[minmax(0,1fr)_9rem] hover:[&_.t]:text-accent-ink">
              <span className="min-w-0">
                <span className="t block truncate font-medium" dir="auto">{p.title}</span>
                <span className="block truncate text-sm text-ink-2"><bdi>{p.company ?? t("Employer not given", "جهة التوظيف غير مذكورة")}</bdi> · <bdi>{p.country ? tv(p.country) : t("No single country", "بلا دولة محددة")}</bdi> · {fmtDate(p.posted_date)}</span>
                {p.missing && p.missing.length > 0 && profile.skills.length > 0 && <span className="block truncate text-xs text-ink-3">{t("Missing: ", "ينقصك: ")}{p.missing.slice(0, 8).join(t(", ", "، "))}{p.missing.length > 8 ? "…" : ""}</span>}
              </span>
              <span className="flex flex-col justify-center gap-1 sm:items-end">
                <span className="tnum text-xs font-medium text-ink-2">{t(`${p.matched} of ${p.listed} ${p.listed === 1 ? "skill" : "skills"}`, `${p.matched} من ${p.listed} مهارات`)}</span>
                <span className="w-full max-w-40">
                  <CoverageStrip size="sm" label={t(`You have ${p.matched} of ${p.listed} listed skills`, `لديك ${p.matched} من ${p.listed} مهارات مذكورة`)}
                    items={[...Array.from({ length: p.matched }, (_, i) => ({ skill: `have-${i}`, weight: null, have: true })),
                      ...(p.missing ?? []).map((s) => ({ skill: s, weight: share.get(s) ?? null, have: false }))]} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>

    <Advanced>
    <details className="group rounded-xl border border-line bg-panel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span><span className="block text-[0.9375rem] font-semibold text-ink">{t("Every skill this role asks for", "كل المهارات التي يطلبها هذا الدور")}</span>
          <span className="block text-sm text-ink-3">{t(`Top ${g.skills.length} by share of ${fmtInt(g.denominator)} postings`, `أعلى ${g.skills.length} مهارة حسب نسبتها من ${fmtInt(g.denominator)} إعلانًا`)}</span></span>
        <ChevronDown size={18} className="shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="grid gap-x-8 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
        {g.skills.map((s) => (
          <li key={s.skill} className="flex items-center justify-between gap-2 border-b border-line py-2 text-sm">
            <span className={clsx("flex items-center gap-1.5", s.have || has(s.skill) ? "font-medium text-good" : "text-ink-2")}>
              {s.have || has(s.skill) ? <Check size={14} aria-label={t("you have it", "لديك")} /> : <span className="size-3.5" aria-hidden />}{s.skill}
            </span>
            <span className="tnum text-ink-3">{fmtPct(s.share, 0)}</span>
          </li>
        ))}
      </ul>
    </details>
    {g.provenance === "all" && (
      <Callout tone="info">{t("Rankings include skills the team added after collection (marked “mostly team-added” when they dominate). To count only what postings wrote, choose “Written in posting” in the filter bar on the Jobs or Market pages.",
        "تشمل الترتيبات مهارات أضافها الفريق بعد الجمع (وتُميَّز بعبارة «أضافها الفريق غالبًا» حين تغلب). لاحتساب ما كتبته الإعلانات فقط، اختر «مذكورة في الإعلان» في شريط التصفية بصفحات الوظائف أو السوق.")}</Callout>
    )}
    </Advanced>
  </div>);
}
