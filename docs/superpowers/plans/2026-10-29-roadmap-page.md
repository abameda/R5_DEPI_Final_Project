# Roadmap Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/roadmap` page that orders a role's skills into Foundations → Core → Stand out from Bosla's own postings, with links out to roadmap.sh.

**Architecture:** Pure stage and premium helpers in `api/queries/roadmap.py`, plus a `career_roadmap` query on the existing `Store`/`Filters`, served at `GET /api/career/roadmap` through `cached()`. A new React page reads it with `useApi` and shares the saved profile (`useProfile`) with `/career`.

**Tech Stack:** FastAPI + DuckDB (Python), pytest on the synthetic demo store; React + TypeScript + Tailwind, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-roadmap-page-design.md`

## Global Constraints

- Thresholds come from `api/labels.py`: `MIN_GROUP_POSTINGS` (30), `MIN_SALARY_N` (10), `RELIABLE_SALARY_N` (30). Never hard-code them.
- Foundations share ≥ 0.25 (fallback: the top 3 by share). Core: 0.05 ≤ share < 0.25, ranked by `wilson_lower`, max 8. Stand out: share < 0.05, positive within-market premium, max 6.
- Candidates are `top_skills(store, target, limit=40)`, minus the exclude list. Every skill appears in exactly one stage.
- Every user-visible string goes through `t(en, ar)`. The layout must work in RTL (logical properties: `ps-`, `border-s`, `start-`).
- External links use `target="_blank" rel="noopener noreferrer"`. No roadmap.sh content beyond links.
- Copy says overlap with postings, never hiring odds.
- Commits carry only the user's name, with no Claude trailer (user memory overrides the default attribution).

## Review Focus

1. **A role whose candidates all sit under 5%** (a small role such as Design & UX). Foundations still gets 3 skills, and Core can be empty. The page must render empty stages as hidden, not crash. Test: `test_roadmap_stages_partition_and_fallback` with a hand-built list where every share is < 0.05.
2. **A skill paid more only because its postings are in a higher-paying market.** It must not qualify. Test: `test_market_premium_ignores_market_mix`.
3. **A market with fewer than 10 salaries on either side** is skipped, not counted as zero. Test: `test_market_premium_skips_thin_markets`.
4. **A profile role that no longer exists, or is empty.** The page falls back to the first role, as `/career` does. Covered by reusing `Career.tsx`'s `target` expression in Task 3.
5. **Profile skills that differ in case from the data** ("sql" vs "SQL"). The ticks must still match. Use `haveSet` from `lib/profile.ts`, as `Career.tsx` does. Test: the e2e in Task 3 adds the skill through the picker and checks the tick.

---

### Task 1: Pure roadmap helpers

**Files:**
- Create: `api/queries/roadmap.py`
- Test: `tests/test_roadmap.py`
- Modify: `.gitignore` (add `.superpowers/`)

**Interfaces:**
- Produces:
  - `assign_stages(skills: list[dict]) -> dict[str, list[dict]]`. Input rows carry `skill`, `share`, `wilson_lower`, in `top_skills` order. Returns keys `"foundations"`, `"core"` and `"niche"`, where `"niche"` holds the share < 0.05 pool that Stand out is picked from. Core overflow (beyond 8) is dropped.
  - `market_premium(cells: list[dict]) -> dict | None`. Each cell is `{"market": str, "role_median": float, "role_n": int, "skill_median": float, "skill_n": int}`. Returns `{"premium": float, "salary_n": int, "markets": list[str]}`, or `None` when the usable markets total fewer than `RELIABLE_SALARY_N` salaries or the premium is ≤ 0.
  - `EXCLUDE: dict[str, frozenset[str]]`, keyed by role (`"*"` for every role).

- [ ] **Step 1: Write the failing tests**

```python
import pytest
from api.queries.roadmap import assign_stages, market_premium

def row(skill, share, wl=None): return {"skill": skill, "share": share, "wilson_lower": wl if wl is not None else share}
def names(rows): return [r["skill"] for r in rows]

def test_roadmap_stages_partition_and_fallback():
    s = assign_stages([row("A", .6), row("B", .3), row("C", .2), row("D", .1), row("E", .04)])
    assert names(s["foundations"]) == ["A", "B", "C"]  # only two reach 25%, so the top 3 are taken
    assert names(s["core"]) == ["D"] and names(s["niche"]) == ["E"]
    small = assign_stages([row(x, .04 - i * .001) for i, x in enumerate("ABCDE")])
    assert names(small["foundations"]) == ["A", "B", "C"] and small["core"] == []
    assert names(small["niche"]) == ["D", "E"]

