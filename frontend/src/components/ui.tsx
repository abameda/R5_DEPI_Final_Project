import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { AlertTriangle, Download, Info, Table2, BarChart3, RefreshCw, SearchX } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ChartHandle } from "./Chart";

export function PageHeader({ title, description, children }: { title: string; description: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-ink-2">{description}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Panel({ title, meta, info, actions, children, className, id }: {
  title: ReactNode; meta?: ReactNode; info?: ReactNode; actions?: ReactNode; children: ReactNode;
  className?: string; id?: string;
}) {
  return (
    <section id={id} className={clsx("min-w-0 rounded-lg border border-line bg-panel", className)} aria-label={typeof title === "string" ? title : undefined}>
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-ink">
            {title}
            {info && <InfoTip>{info}</InfoTip>}
          </h2>
          {meta && <div className="mt-0.5 text-xs text-ink-3">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

export interface TableSpec { columns: string[]; rows: (string | number | null)[][]; filename: string }

/** A chart panel with a table view (accessibility + exact values) and PNG/CSV downloads of the aggregate. */
export function ChartPanel({ title, meta, info, table, children, className, extraActions, id }: {
  title: string; meta?: ReactNode; info?: ReactNode; table?: TableSpec;
  children: (handle: React.MutableRefObject<ChartHandle | null>) => ReactNode; className?: string;
  extraActions?: ReactNode; id?: string;
}) {
  const handle = useRef<ChartHandle | null>(null);
  const [asTable, setAsTable] = useState(false);
  const downloadPng = () => {
    const url = handle.current?.png();
    if (url) save(url, `${slug(title)}.png`);
  };
  const downloadCsv = () => {
    if (!table) return;
    const csv = [table.columns, ...table.rows].map((r) => r.map(csvCell).join(",")).join("\n")
      + "\n# Aggregated from the Job Market Intelligence posting sample (not the whole labour market)\n";
    save(URL.createObjectURL(new Blob([csv], { type: "text/csv" })), `${table.filename}.csv`);
  };
  return (
    <Panel id={id} title={title} meta={meta} info={info} className={className} actions={<>
      {extraActions}
      {table && (
        <IconButton label={asTable ? "Show chart" : "Show as table"} onClick={() => setAsTable(!asTable)}>
          {asTable ? <BarChart3 size={15} /> : <Table2 size={15} />}
        </IconButton>
      )}
      {!asTable && <IconButton label="Download chart as PNG" onClick={downloadPng}><Download size={15} /></IconButton>}
      {asTable && table && <IconButton label="Download table as CSV" onClick={downloadCsv}><Download size={15} /></IconButton>}
    </>}>
      {asTable && table ? <DataTable table={table} /> : children(handle)}
    </Panel>
  );
}

function DataTable({ table }: { table: TableSpec }) {
  return (
    <div className="max-h-80 overflow-auto rounded border border-line">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-panel-2 text-left text-ink-2">
          <tr>{table.columns.map((c) => <th key={c} scope="col" className="px-3 py-1.5 font-medium">{c}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => <td key={j} dir="auto" className={clsx("px-3 py-1.5", j > 0 && "text-right")}>{c ?? "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
function save(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  if (url.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function IconButton({ label, onClick, children, active }: { label: string; onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} aria-pressed={active}
      className={clsx("grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink",
        active && "bg-accent-soft text-accent-ink")}>
      {children}
    </button>
  );
}

export function Button({ children, onClick, variant = "secondary", type = "button", disabled, className }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost"; type?: "button" | "submit";
  disabled?: boolean; className?: string;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={clsx(
      "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
      variant === "primary" && "bg-rail text-rail-ink hover:bg-rail-2 dark:bg-accent dark:text-rail dark:hover:brightness-110",
      variant === "secondary" && "border border-line-strong bg-panel text-ink hover:bg-panel-2",
      variant === "ghost" && "text-ink-2 hover:bg-panel-2 hover:text-ink",
      className)}>
      {children}
    </button>
  );
}

export function InfoTip({ children }: { children: ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger aria-label="How this is calculated" className="grid size-5 place-items-center rounded text-ink-3 hover:text-ink">
        <Info size={14} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} collisionPadding={12}
          className="z-50 max-w-xs rounded-md border border-line-strong bg-panel p-3 text-sm font-normal text-ink-2 shadow-panel">
          {children}
          <Popover.Arrow className="fill-[var(--line-strong)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line-strong bg-panel p-0.5"
      onKeyDown={(e) => {
        const i = options.findIndex((o) => o.value === value);
        const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: options.length - 1 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        const o = options[(next + options.length) % options.length];
        onChange(o.value);
        (e.currentTarget.querySelector(`[data-value="${CSS.escape(o.value)}"]`) as HTMLElement | null)?.focus();
      }}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          data-value={o.value} tabIndex={value === o.value ? 0 : -1}
          className={clsx("h-7 rounded px-2.5 text-sm transition-colors",
            value === o.value ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-2 hover:text-ink")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select({ value, onChange, options, label, className }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string; className?: string;
}) {
  return (
    <label className={clsx("inline-flex items-center gap-2 text-sm text-ink-2", className)}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-line-strong bg-panel px-2 text-sm text-ink focus-visible:outline-2">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Skeleton({ h = 240, className }: { h?: number; className?: string }) {
  return <div className={clsx("skeleton w-full", className)} style={{ height: h }} aria-hidden />;
}

export function Loading({ h = 240 }: { h?: number }) {
  return <div role="status" aria-label="Loading"><Skeleton h={h} /></div>;
}

export function ErrorState({ error, retry }: { error: Error | null; retry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-md border border-crit/40 bg-crit-soft p-4 text-sm text-ink">
      <p className="flex items-center gap-2 font-medium"><AlertTriangle size={16} className="text-crit" /> This view could not be loaded.</p>
      <p className="text-ink-2">{error?.message ?? "Unknown error."}</p>
      {retry && <Button onClick={retry}><RefreshCw size={14} /> Try again</Button>}
    </div>
  );
}

export function Empty({ title = "No postings match these filters", hint, action }: { title?: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <SearchX size={22} className="text-ink-3" />
      <p className="font-medium text-ink">{title}</p>
      <p className="max-w-md text-sm text-ink-2">{hint ?? "Remove a filter or widen the date range to bring postings back."}</p>
      {action}
    </div>
  );
}

export function Callout({ tone = "info", children, title }: { tone?: "info" | "warn" | "crit"; children: ReactNode; title?: string }) {
  return (
    <div role={tone === "info" ? "note" : "status"} className={clsx("flex gap-2.5 rounded-md border p-3 text-sm",
      tone === "info" && "border-line bg-info-soft text-ink",
      tone === "warn" && "border-warn/40 bg-warn-soft text-ink",
      tone === "crit" && "border-crit/40 bg-crit-soft text-ink")}>
      {tone === "info" ? <Info size={16} className="mt-0.5 shrink-0 text-s1" /> : <AlertTriangle size={16} className={clsx("mt-0.5 shrink-0", tone === "warn" ? "text-warn" : "text-crit")} />}
      <div>{title && <p className="font-medium">{title}</p>}<div className="text-ink-2">{children}</div></div>
    </div>
  );
}

export function Pill({ children, tone = "neutral", title }: { children: ReactNode; tone?: "neutral" | "accent" | "warn" | "good" | "added"; title?: string }) {
  return (
    <span title={title} className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
      tone === "neutral" && "bg-panel-2 text-ink-2 ring-1 ring-line",
      tone === "accent" && "bg-accent-soft text-accent-ink",
      tone === "warn" && "bg-warn-soft text-warn",
      tone === "good" && "bg-panel-2 text-good ring-1 ring-line",
      tone === "added" && "border border-dashed border-ink-3 text-ink-2")}>
      {children}
    </span>
  );
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="font-medium text-accent-ink underline decoration-accent-line underline-offset-2 hover:decoration-current">{children}</Link>;
}

/** A data region that reports loading / error / empty consistently. */
export function Guard<T>({ q, h = 240, empty, children }: {
  q: { data: T | undefined; isLoading: boolean; error: Error | null; refetch: () => unknown; isFetching?: boolean };
  h?: number; empty?: (d: T) => boolean; children: (d: T) => ReactNode;
}) {
  if (q.error && !q.data) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  if (q.isLoading || !q.data) return <Loading h={h} />;
  if (empty?.(q.data)) return <Empty />;
  return <div className={clsx("transition-opacity", q.isFetching && "opacity-60")} aria-busy={q.isFetching}>{children(q.data)}</div>;
}
