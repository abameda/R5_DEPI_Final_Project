"""Where postings are listed: per-platform coverage of a segment ("Where should I search?")
and every listing of one posting ("Also posted on").

A posting found on three boards was de-duplicated to ONE posting, but the
`job_listings` table keeps all three listings, so each board is credited with
it. Coverage therefore answers: of the unique postings in this selection that
we can attribute to a named platform, what share could you have found on each
one? It describes where the team's collection found postings, not each board's
full inventory: boards the team queries through their own API are
over-represented, and the response flags them.
"""
from __future__ import annotations

from ..db import Store
from ..filters import Filters
from ..labels import MIN_GROUP_POSTINGS, share

UNATTRIBUTED = "Not attributed"
# Boards whose postings the team pulls straight from their own API (collectors.py
# and the earlier API collection). Every posting they publish in a query reaches
# the sample, so they are over-represented next to boards seen only through
# Google Jobs (the 2023 archive). The panel names them.
QUERIED_DIRECTLY = {"Careerjet", "Jooble", "startup.jobs", "Arbeitnow", "Himalayas", "Jobicy", "Remote OK",
                    "Remotive", "We Work Remotely", "Employer careers page"}
TOP_PLATFORMS = 15
COMBINE_UP_TO = 3


def where_to_search(store: Store, f: Filters) -> dict:
    cte, params = f.cte()
    base = f"""{cte}, l AS (
        SELECT l.jid, l.platform, l.url, l.posted_date FROM job_listings l JOIN f USING (jid)
        WHERE l.platform <> '{UNATTRIBUTED}')"""
    totals = store.one(f"""{cte}
        SELECT count(*) AS postings,
               count(*) FILTER (WHERE cohort = 'kaggle_2023') AS kaggle_2023,
               count(*) FILTER (WHERE jid IN (SELECT jid FROM job_listings
                                              WHERE platform <> '{UNATTRIBUTED}')) AS attributed
        FROM f""", params)
    attributed = totals["attributed"] or 0
    rows = store.rows(f"""{base},
        single AS (SELECT jid FROM l GROUP BY jid HAVING count(DISTINCT platform) = 1)
        SELECT platform, count(DISTINCT jid) AS postings,
               count(DISTINCT jid) FILTER (WHERE jid IN (SELECT jid FROM single)) AS only_here,
               count(DISTINCT jid) FILTER (WHERE url IS NOT NULL) AS with_link,
               max(posted_date) AS last_posted
        FROM l GROUP BY platform ORDER BY postings DESC, platform""", params)
    for r in rows:
        r["share"] = share(r["postings"], attributed)
        r["only_here_share"] = share(r["only_here"], r["postings"])
        r["queried_directly"] = r["platform"] in QUERIED_DIRECTLY

    # Greedy "if you only check N boards": add the board that reaches the most
    # postings not yet covered by the boards already chosen.
    chosen: list[str] = []
    combination = []
    for _ in range(min(COMBINE_UP_TO, len(rows))):
        placeholders = ", ".join("?" * len(chosen)) or "NULL"
        best = store.one(f"""{base},
            covered AS (SELECT DISTINCT jid FROM l WHERE platform IN ({placeholders}))
            SELECT platform, count(DISTINCT jid) AS added FROM l
            WHERE jid NOT IN (SELECT jid FROM covered) GROUP BY platform
            ORDER BY added DESC, platform LIMIT 1""", [*params, *chosen])
        if not best or not best["added"]:
            break
        chosen.append(best["platform"])
        reached = (combination[-1]["reached"] if combination else 0) + best["added"]
        combination.append({"platforms": list(chosen), "added": best["added"], "reached": reached,
                            "share": share(reached, attributed)})

    return {
        "postings": totals["postings"] or 0,
        "attributed": attributed,
        "not_attributed": (totals["postings"] or 0) - attributed,
        "kaggle_2023_share": share(totals["kaggle_2023"] or 0, totals["postings"] or 0),
        "platform_count": len(rows),
        "platforms": rows[:TOP_PLATFORMS],
        "combination": combination,
        "small_sample": attributed < MIN_GROUP_POSTINGS,
    }


def listings(store: Store, jid: int) -> list[dict]:
    return store.rows("""SELECT platform, source_platform, url, posted_date FROM job_listings
                         WHERE jid = ? ORDER BY platform = ?, platform""", [jid, UNATTRIBUTED])