def test_core_is_capped_and_overflow_dropped():
    rows = [row("F", .5)] + [row(f"c{i}", .2 - i * .01, wl=.2 - i * .01) for i in range(10)] + [row("n", .03)]
    s = assign_stages(rows)
    assert len(s["core"]) == 8
    assert [r["skill"] for r in s["niche"]] == ["n"]

def cell(m, rm, rn, sm, sn): return {"market": m, "role_median": rm, "role_n": rn, "skill_median": sm, "skill_n": sn}

def test_market_premium_ignores_market_mix():
    # pays exactly the role median inside each market, but sits mostly in the richer one
    assert market_premium([cell("Arab", 30000, 200, 30000, 15), cell("International", 100000, 500, 100000, 40)]) is None

def test_market_premium_weights_by_skill_salaries():
    p = market_premium([cell("Arab", 30000, 200, 33000, 10), cell("International", 100000, 500, 120000, 30)])
    assert p["premium"] == pytest.approx((0.1 * 10 + 0.2 * 30) / 40)
    assert p["salary_n"] == 40 and p["markets"] == ["Arab", "International"]

def test_market_premium_skips_thin_markets():
    assert market_premium([cell("Arab", 30000, 9, 90000, 40)]) is None
    assert market_premium([cell("Arab", 30000, 200, 33000, 25), cell("Remote", 50000, 200, 99000, 5)]) is None  # 25 < 30
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `.venv/Scripts/python.exe -m pytest tests/test_roadmap.py -v`
Expected: FAIL with `ModuleNotFoundError: api.queries.roadmap`

- [ ] **Step 3: Implement `assign_stages`, `market_premium` and `EXCLUDE` in `api/queries/roadmap.py`**

Order of operations in `assign_stages`:
1. Foundations = rows with share ≥ 0.25. When there are fewer than 3, take the first 3 rows by share.
2. Core = the remaining rows with share ≥ 0.05, sorted by `-wilson_lower`, cut to 8.
3. Niche = the remaining rows with share < 0.05.

`market_premium` keeps the cells where `role_n >= MIN_SALARY_N and skill_n >= MIN_SALARY_N`. The premium is Σ((sm − rm)/rm · sn) / Σsn. `markets` is sorted.

`EXCLUDE = {"*": frozenset(), "Data Analysis & BI": frozenset({"Go"}), "Data Engineering": frozenset({"Go"}), "Data Science & AI": frozenset({"Go"})}`. Task 2 decides on "Flow".

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `.venv/Scripts/python.exe -m pytest tests/test_roadmap.py -v`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add api/queries/roadmap.py tests/test_roadmap.py .gitignore
git commit -m "Add roadmap stage and within-market pay helpers"
```

---

### Task 2: Roadmap query and endpoint

**Files:**
- Modify: `api/queries/roadmap.py` (add `career_roadmap`)
- Modify: `api/main.py` (route next to `/api/career/gap`, around line 199)
- Test: `tests/test_api.py` (add to the career section, after line 201)

**Interfaces:**
- Consumes: `assign_stages`, `market_premium` and `EXCLUDE` from Task 1; `top_skills` and `wilson_lower` from `api/queries/skills.py`.
- Produces: `career_roadmap(store: Store, f: Filters, role: str, have: list[str]) -> dict` and `GET /api/career/roadmap?target_role=&have=&<filters>`. The response is:
  `{role, denominator, status: "ok"|"too_few_postings", provenance, min_group, stages: [{key: "foundations"|"core"|"stand_out", skills: [{skill, category, share, postings, observed, added, have, premium?, salary_n?, markets?}]}]}`.
  On `too_few_postings`, `stages` is `[]`. A `stand_out` stage with no skills is omitted.

- [ ] **Step 1: Write the failing API tests**

```python
def test_roadmap_stages_do_not_overlap(demo):
    res = get(demo, "/api/career/roadmap", target_role="Data Analysis & BI", have=["SQL"])
    assert res["status"] == "ok"
    names = [s["skill"] for st in res["stages"] for s in st["skills"]]
    assert len(names) == len(set(names))
    assert [st["key"] for st in res["stages"]][:2] == ["foundations", "core"]
    assert all(s["have"] == (s["skill"] == "SQL") for st in res["stages"] for s in st["skills"])
    for st in res["stages"]:
        if st["key"] == "stand_out":
            assert all(s["share"] < 0.05 and s["premium"] > 0 and s["salary_n"] >= 30 for s in st["skills"])

