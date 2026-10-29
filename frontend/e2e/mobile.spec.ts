import { expect, test } from "@playwright/test";

test("mobile: navigation opens from the menu button", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "My skills & plan" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My skills & plan" })).toBeVisible();
});

test("mobile: facets fold behind a Filters button", async ({ page }) => {
  await page.goto("/market");
  const market = page.getByRole("button", { name: "Filter by market" });
  await expect(market).toBeHidden();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(market).toBeVisible();
});

test("mobile: no horizontal page scroll", async ({ page }) => {
  for (const path of ["/", "/market", "/explorer", "/explorer?job=demo000001", "/skills", "/salary", "/career", "/compare", "/quality"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
