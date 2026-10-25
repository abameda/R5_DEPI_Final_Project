import { useSyncExternalStore } from "react";

/**
 * Two interface languages. English strings stay inline next to their Arabic
 * twin (`t(en, ar)`), so a view can never ship half-translated. The app
 * remounts when the language changes (see main.tsx), so `t` and the
 * formatters can read the current language at render time.
 */
export type Lang = "en" | "ar";

const listeners = new Set<() => void>();
export const getLang = (): Lang => (typeof document !== "undefined" && document.documentElement.lang === "ar" ? "ar" : "en");
export const isRtl = () => getLang() === "ar";

export function setLang(l: Lang) {
  const root = document.documentElement;
  root.lang = l;
  root.dir = l === "ar" ? "rtl" : "ltr";
  try { localStorage.setItem("jmi-lang", l); } catch { /* storage may be blocked */ }
  listeners.forEach((fn) => fn());
}

export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, getLang);
  return [lang, setLang];
}

/** The string for the current language. */
export const t = (en: string, ar: string) => (getLang() === "ar" ? ar : en);

/** Intl locale: Arabic text with Latin digits, which is what the data and charts use. */
export const locale = () => (getLang() === "ar" ? "ar-EG-u-nu-latn" : "en-GB");

// --- data values ----------------------------------------------------------------
// Categorical values from the pipeline (role, seniority, market, ...). Skills,
// titles and employers are data and are shown as written.
const VALUES: Record<string, string> = {
  // role_category
  "Backend": "الواجهات الخلفية",
  "Cybersecurity": "الأمن السيبراني",
  "Data Analysis & BI": "تحليل البيانات وذكاء الأعمال",
  "Data Engineering": "هندسة البيانات",
  "Data Science & AI": "علم البيانات والذكاء الاصطناعي",
  "Design & UX": "التصميم وتجربة المستخدم",
  "DevOps & Cloud": "DevOps والحوسبة السحابية",
  "Embedded & Hardware": "الأنظمة المدمجة والعتاد",
  "Frontend": "الواجهات الأمامية",
  "Full Stack": "التطوير الشامل",
  "IT Support & Networking": "الدعم الفني والشبكات",
  "Mobile": "تطبيقات الجوال",
  "Other / Unclassified": "أخرى / غير مصنفة",
  "Other Engineering": "هندسة أخرى",
  "Product & Project": "إدارة المنتجات والمشاريع",
  "QA & Testing": "ضمان الجودة والاختبار",
  "Software Engineering": "هندسة البرمجيات",
  // seniority
  "Intern": "متدرب",
  "Junior": "مبتدئ",
  "Senior": "خبير",
  "Lead / Principal": "قائد / رئيسي",
  "Manager / Director": "مدير",
  "Not specified": "غير محدد",
  // job_type
  "Contract": "عقد",
  "Full-time": "دوام كامل",
  "Internship": "تدريب",
  "Part-time": "دوام جزئي",
  "Temporary": "مؤقت",
  "Unknown": "غير معروف",
  // work_mode, market_type, region
  "Hybrid": "هجين",
  "On-site": "من المقر",
  "Remote": "عن بُعد",
  "Arab": "عربي",
  "International": "دولي",
  "Non-Arab": "غير عربي",
  "Worldwide / Unknown": "عالمي / غير معروف",
  // language
  "ar": "العربية",
  "en": "الإنجليزية",
  "mixed": "مختلطة",
  "unknown": "غير معروفة",
  // skill category
  "AI & ML concepts": "مفاهيم الذكاء الاصطناعي وتعلم الآلة",
  "Analytics, BI & office tools": "أدوات التحليل وذكاء الأعمال والمكتب",
  "Cloud & data platforms": "منصات السحابة والبيانات",
  "Collaboration tools": "أدوات التعاون",
  "Data practices": "ممارسات البيانات",
  "Databases": "قواعد البيانات",
  "DevOps & engineering tools": "أدوات DevOps والهندسة",
  "Domain knowledge": "المعرفة بالمجال",
  "Embedded & hardware": "الأنظمة المدمجة والعتاد",
  "Libraries & frameworks": "المكتبات وأطر العمل",
  "Networking & IT operations": "الشبكات وعمليات تقنية المعلومات",
  "Operating systems & platforms": "أنظمة التشغيل والمنصات",
  "Programming & query languages": "لغات البرمجة والاستعلام",
  "Security & compliance": "الأمن والامتثال",
  "Soft skills & management": "المهارات الشخصية والإدارة",
  "Software engineering practices": "ممارسات هندسة البرمجيات",
  "Spoken languages": "اللغات المحكية",
  "Testing & QA": "الاختبار وضمان الجودة",
  "Uncategorized": "غير مصنفة",
  "Web frameworks": "أطر تطوير الويب",
};

/** Dataset country names that differ from the Intl English region name. */
const COUNTRY_CODES: Record<string, string> = {
  "Hong Kong": "HK", "Trinidad and Tobago": "TT", "Bosnia and Herzegovina": "BA", "Turkey": "TR",
  "Côte d'Ivoire": "CI", "Ivory Coast": "CI", "DR Congo": "CD", "Palestine": "PS", "Myanmar": "MM",
  "Czech Republic": "CZ",
};
let countryCodes: Record<string, string> | null = null;
function countryCode(name: string): string | undefined {
  if (!countryCodes) {
    countryCodes = { ...COUNTRY_CODES };
    const en = new Intl.DisplayNames("en", { type: "region", fallback: "none" });
    for (let a = 65; a < 91; a++) for (let b = 65; b < 91; b++) {
      const code = String.fromCharCode(a, b);
      const n = en.of(code);
      if (n && !countryCodes[n]) countryCodes[n] = code;
    }
  }
  return countryCodes[name];
}
let arRegions: Intl.DisplayNames | null = null;

/** A categorical data value (role, seniority, country, skill category ...) in the current language. */
export function tv(value: string): string {
  if (getLang() !== "ar" || !value) return value;
  const known = VALUES[value];
  if (known) return known;
  const code = countryCode(value);
  if (!code) return value;
  arRegions ??= new Intl.DisplayNames("ar", { type: "region", fallback: "none" });
  return arRegions.of(code) ?? value;
}