def test_roadmap_too_few_postings(demo):
    res = get(demo, "/api/career/roadmap", target_role="Mobile", country="Egypt", seniority="Intern")
    assert res["status"] == "too_few_postings" and res["stages"] == []

def test_roadmap_drops_excluded_skills(demo, monkeypatch):
    from api.queries import roadmap
    monkeypatch.setitem(roadmap.EXCLUDE, "Data Analysis & BI", frozenset({"SQL"}))
    res = get(demo, "/api/career/roadmap", target_role="Data Analysis & BI", country="Egypt")  # fresh cache key
    assert "SQL" not in [s["skill"] for st in res["stages"] for s in st["skills"]]

def test_roadmap_rejects_unknown_role(demo):
    assert demo["client"].get("/api/career/roadmap", params={"target_role": "Astronaut"}).status_code == 422
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `.venv/Scripts/python.exe -m pytest tests/test_api.py -k roadmap -v`
Expected: FAIL with 404 on `/api/career/roadmap`

- [ ] **Step 3: Implement `career_roadmap` and the route**

- Validate the role as `career_gap` does: 422 if it isn't in `store.domains["role_category"]`. Build `target = f.model_copy(update={"role": [role]})`, call `top_skills(target, limit=40)`, return `too_few_postings` when the denominator is below `MIN_GROUP_POSTINGS`, drop `EXCLUDE["*"] | EXCLUDE.get(role, ∅)`, and add `wilson_lower` and `have` to each row.
- For the niche pool, use one SQL query over `target.cte()` grouped by `market_type`. It returns, per (market, skill), the median advertised `salary_usd_annual` and the count. Then run one query for the role's median and count per market, also with `salary_kind = 'advertised'`. Feed both into `market_premium` and keep the top 6 by premium.
- Route: copy the `career_gap` handler signature. Call `cached("roadmap", f, lambda: roadmap.career_roadmap(get_store(), f, target_role, have), role=target_role, have=sorted(set(have)))`.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `.venv/Scripts/python.exe -m pytest tests/ -v`
Expected: all PASS, with no regressions in `test_api.py`

- [ ] **Step 5: Decide on "Flow" from the real store**

Run: `.venv/Scripts/python.exe -c "import duckdb; c=duckdb.connect('data/analytics/jmi.duckdb', read_only=True); print(c.sql(\"select j.title from jobs j join job_skills s using(jid) where s.skill='Flow' using sample 15\").fetchall())"`
If the titles show no workflow-tool sense (Power Automate, Salesforce Flow), add `"Flow"` to `EXCLUDE["*"]`. Otherwise leave it. Record the decision in a one-line comment above `EXCLUDE`.

- [ ] **Step 6: Commit**

```bash
git add api/queries/roadmap.py api/main.py tests/test_api.py
git commit -m "Serve role roadmaps from posting demand"
```

---

### Task 3: Roadmap page

**Files:**
- Create: `frontend/src/pages/Roadmap.tsx`
- Create: `frontend/src/lib/roadmaps.ts` (role → roadmap.sh links)
- Create: `frontend/src/lib/roadmaps.test.ts`
- Modify: `frontend/src/lib/types.ts` (add `Roadmap` after `CareerGap`)
- Modify: `frontend/src/main.tsx` (route next to `/career`, line 61)
- Modify: `frontend/src/components/Shell.tsx:24` (nav item after "My skills & plan", `filters: false`, a lucide icon such as `Milestone`)
- Test: `frontend/e2e/app.spec.ts` (add `["/roadmap", "Roadmap"]` to the page list on line 8, one flow test, and `/roadmap` in the a11y loop on line 280); `frontend/e2e/mobile.spec.ts` (one-column check)

