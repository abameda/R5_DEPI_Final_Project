import clsx from "clsx";
import { Check, ExternalLink, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Callout, Empty, Guard, PageHeader, Segmented } from "../components/ui";
import { useApi } from "../lib/api";
import { drillHref } from "../lib/filters";
import { fmtInt, fmtPct } from "../lib/format";
import { useFilters, useMeta } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import { haveSet, useProfile } from "../lib/profile";
import { roadmapLinks } from "../lib/roadmaps";
import type { Roadmap as RoadmapData, RoadmapSkill } from "../lib/types";

const STAGES = {
  foundations: () => ({ title: t("Foundations", "الأساسيات"), rule: t("Asked for in the most postings. Start here.", "الأكثر طلبًا في الإعلانات. ابدأ هنا.") }),
  core: () => ({ title: t("Core", "الجوهر"), rule: t("Asked for in 5–25% of postings.", "مطلوبة في 5–25% من الإعلانات.") }),
  stand_out: () => ({ title: t("Stand out", "للتميّز"), rule: t("Rarer, but these postings pay more than the role does in the same market.", "أقل طلبًا، لكن إعلاناتها تدفع أكثر من الدور نفسه في السوق ذاته.") }),
};

export default function Roadmap() {
  const { filters, set } = useFilters();
  const { data: meta } = useMeta();
  const { profile, setRole } = useProfile();
  const roles = meta?.dimensions.role_category.map((r) => r.value).filter((r) => r !== "Other / Unclassified") ?? [];
  const target = profile.role && roles.includes(profile.role) ? profile.role : roles[0] ?? "";
  const q = useApi<RoadmapData>("/career/roadmap", { ...filters, role: [] }, { target_role: target, have: profile.skills }, !!target);

  return (
    <>
      <PageHeader title={t("Roadmap", "خارطة الطريق")}
        description={t("The skills a role asks for, in the order to learn them, ranked from the postings themselves.",
          "المهارات التي يطلبها الدور بترتيب تعلّمها، مرتبة من الإعلانات نفسها.")} />
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label className="block w-full max-w-xs">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">{t("Role you want", "الدور الذي تريده")}</span>
          <select value={target} onChange={(e) => setRole(e.target.value)} className="h-10 w-full rounded-lg border border-line-strong bg-panel px-3 text-sm text-ink">
            {roles.map((r) => <option key={r} value={r}>{tv(r)}</option>)}
          </select>
        </label>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-2">{t("Where you want to work", "أين تريد أن تعمل")}</span>
          <Segmented label={t("Market", "السوق")} value={filters.market.length === 1 ? filters.market[0] : "any"}
            onChange={(v) => set("market", v === "any" ? [] : [v])}
            options={[{ value: "any", label: t("Anywhere", "أي مكان") }, { value: "Arab", label: t("Arab", "عربي") }, { value: "International", label: t("Int’l", "دولي") }, { value: "Remote", label: t("Remote", "عن بُعد") }]} />
        </div>
      </div>
      <Guard q={q} h={480}>
        {(g) => g.status === "too_few_postings" ? (
          <Empty title={t(`Only ${fmtInt(g.denominator)} ${tv(g.role)} postings list skills here`, `${fmtInt(g.denominator)} إعلانًا فقط لدور ${tv(g.role)} تذكر مهارات هنا`)}
            hint={t(`At least ${g.min_group} are needed for a reliable ranking. Choose “Anywhere”, or pick a broader role.`,
              `يلزم ${g.min_group} إعلانًا على الأقل لترتيب موثوق. اختر «أي مكان» أو دورًا أشمل.`)} />
        ) : <Path g={g} />}
      </Guard>
    </>
  );
}

