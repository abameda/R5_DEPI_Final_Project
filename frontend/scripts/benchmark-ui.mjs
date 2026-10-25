// Measures real user-facing timings against a running production build.
//   node scripts/benchmark-ui.mjs http://127.0.0.1:8020 3
// - initial load: navigation start -> overview KPIs and the lattice rendered
// - filter update: choosing a market in the filter bar -> population line updated
// - route change: overview -> skills page with its main chart rendered
import { chromium } from "@playwright/test";

const [, , base = "http://127.0.0.1:8020", runsArg = "3"] = process.argv;
const runs = Number(runsArg);
const out = { load: [], filter: [], route: [], transferKB: [] };
const browser = await chromium.launch();

for (let i = 0; i < runs; i++) {
  // a new context each run = empty HTTP cache, like a first visit
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let bytes = 0;
  page.on("response", async (r) => { try { bytes += (await r.body()).length; } catch { /* redirects */ } });
  // vary the query so the API's result cache cannot answer the first load
  const t0 = Date.now();
  await page.goto(`${base}/?seniority=Not%20specified&salary=any&_r=${Date.now()}`.replace("&salary=any", ""));
  await page.getByText("Unique postings", { exact: true }).waitFor();
  await page.getByRole("grid", { name: /Share of each role/ }).waitFor();
  out.load.push(Date.now() - t0);
  out.transferKB.push(Math.round(bytes / 1024));

  const pop = page.getByText(/unique postings/).first();
  const before = await pop.textContent();
  const t1 = Date.now();
  await page.getByRole("button", { name: "Filter by market" }).click();
  await page.getByRole("option", { name: i % 2 ? /^Remote/ : /^Arab/ }).click();
  await page.waitForFunction((b) => {
    const el = [...document.querySelectorAll("span")].find((s) => s.textContent?.includes("unique postings"));
    return el && el.parentElement?.textContent !== b;
  }, before);
  await page.getByText("Unique postings", { exact: true }).waitFor();
  out.filter.push(Date.now() - t1);
  await page.keyboard.press("Escape");

  const t2 = Date.now();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Skills" }).click();
  await page.getByRole("heading", { name: "Most requested skills" }).waitFor();
  await page.locator("canvas").first().waitFor();
  out.route.push(Date.now() - t2);
  await ctx.close();
}
await browser.close();
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(JSON.stringify({ runs, median_ms: { initial_load: med(out.load), filter_update: med(out.filter), route_change: med(out.route) },
  all_ms: out, transfer_kb_first_load: med(out.transferKB) }, null, 2));