**Interfaces:**
- Consumes: the `/api/career/roadmap` response from Task 2; `useProfile`, `haveSet`, `useApi`, `useFilters`, `useMeta`, `Guard`, `Empty`, `PageHeader`, `Segmented`, `Callout`, `drillHref` and `t`/`tv`, all as used in `frontend/src/pages/Career.tsx`.
- Produces: `roadmapLinks(role: string): { label: string; href: string }[]`. It returns `[]` for unmapped roles.

- [ ] **Step 1: Write the failing vitest**

```ts
import { roadmapLinks } from "./roadmaps";
test("maps roles to roadmap.sh and skips unmapped ones", () => {
  expect(roadmapLinks("Data Analysis & BI").map((l) => l.href)).toEqual(["https://roadmap.sh/data-analyst", "https://roadmap.sh/bi-analyst"]);
  expect(roadmapLinks("Mobile").map((l) => l.href)).toEqual(["https://roadmap.sh/android", "https://roadmap.sh/ios"]);
  expect(roadmapLinks("IT Support & Networking")).toEqual([]);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd frontend && npx vitest run src/lib/roadmaps.test.ts`
Expected: FAIL, module not found

- [ ] **Step 3: Implement `roadmaps.ts` using the spec's table verbatim**

Before writing it, run `curl -s -o /dev/null -w "%{http_code}" https://roadmap.sh/ios`. Drop `/ios` if the result isn't 200, and update the test.

- [ ] **Step 4: Write the failing e2e test**

```ts
test("the roadmap orders skills and shares your profile with the plan", async ({ page }) => {
  await page.goto("/roadmap");
  await page.getByLabel("Role you want").selectOption("Data Analysis & BI");
  await expect(page.getByRole("heading", { name: "Foundations" })).toBeVisible();
  const done = page.getByText(/\d+ of \d+ done/);
  const before = await done.textContent();
  await page.getByRole("button", { name: /^I have / }).first().click();
  await expect(done).not.toHaveText(before!);
  await expect(page.getByRole("link", { name: /roadmap\.sh/ }).first()).toHaveAttribute("target", "_blank");
  await page.goto("/career");
  await expect(page.getByRole("button", { name: /^Remove / }).first()).toBeVisible();
});
```

In `mobile.spec.ts`, at the phone viewport, check that two chips in the Foundations grid share the same x offset (one column).

- [ ] **Step 5: Build `Roadmap.tsx`, the type, the route and the nav item**

- Layout A from the spec: the role select (same `roles` and `target` expressions as `Career.tsx:22-23`), the market `Segmented`, and the "N of M done" pill. Then an `<ol>` with `border-s`, one `<li>` per stage with a marker dot (`good` when every skill in the stage is had, `warn` otherwise), a stage heading (`h2`: Foundations / Core / Stand out), the rule line, and a `grid sm:grid-cols-2` of chips. Finish with the roadmap.sh links.
- A chip shows the skill name, which links to `drillHref("/skills", filters, {}, { view: skill })`. For Foundations and Core it shows `fmtPct(share, 0)`; for Stand out it shows `+{fmtPct(premium, 0)} pay`, with a `title` that names the markets. The toggle button has `aria-label` "I have {skill}" or "Remove {skill}" and calls `addSkill` or `removeSkill`. Show the "mostly team-added" marker under the same rule as `Career.tsx:162`.
- `too_few_postings`: show the same `Empty` copy as `Career.tsx:85-87`. When provenance is `all`, show the same `Callout` as `Career.tsx:249-252`.
- Arabic strings: «خارطة الطريق», «الأساسيات», «الجوهر», «للتميّز», «من {M} أنجزت {N}», «مصادر تعلّم على roadmap.sh (موقع خارجي)».

- [ ] **Step 6: Run unit tests, typecheck and e2e**

Run: `cd frontend && npx vitest run && npx tsc -b && npx playwright test`
Expected: all pass, including the axe check on `/roadmap` with no serious violations

- [ ] **Step 7: Check it in the browser**

Start the app from `.claude/launch.json` with `preview_start`. Open `/roadmap` and screenshot it in English, Arabic (RTL) and at mobile width. Check there are no console errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Roadmap.tsx frontend/src/lib/roadmaps.ts frontend/src/lib/roadmaps.test.ts frontend/src/lib/types.ts frontend/src/main.tsx frontend/src/components/Shell.tsx frontend/e2e/app.spec.ts frontend/e2e/mobile.spec.ts
git commit -m "Add the Roadmap page"
```
