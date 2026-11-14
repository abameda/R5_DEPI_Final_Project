import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { t } from "../lib/i18n";

export default function NotFound() {
  return (
    <section aria-labelledby="nf-h" className="mx-auto max-w-lg py-16 text-center sm:py-24">
      <p className="tnum text-sm font-medium text-ink-3">404</p>
      <h1 id="nf-h" className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink">{t("We couldn’t find that page", "لم نعثر على هذه الصفحة")}</h1>
      <p className="mt-2 text-[0.9375rem] leading-6 text-ink-2">{t("The link may be old or mistyped. Start again from Home, or go straight to the jobs.", "ربما يكون الرابط قديمًا أو به خطأ. ابدأ من جديد من الصفحة الرئيسية، أو اذهب مباشرة إلى الوظائف.")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/" className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white no-underline hover:bg-accent-ink dark:text-[#0b0f17]">{t("Go to Home", "اذهب إلى الرئيسية")}</Link>
        <Link to="/explorer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-panel px-4 text-sm font-medium text-ink no-underline hover:bg-panel-2">
          <Search size={15} className="text-ink-3" /> {t("Search jobs", "ابحث عن وظائف")}
        </Link>
      </div>
    </section>
  );
}
