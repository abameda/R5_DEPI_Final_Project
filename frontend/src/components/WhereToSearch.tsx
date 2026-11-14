import { useApi } from "../lib/api";
import type { Filters } from "../lib/filters";
import { fmtDate, fmtInt, fmtPct } from "../lib/format";
import { t, tv } from "../lib/i18n";
import type { PlatformCoverage } from "../lib/types";
import { HBar } from "./charts";
import { Callout, ChartPanel, Guard } from "./ui";

const list = (names: string[]) => {
  const n = names.map(tv);
  if (n.length < 2) return n.join("");
  return n.slice(0, -1).join(t(", ", "، ")) + t(" and ", " و") + n[n.length - 1];
};

/**
 * Which job boards listed the postings of a selection. A posting found on
 * several boards counts once in the total and once for each board, so the
 * shares say: of the postings we can trace to a board, how many could you
 * have found on this one?
 */
export function WhereToSearch({ filters, subject }: { filters: Filters; subject: string }) {
  const q = useApi<PlatformCoverage>("/platforms", filters);
  return (
    <ChartPanel title={t("Where to search for these jobs", "أين تبحث عن هذه الوظائف")}
      meta={t(`Job boards that listed ${subject}, as a share of the postings we can trace to a board`, `مواقع التوظيف التي نشرت ${subject}، كنسبة من الإعلانات التي نعرف موقع نشرها`)}
      info={t("A job found on three boards is counted once in the total and credited to each of the three boards, so the shares add up to more than 100%. This describes where our collection found postings, not each board's full listing count.",
        "الوظيفة الموجودة في ثلاثة مواقع تُحتسب مرة واحدة في الإجمالي وتُنسب إلى كل موقع من الثلاثة، لذا يتجاوز مجموع النسب 100%. يصف هذا أين وجد الجمع الإعلانات، لا العدد الكامل لإعلانات كل موقع.")}
      table={q.data ? {
        columns: [t("Board", "الموقع"), t("Postings", "الإعلانات"), t("Share", "النسبة"), t("Only on this board", "على هذا الموقع فقط"), t("Latest posting", "أحدث إعلان"), t("Read directly by Bosla", "يقرؤه بوصلة مباشرة")],
        filename: "where-to-search",
        rows: q.data.platforms.map((p) => [p.platform, p.postings, fmtPct(p.share), p.only_here, fmtDate(p.last_posted), p.queried_directly ? t("yes", "نعم") : ""]),
      } : undefined}>
      {(h) => (
        <Guard q={q} h={280} empty={(d) => d.attributed === 0}>
          {(d) => {
            const best = d.combination[d.combination.length - 1];
            const direct = d.platforms.filter((p) => p.queried_directly).map((p) => p.platform);
            return (
              <div className="space-y-4">
                {best && (
                  <p className="text-sm leading-6 text-ink">
                    {best.platforms.length === 1
                      ? t(`${tv(best.platforms[0])} listed ${fmtPct(best.share, 0)} of the ${fmtInt(d.attributed)} postings we can trace to a board.`,
                        `نشر ${tv(best.platforms[0])} ${fmtPct(best.share, 0)} من ${fmtInt(d.attributed)} إعلانًا نعرف موقع نشرها.`)
                      : t(`Checking ${list(best.platforms)} would have reached ${fmtPct(best.share, 0)} of the ${fmtInt(d.attributed)} postings we can trace to a board.`,
                        `متابعة ${list(best.platforms)} كانت ستصل إلى ${fmtPct(best.share, 0)} من ${fmtInt(d.attributed)} إعلانًا نعرف موقع نشرها.`)}
                  </p>
                )}
                {d.small_sample && <Callout tone="warn">{t(`Only ${fmtInt(d.attributed)} postings here can be traced to a board: read the ranking as a hint, not a measurement.`,
                  `يمكن تتبع ${fmtInt(d.attributed)} إعلانًا فقط هنا إلى موقع نشرها: اقرأ الترتيب كإشارة لا كقياس.`)}</Callout>}
                <HBar handle={h} label={t("Job boards", "مواقع التوظيف")} maxLabel={28}
                  data={d.platforms.map((p) => ({ label: p.platform, value: p.postings, share: p.share,
                    note: t(`${fmtInt(p.only_here)} only on this board · latest ${fmtDate(p.last_posted)}${p.queried_directly ? " · read directly by Bosla" : ""}`,
                      `${fmtInt(p.only_here)} على هذا الموقع فقط · الأحدث ${fmtDate(p.last_posted)}${p.queried_directly ? " · يقرؤه بوصلة مباشرة" : ""}`) }))} />
                <div className="space-y-1 text-xs leading-5 text-ink-3">
                  {d.not_attributed > 0 && <p>{t(`${fmtInt(d.not_attributed)} of ${fmtInt(d.postings)} postings have no known board and are left out.`, `${fmtInt(d.not_attributed)} من ${fmtInt(d.postings)} إعلانًا بلا موقع نشر معروف ولم تُحتسب.`)}</p>}
                  {d.platform_count > d.platforms.length && <p>{t(`Showing the ${d.platforms.length} largest of ${fmtInt(d.platform_count)} boards.`, `يظهر أكبر ${d.platforms.length} من ${fmtInt(d.platform_count)} موقعًا.`)}</p>}
                  {(d.kaggle_2023_share ?? 0) >= 0.5
                    ? <p>{t(`${fmtPct(d.kaggle_2023_share, 0)} of these postings are from the 2023 archive (Google Jobs, which lists jobs from many boards), so this mostly shows where these jobs were listed in 2023.`,
                        `${fmtPct(d.kaggle_2023_share, 0)} من هذه الإعلانات من أرشيف 2023 (Google Jobs الذي يعرض وظائف من مواقع كثيرة)، لذا يُظهر هذا غالبًا أين نُشرت هذه الوظائف في 2023.`)}</p>
                    : <p>{t("Most of these postings were collected since 2024 from the specific sources Bosla queries, so the ranking partly reflects how Bosla collects, not only where jobs are posted.",
                        "جُمعت معظم هذه الإعلانات منذ 2024 من مصادر محددة يستعلمها بوصلة، لذا يعكس الترتيب جزئيًا طريقة الجمع، لا أماكن النشر وحدها.")}</p>}
                  {direct.length > 0 && <p>{t(`Bosla reads ${list(direct)} directly through their APIs, so they are over-represented here.`,
                    `يقرأ بوصلة ${list(direct)} مباشرةً عبر واجهاتها البرمجية، لذا تظهر هنا بأكثر من حجمها.`)}</p>}
                </div>
              </div>
            );
          }}
        </Guard>
      )}
    </ChartPanel>
  );
}
