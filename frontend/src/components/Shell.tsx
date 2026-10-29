import clsx from "clsx";
import {
  BarChart3, Briefcase, Building2, Clock3, FlaskConical, GitCompareArrows, Globe2, Home, Languages, LayoutGrid,
  Menu, Moon, Route, Search, ShieldCheck, Sparkles, Sun, Wallet, X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { filterParams } from "../lib/filters";
import { fmtDate } from "../lib/format";
import { useFilters, useMeta, useTheme } from "../lib/hooks";
import { t, tv, useLang } from "../lib/i18n";
import { useMode, type Mode } from "../lib/mode";
import { useProfile } from "../lib/profile";
import { FilterBar } from "./FilterBar";
import { Segmented } from "./ui";

/** `advanced` pages hold the analysis and methodology; Simple mode leaves them out of the menu. */
export const nav = (): { group: string; items: { to: string; label: string; icon: typeof Home; filters?: boolean; advanced?: boolean }[] }[] => [
  { group: t("Discover", "اكتشف"), items: [
    { to: "/", label: t("Home", "الرئيسية"), icon: Home, filters: false },
    { to: "/explorer", label: t("Jobs", "الوظائف"), icon: Briefcase },
  ] },
  { group: t("You", "أنت"), items: [
    { to: "/career", label: t("My skills & plan", "مهاراتي وخطتي"), icon: Route, filters: false },
  ] },
  { group: t("Market", "السوق"), items: [
    { to: "/market", label: t("Market overview", "نظرة على السوق"), icon: LayoutGrid, advanced: true },
    { to: "/skills", label: t("Skills in demand", "المهارات المطلوبة"), icon: Sparkles },
    { to: "/salary", label: t("Salaries", "الرواتب"), icon: Wallet },
    { to: "/geography", label: t("Locations", "المواقع"), icon: Globe2, advanced: true },
    { to: "/employers", label: t("Employers", "جهات التوظيف"), icon: Building2, advanced: true },
    { to: "/trends", label: t("Over time", "عبر الزمن"), icon: Clock3, advanced: true },
    { to: "/compare", label: t("Compare markets", "مقارنة الأسواق"), icon: GitCompareArrows, filters: false, advanced: true },
  ] },
  { group: t("Tools", "أدوات"), items: [
    { to: "/insights", label: t("Guided insights", "رؤى موجّهة"), icon: BarChart3, advanced: true },
    { to: "/builder", label: t("Insight builder", "منشئ التحليلات"), icon: FlaskConical, advanced: true },
  ] },
  { group: t("About the data", "عن البيانات"), items: [
    { to: "/quality", label: t("Data & methodology", "البيانات والمنهجية"), icon: ShieldCheck, filters: false, advanced: true },
  ] },
];

/** Pages whose content does not depend on the global filters hide the bar. */
const NO_FILTERS = new Set(nav().flatMap((g) => g.items).filter((i) => i.filters === false).map((i) => i.to));

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  const { data: meta } = useMeta();
  useEffect(() => {
    document.title = t("Bosla", "بوصلة");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t(
      "Bosla: find tech jobs, see how your skills match, and learn what to do next, from a unified sample of 588k postings.",
      "بوصلة: ابحث عن وظائف تقنية، واعرف مدى توافق مهاراتك، وما تفعله بعد ذلك، من عينة موحَّدة تضم 588 ألف إعلان."));
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  // sticky side panels (posting detail, career plan) sit just below the sticky header
  const headRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = headRef.current;
    const root = document.documentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => root.style.setProperty("--filters-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, [loc.pathname]);
  const showFilters = !NO_FILTERS.has(loc.pathname);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a href="#main" className="sr-only z-50 rounded-lg bg-panel p-2 focus:not-sr-only focus:fixed focus:start-2 focus:top-2">{t("Skip to content", "تخطَّ إلى المحتوى")}</a>
      <aside className={clsx("z-40 flex-col border-line bg-panel lg:sticky lg:top-0 lg:flex lg:h-screen lg:border-e",
        open ? "fixed inset-x-0 top-14 bottom-0 flex overflow-auto" : "hidden")} aria-label={t("Sidebar", "الشريط الجانبي")}>
        <div className="hidden h-16 shrink-0 items-center px-5 lg:flex"><Brand /></div>
        <ModeSwitch />
        <Nav />
        <SideFooter builtAt={meta?.built_at} />
      </aside>
      <div className="min-w-0">
        {meta?.dataset_kind === "synthetic" && (
          <div role="alert" className="bg-crit px-4 py-1.5 text-center text-sm font-medium text-white">
            {t("Synthetic demo data — generated for testing. These numbers are not research results.", "بيانات تجريبية مُولَّدة للاختبار — هذه الأرقام ليست نتائج بحثية.")}
          </div>
        )}
        <div ref={headRef} className="sticky top-0 z-30">
          <TopBar open={open} onMenu={() => setOpen(!open)} />
          {showFilters && <FilterBar />}
        </div>
        <main id="main" className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        <footer className="mx-auto max-w-[1600px] border-t border-line px-4 py-5 text-xs text-ink-3 sm:px-6 lg:px-8">
          {t("Created by", "صُنع بواسطة")}{" "}
          <a href="https://abdelhmeed.com" target="_blank" rel="noopener" dir="ltr" className="font-medium text-ink-2 hover:text-ink">abdelhmeed.com</a>
        </footer>
      </div>
    </div>
  );
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    // the Bosla mark (small-size cut): a b whose bowl is a compass dial, needle pointing north-east
    <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden className="shrink-0">
      <rect width="256" height="256" rx="56" fill="var(--rail)" />
      <g transform="translate(25.6 25.6) scale(.8)">
        <path fill="var(--rail-ink)" fillRule="evenodd" d="M56 24H86V101.52A72 72 0 1 1 86 218.48V232H56ZM86 160A42 42 0 1 0 170 160A42 42 0 1 0 86 160Z" />
        <path fill="var(--warn-fill)" d="M151.33 136.67 137.19 169.19 104.67 183.33 118.81 150.81Z" />
      </g>
    </svg>
  );
}

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5 rounded-lg text-ink no-underline">
      <BrandMark />
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-[-0.01em]">{t("Bosla", "بوصلة")}</span>
        <span className="block text-xs text-ink-3">{t("Your tech career compass", "بوصلتك في سوق شغل التكنولوجيا")}</span>
      </span>
    </NavLink>
  );
}

