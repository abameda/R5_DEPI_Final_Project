const int = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const fmtInt = (n: number | null | undefined) => (n == null ? "—" : int.format(Math.round(n)));
export const fmtCompact = (n: number | null | undefined) => (n == null ? "—" : compact.format(n));

/** 0.4567 -> "45.7%"; small shares keep one more digit so they never read as 0%. */
export function fmtPct(x: number | null | undefined, digits?: number): string {
  if (x == null || Number.isNaN(x)) return "—";
  const p = x * 100;
  const d = digits ?? (p !== 0 && Math.abs(p) < 1 ? 2 : 1);
  return `${p.toFixed(d)}%`;
}

export const fmtPp = (x: number | null | undefined) =>
  x == null ? "—" : `${x > 0 ? "+" : x < 0 ? "−" : "±"}${Math.abs(x).toFixed(1)} pp`;

export function fmtUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `$${Math.round(n)}`;
}

export const fmtUsdFull = (n: number | null | undefined) => (n == null ? "—" : `$${int.format(Math.round(n))}`);

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtMonth(d: string): string {
  const dt = new Date(`${d.slice(0, 7)}-01T00:00:00`);
  return dt.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}
