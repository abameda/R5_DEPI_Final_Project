import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import {
  BarChart3, Briefcase, Building2, ChevronDown, Clock3, FlaskConical, GitCompareArrows, Globe2, Home, Languages, LayoutGrid,
  Menu, Milestone, Moon, Route, Search, ShieldCheck, Sparkles, Sun, Wallet, X,
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

type NavItem = { to: string; label: string; icon: typeof Home; filters?: boolean; advanced?: boolean };

/** `advanced` pages hold the analysis and methodology; Simple mode leaves them out of the menu. */
export const nav = (): { group: string; items: NavItem[] }[] => [
  { group: t("Discover", "اكتشف"), items: [
    { to: "/", label: t("Home", "الرئيسية"), icon: Home, filters: false },
    { to: "/explorer", label: t("Jobs", "الوظائف"), icon: Briefcase },
  ] },
  { group: t("You", "أنت"), items: [
    { to: "/career", label: t("My skills & plan", "مهاراتي وخطتي"), icon: Route, filters: false },
    { to: "/roadmap", label: t("Roadmap", "خارطة الطريق"), icon: Milestone, filters: false },
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
  { group: t("Tools & data", "أدوات وبيانات"), items: [
    { to: "/insights", label: t("Guided insights", "رؤى موجّهة"), icon: BarChart3, advanced: true },
    { to: "/builder", label: t("Insight builder", "منشئ التحليلات"), icon: FlaskConical, advanced: true },
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
    <div className="min-h-screen">
      <a href="#main" className="sr-only z-50 rounded-lg bg-panel p-2 focus:not-sr-only focus:fixed focus:start-2 focus:top-2">{t("Skip to content", "تخطَّ إلى المحتوى")}</a>
      {meta?.dataset_kind === "synthetic" && (
        <div role="alert" className="bg-crit px-4 py-1.5 text-center text-sm font-medium text-white">
          {t("Synthetic demo data — generated for testing. These numbers are not research results.", "بيانات تجريبية مُولَّدة للاختبار — هذه الأرقام ليست نتائج بحثية.")}
        </div>
      )}
      <div ref={headRef} className="sticky top-0 z-30">
        <TopBar open={open} onMenu={() => setOpen(!open)} />
        {showFilters && <FilterBar />}
      </div>
      {/* below xl the menu folds into a drawer under the top bar */}
      <aside id="nav-drawer" aria-label={t("Menu", "القائمة")}
        className={clsx("fixed inset-x-0 top-14 bottom-0 z-40 flex-col overflow-auto bg-panel xl:hidden", open ? "flex" : "hidden")}>
        <ModeSwitch hint />
        <Nav />
      </aside>
      <main id="main" className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      <footer className="mx-auto max-w-[1600px] border-t border-line px-4 py-6 text-xs leading-5 text-ink-3 sm:px-6 lg:px-8">
        <p>
          {t("Data built", "تاريخ بناء البيانات:")} {meta?.built_at ? fmtDate(meta.built_at.slice(0, 10)) : "…"}.{" "}
          {t("Findings describe the collected sample, not the whole job market.", "النتائج تصف العينة المجمَّعة، لا سوق العمل بأكمله.")}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="flex items-center gap-2 text-ink-2">
            <BrandMark size={18} />
            <span>© {new Date().getFullYear()} {t("Bosla. All rights reserved.", "بوصلة. جميع الحقوق محفوظة.")}</span>
          </p>
          <p>
            {t("Designed and built by", "تصميم وتطوير")}{" "}
            <a href="https://abdelhmeed.com" target="_blank" rel="noopener" dir="ltr"
              className="font-medium text-ink-2 underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink-3">
              Abdelhmeed Elshorbagy
            </a>
          </p>
        </div>
      </footer>
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
    <NavLink to="/" title={t("Your tech career compass", "بوصلتك في سوق شغل التكنولوجيا")} className="flex shrink-0 items-center gap-2.5 rounded-lg text-ink no-underline">
      <BrandMark />
      <span className="text-sm font-semibold tracking-[-0.01em]">{t("Bosla", "بوصلة")}</span>
    </NavLink>
  );
}

function TopBar({ open, onMenu }: { open: boolean; onMenu: () => void }) {
  const [theme, setTheme] = useTheme();
  const [lang, setLang] = useLang();
  const { profile } = useProfile();
  return (
    <div className="flex h-14 items-center gap-2 border-b border-line bg-panel/90 px-3 backdrop-blur-md sm:px-4 lg:gap-3 lg:px-8 xl:h-16">
      <button type="button" aria-label={open ? t("Close navigation", "إغلاق التنقل") : t("Open navigation", "فتح التنقل")} aria-expanded={open}
        aria-controls="nav-drawer" onClick={onMenu}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-panel-2 xl:hidden">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div className="xl:hidden"><NavLink to="/" aria-label={t("Home", "الرئيسية")}><BrandMark /></NavLink></div>
      <div className="me-2 hidden xl:block"><Brand /></div>
      <TopNav />
      <JobSearch />
      <div className="ms-auto flex shrink-0 items-center gap-1">
        {/* from xl the menu already links to the plan; the chip returns once there is room */}
        <NavLink to="/career" className="hidden h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm text-ink-2 no-underline hover:bg-panel-2 hover:text-ink sm:inline-flex xl:hidden 2xl:inline-flex">
          <Route size={15} className="text-accent" />
          {profile.role || profile.skills.length
            ? <span className="max-w-[220px] truncate"><span className="font-medium text-ink">{profile.role ? tv(profile.role) : t("Your profile", "ملفك")}</span>
              <span className="tnum text-ink-3"> · {t(`${profile.skills.length} skills`, `${profile.skills.length} مهارات`)}</span></span>
            : <span>{t("Add your skills", "أضف مهاراتك")}</span>}
        </NavLink>
        <div className="hidden px-1 xl:block"><ModeSwitch /></div>
        <button type="button" onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          lang={lang === "ar" ? "en" : "ar"} title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink-2 hover:bg-panel-2 hover:text-ink">
          <Languages size={16} /> <span className="hidden sm:inline xl:hidden 2xl:inline">{lang === "ar" ? "English" : "العربية"}</span>
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
    <form role="search" onSubmit={submit} className="min-w-0 flex-1 sm:max-w-md xl:max-w-xs">
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
function ModeSwitch({ hint = false }: { hint?: boolean }) {
  const [mode, setMode] = useMode();
  const loc = useLocation();
  const navigate = useNavigate();
  const change = (m: Mode) => {
    setMode(m);
    // the page just left the menu: go back to the start of the job seeker's path
    if (m === "simple" && nav().some((g) => g.items.some((i) => i.advanced && i.to === loc.pathname))) navigate("/");
  };
  const control = (
    <Segmented label={t("Level of detail", "مستوى التفاصيل")} value={mode} onChange={change}
      options={[{ value: "simple", label: t("Simple", "بسيط") }, { value: "advanced", label: t("Advanced", "متقدم") }]} />
  );
  if (!hint) return control;
  return (
    <div className="shrink-0 px-5 pt-4 pb-1">
      {control}
      <p className="mt-1.5 text-xs leading-5 text-ink-3">{mode === "simple"
        ? t("The essentials: jobs, your match and what to learn next.", "الأساسيات: الوظائف، ومدى توافقك، وما تتعلمه بعد ذلك.")
        : t("Everything: market analysis, tools and how each number was made.", "كل شيء: تحليل السوق، والأدوات، وكيف حُسب كل رقم.")}</p>
    </div>
  );
}

/** The menu for the current mode; links carry the global filters to the pages that use them. */
function useMenu() {
  const { filters } = useFilters();
  const [mode] = useMode();
  const qs = new URLSearchParams(filterParams(filters)).toString();
  const groups = nav().map((g) => ({ ...g, items: g.items.filter((i) => mode === "advanced" || !i.advanced) })).filter((g) => g.items.length);
  const to = (it: NavItem) => ({ pathname: it.to, search: qs && it.filters !== false ? `?${qs}` : "" });
  return { groups, to };
}

type LinkTo = ReturnType<typeof useMenu>["to"];

const barItem = "inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3 text-sm no-underline transition-colors";
const barState = (active: boolean) => active ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-2 hover:bg-panel-2 hover:text-ink";

/** xl and up: small groups sit in the bar as links, larger ones open as a dropdown. */
function TopNav() {
  const { groups, to } = useMenu();
  return (
    <nav aria-label={t("Main navigation", "التنقل الرئيسي")} className="hidden items-center gap-0.5 xl:flex">
      {groups.flatMap((g) => g.items.length <= 2
        ? g.items.map((it) => (
          <NavLink key={it.to} to={to(it)} end={it.to === "/"} className={({ isActive }) => clsx(barItem, barState(isActive))}>{it.label}</NavLink>
        ))
        : [<NavMenu key={g.group} label={g.group} items={g.items} to={to} />])}
    </nav>
  );
}

function NavMenu({ label, items, to }: { label: string; items: NavItem[]; to: LinkTo }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={clsx(barItem, barState(items.some((i) => i.to === loc.pathname)))}>
        {label}
        <ChevronDown size={14} aria-hidden className={clsx("transition-transform", open && "rotate-180")} />
      </Popover.Trigger>
      {/* not portalled, so the links stay inside the navigation landmark */}
      <Popover.Content align="start" sideOffset={6} collisionPadding={12} className="z-50 w-60 rounded-xl border border-line bg-panel p-1.5 shadow-panel">
        <ul className="space-y-px">
          {items.map((it) => <li key={it.to}><MenuLink item={it} to={to} onClick={() => setOpen(false)} /></li>)}
        </ul>
      </Popover.Content>
    </Popover.Root>
  );
}

function MenuLink({ item, to, onClick }: { item: NavItem; to: LinkTo; onClick?: () => void }) {
  return (
    <NavLink to={to(item)} end={item.to === "/"} onClick={onClick}
      className={({ isActive }) => clsx("group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm no-underline transition-colors",
        isActive ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-2 hover:bg-panel-2 hover:text-ink")}>
      {({ isActive }) => (<>
        <item.icon size={16} strokeWidth={1.75} aria-hidden className={isActive ? "text-accent" : "text-ink-3 group-hover:text-ink-2"} />
        {item.label}
      </>)}
    </NavLink>
  );
}

/** Below xl, the drawer lists every group under its heading. */
function Nav() {
  const { groups, to } = useMenu();
  return (
    <nav aria-label={t("Main navigation", "التنقل الرئيسي")} className="flex-1 px-3 pt-2 pb-4">
      {groups.map((g) => (
        <div key={g.group} className="mt-4 first:mt-1">
          <p className="px-2.5 pb-1.5 text-xs font-medium text-ink-3">{g.group}</p>
          <ul className="space-y-px">
            {g.items.map((it) => <li key={it.to}><MenuLink item={it} to={to} /></li>)}
          </ul>
        </div>
      ))}
    </nav>
  );
}