function TopBar({ open, onMenu }: { open: boolean; onMenu: () => void }) {
  const [theme, setTheme] = useTheme();
  const [lang, setLang] = useLang();
  const { profile } = useProfile();
  return (
    <div className="flex h-14 items-center gap-2 border-b border-line bg-panel/90 px-3 backdrop-blur-md sm:px-4 lg:h-16 lg:gap-3 lg:px-8">
      <button type="button" aria-label={open ? t("Close navigation", "إغلاق التنقل") : t("Open navigation", "فتح التنقل")} aria-expanded={open} onClick={onMenu}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-panel-2 lg:hidden">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div className="lg:hidden"><NavLink to="/" aria-label={t("Home", "الرئيسية")}><BrandMark /></NavLink></div>
      <JobSearch />
      <div className="ms-auto flex items-center gap-1">
        <NavLink to="/career" className="hidden h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm text-ink-2 no-underline hover:bg-panel-2 hover:text-ink sm:inline-flex">
          <Route size={15} className="text-accent" />
          {profile.role || profile.skills.length
            ? <span className="max-w-[220px] truncate"><span className="font-medium text-ink">{profile.role ? tv(profile.role) : t("Your profile", "ملفك")}</span>
              <span className="tnum text-ink-3"> · {t(`${profile.skills.length} skills`, `${profile.skills.length} مهارات`)}</span></span>
            : <span>{t("Add your skills", "أضف مهاراتك")}</span>}
        </NavLink>
        <button type="button" onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          lang={lang === "ar" ? "en" : "ar"} title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink-2 hover:bg-panel-2 hover:text-ink">
          <Languages size={16} /> <span className="hidden sm:inline">{lang === "ar" ? "English" : "العربية"}</span>
        </button>
        <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? t("Switch to light theme", "التبديل إلى الوضع الفاتح") : t("Switch to dark theme", "التبديل إلى الوضع الداكن")}
          title={theme === "dark" ? t("Light theme", "الوضع الفاتح") : t("Dark theme", "الوضع الداكن")}
          className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-panel-2 hover:text-ink">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}

/** Search from anywhere: lands on Jobs with the query applied, keeping other filters. */
function JobSearch() {
  const { filters } = useFilters();
  const navigate = useNavigate();
  const loc = useLocation();
  const [text, setText] = useState(filters.q ?? "");
  useEffect(() => { setText(filters.q ?? ""); }, [filters.q]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams(filterParams({ ...filters, q: text.trim() || undefined }));
    navigate({ pathname: "/explorer", search: sp.toString() ? `?${sp}` : "" }, { replace: loc.pathname === "/explorer" });
  };
  return (
    <form role="search" onSubmit={submit} className="min-w-0 flex-1 sm:max-w-md">
      <label className="relative flex h-9 items-center">
        <Search size={16} className="pointer-events-none absolute start-3 text-ink-3" />
        <span className="sr-only">{t("Search jobs by title or employer", "ابحث في الوظائف بالمسمى أو جهة التوظيف")}</span>
        <input value={text} onChange={(e) => setText(e.target.value)} type="search" dir="auto" maxLength={120}
          placeholder={t("Search jobs by title or employer", "ابحث في الوظائف بالمسمى أو جهة التوظيف")}
          className="h-9 w-full rounded-lg border border-line bg-panel-2 ps-9 pe-3 text-sm transition-colors placeholder:text-ink-3 hover:border-line-strong focus:border-accent focus:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25" />
      </label>
    </form>
  );
}

/** Simple or Advanced: how much of the analysis the menu and the pages show. */
function ModeSwitch() {
  const [mode, setMode] = useMode();
  const loc = useLocation();
  const navigate = useNavigate();
  const change = (m: Mode) => {
    setMode(m);
    // the page just left the menu: go back to the start of the job seeker's path
    if (m === "simple" && nav().some((g) => g.items.some((i) => i.advanced && i.to === loc.pathname))) navigate("/");
  };
  return (
    <div className="shrink-0 px-5 pt-4 pb-1 lg:pt-1">
      <Segmented label={t("Level of detail", "مستوى التفاصيل")} value={mode} onChange={change}
        options={[{ value: "simple", label: t("Simple", "بسيط") }, { value: "advanced", label: t("Advanced", "متقدم") }]} />
      <p className="mt-1.5 text-xs leading-5 text-ink-3">{mode === "simple"
        ? t("The essentials: jobs, your match and what to learn next.", "الأساسيات: الوظائف، ومدى توافقك، وما تتعلمه بعد ذلك.")
        : t("Everything: market analysis, tools and how each number was made.", "كل شيء: تحليل السوق، والأدوات، وكيف حُسب كل رقم.")}</p>
    </div>
  );
}

function Nav() {
  const { filters } = useFilters();
  const [mode] = useMode();
  const qs = new URLSearchParams(filterParams(filters)).toString();
  const groups = nav().map((g) => ({ ...g, items: g.items.filter((i) => mode === "advanced" || !i.advanced) })).filter((g) => g.items.length);
  return (
    <nav aria-label={t("Main navigation", "التنقل الرئيسي")} className="flex-1 overflow-y-auto px-3 pt-2 pb-4 lg:pt-0">
      {groups.map((g) => (
        <div key={g.group} className="mt-4 first:mt-1">
          <p className="px-2.5 pb-1.5 text-xs font-medium text-ink-3">{g.group}</p>
          <ul className="space-y-px">
            {g.items.map((it) => (
              <li key={it.to}>
                <NavLink to={{ pathname: it.to, search: qs && it.filters !== false ? `?${qs}` : "" }} end={it.to === "/"}
                  className={({ isActive }) => clsx("group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm no-underline transition-colors",
                    isActive ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-2 hover:bg-panel-2 hover:text-ink")}>
                  {({ isActive }) => (<>
                    <it.icon size={16} strokeWidth={1.75} aria-hidden className={isActive ? "text-accent" : "text-ink-3 group-hover:text-ink-2"} />
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

function SideFooter({ builtAt }: { builtAt?: string }) {
  return (
    <div className="border-t border-line px-5 py-4 text-xs leading-5 text-ink-3">
      <p>{t("Data built", "تاريخ بناء البيانات:")} {builtAt ? fmtDate(builtAt.slice(0, 10)) : "…"}</p>
      <p>{t("Findings describe the collected sample, not the whole job market.", "النتائج تصف العينة المجمَّعة، لا سوق العمل بأكمله.")}</p>
    </div>
  );
}
