import { ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Guard, PageHeader, Pill } from "../components/ui";
import { useApi } from "../lib/api";
import { filterParams } from "../lib/filters";
import { fmtInt } from "../lib/format";
import { useFilters } from "../lib/hooks";
import type { Insight } from "../lib/types";

const KIND: Record<string, string> = { skills: "Skills", roles: "Roles", market: "Market", salary: "Salary", geography: "Geography", provenance: "Data provenance" };

export default function Insights() {
  const { filters } = useFilters();
  const q = useApi<Insight[]>("/insights", filters);
  const base = filterParams(filters);
  return (
    <>
      <PageHeader title="Guided insights"
        description="Plain-language findings computed for your current filters. Each sentence is generated from a database query — no language model writes the numbers — and shows its population." />
      <Guard q={q} h={420} empty={(d) => !d.length}>
        {(items) => (
          <ol className="grid gap-3">
            {items.map((i) => {
              const sp = new URLSearchParams(base);
              for (const [k, v] of Object.entries(i.drill.params)) sp.append(k, v);
              const to = i.drill.path === "/skills" && i.drill.params.skill
                ? `/skills?${new URLSearchParams([...base, ["view", i.drill.params.skill]]).toString()}`
                : `${i.drill.path}${sp.toString() ? `?${sp}` : ""}`;
              return (
                <li key={i.id} className="rounded-lg border border-line bg-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="max-w-3xl text-lg text-ink">{i.text}</p>
                    <Pill>{KIND[i.kind] ?? i.kind}</Pill>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
                    <span className="inline-flex items-center gap-1"><Info size={12} /> n = {fmtInt(i.n)}{i.denominator !== i.n && <> of {fmtInt(i.denominator)}</>}</span>
                    <span>Filters: {Object.keys(i.filters).length ? Object.entries(i.filters).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("|") : v}`).join(", ") : "none"}</span>
                    <span>Skills counted: {i.provenance === "observed" ? "written in posting" : "including team-added"}</span>
                    <Link to={to} className="ml-auto inline-flex items-center gap-1 font-medium text-accent-ink hover:underline">Investigate <ArrowRight size={13} /></Link>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Guard>
    </>
  );
}
