import clsx from "clsx";
import {
  BarChart3, Briefcase, Building2, Compass, FlaskConical, GitCompareArrows, Globe2, Lightbulb, LineChart,
  Languages, Menu, Moon, ShieldCheck, Sparkles, Sun, Wallet, X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { filterParams } from "../lib/filters";
import { fmtDate } from "../lib/format";
import { useFilters, useMeta, useTheme } from "../lib/hooks";
import { t, useLang } from "../lib/i18n";
import { FilterBar } from "./FilterBar";

export const nav = (): { group: string; items: { to: string; label: string; icon: typeof Compass; filters?: boolean }[] }[] => [
  { group: t("Explore", "استكشاف"), items: [
    { to: "/", label: t("Overview", "نظرة عامة"), icon: Compass },
    { to: "/explorer", label: t("Job explorer", "مستكشف الوظائف"), icon: Briefcase },
    { to: "/geography", label: t("Geography", "الجغرافيا"), icon: Globe2 },
    { to: "/employers", label: t("Employers", "جهات التوظيف"), icon: Building2 },
  ] },
  { group: t("Analyze", "تحليل"), items: [
    { to: "/skills", label: t("Skills", "المهارات"), icon: Sparkles },
    { to: "/salary", label: t("Salaries", "الرواتب"), icon: Wallet },
    { to: "/trends", label: t("Time & cohorts", "الزمن ودفعات الجمع"), icon: LineChart },
    { to: "/compare", label: t("Compare markets", "مقارنة الأسواق"), icon: GitCompareArrows, filters: false },
  ] },
  { group: t("Plan", "تخطيط"), items: [
    { to: "/career", label: t("Career planner", "مخطط المسار المهني"), icon: Lightbulb },
    { to: "/insights", label: t("Guided insights", "رؤى موجّهة"), icon: BarChart3 },
    { to: "/builder", label: t("Insight builder", "منشئ التحليلات"), icon: FlaskConical },
  ] },
  { group: t("Trust", "الثقة"), items: [
    { to: "/quality", label: t("Data & methodology", "البيانات والمنهجية"), icon: ShieldCheck, filters: false },
  ] },
];

/** Pages whose content does not depend on the global filters hide the bar. */
const NO_FILTERS = new Set(["/compare", "/quality"]);

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  const { data: meta } = useMeta();
  useEffect(() => {
    document.title = t("Job Market Intelligence", "ذكاء سوق العمل");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t(
      "Job Market Intelligence: demand, skills, pay and geography from a unified, deduplicated sample of 588k tech job postings.",
      "ذكاء سوق العمل: الطلب والمهارات والأجور والجغرافيا من عينة موحَّدة وخالية من التكرار تضم 588 ألف إعلان وظيفة تقنية."));
  }, []);
  // sticky side panels (posting detail, career plan) sit just below the filter bar
  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = filterRef.current;
    const root = document.documentElement;
    if (!el) { root.style.setProperty("--filters-h", "0px"); return; }
    const ro = new ResizeObserver(() => root.style.setProperty("--filters-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, [loc.pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[236px_1fr]">
      <a href="#main" className="sr-only z-50 rounded bg-panel p-2 focus:not-sr-only focus:fixed focus:start-2 focus:top-2">{t("Skip to content", "تخطَّ إلى المحتوى")}</a>
      {/* mobile top bar */}
      <div className="sticky top-0 z-40 flex h-12 items-center justify-between bg-rail px-3 text-rail-ink lg:hidden">
        <Brand />
        <button type="button" aria-label={open ? t("Close navigation", "إغلاق التنقل") : t("Open navigation", "فتح التنقل")} aria-expanded={open} onClick={() => setOpen(!open)}
          className="grid size-9 place-items-center rounded-md hover:bg-rail-2">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <aside className={clsx("z-30 flex-col bg-rail text-rail-ink lg:sticky lg:top-0 lg:flex lg:h-screen",
        open ? "fixed inset-x-0 top-12 bottom-0 flex overflow-auto" : "hidden")} aria-label={t("Sidebar", "الشريط الجانبي")}>
        <div className="hidden px-4 pt-4 pb-3 lg:block"><Brand /></div>
        <Nav />
        <RailFooter builtAt={meta?.built_at} />
      </aside>
      <div className="min-w-0">
        {meta?.dataset_kind === "synthetic" && (
          <div role="alert" className="bg-crit px-4 py-1.5 text-center text-sm font-medium text-white">
            {t("Synthetic demo data — generated for testing. These numbers are not research results.", "بيانات تجريبية مُولَّدة للاختبار — هذه الأرقام ليست نتائج بحثية.")}
          </div>
        )}
        {!NO_FILTERS.has(loc.pathname) && <div ref={filterRef} className="z-20 lg:sticky lg:top-0"><FilterBar /></div>}
        <main id="main" className="mx-auto max-w-[1480px] px-4 py-5 lg:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5 rounded-md text-rail-ink no-underline">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="6" fill="var(--rail-2)" />
        <g fill="var(--accent)"><circle cx="10" cy="10" r="3" /><circle cx="22" cy="10" r="4.5" /><circle cx="10" cy="22" r="4.5" /><circle cx="22" cy="22" r="2" /></g>
      </svg>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">{t("Job Market Intelligence", "ذكاء سوق العمل")}</span>
        <span className="block text-xs text-rail-ink-2">{t("DEPI · Team 1", "DEPI · الفريق 1")}</span>
      </span>
    </NavLink>
  );
}

