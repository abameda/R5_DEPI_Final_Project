import clsx from "clsx";
import { ArrowRight, Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CoverageStrip } from "../components/Coverage";
import { SkillPicker } from "../components/SkillPicker";
import { Advanced, Skeleton, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { fmtCompact, fmtDate, fmtInt, fmtPct, fmtUsdFull } from "../lib/format";
import { useMeta } from "../lib/hooks";
import { t, tv } from "../lib/i18n";
import { haveSet, useProfile } from "../lib/profile";
import type { CareerGap, JobPage, Overview } from "../lib/types";

export default function Home() {
  const { data: meta } = useMeta();
  const { profile, setRole, addSkill, removeSkill } = useProfile();
  const roles = meta?.dimensions.role_category.filter((r) => r.value !== "Other / Unclassified") ?? [];
  const role = profile.role || roles[0]?.value || "";
  const ov = useApi<Overview>("/overview", null);
  const gap = useApi<CareerGap>("/career/gap", null, { target_role: role, have: profile.skills }, !!role);
  const k = ov.data?.kpis;

  return (
    <div className="space-y-10 lg:space-y-14">
      <section className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:gap-12">
        <div className="max-w-2xl pt-1 xl:pt-4">
          <h1 className="text-[2rem] leading-[2.375rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.75rem] sm:leading-[3.125rem]">
            {t("Understand the job market. See where you fit. Know what comes next.", "افهم سوق العمل. اعرف موقعك. واعرف خطوتك التالية.")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-ink-2">
            {k ? t(`Search ${fmtInt(k.postings)} tech job postings from ${fmtInt(k.countries)} countries, compare them with your skills, and see which skills each role asks for most.`,
              `ابحث في ${fmtInt(k.postings)} إعلان وظيفة تقنية من ${fmtInt(k.countries)} دولة، وقارنها بمهاراتك، واعرف المهارات التي يطلبها كل دور أكثر من غيرها.`)
              : t("Search tech job postings, compare them with your skills, and see which skills each role asks for most.", "ابحث في إعلانات الوظائف التقنية، وقارنها بمهاراتك، واعرف المهارات التي يطلبها كل دور أكثر من غيرها.")}
          </p>
          <HeroSearch />

          <div className="mt-8 border-t border-line pt-6">
            <h2 className="text-sm font-semibold text-ink">{t("Tell us where you are", "أخبرنا أين أنت الآن")}</h2>
            <p className="mt-0.5 text-sm text-ink-3">{t("Saved in this browser only. Every page uses it to show your match.", "تُحفظ في هذا المتصفح فقط، وتستخدمها كل الصفحات لعرض مدى توافقك.")}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-2">{t("Role you want", "الدور الذي تريده")}</span>
                <select value={role} onChange={(e) => setRole(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line-strong bg-panel px-3 text-sm text-ink">
                  {roles.map((r) => <option key={r.value} value={r.value}>{tv(r.value)}</option>)}
                </select>
              </label>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-ink-2">{t("Skills you have", "مهاراتك")}</span>
                <div className="flex min-h-10 flex-wrap items-center gap-1.5">
                  {profile.skills.map((s) => (
                    <span key={s} className="inline-flex h-8 items-center gap-1 rounded-lg bg-good-soft ps-2.5 pe-1 text-sm font-medium text-good">
                      {s}
                      <button type="button" aria-label={t(`Remove ${s}`, `إزالة ${s}`)} onClick={() => removeSkill(s)}
                        className="grid size-6 place-items-center rounded-md hover:bg-panel/70"><X size={13} /></button>
                    </span>
                  ))}
                  <SkillPicker selected={profile.skills} onAdd={addSkill}
                    suggestions={gap.data?.skills.slice(0, 12).map((s) => s.skill) ?? []}
                    suggestionsTitle={t(`Most requested for ${tv(role)}`, `الأكثر طلبًا لدور ${tv(role)}`)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <MatchPreview role={role} gap={gap.data} loading={gap.isLoading} />
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:gap-12">
        <NewestJobs role={role} weights={new Map(gap.data?.skills.map((s) => [s.skill, s.share]) ?? [])} />
        <div className="space-y-8">
          <InDemand ov={ov.data} />
          <Advanced><Markets ov={ov.data} /></Advanced>
        </div>
      </section>

      <Advanced>{ov.data && (() => {
        const kaggle = ov.data.cohorts.find((c) => c.key === "kaggle_2023")?.share ?? 0;
        return (
          <p className="max-w-3xl border-t border-line pt-6 text-sm leading-6 text-ink-3">
            {t(`About this data: ${fmtInt(ov.data.kpis.postings)} unique postings after removing duplicates across 8 sources. ${fmtPct(kaggle, 0)} come from a 2023 archive of data jobs, so data roles and data skills lead most rankings. Figures describe this collected sample, not the whole job market.`,
              `عن هذه البيانات: ${fmtInt(ov.data.kpis.postings)} إعلانًا فريدًا بعد إزالة التكرار بين 8 مصادر. ${fmtPct(kaggle, 0)} منها من أرشيف وظائف البيانات لعام 2023، لذا تتصدر وظائف البيانات ومهاراتها معظم الترتيبات. الأرقام تصف هذه العينة المجمَّعة، لا سوق العمل بأكمله.`)}{" "}
            <TextLink to="/quality">{t("How the data was built", "كيف بُنيت البيانات")}</TextLink>
          </p>
        );
      })()}</Advanced>
    </div>
  );
}

function HeroSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/explorer?q=${encodeURIComponent(q.trim())}` : "/explorer");
  };
  return (
    <form role="search" onSubmit={submit} className="mt-7 flex max-w-xl gap-2">
      <label className="relative flex min-w-0 flex-1 items-center">
        <Search size={18} className="pointer-events-none absolute start-3.5 text-ink-3" />
        <span className="sr-only">{t("Job title or employer", "المسمى الوظيفي أو جهة التوظيف")}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} type="search" dir="auto" maxLength={120}
          placeholder={t("Job title or employer, e.g. data analyst", "المسمى أو جهة التوظيف، مثل محلل بيانات")}
          className="h-12 w-full rounded-xl border border-line-strong bg-panel ps-11 pe-3 text-[0.9375rem] shadow-[0_1px_2px_rgba(14,21,37,0.05)] placeholder:text-ink-3 focus:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15" />
      </label>
      <button type="submit" className="h-12 shrink-0 rounded-xl bg-accent px-5 text-[0.9375rem] font-medium text-white hover:bg-accent-ink dark:text-[#0b0f17]">
        {t("Find jobs", "ابحث")}
      </button>
    </form>
  );
}

/** The one navy surface on the page: the visitor's role, read through the coverage strip. */
function MatchPreview({ role, gap, loading }: { role: string; gap?: CareerGap; loading: boolean }) {
  const { profile, addSkill } = useProfile();
  const top = gap?.skills.slice(0, 15) ?? [];
  const missing = gap?.priorities.slice(0, 3) ?? [];
  const a = gap?.alignment;
  return (
    <section aria-label={t("Your match preview", "معاينة توافقك")} className="rounded-2xl bg-rail p-6 text-rail-ink sm:p-8">
      <h2 className="text-xl font-semibold tracking-[-0.01em]">{tv(role)}</h2>
      {loading || !gap ? <div className="mt-6 space-y-3 opacity-30"><Skeleton h={36} /><Skeleton h={80} /></div>
        : gap.status !== "ok" ? <p className="mt-4 text-sm text-rail-ink-2">{t("Too few postings list skills for this role to rank them.", "عدد الإعلانات التي تذكر مهارات لهذا الدور قليل جدًا لترتيبها.")}</p>
        : (<>
          {profile.skills.length ? (
            <p className="mt-3 max-w-lg text-xl leading-8 font-semibold tracking-[-0.015em]">
              {t(`You have ${top.filter((s) => s.have).length} of the ${top.length} skills it asks for most, about ${fmtPct(a?.score ?? 0, 0)} of the demand.`,
                `لديك ${top.filter((s) => s.have).length} من أكثر ${top.length} مهارة يطلبها، أي نحو ${fmtPct(a?.score ?? 0, 0)} من الطلب.`)}
            </p>
          ) : (
            <p className="mt-4 max-w-md text-[0.9375rem] leading-6 text-rail-ink-2">
              {t(`These are the ${a?.top_k} skills this role asks for most. Click the ones you have, or use “Add skill”, to see your match.`,
                `هذه أكثر ${a?.top_k} مهارة يطلبها هذا الدور. انقر على ما لديك منها، أو استخدم «إضافة مهارة»، لترى مدى توافقك.`)}
            </p>
          )}
          <div className="mt-6 rounded-xl bg-panel p-4 text-ink">
            <CoverageStrip label={t(`Top ${top.length} skills in ${tv(role)} postings`, `أهم ${top.length} مهارة في إعلانات ${tv(role)}`)}
              context={t(`${tv(role)} postings`, `إعلانات ${tv(role)}`)}
              items={top.map((s) => ({ skill: s.skill, weight: s.share, have: s.have, added: s.added > s.observed }))}
              onSelect={(s) => !profile.skills.includes(s) && addSkill(s)} />
          </div>
          {missing.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium">{t("Learn next", "تعلّم بعد ذلك")}</p>
              <ol className="mt-2 divide-y divide-rail-line">
                {missing.map((s) => (
                  <li key={s.skill} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-medium">{s.skill}</span>
                    <span className="tnum text-rail-ink-2">{t(`in ${fmtPct(s.share, 0)} of postings`, `في ${fmtPct(s.share, 0)} من الإعلانات`)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-rail-line pt-5">
            <Advanced><span className="text-xs text-rail-ink-2">{t(`Based on ${fmtInt(gap.denominator)} postings that list skills`, `استنادًا إلى ${fmtInt(gap.denominator)} إعلانًا تذكر مهارات`)}</span></Advanced>
            <Link to="/career" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-panel px-3.5 text-sm font-medium text-ink no-underline hover:bg-panel-2">
              {t("Open your plan", "افتح خطتك")} <ArrowRight size={15} className="rtl:rotate-180" />
            </Link>
          </div>
        </>)}
    </section>
  );
}

function NewestJobs({ role, weights }: { role: string; weights: Map<string, number | null> }) {
  const { profile } = useProfile();
  const has = haveSet(profile.skills);
  const q = useApi<JobPage>("/jobs", { role: [role] }, { page: 1, page_size: 6, sort: "newest" }, !!role);
  return (
    <section aria-labelledby="newest-h">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="newest-h" className="text-lg font-semibold tracking-[-0.01em] text-ink">{t(`Newest ${tv(role)} jobs`, `أحدث وظائف ${tv(role)}`)}</h2>
        <TextLink to={`/explorer?role=${encodeURIComponent(role)}`}>{q.data ? t(`All ${fmtInt(q.data.total)}`, `الكل (${fmtInt(q.data.total)})`) : t("All jobs", "كل الوظائف")}</TextLink>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        {!q.data ? <div className="p-4"><Skeleton h={300} /></div> : (
          <ul className="divide-y divide-line">
            {q.data.rows.map((j) => {
              const listed = j.skill_list.length;
              const matched = j.skill_list.filter((s) => has(s.skill)).length;
              return (
                <li key={j.job_id}>
                  <Link to={`/explorer?role=${encodeURIComponent(role)}&job=${encodeURIComponent(j.job_id)}`}
                    className="grid gap-x-6 gap-y-1 px-5 py-4 text-ink no-underline transition-colors hover:bg-panel-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
                    <span className="min-w-0">
                      <span className="block truncate font-medium" dir="auto">{j.title}</span>
                      <span className="block truncate text-sm text-ink-2"><bdi>{j.company ?? t("Employer not given", "جهة التوظيف غير مذكورة")}</bdi> · <bdi>{j.country ? tv(j.country) : t("No single country", "بلا دولة محددة")}</bdi> · {fmtDate(j.posted_date)}</span>
                    </span>
                    <span className="flex flex-col justify-center gap-1.5 sm:items-end">
                      {profile.skills.length > 0 && listed > 0 ? (<>
                        <span className="tnum text-xs text-ink-2">{t(`${matched} of ${listed} skills`, `${matched} من ${listed} مهارات`)}</span>
                        <CoverageStrip size="sm" label={t(`You have ${matched} of ${listed} listed skills`, `لديك ${matched} من ${listed} مهارات مذكورة`)}
                          items={j.skill_list.map((s) => ({ skill: s.skill, weight: weights.get(s.skill) ?? null, have: has(s.skill) }))} />
                      </>) : <span className={clsx("tnum text-sm", j.salary_kind === "advertised" ? "text-ink" : "text-ink-3")}>
                        {j.salary_kind === "advertised" ? fmtUsdFull(j.salary_usd_annual) : listed ? t(`${listed} skills listed`, `${listed} مهارات مذكورة`) : t("No skills listed", "لا مهارات مذكورة")}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function InDemand({ ov }: { ov?: Overview }) {
  const rows = ov?.top_skills.rows.slice(0, 8) ?? [];
  const max = Math.max(0.0001, ...rows.map((r) => r.share ?? 0));
  const { profile } = useProfile();
  const has = haveSet(profile.skills);
  return (
    <section aria-labelledby="demand-h">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="demand-h" className="text-lg font-semibold tracking-[-0.01em] text-ink">{t("Skills in demand", "المهارات المطلوبة")}</h2>
        <TextLink to="/skills">{t("All skills", "كل المهارات")}</TextLink>
      </div>
      {!ov ? <Skeleton h={240} /> : (<>
        <ol className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.skill} className="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
              <span className={clsx("truncate", has(r.skill) ? "font-medium text-good" : "text-ink")}>{r.skill}</span>
              <span className="h-2 overflow-hidden rounded-full bg-panel-2">
                <span className={clsx("block h-full rounded-full", has(r.skill) ? "bg-good-fill" : "bg-accent")} style={{ width: `${((r.share ?? 0) / max) * 100}%` }} />
              </span>
              <span className="tnum text-end text-ink-2">{fmtPct(r.share, 0)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-ink-3">{t(`Share of ${fmtInt(ov.top_skills.denominator)} postings that list skills.`, `النسبة من ${fmtInt(ov.top_skills.denominator)} إعلانًا تذكر مهارات.`)}{profile.skills.length > 0 && t(" Teal = you have it.", " الأخضر = لديك.")}</p>
      </>)}
    </section>
  );
}

function Markets({ ov }: { ov?: Overview }) {
  if (!ov) return <Skeleton h={120} />;
  const order = ["International", "Remote", "Arab"];
  const rows = [...ov.markets].filter((m) => order.includes(m.key)).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  const total = rows.reduce((a, r) => a + r.n, 0) || 1;
  // market kinds are categories, not "have"/"gap": blue, violet and slate, never teal or amber
  const tone = ["bg-accent", "bg-s4", "bg-s6"];
  return (
    <section aria-labelledby="where-h">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="where-h" className="text-lg font-semibold tracking-[-0.01em] text-ink">{t("Where the postings are", "أين الإعلانات")}</h2>
        <TextLink to="/geography">{t("Locations", "المواقع")}</TextLink>
      </div>
      <div className="flex h-3 gap-[3px] overflow-hidden rounded-full" role="img"
        aria-label={rows.map((r) => `${tv(r.key)} ${fmtPct(r.share, 0)}`).join(", ")}>
        {rows.map((r, i) => <span key={r.key} className={tone[i]} style={{ flexGrow: r.n / total, flexBasis: 0, minWidth: 4 }} />)}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-3 text-sm">
        {rows.map((r, i) => (
          <li key={r.key}>
            <Link to={`/explorer?market=${encodeURIComponent(r.key)}`} className="block rounded-lg text-ink no-underline hover:underline">
              <span className="flex items-center gap-1.5 text-ink-2"><span className={clsx("size-2 rounded-full", tone[i])} aria-hidden />{tv(r.key)}</span>
              <span className="tnum mt-0.5 block font-semibold">{fmtCompact(r.n)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-3">{t("Arab = located in an Arab League country. Remote = marked remote or from a remote-jobs board.", "عربي = في دولة من الجامعة العربية. عن بُعد = موسوم بذلك أو من موقع وظائف عن بُعد.")}</p>
    </section>
  );
}