function Path({ g }: { g: RoadmapData }) {
  const { profile } = useProfile();
  const has = haveSet(profile.skills);
  const owned = (s: RoadmapSkill) => s.have || has(s.skill);
  const all = g.stages.flatMap((st) => st.skills);
  const done = all.filter(owned).length;
  const links = roadmapLinks(g.role);
  return (
    <div className="max-w-4xl space-y-6">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-xl font-semibold tracking-[-0.015em] text-ink">{t(`${tv(g.role)} roadmap`, `خارطة طريق ${tv(g.role)}`)}</span>
        <span className="tnum rounded-full bg-panel-2 px-2.5 py-0.5 text-xs font-medium text-ink-2">{t(`${done} of ${all.length} done`, `أنجزت ${done} من ${all.length}`)}</span>
        <span className="text-xs text-ink-3">{t(`From ${fmtInt(g.denominator)} postings that list skills`, `من ${fmtInt(g.denominator)} إعلانًا تذكر مهارات`)}</span>
      </p>
      <ol className="ms-2 space-y-8 border-s-2 border-line ps-6">
        {g.stages.filter((st) => st.skills.length > 0).map((st) => {
          const { title, rule } = STAGES[st.key]();
          const complete = st.skills.every(owned);
          return (
            <li key={st.key} className="relative">
              <span aria-hidden className={clsx("absolute -start-[31px] top-1.5 size-3 rounded-full ring-4 ring-bg", complete ? "bg-good" : "bg-warn-fill")} />
              <h2 id={`stage-${st.key}`} className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
              <p className="mt-0.5 text-xs text-ink-3">{rule}</p>
              <ul aria-labelledby={`stage-${st.key}`} className="mt-3 grid gap-2 sm:grid-cols-2">
                {st.skills.map((s) => <Chip key={s.skill} s={s} role={g.role} have={owned(s)} />)}
              </ul>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-ink-3">{t("Learning these raises your overlap with these postings; it does not guarantee interviews or a job.", "تعلّم هذه المهارات يزيد تداخلك مع هذه الإعلانات، لكنه لا يضمن مقابلات أو وظيفة.")}</p>
      {links.length > 0 && (
        <section aria-labelledby="learn-h" className="rounded-xl border border-line bg-panel p-5">
          <h2 id="learn-h" className="text-[0.9375rem] font-semibold text-ink">{t("Where to learn", "أين تتعلم")}</h2>
          <p className="mt-0.5 text-xs text-ink-3">{t("roadmap.sh is a separate site with community learning paths. It opens in a new tab.", "roadmap.sh موقع منفصل فيه مسارات تعلّم مجتمعية. يفتح في علامة تبويب جديدة.")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-accent-ink no-underline hover:bg-accent-soft">
                  {t(`${l.label} roadmap on roadmap.sh`, `خارطة ${l.label} على roadmap.sh`)} <ExternalLink size={13} aria-hidden className="rtl:-scale-x-100" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {g.provenance === "all" && (
        <Callout tone="info">{t("Rankings include skills the team added after collection (marked “mostly team-added” when they dominate). To count only what postings wrote, choose “Written in posting” in the filter bar on the Jobs or Market pages.",
          "تشمل الترتيبات مهارات أضافها الفريق بعد الجمع (وتُميَّز بعبارة «أضافها الفريق غالبًا» حين تغلب). لاحتساب ما كتبته الإعلانات فقط، اختر «مذكورة في الإعلان» في شريط التصفية بصفحات الوظائف أو السوق.")}</Callout>
      )}
    </div>
  );
}

function Chip({ s, role, have }: { s: RoadmapSkill; role: string; have: boolean }) {
  const { filters } = useFilters();
  const { addSkill, removeSkill } = useProfile();
  const addedShare = s.postings ? s.added / s.postings : 0;
  const markets = (s.markets ?? []).map(tv).join(t(", ", "، "));
  return (
    <li className={clsx("flex min-h-11 items-center gap-2 rounded-lg border px-2 py-1.5", have ? "border-good/40 bg-good-soft" : "border-line bg-panel")}>
      <button type="button" onClick={() => (have ? removeSkill(s.skill) : addSkill(s.skill))}
        aria-label={have ? t(`Remove ${s.skill}`, `إزالة ${s.skill}`) : t(`I have ${s.skill}`, `لدي ${s.skill}`)}
        className={clsx("grid size-7 shrink-0 place-items-center rounded-md", have ? "text-good hover:bg-panel/70" : "text-ink-3 hover:bg-panel-2 hover:text-ink")}>
        {have ? <Check size={15} /> : <Plus size={15} />}
      </button>
      <span className="min-w-0 flex-1">
        <Link to={drillHref("/skills", filters, { role }, { view: s.skill })} className={clsx("block truncate font-medium no-underline hover:underline", have ? "text-good" : "text-ink")}>{s.skill}</Link>
        {addedShare > 0.5 && <span className="block text-xs text-ink-3" title={t(`${fmtPct(addedShare, 0)} of these mentions were added by the team`, `${fmtPct(addedShare, 0)} من هذه الإشارات أضافها الفريق`)}>{t("mostly team-added", "أضافها الفريق غالبًا")}</span>}
      </span>
      {s.premium != null ? (
        <span className="tnum shrink-0 text-xs font-medium text-ink-2" title={t(`Compared within: ${markets} · ${fmtInt(s.salary_n ?? 0)} salaries`, `مقارنة داخل: ${markets} · ${fmtInt(s.salary_n ?? 0)} راتبًا`)}>
          {t(`+${fmtPct(s.premium, 0)} pay`, `+${fmtPct(s.premium, 0)} أجر`)}
        </span>
      ) : <span className="tnum shrink-0 text-xs text-ink-2">{fmtPct(s.share, 0)}</span>}
    </li>
  );
}
