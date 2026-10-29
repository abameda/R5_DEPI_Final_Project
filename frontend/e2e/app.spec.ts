import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ROUTES: [string, string][] = [
  ["/", "Understand the job market. See where you fit. Know what comes next."], ["/market", "Market overview"],
  ["/explorer", "Jobs"], ["/geography", "Locations"], ["/employers", "Employers"],
  ["/skills", "Skills in demand"], ["/salary", "Salaries"], ["/trends", "Over time"], ["/compare", "Compare markets"],
  ["/career", "My skills & plan"], ["/roadmap", "Roadmap"], ["/insights", "Guided insights"], ["/builder", "Insight builder"], ["/quality", "Data & methodology"],
];

/** Fails the test on any console error or failed API call. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("response", (r) => { if (r.url().includes("/api/") && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  return errors;
}

const population = (page: Page) => page.getByText(/unique postings/).first();

// These tests check the full analysis, so they start in Advanced mode (Simple is the visitor default)
// unless a test has already picked a mode itself.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem("jmi-mode")) localStorage.setItem("jmi-mode", "advanced"); });
});

for (const [path, heading] of ROUTES) {
  test(`route ${path} renders without errors`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText("Synthetic demo data")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("alert").filter({ hasText: "could not be loaded" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("unknown routes show a helpful page", async ({ page }) => {
  await page.goto("/nope");
  await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Search jobs" })).toBeVisible();
});

test("a facet filter updates the URL, the chips and the population", async ({ page }) => {
  await page.goto("/market");
  const before = await population(page).textContent();
  await page.getByRole("button", { name: "Filter by market" }).click();
  await page.getByRole("option", { name: /^Arab/ }).click();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/market=Arab/);
  await expect(page.getByRole("button", { name: "Remove Arab" })).toBeVisible();
  await expect(population(page)).not.toHaveText(before!);
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page).not.toHaveURL(/market=/);
});

test("filters survive navigation between modules", async ({ page }) => {
  await page.goto("/market?country=Egypt");
  const menu = page.getByRole("navigation", { name: "Main navigation" });
  await menu.getByRole("button", { name: "Market" }).click();
  await menu.getByRole("link", { name: "Skills in demand" }).click();
  await expect(page).toHaveURL(/\/skills\?country=Egypt/);
  await expect(page.getByRole("button", { name: "Remove Egypt" })).toBeVisible();
});

test("job search from the top bar lands in the URL", async ({ page }) => {
  await page.goto("/explorer");
  await page.getByPlaceholder("Search jobs by title or employer").fill("Data Engineering");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=Data\+Engineering/);
  await expect(page.getByRole("button", { name: /Remove “Data Engineering”/ })).toBeVisible();
});

test("search from Home opens Jobs with the query", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder(/Job title or employer/).fill("analyst");
  await page.getByRole("button", { name: "Find jobs" }).click();
  await expect(page).toHaveURL(/\/explorer\?q=analyst/);
  await expect(page.getByRole("heading", { level: 1, name: "Jobs" })).toBeVisible();
});

test("the lattice drills down with the keyboard", async ({ page }) => {
  await page.goto("/market");
  const grid = page.getByRole("grid", { name: /Share of each role/ });
  await expect(grid).toBeVisible();
  const first = grid.getByRole("gridcell").first();
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/postings with skill data/).first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/explorer\?.*role=.*skill=/);
  await expect(page.getByText(/Page 1 of/)).toBeVisible();
});

test("explorer paginates, sorts and opens a posting", async ({ page }) => {
  await page.goto("/explorer");
  await expect(page.getByText(/Page 1 of/).first()).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByLabel("Sort").selectOption("salary_high");
  await expect(page).toHaveURL(/sort=salary_high/);
  await expect(page).not.toHaveURL(/page=2/);
  await page.getByRole("main").getByRole("listitem").first().getByRole("button").first().click();
  const detail = page.getByRole("complementary", { name: "Job details" });
  await expect(detail.getByText(/written in the posting/)).toBeVisible();
  await expect(detail.getByRole("heading", { name: "How you match" })).toBeVisible();
  await detail.getByRole("button", { name: "Close details" }).click();
  await expect(detail).toHaveCount(0);
});

test("job detail compares the posting with your skills", async ({ page }) => {
  await page.goto("/explorer");
  await page.getByRole("main").getByRole("listitem").first().getByRole("button").first().click();
  const detail = page.getByRole("complementary", { name: "Job details" });
  const strip = detail.getByRole("list", { name: /skills listed in this posting/ });
  if (await strip.count()) {
    await strip.getByRole("listitem").first().click();
    await expect(detail.getByText(/You have \d+ of the \d+ skills this posting lists/)).toBeVisible();
    await expect(page.getByRole("link", { name: /· 1 skills/ })).toBeVisible();
  }
});

test("empty results explain how to recover", async ({ page }) => {
  await page.goto("/explorer?q=zzzz-no-such-posting");
  await expect(page.getByText("No jobs match these filters")).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.getByText(/Page 1 of/)).toBeVisible();
});

test("chart panels switch to a table and export CSV", async ({ page }) => {
  await page.goto("/market");
  const panel = page.getByRole("region", { name: "Which roles are hiring" });
  await panel.getByRole("button", { name: "Show as table" }).click();
  await expect(panel.getByRole("table")).toBeVisible();
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Download table as CSV" }).click();
  expect((await download).suggestedFilename()).toBe("roles.csv");
});

test("theme choice persists across reloads", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /theme$/ });
  const was = await page.locator("html").getAttribute("data-theme");
  await toggle.click();
  const now = was === "dark" ? "light" : "dark";
  await expect(page.locator("html")).toHaveAttribute("data-theme", now);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", now);
});

test("Simple mode keeps the job seeker's pages and hides the analysis", async ({ page }) => {
  await page.goto("/market");
  const menu = page.getByRole("navigation", { name: "Main navigation" });
  await page.getByRole("radio", { name: "Simple" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(menu.getByRole("link", { name: "Market overview" })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "My skills & plan" })).toBeVisible();
  await page.goto("/skills");
  await expect(page.getByRole("radiogroup", { name: "Skills view" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Written in posting" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("radio", { name: "Simple" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Advanced" }).click();
  await menu.getByRole("button", { name: "Market" }).click();
  await expect(menu.getByRole("link", { name: "Market overview" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Skills view" })).toBeVisible();
});

test("Arabic switches the interface to right-to-left and persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "العربية" }).click();
  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "ar");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("link", { name: "الرئيسية", exact: true })).toBeVisible();
  await page.reload();
  await expect(html).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "English" }).click();
  await expect(html).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible();
});

test("the provenance switch changes how skills are counted", async ({ page }) => {
  await page.goto("/skills");
  await page.getByRole("radio", { name: "Written in posting" }).click();
  await expect(page).toHaveURL(/provenance=observed/);
  await expect(page.getByText("Skills: only those written in the posting data")).toBeVisible();
});

test("skill profile opens from the URL and closes", async ({ page }) => {
  await page.goto("/skills?view=Python");
  await expect(page.getByRole("heading", { name: /Skill profile: Python/ })).toBeVisible();
  await expect(page.getByText(/written in the posting/).first()).toBeVisible();
  await page.getByRole("button", { name: "Close skill profile" }).click();
  await expect(page).not.toHaveURL(/view=/);
});

test("the plan ranks missing skills and remembers your skills", async ({ page }) => {
  await page.goto("/career?target=Data%20Analysis%20%26%20BI");
  // the shared link seeds the profile, then the URL is tidied
  await expect(page).toHaveURL(/\/career$/);
  await expect(page.getByLabel("Role you want")).toHaveValue("Data Analysis & BI");
  await expect(page.getByRole("heading", { name: "What to learn next" })).toBeVisible();
  await page.getByRole("button", { name: "Add skill" }).click();
  await page.getByPlaceholder("Type a skill").fill("SQL");
  await page.getByRole("option", { name: /^SQL/ }).first().click();
  await expect(page.getByRole("button", { name: "Remove SQL" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /You have \d+ of the \d+ skills .* ask for most/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What to learn next" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Remove SQL" })).toBeVisible();
});

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

test("compare keeps global filters and allows all-vs-all", async ({ page }) => {
  await page.goto("/compare?country=Egypt");
  await page.getByLabel("Country").first().selectOption("");
  await page.getByLabel("Country").nth(1).selectOption("");
  await expect(page).toHaveURL(/cmp=1/);
  await expect(page).not.toHaveURL(/a\.country/);
  await expect(page).toHaveURL(/country=Egypt/);
  const menu = page.getByRole("navigation", { name: "Main navigation" });
  await menu.getByRole("button", { name: "Market" }).click();
  await menu.getByRole("link", { name: "Skills in demand" }).click();
  await expect(page).toHaveURL(/\/skills\?country=Egypt/);
});

test("the lattice survives a filter change while a cell is focused", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/market");
  const cells = page.getByRole("grid", { name: /Share of each role/ }).getByRole("gridcell");
  await cells.first().focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
  await page.getByRole("button", { name: /^Filter by role/ }).click();
  await page.getByRole("option").first().click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { level: 1, name: "Market overview" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("search keeps spaces typed after a pause", async ({ page }) => {
  await page.goto("/explorer");
  const box = page.getByPlaceholder("Search jobs by title or employer");
  await box.pressSequentially("data ");
  await page.waitForTimeout(700);
  await box.pressSequentially("engineer");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=data\+engineer/);
  await expect(box).toHaveValue("data engineer");
});

test("out-of-range pages snap back to the last page", async ({ page }) => {
  await page.goto("/explorer?page=99999");
  await expect(page.getByText(/Page \d+ of \d+/)).toBeVisible();
  await expect(page.getByRole("main").getByRole("listitem").first()).toBeVisible();
});

test("compare presets define both segments", async ({ page }) => {
  await page.goto("/compare");
  await page.getByLabel("Preset").selectOption({ label: "Junior vs Senior" });
  await expect(page).toHaveURL(/a\.seniority=Junior&b\.seniority=Senior/);
  await expect(page.getByRole("heading", { name: "Side by side" })).toBeVisible();
});

test("builder disables measures that do not apply per skill", async ({ page }) => {
  await page.goto("/builder?dimension=skill");
  const remote = page.getByLabel("Measure").locator("option", { hasText: "Share remote" });
  await expect(remote).toHaveAttribute("disabled", "");
  await expect(page.getByRole("heading", { name: /by skill/ })).toBeVisible();
});

test("the methodology page ignores the filter bar", async ({ page }) => {
  await page.goto("/quality");
  await expect(page.getByRole("heading", { name: "How the dataset was built" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Filter by market" })).toHaveCount(0);
});

test("skip link reaches the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});

for (const path of ["/", "/market", "/explorer?job=demo000001", "/career?have=SQL", "/roadmap", "/quality"]) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}