function Nav() {
  const { filters } = useFilters();
  const qs = new URLSearchParams(filterParams(filters)).toString();
  return (
    <nav aria-label={t("Main navigation", "التنقل الرئيسي")} className="flex-1 overflow-y-auto px-2 pb-4">
      {nav().map((g) => (
        <div key={g.group} className="mt-3">
          <p className="px-2 pb-1 text-xs font-medium text-rail-ink-2">{g.group}</p>
          <ul>
            {g.items.map((it) => (
              <li key={it.to}>
                <NavLink to={{ pathname: it.to, search: qs ? `?${qs}` : "" }} end={it.to === "/"}
                  className={({ isActive }) => clsx("group flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
                    isActive ? "bg-rail-2 font-medium text-rail-ink ring-1 ring-rail-line" : "text-rail-ink-2 hover:bg-rail-2/60 hover:text-rail-ink")}>
                  {({ isActive }) => (<>
                    <it.icon size={16} strokeWidth={1.75} aria-hidden className={isActive ? "text-accent" : undefined} />
                    {it.label}
                  </>)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function RailFooter({ builtAt }: { builtAt?: string }) {
  const [theme, setTheme] = useTheme();
  const [lang, setLang] = useLang();
  return (
    <div className="border-t border-rail-line px-4 py-3 text-xs text-rail-ink-2">
      <button type="button" onClick={() => setLang(lang === "ar" ? "en" : "ar")}
        lang={lang === "ar" ? "en" : "ar"} title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
        className="mb-1 flex h-8 w-full items-center gap-2 rounded-md px-2 text-rail-ink hover:bg-rail-2">
        <Languages size={15} /> {lang === "ar" ? "English" : "العربية"}
      </button>
      <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="mb-2 flex h-8 w-full items-center gap-2 rounded-md px-2 text-rail-ink hover:bg-rail-2">
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        {theme === "dark" ? t("Light theme", "الوضع الفاتح") : t("Dark theme", "الوضع الداكن")}
      </button>
      <p>{t("Store built", "تاريخ بناء البيانات:")} {builtAt ? fmtDate(builtAt.slice(0, 10)) : "…"}</p>
      <p className="mt-0.5">{t("Findings describe the collected sample, not the whole job market.", "النتائج تصف العينة المجمَّعة، لا سوق العمل بأكمله.")}</p>
    </div>
  );
}
