import clsx from "clsx";
import { ArrowRight, Check, ChevronDown, Link2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CompassDial } from "../components/CompassDial";
import { CoverageStrip } from "../components/Coverage";
import { PayLands } from "../components/PayLands";
import { SkillPicker } from "../components/SkillPicker";
import { WhereToSearch } from "../components/WhereToSearch";
import { Advanced, Callout, Empty, Guard, InfoTip, PageHeader, Panel, Segmented, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { drillHref, type Filters } from "../lib/filters";
import { fmtDate, fmtInt, fmtMonth, fmtPct } from "../lib/format";
import { useFilters, useLabels, useMeta } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import { matchFilters, placeName, scopeText, whereOptions, type Recency } from "../lib/match";
import { broaderWhere, haveSet, useProfile, WHERE_VALUES, whereFilters, type Where } from "../lib/profile";
import { skillAnchor } from "../lib/roadmaps";
import type { CareerGap, Overview } from "../lib/types";

/**
 * Your compass: the role you want, the skills you have and where you want to
 * work, read against the postings. The skill match is global (every posting
 * for the role); pay and jobs follow your chosen place.
 */
export default function Compass() {
  const { filters } = useFilters();
  const { data: meta } = useMeta();
  const labels = useLabels();
  const { profile, setRole, setSkills, addSkill, removeSkill, setWhere, replace } = useProfile();
  const [params, setParams] = useSearchParams();
  const [recency, setRecency] = useState<Recency>("all");
  const roles = meta?.dimensions.role_category.map((r) => r.value).filter((r) => r !== "Other / Unclassified") ?? [];
  const target = profile.role && roles.includes(profile.role) ? profile.role : roles[0] ?? "";
  const q = useApi<CareerGap>("/career/gap", matchFilters(filters, "global", profile.where, recency), { target_role: target, have: profile.skills }, !!target);

  // shared links (?target=…&have=…&where=…) seed the profile once, then the URL is tidied
  useEffect(() => {
    const urlRole = params.get("target");
    const urlHave = params.getAll("have");
    const urlWhere = params.get("where");
    if (!urlRole && !urlHave.length && !urlWhere) return;
    // a full compass link (role + place) restores the sharer's skills; a lone ?have= adds to yours
    const full = !!urlRole && !!urlWhere;
    replace({
      role: urlRole ?? profile.role,
      skills: full ? urlHave : urlHave.length ? [...profile.skills, ...urlHave] : profile.skills,
      where: urlWhere && (WHERE_VALUES as readonly string[]).includes(urlWhere) ? urlWhere as Where : profile.where,
    });
    setParams((prev) => { const sp = new URLSearchParams(prev); sp.delete("target"); sp.delete("have"); sp.delete("where"); return sp; }, { replace: true });
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const roleSkills = new Set(q.data?.skills.map((s) => s.skill.toLowerCase()) ?? []);
  const relevant = profile.skills.filter((s) => roleSkills.has(s.toLowerCase()));
  const other = profile.skills.filter((s) => !roleSkills.has(s.toLowerCase()));
  // location and cohort are set here, so only the remaining page filters are worth naming
  const extra = [...filters.seniority.map(tv), ...filters.job_type.map(tv), ...filters.work_mode.map(tv), ...filters.source.map(labels.source),
    ...filters.company, ...filters.skill.map((s) => t(`lists ${s}`, `يذكر ${s}`)), ...(filters.q ? [`“${filters.q}”`] : [])];

  return (
    <>
      <PageHeader title={t("Your compass", "بوصلتك")}
        description={t("Pick the role you want, the skills you have and where you want to work. See how your skills match what postings ask for, what to learn next, what the role pays and which jobs already fit.",
          "اختر الدور اللي عايزه ومهاراتك والمكان اللي حابب تشتغل فيه. شوف مهاراتك قريبة قد إيه من المطلوب في الإعلانات، وتتعلم إيه بعد كده، والدور بيدفع كام، وأنهي وظائف مناسبة لك دلوقتي.")} />
      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-labelledby="profile-h" className="rounded-xl border border-line bg-panel p-5 lg:sticky lg:top-[calc(var(--filters-h,0px)+1.5rem)]">
          <h2 id="profile-h" className="text-base font-semibold text-ink">{t("You", "أنت")}</h2>
          <p className="mt-0.5 text-xs text-ink-3">{t("Saved in this browser only.", "محفوظ في هذا المتصفح فقط.")}</p>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{t("Role you want", "الدور الذي تريده")}</span>
            <select value={target} onChange={(e) => setRole(e.target.value)} className="h-10 w-full rounded-lg border border-line-strong bg-panel px-3 text-sm text-ink">
              {roles.map((r) => <option key={r} value={r}>{tv(r)}</option>)}
            </select>
          </label>
          <div className="mt-4">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{t("Where you’d work", "فين حابب تشتغل")}</span>
            <Segmented label={t("Where you’d work", "فين حابب تشتغل")} value={profile.where} onChange={setWhere} options={whereOptions()} />
            <p className="mt-1.5 text-xs text-ink-3">{t("Sets pay and jobs. Your skill match stays global.", "يحدد الأجور والوظائف. توافق مهاراتك يظل عالميًا.")}</p>
            {extra.length > 0 && <p className="mt-1.5 text-xs text-ink-3">{t("Also using filters from other pages: ", "يستخدم أيضًا فلاتر من صفحات أخرى: ")}{extra.join(t(", ", "، "))}</p>}
          </div>
          <div className="mt-5 border-t border-line pt-5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-ink-2">{t(`Skills you have (${profile.skills.length})`, `مهاراتك (${profile.skills.length})`)}</span>
              {profile.skills.length > 0 && <button type="button" onClick={() => setSkills([])} className="text-xs font-medium text-ink-3 hover:text-crit">{t("Clear all", "مسح الكل")}</button>}
            </div>
            {profile.skills.length === 0 && <p className="mt-2 text-sm text-ink-2">{t("Add what you already know. Start with the role’s most requested skills.", "أضف اللي تعرفه بالفعل. ابدأ بأكثر المهارات طلبًا للدور.")}</p>}
            <SkillGroup title={t(`Asked for in ${tv(target)}`, `مطلوبة في ${tv(target)}`)} skills={relevant} onRemove={removeSkill} tone="good" />
            <SkillGroup title={t("Other skills", "مهارات أخرى")} skills={other} onRemove={removeSkill} tone="neutral" />
            <div className="mt-3">
              <SkillPicker selected={profile.skills} onAdd={addSkill} suggestions={q.data?.skills.filter((s) => !s.have).slice(0, 12).map((s) => s.skill) ?? []}
                suggestionsTitle={t(`Most requested for ${tv(target)}`, `الأكثر طلبًا لدور ${tv(target)}`)} />
            </div>
          </div>
          <ShareButton role={target} skills={profile.skills} where={profile.where} />
        </section>

        <div className="min-w-0 space-y-6">
          <Guard q={q} h={420}>
            {(g) => g.status === "too_few_postings" ? (
              <Empty title={recency === "recent"
                ? t(`Only ${fmtInt(g.denominator)} recent ${tv(g.role)} postings list skills`, `${fmtInt(g.denominator)} إعلانًا حديثًا فقط لدور ${tv(g.role)} تذكر مهارات`)
                : t(`Only ${fmtInt(g.denominator)} ${tv(g.role)} postings list skills`, `${fmtInt(g.denominator)} إعلانًا فقط لدور ${tv(g.role)} تذكر مهارات`)}
                hint={t(`At least ${g.min_group} are needed for a reliable match.`, `يلزم ${g.min_group} إعلانًا على الأقل لتوافق موثوق.`)}
                action={recency === "recent" ? <button type="button" onClick={() => setRecency("all")} className="h-9 rounded-lg border border-line-strong bg-panel px-3.5 text-sm font-medium text-ink hover:bg-panel-2">{t("Use all postings", "استخدم كل الإعلانات")}</button> : undefined} />
            ) : <Results g={g} recency={recency} onRecency={setRecency} onRole={setRole} onHave={addSkill} />}
          </Guard>
        </div>
      </div>
    </>
  );
}

function ShareButton({ role, skills, where }: { role: string; skills: string[]; where: Where }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const id = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(id);
  }, [state]);
  const copy = async () => {
    const sp = new URLSearchParams([["target", role], ...skills.map((s) => ["have", s] as [string, string]), ["where", where]]);
    try { await navigator.clipboard.writeText(`${location.origin}/compass?${sp}`); setState("copied"); } catch { setState("failed"); }
  };
  return (
    <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
      <button type="button" onClick={copy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-panel px-3.5 text-sm font-medium text-ink hover:bg-panel-2">
        <Link2 size={15} aria-hidden /> {t("Share my compass", "شارك بوصلتك")}
      </button>
      <span role="status" className="text-xs text-ink-3">
        {state === "copied" ? t("Link copied", "تم نسخ الرابط") : state === "failed" ? t("Could not copy. Copy the address bar instead.", "تعذّر النسخ. انسخ العنوان من شريط المتصفح.") : ""}
      </span>
    </div>
  );
}

function SkillGroup({ title, skills, onRemove, tone }: { title: string; skills: string[]; onRemove: (s: string) => void; tone: "good" | "neutral" }) {
  if (!skills.length) return null;
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs text-ink-3">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {skills.map((s) => (
          <li key={s} className={clsx("inline-flex h-8 motion-safe:animate-[rise_400ms_ease-out] items-center gap-1 rounded-lg ps-2.5 pe-1 text-sm font-medium",
            tone === "good" ? "bg-good-soft text-good" : "bg-panel-2 text-ink-2")}>
            {s}
            <button type="button" aria-label={t(`Remove ${s}`, `إزالة ${s}`)} onClick={() => onRemove(s)} className="grid size-6 place-items-center rounded-md hover:bg-panel/70"><X size={13} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Posting dates and the share from the 2023 archive, for exactly the postings the match uses. */
function useFreshness(f: Filters, role: string) {
  const ov = useApi<Overview>("/overview", { ...f, role: [role] }, {}, !!role);
  const k = ov.data?.kpis;
  if (!k) return null;
  const archive = ov.data!.cohorts.find((c) => c.key === "kaggle_2023")?.share ?? 0;
  const span = k.first_posted && k.last_posted ? t(`Posted ${fmtMonth(k.first_posted)} – ${fmtMonth(k.last_posted)}`, `منشورة من ${fmtMonth(k.first_posted)} إلى ${fmtMonth(k.last_posted)}`) : "";
  // one decimal near the ends, so 99.8% never reads as "100%" and hides the recent postings
  const share = fmtPct(archive, archive > 0.99 || (archive > 0 && archive < 0.01) ? 1 : 0);
  return [span, t(`${share} from the 2023 archive`, `${share} من أرشيف 2023`)].filter(Boolean).join(" · ");
}

function Results({ g, recency, onRecency, onRole, onHave }: { g: CareerGap; recency: Recency; onRecency: (r: Recency) => void; onRole: (r: string) => void; onHave: (s: string) => void }) {
  const { filters } = useFilters();
  const { profile } = useProfile();
  const a = g.alignment!;
  const top = g.skills.slice(0, a.top_k);
  const has = haveSet(profile.skills);
  const haveTop = top.filter((s) => s.have || has(s.skill)).length;
  const scope = scopeText("global");
  const freshness = useFreshness(matchFilters(filters, "global", profile.where, recency), g.role);
  return (<div className="space-y-6">
    <section aria-label={t("Where you stand", "موقعك")} className="rounded-2xl bg-rail p-6 text-rail-ink sm:p-7">
      <div className="grid items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
        <div className="justify-self-center"><CompassDial score={a.score} name={scope.name} /></div>
        <div className="min-w-0">
          <h2 className="max-w-2xl text-xl leading-8 font-semibold tracking-[-0.015em] sm:text-2xl sm:leading-9">
            {t(`You have ${haveTop} of the ${top.length} skills ${tv(g.role)} postings ask for most worldwide, about ${fmtPct(a.score, 0)} of the demand.`,
              `لديك ${haveTop} من أكثر ${top.length} مهارة تطلبها إعلانات ${tv(g.role)} حول العالم، أي نحو ${fmtPct(a.score, 0)} من الطلب.`)}
          </h2>
          <ul className="mt-3 space-y-1 text-sm leading-6 text-rail-ink-2">
            <li>{t(`Based on ${fmtInt(g.denominator)} ${tv(g.role)} postings that list skills`, `استنادًا إلى ${fmtInt(g.denominator)} إعلانًا لدور ${tv(g.role)} تذكر مهارات`)}</li>
            {freshness && <li>{freshness}</li>}
            <li>{g.provenance === "observed"
              ? t("Counting only skills written in postings.", "تُحتسب المهارات المذكورة في الإعلانات فقط.")
              : t("Counting skills written in postings and skills the team added after collection.", "تُحتسب المهارات المذكورة في الإعلانات والمهارات التي أضافها الفريق بعد الجمع.")}</li>
            <li>{scope.note}</li>
            <Advanced>{g.posting_match && profile.skills.length > 0 && (() => {
              const m = g.posting_match!;
              return <li>{t(`Of these ${fmtInt(m.postings)} postings, you have every listed skill for ${fmtPct(m.full_match / m.postings, 0)}, half or more for ${fmtPct(m.half_match / m.postings, 0)}, and at least one for ${fmtPct(m.any_match / m.postings, 0)}.`,
                `من هذه الإعلانات (${fmtInt(m.postings)})، لديك كل المهارات المذكورة في ${fmtPct(m.full_match / m.postings, 0)}، والنصف فأكثر في ${fmtPct(m.half_match / m.postings, 0)}، وواحدة على الأقل في ${fmtPct(m.any_match / m.postings, 0)}.`)}</li>;
            })()}</Advanced>
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-rail-ink-2">
            <Segmented label={t("Which postings", "أي الإعلانات")} value={recency} onChange={onRecency}
              options={[{ value: "all", label: t("All postings", "كل الإعلانات") }, { value: "recent", label: t("Recent (2024–26)", "الحديثة (2024–26)") }]} />
            <Advanced><span className="text-rail-ink [&_button]:text-rail-ink-2 [&_button:hover]:text-rail-ink"><InfoTip>
              {t(`Each of the ${a.top_k} most requested skills counts by how often it is requested. Match = the shares of the ones you have ÷ the shares of all ${a.top_k}. It describes overlap with this sample of postings; it is not a probability of being hired.`,
                `تُوزن كل مهارة من أكثر ${a.top_k} مهارة طلبًا بمدى تكرار طلبها. التوافق = نسب المهارات التي لديك ÷ نسب المهارات الـ${a.top_k} كلها. يصف التداخل مع عينة الإعلانات هذه؛ وليس احتمالًا للتوظيف.`)}
            </InfoTip></span></Advanced>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-xl bg-panel p-4 text-ink">
        <CoverageStrip label={t(`The ${top.length} skills ${tv(g.role)} postings ask for most`, `أكثر ${top.length} مهارة تطلبها إعلانات ${tv(g.role)}`)}
          context={t(`${tv(g.role)} postings`, `إعلانات ${tv(g.role)}`)}
          items={top.map((s) => ({ skill: s.skill, weight: s.share, have: s.have || has(s.skill), added: s.added > s.observed }))}
          onSelect={(s) => !has(s) && onHave(s)} />
      </div>
    </section>

    <Evidence role={g.role} />
    <LearnNext g={g} onHave={onHave} />
    <PayLands role={g.role} where={profile.where} />
    <FitJobs role={g.role} recency={recency} />

    <Panel title={t("Where else you fit", "أين تناسب أيضًا")} meta={t("Roles that ask for a similar mix of skills", "أدوار تطلب مزيجًا مشابهًا من المهارات")}
      info={t("Each role is a vector of the shares of the 60 most requested skills; similarity is the cosine between them (1 = identical mix). Your match uses the same formula as above.",
        "يُمثَّل كل دور بمتجه من نسب أكثر 60 مهارة طلبًا؛ والتشابه هو جيب التمام بينها (1 = مزيج متطابق). ويُحسب توافقك بالمعادلة نفسها أعلاه.")}>
      {g.related_roles.length === 0 ? <p className="text-sm text-ink-3">{t("No other role has enough postings in this selection.", "لا يوجد دور آخر لديه إعلانات كافية ضمن هذا الاختيار.")}</p> : (
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {g.related_roles.filter((r) => r.role !== "Other / Unclassified").slice(0, 6).map((r) => (
            <li key={r.role} className="border-b border-line last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
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
      <p className="mt-3 text-xs text-ink-3">{t("Percent = your Global Skill Match with that role. Select a role to plan for it.", "النسبة = توافقك العالمي للمهارات مع ذلك الدور. اختر دورًا لتخطط له.")}</p>
    </Panel>

    <WhereToSearch filters={{ ...matchFilters(filters, "local", profile.where, recency), role: [g.role] }}
      subject={t(`${tv(g.role)} postings in ${placeName(profile.where)}`, `إعلانات ${tv(g.role)} في ${placeName(profile.where)}`)} />

    <Advanced>
    <details className="group rounded-xl border border-line bg-panel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span><span className="block text-base font-semibold text-ink">{t("Every skill this role asks for", "كل المهارات التي يطلبها هذا الدور")}</span>
          <span className="block text-sm text-ink-3">{t(`Top ${g.skills.length} by share of ${fmtInt(g.denominator)} postings worldwide`, `أعلى ${g.skills.length} مهارة حسب نسبتها من ${fmtInt(g.denominator)} إعلانًا حول العالم`)}</span></span>
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

/** The pages behind the answer, opened on your role and place. */
function Evidence({ role }: { role: string }) {
  const { filters } = useFilters();
  const { profile } = useProfile();
  const everywhere: Filters = { ...filters, country: [], region: [], market: [], role: [] };
  const base: Filters = { ...everywhere, ...whereFilters(profile.where) };
  return (
    <nav aria-label={t("See the evidence", "شوف الدليل")} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <span className="text-ink-3">{t("See the evidence:", "شوف الدليل:")}</span>
      <TextLink to={drillHref("/skills", base, { role })}>{t("Skills for this role", "مهارات هذا الدور")}</TextLink>
      <TextLink to={drillHref("/salary", base, { role })}>{t("Salaries for this role", "رواتب هذا الدور")}</TextLink>
      <TextLink to={drillHref("/geography", everywhere, { role })}>{t("Where these jobs are", "أماكن هذه الوظائف")}</TextLink>
    </nav>
  );
}

/** The skills you lack, most reliably requested first, each one tap from "I have it" or its Roadmap step. */
function LearnNext({ g, onHave }: { g: CareerGap; onHave: (s: string) => void }) {
  return (
    <Panel title={t("What to learn next", "تتعلم إيه بعد كده")} meta={t("Skills you don’t have yet, most reliably requested first", "مهارات لسه ما عندكش، الأكثر طلبًا بثبات أولًا")}
      info={t("Ranked by the lower bound of the 95% Wilson interval of the share of this role's postings that list the skill, so small samples do not jump the queue.",
        "مرتبة حسب الحد الأدنى لفترة ويلسون بثقة 95% لنسبة إعلانات الدور التي تذكر المهارة، حتى لا تتقدم العينات الصغيرة.")}>
      {g.priorities.length === 0 ? <p className="text-sm text-ink-2">{t("You already have every skill in the top 40 for this role.", "لديك بالفعل كل المهارات ضمن أكثر 40 مهارة طلبًا لهذا الدور.")}</p> : (<>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {g.priorities.slice(0, 6).map((s) => {
            const addedShare = s.postings ? s.added / s.postings : 0;
            return (
              <li key={s.skill} className="flex min-h-14 motion-safe:animate-[rise_400ms_ease-out] items-center gap-2 rounded-lg border border-warn/30 bg-warn-soft/50 py-2 ps-3 pe-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{s.skill}</span>
                  <span className="tnum block text-xs text-ink-2" title={t(`at least ${fmtPct(s.wilson_lower, 0)} with 95% confidence · ${fmtInt(s.postings)} postings`, `${fmtPct(s.wilson_lower, 0)} على الأقل بثقة 95% · ${fmtInt(s.postings)} إعلانًا`)}>
                    {t(`in ${fmtPct(s.share, 0)} of postings`, `في ${fmtPct(s.share, 0)} من الإعلانات`)}{addedShare > 0.5 ? t(" · mostly team-added", " · أضافها الفريق غالبًا") : ""}
                  </span>
                </span>
                <Link to={`/roadmap#${skillAnchor(s.skill)}`} className="rounded-md px-2 py-1 text-xs font-medium text-accent-ink no-underline hover:bg-accent-soft">{t("Roadmap", "الخطة")}</Link>
                <button type="button" onClick={() => onHave(s.skill)} aria-label={t(`I have ${s.skill}`, `لدي ${s.skill}`)} title={t("I have this", "عندي المهارة دي")}
                  className="grid size-8 place-items-center rounded-md text-ink-2 hover:bg-panel hover:text-good"><Plus size={16} /></button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-ink-3">{t("Learning a skill raises your overlap with these postings; it does not guarantee interviews or a job.", "تعلّم مهارة يزيد تداخلك مع هذه الإعلانات، لكنه لا يضمن مقابلات أو وظيفة.")}</p>
      </>)}
    </Panel>
  );
}

/** Postings in your chosen place that list the most of your skills. Too few there → offer the next wider place. */
function FitJobs({ role, recency }: { role: string; recency: Recency }) {
  const { filters } = useFilters();
  const { profile } = useProfile();
  const [picked, setPicked] = useState<{ from: Where; role: string; to: Where } | null>(null);
  const shown = picked && picked.from === profile.where && picked.role === role ? picked.to : profile.where;
  const local = matchFilters(filters, "local", shown, recency);
  const q = useApi<CareerGap>("/career/gap", local, { target_role: role, have: profile.skills }, !!role);
  const wider = broaderWhere(shown);
  return (
    <Panel title={t(`Jobs that fit you best in ${placeName(shown)}`, `أنسب الوظائف لك في ${placeName(shown)}`)}
      meta={t("Postings that list the most of your skills; ties go to the larger share of their list, then the newest", "الإعلانات التي تذكر أكبر عدد من مهاراتك؛ وعند التساوي الأعلى نسبةً من قائمتها ثم الأحدث")}
      actions={<TextLink to={drillHref("/explorer", local, { role })}>{t(`All ${tv(role)} jobs`, `كل وظائف ${tv(role)}`)}</TextLink>}>
      <Guard q={q} h={200}>
        {(lg) => lg.status === "too_few_postings" || lg.postings.length === 0 ? (
          <Empty title={t(`Only ${fmtInt(lg.denominator)} ${tv(role)} postings in ${placeName(shown)} list skills`, `${fmtInt(lg.denominator)} إعلانًا فقط لدور ${tv(role)} في ${placeName(shown)} تذكر مهارات`)}
            hint={t("Too few to rank them by your skills.", "عددها قليل جدًا لترتيبها حسب مهاراتك.")}
            action={wider ? <button type="button" onClick={() => setPicked({ from: profile.where, role, to: wider })} className="h-9 rounded-lg border border-line-strong bg-panel px-3.5 text-sm font-medium text-ink hover:bg-panel-2">
              {t(`See ${placeName(wider)} instead`, `شوف ${placeName(wider)} بدلًا من ذلك`)}</button> : undefined} />
        ) : <PostingList g={lg} />}
      </Guard>
    </Panel>
  );
}

function PostingList({ g }: { g: CareerGap }) {
  const { profile } = useProfile();
  const share = new Map(g.skills.map((s) => [s.skill, s.share]));
  // more listed skills you have wins; share breaks ties, so a one-skill posting never outranks a richer match
  const postings = [...g.postings].sort((x, y) => y.matched - x.matched || y.matched / y.listed - x.matched / x.listed);
  return (
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
  );
}
