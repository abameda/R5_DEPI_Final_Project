import { chromium } from "@playwright/test";
const [,, outDir, theme = "light", w = "1440", only = ""] = process.argv;
const routes = [
  ["overview", "/"], ["explorer", "/explorer?country=Egypt&job="], ["skills", "/skills?view=Python"], ["skills-by", "/skills?tab=by&dim=market_type"],
  ["skills-pairs", "/skills?tab=pairs"], ["salary", "/salary?dim=country"], ["geography", "/geography"], ["career", "/career?target=Data%20Analysis%20%26%20BI&have=SQL&have=Excel&market=Arab"],
  ["compare", "/compare"], ["employers", "/employers?name=Deloitte"], ["trends", "/trends"], ["quality", "/quality"],
  ["builder", "/builder?dimension=skill&split=market_type&metric=share"], ["insights", "/insights?market=Arab"],
].filter(([n]) => !only || only.split(",").includes(n));
const b = await chromium.launch();
for (const [name, path] of routes) {
  const p = await b.newPage({ viewport: { width: +w, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
  const errs = [];
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
  p.on("response", (r) => { if (r.url().includes("/api/") && r.status() >= 400) errs.push(`${r.status()} ${r.url().slice(0, 150)}`); });
  const t = Date.now();
  await p.goto("http://localhost:5173" + path, { waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${outDir}/${name}-${theme}-${w}.png`, fullPage: true });
  console.log(name.padEnd(14), `${Date.now() - t}ms`, errs.length ? JSON.stringify(errs) : "ok");
  await p.close();
}
await b.close();
