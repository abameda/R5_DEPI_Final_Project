import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { Command } from "cmdk";
import { Check, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Callout, Empty, Guard, InfoTip, PageHeader, Panel, Pill, Segmented, Select, TextLink } from "../components/ui";
import { useApi } from "../lib/api";
import { drillHref } from "../lib/filters";
import { fmtDate, fmtInt, fmtPct } from "../lib/format";
import { useFilters, useLabels, useMeta, useParam } from "../lib/hooks";
import type { SkillRow } from "../lib/types";

interface Gap {
  role: string; denominator: number; have: string[]; min_group: number; provenance: string;
  status: "ok" | "too_few_postings";
  skills: (SkillRow & { have: boolean; wilson_lower: number })[];
  priorities: (SkillRow & { have: boolean; wilson_lower: number })[];
  alignment: { score: number; top_k: number; matched_top: string[] } | null;
  posting_match?: { postings: number; full_match: number; half_match: number; any_match: number } | null;
  related_roles: { role: string; similarity: number; postings_with_skills: number; alignment: number | null; top_skills: string[] }[];
  postings: { job_id: string; title: string; company: string | null; country: string | null; market_type: string; posted_date: string | null; url: string | null; matched: number; listed: number; missing: string[] | null }[];
}

export default function Career() {
  const { filters, set } = useFilters();
  const { data: meta } = useMeta();
  const labels = useLabels();
  const [params, setParams] = useSearchParams();
  const have = params.getAll("have");
  const roles = meta?.dimensions.role_category.map((r) => r.value).filter((r) => r !== "Other / Unclassified") ?? [];
  const [role, setRole] = useParam("target", "");
  const target = role || roles[0] || "";
  const q = useApi<Gap>("/career/gap", { ...filters, role: [] }, { target_role: target, have }, !!target);

  const setHave = (next: string[]) => setParams((prev) => {
    const sp = new URLSearchParams(prev);
    sp.delete("have");
    [...new Set(next)].forEach((s) => sp.append("have", s));
    return sp;
  }, { replace: true });

  return (
    <>
      <PageHeader title="Career planner"
        description="Pick a target role and market, add the skills you already have, and see which commonly requested skills to learn next — ranked from the postings themselves." />
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title="Your plan" className="h-fit lg:sticky lg:top-[calc(var(--filters-h,0px)+1rem)]">
          <div className="space-y-4">
            <Select label="Target role" value={target} onChange={setRole} options={roles.map((r) => ({ value: r, label: r }))} className="w-full justify-between" />
            <div>
              <p className="mb-1.5 text-sm text-ink-2">Market</p>
              <Segmented label="Market" value={filters.market.length === 1 ? filters.market[0] : "any"}
                onChange={(v) => set("market", v === "any" ? [] : [v])}
                options={[{ value: "any", label: "Any" }, { value: "Arab", label: "Arab" }, { value: "International", label: "Int’l" }, { value: "Remote", label: "Remote" }]} />
              {[filters.country, filters.region, filters.seniority, filters.job_type, filters.work_mode, filters.source, filters.cohort, filters.company, filters.skill].some((x) => x.length > 0) || filters.q ? (
                <p className="mt-1.5 text-xs text-ink-3">Also using filter-bar selections: {[...filters.country, ...filters.region, ...filters.seniority, ...filters.job_type, ...filters.work_mode, ...filters.source.map(labels.source), ...filters.cohort.map(labels.cohort), ...filters.company, ...filters.skill.map((s) => `lists ${s}`), ...(filters.q ? [`“${filters.q}”`] : [])].join(", ")}</p>
              ) : null}
              {filters.role.length > 0 && <p className="mt-1 text-xs text-ink-3">The Role filter is replaced by the target role above.</p>}
            </div>
            <div>
              <p className="mb-1.5 text-sm text-ink-2">Skills you have ({have.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {have.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-md bg-accent-soft py-0.5 pl-2 pr-1 text-sm text-accent-ink">
                    {s}
                    <button type="button" aria-label={`Remove ${s}`} onClick={() => setHave(have.filter((h) => h !== s))} className="grid size-5 place-items-center rounded hover:bg-panel"><X size={12} /></button>
                  </span>
                ))}
                <SkillPicker selected={have} onAdd={(s) => setHave([...have, s])} suggestions={q.data?.skills.slice(0, 12).map((s) => s.skill) ?? []} />
              </div>
              {have.length > 0 && <button type="button" onClick={() => setHave([])} className="mt-2 text-xs font-medium text-accent-ink hover:underline">Clear my skills</button>}
            </div>
            <p className="border-t border-line pt-3 text-xs text-ink-3">
              The analysis counts {filters.provenance === "observed" ? "only skills written in the postings" : "skills written in postings and skills the team added"}.
              Switch with “Written in posting” in the filter bar.
            </p>
          </div>
        </Panel>

        <div className="min-w-0 space-y-4">
          <Guard q={q} h={420}>
            {(g) => g.status === "too_few_postings" ? (
              <Empty title={`Only ${fmtInt(g.denominator)} ${g.role} postings list skills here`}
                hint={`At least ${g.min_group} are needed for a reliable ranking. Choose “Any” market, remove a country or seniority filter, or pick a broader role.`} />
            ) : <Results g={g} />}
          </Guard>
        </div>
      </div>
    </>
  );
}

