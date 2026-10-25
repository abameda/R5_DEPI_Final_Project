import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ROUTES: [string, string][] = [
  ["/", "Market overview"], ["/explorer", "Job explorer"], ["/geography", "Geography"], ["/employers", "Employers"],
  ["/skills", "Skills intelligence"], ["/salary", "Salary lab"], ["/trends", "Time & cohorts"], ["/compare", "Compare markets"],
  ["/career", "Career planner"], ["/insights", "Guided insights"], ["/builder", "Insight builder"], ["/quality", "Data & methodology"],
];

/** Fails the test on any console error or failed API call. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("response", (r) => { if (r.url().includes("/api/") && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  return errors;
}

const population = (page: Page) => page.getByText(/unique postings/).first();

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
  await expect(page.getByText("This page does not exist")).toBeVisible();
});

test("a facet filter updates the URL, the chips and the population", async ({ page }) => {
  await page.goto("/");
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
  await page.goto("/?country=Egypt");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Skills" }).click();
  await expect(page).toHaveURL(/\/skills\?country=Egypt/);
  await expect(page.getByRole("button", { name: "Remove Egypt" })).toBeVisible();
});

test("keyword search is debounced into the URL", async ({ page }) => {
  await page.goto("/explorer");
  await page.getByPlaceholder("Search titles or employers").fill("Data Engineering");
  await expect(page).toHaveURL(/q=Data\+Engineering/);
  await expect(page.getByRole("button", { name: /Remove “Data Engineering”/ })).toBeVisible();
});

test("the lattice drills down with the keyboard", async ({ page }) => {
  await page.goto("/");
  const grid = page.getByRole("grid", { name: /Share of each role/ });
  await expect(grid).toBeVisible();
  const first = grid.getByRole("gridcell").first();
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/postings with skill data/).first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/explorer\?.*role=.*skill=/);
  await expect(page.getByText(/postings · page 1 of/)).toBeVisible();
});

test("explorer paginates, sorts and opens a posting", async ({ page }) => {
  await page.goto("/explorer");
  await expect(page.getByText(/page 1 of/).first()).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByLabel("Sort").selectOption("salary_high");
  await expect(page).toHaveURL(/sort=salary_high/);
  await expect(page).not.toHaveURL(/page=2/);
  await page.locator("tbody tr").first().getByRole("button").first().click();
  const detail = page.getByRole("complementary", { name: "Posting details" });
  await expect(detail.getByText(/written in posting/)).toBeVisible();
  await expect(detail.getByRole("heading", { name: "Salary" })).toBeVisible();
  await detail.getByRole("button", { name: "Close details" }).click();
  await expect(detail).toHaveCount(0);
});

test("empty results explain how to recover", async ({ page }) => {
  await page.goto("/explorer?q=zzzz-no-such-posting");
  await expect(page.getByText("No postings match these filters")).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Reset filters" }).click();
  await expect(page.getByText(/postings · page 1 of/)).toBeVisible();
});

test("chart panels switch to a table and export CSV", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Postings by role" });
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

test("career planner ranks missing skills for a role", async ({ page }) => {
  await page.goto("/career?target=Data%20Analysis%20%26%20BI");
  await page.getByRole("button", { name: "Add skill" }).click();
  await page.getByPlaceholder("Type a skill").fill("SQL");
  await page.getByRole("option", { name: "SQL", exact: true }).click();
  await expect(page).toHaveURL(/have=SQL/);
  await expect(page.getByText(/of the demand weight of the top 15 skills/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "What to learn next" })).toBeVisible();
  await expect(page.getByText("You have SQL.")).toBeVisible();
});

test("compare keeps global filters and allows all-vs-all", async ({ page }) => {
  await page.goto("/compare?country=Egypt");
  await page.getByLabel("Country").first().selectOption("");
  await page.getByLabel("Country").nth(1).selectOption("");
  await expect(page).toHaveURL(/cmp=1/);
  await expect(page).not.toHaveURL(/a\.country/);
  await expect(page).toHaveURL(/country=Egypt/);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Skills" }).click();
  await expect(page).toHaveURL(/\/skills\?country=Egypt/);
});

test("the lattice survives a filter change while a cell is focused", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
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
  const box = page.getByPlaceholder("Search titles or employers");
  await box.pressSequentially("data ");
  await page.waitForTimeout(700);
  await box.pressSequentially("engineer");
  await expect(page).toHaveURL(/q=data\+engineer/);
  await expect(box).toHaveValue("data engineer");
});

test("out-of-range pages snap back to the last page", async ({ page }) => {
  await page.goto("/explorer?page=99999");
  await expect(page.getByText(/postings · page \d+ of \d+/)).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Pipeline stages" })).toBeVisible();
  await expect(page.getByPlaceholder("Search titles or employers")).toHaveCount(0);
});

test("skip link reaches the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});

for (const path of ["/", "/explorer?job=demo000001", "/career?have=SQL", "/quality"]) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}
