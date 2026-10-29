import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { Command } from "cmdk";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useApi } from "../lib/api";
import { fmtCompact } from "../lib/format";
import { t, tv } from "../lib/i18n";

/** Search the skill catalogue (server side) and add one; suggestions show before typing. */
export function SkillPicker({ selected, onAdd, suggestions = [], label = t("Add skill", "إضافة مهارة"), suggestionsTitle, className }: {
  selected: string[]; onAdd: (s: string) => void; suggestions?: string[]; label?: string; suggestionsTitle?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [deb, setDeb] = useState("");
  useEffect(() => { const id = setTimeout(() => setDeb(q.trim()), 200); return () => clearTimeout(id); }, [q]);
  const res = useApi<{ skill: string; postings: number; category: string }[]>("/skills/search", null, { q: deb, limit: 20 }, open && deb.length > 0);
  const lower = new Set(selected.map((s) => s.toLowerCase()));
  const options = deb
    ? (res.data ?? []).map((r) => ({ skill: r.skill, note: `${tv(r.category)} · ${fmtCompact(r.postings)}` }))
    : suggestions.map((s) => ({ skill: s, note: "" }));
  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <Popover.Trigger className={clsx("inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-line-strong px-2.5 text-sm font-medium text-ink-2 hover:border-accent hover:text-accent-ink", className)}>
        <Plus size={14} /> {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} className="z-50 w-72 rounded-xl border border-line bg-panel shadow-panel">
          <Command shouldFilter={false} label={t("Add a skill", "إضافة مهارة")}>
            <div className="border-b border-line p-2">
              <Command.Input autoFocus value={q} onValueChange={setQ} placeholder={t("Type a skill, e.g. Python", "اكتب مهارة، مثل Python")} dir="auto"
                className="h-9 w-full rounded-lg bg-panel-2 px-2.5 text-sm placeholder:text-ink-3 focus:outline-none" />
            </div>
            <Command.List className="max-h-72 overflow-auto p-1">
              {!deb && options.length > 0 && <p className="px-2 pt-1 pb-1.5 text-xs text-ink-3">{suggestionsTitle ?? t("Often requested", "مطلوبة كثيرًا")}</p>}
              {!deb && !options.length && <p className="px-2 py-2 text-sm text-ink-3">{t("Start typing to search 1,475 skills.", "ابدأ الكتابة للبحث في 1,475 مهارة.")}</p>}
              {deb && <Command.Empty className="p-3 text-sm text-ink-3">{res.isFetching ? t("Searching…", "جارٍ البحث…") : t("No skill matches that.", "لا توجد مهارة مطابقة.")}</Command.Empty>}
              {options.filter((o) => !lower.has(o.skill.toLowerCase())).map((o) => (
                <Command.Item key={o.skill} value={o.skill} onSelect={() => { onAdd(o.skill); setQ(""); }}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm data-[selected=true]:bg-panel-2">
                  <span className="truncate">{o.skill}</span>
                  {o.note && <span className="shrink-0 text-xs text-ink-3">{o.note}</span>}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