function Results({ g }: { g: Gap }) {
  const { filters } = useFilters();
  const [, setTarget] = useParam("target", "");
  const a = g.alignment!;
  const m = g.posting_match;
  return (<>
    <section className="grid gap-4 md:grid-cols-2" aria-label="Your alignment">
      <div className="rounded-lg border border-line bg-panel p-4">
        <h2 className="flex items-center gap-1.5 text-base font-semibold">Skill alignment <InfoTip>
          Of the {a.top_k} skills most often requested for this role, each counts by how often it is requested.
          Alignment = sum of the shares of the ones you have ÷ sum of all {a.top_k} shares. It describes overlap with this sample of postings;
          it is not a probability of being hired and has not been validated against hiring outcomes.
        </InfoTip></h2>
        <p className="mt-2"><span className="kpi text-3xl font-semibold text-ink">{fmtPct(a.score, 0)}</span>
          <span className="ml-2 text-ink-2">of the demand weight of the top {a.top_k} skills</span></p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel-2" role="img" aria-label={`Alignment ${fmtPct(a.score, 0)}`}>
          <div className="h-full rounded-full bg-s3" style={{ width: `${a.score * 100}%` }} />
        </div>
        <p className="mt-2 text-sm text-ink-2">{a.matched_top.length ? <>You have {a.matched_top.join(", ")}.</> : "Add skills on the left to see your alignment."}</p>
      </div>
      <div className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-base font-semibold">Postings you already match</h2>
        {m ? (
          <dl className="mt-2 grid grid-cols-3 gap-3">
            {[["All listed skills", m.full_match], ["At least half", m.half_match], ["At least one", m.any_match]].map(([k, v]) => (
              <div key={k as string}><dt className="text-xs text-ink-3">{k}</dt><dd className="m-0"><span className="kpi text-xl font-semibold">{fmtPct((v as number) / m.postings, 0)}</span>
                <span className="block text-xs text-ink-3">{fmtInt(v as number)} of {fmtInt(m.postings)}</span></dd></div>
            ))}
          </dl>
        ) : <p className="mt-2 text-sm text-ink-3">Add your skills to compare them with each posting’s list.</p>}
        <p className="mt-2 text-xs text-ink-3">Based on {fmtInt(g.denominator)} {g.role} postings that list skills.</p>
      </div>
    </section>

    <Panel title="What to learn next" meta="Missing skills, most requested first"
      info="Ranked by the share of this role's postings (with skill data) that list the skill. “At least X%” is the lower bound of the 95% Wilson interval: with the role's sample size, the true share in comparable postings is very likely above it.">
      {g.priorities.length === 0 ? <p className="text-sm text-ink-2">You already have every skill in the top 40 for this role.</p> : (
        <ol className="divide-y divide-line">
          {g.priorities.map((s, i) => {
            const addedShare = s.postings ? s.added / s.postings : 0;
            return (
              <li key={s.skill} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5">
                <span className="tnum row-span-2 text-ink-3">{i + 1}</span>
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-ink">{s.skill}</span>
                  <span className="text-xs text-ink-3">{s.category}</span>
                  {addedShare > 0.5 && <Pill tone="added" title={`${fmtPct(addedShare, 0)} of these mentions were added by the team, not written in postings`}>mostly team-added</Pill>}
                </span>
                <TextLink to={drillHref("/explorer", filters, { role: g.role, skill: s.skill })}>Postings</TextLink>
                <span className="col-span-2 flex items-center gap-3">
                  <span className="h-1.5 max-w-80 flex-1 overflow-hidden rounded-full bg-panel-2"><span className="block h-full bg-s3" style={{ width: `${(s.share ?? 0) * 100}%` }} /></span>
                  <span className="tnum text-sm text-ink">{fmtPct(s.share, 0)}</span>
                  <span className="text-xs text-ink-3">of postings ({fmtInt(s.postings)}) · at least {fmtPct(s.wilson_lower, 0)} with 95% confidence</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 text-xs text-ink-3">Learning a skill raises your overlap with these postings; it does not guarantee interviews or employment.</p>
    </Panel>

    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="All requested skills for this role" meta={`Top ${g.skills.length} by share of ${fmtInt(g.denominator)} postings`}>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {g.skills.map((s) => (
            <li key={s.skill} className="flex items-center justify-between gap-2 border-b border-line py-1.5 text-sm">
              <span className={clsx("flex items-center gap-1.5", s.have ? "font-medium text-ink" : "text-ink-2")}>
                {s.have ? <Check size={14} className="text-good" aria-label="you have it" /> : <span className="size-3.5" aria-hidden />}{s.skill}
              </span>
              <span className="tnum text-ink-3">{fmtPct(s.share, 0)}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Adjacent roles" meta="Roles whose skill profile is closest to this one (cosine similarity of skill shares)"
        info="Each role is a vector of the shares of the 60 most requested skills. Similarity 1 = identical skill mix. Your alignment with each role uses the same formula as above.">
        {g.related_roles.length === 0 ? <p className="text-sm text-ink-3">No other role has enough postings in this selection.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-ink-3"><tr><th scope="col" className="py-1.5 font-medium">Role</th><th scope="col" className="py-1.5 text-right font-medium">Similarity</th><th scope="col" className="py-1.5 text-right font-medium">Your alignment</th></tr></thead>
            <tbody>
              {g.related_roles.map((r) => (
                <tr key={r.role} className="border-t border-line">
                  <td className="py-1.5"><button type="button" className="text-left font-medium text-ink hover:underline" onClick={() => setTarget(r.role)}>{r.role}</button>
                    <span className="block text-xs text-ink-3">{r.top_skills.join(" · ")}</span></td>
                  <td className="tnum py-1.5 text-right">{r.similarity.toFixed(2)}</td>
                  <td className="tnum py-1.5 text-right">{fmtPct(r.alignment, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>

    <Panel title="Closest-matching postings" meta="Postings in this role and market ranked by the share of their listed skills you have, newest first"
      actions={<TextLink to={drillHref("/explorer", filters, { role: g.role })}>All {g.role} postings</TextLink>}>
      <ul className="divide-y divide-line">
        {g.postings.map((p) => (
          <li key={p.job_id} className="flex flex-wrap items-start justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <TextLink to={`/explorer?job=${encodeURIComponent(p.job_id)}`}><bdi>{p.title}</bdi></TextLink>
              <p className="text-ink-2"><bdi>{p.company ?? "Employer not given"}</bdi> · <bdi>{p.country ?? "No single country"}</bdi> · {fmtDate(p.posted_date)}</p>
              {p.missing && p.missing.length > 0 && <p className="text-xs text-ink-3">Missing: {p.missing.slice(0, 8).join(", ")}{p.missing.length > 8 ? "…" : ""}</p>}
            </div>
            <Pill tone={p.matched === p.listed ? "good" : "neutral"}>{p.matched}/{p.listed} skills</Pill>
          </li>
        ))}
      </ul>
    </Panel>
    {g.provenance === "all" && (
      <Callout tone="info">Rankings include skills the team added after collection (marked “mostly team-added” when they dominate). For the strictest view, choose “Written in posting” in the filter bar.</Callout>
    )}
  </>);
}

function SkillPicker({ selected, onAdd, suggestions }: { selected: string[]; onAdd: (s: string) => void; suggestions: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [deb, setDeb] = useState("");
  useEffect(() => { const t = setTimeout(() => setDeb(q), 200); return () => clearTimeout(t); }, [q]);
  const res = useApi<{ skill: string; postings: number }[]>("/skills/search", null, { q: deb, limit: 20 }, open && deb.length > 0);
  const options = deb ? (res.data ?? []).map((r) => r.skill) : suggestions;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="inline-flex h-7 items-center gap-1 rounded-md border border-line-strong bg-panel px-2 text-sm font-medium text-ink hover:bg-panel-2">
        <Plus size={14} /> Add skill
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} className="z-50 w-64 rounded-lg border border-line-strong bg-panel shadow-panel">
          <Command shouldFilter={false} label="Add a skill">
            <div className="border-b border-line p-2">
              <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Type a skill"
                className="h-8 w-full rounded-md bg-panel-2 px-2 text-sm placeholder:text-ink-3 focus:outline-none" />
            </div>
            <Command.List className="max-h-64 overflow-auto p-1">
              {!deb && <p className="px-2 py-1 text-xs text-ink-3">Most requested for this role</p>}
              <Command.Empty className="p-3 text-sm text-ink-3">{res.isFetching ? "Searching…" : "No match."}</Command.Empty>
              {options.filter((o) => !selected.includes(o)).map((o) => (
                <Command.Item key={o} value={o} onSelect={() => { onAdd(o); setQ(""); }}
                  className="cursor-pointer rounded px-2 py-1.5 text-sm data-[selected=true]:bg-panel-2">{o}</Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
