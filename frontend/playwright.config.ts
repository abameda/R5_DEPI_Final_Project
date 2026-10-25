import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the SYNTHETIC demo store, so they work on any
 * machine without the restricted raw data. Both servers start on their own
 * ports and do not touch a dev session on 8000/5173.
 */
// Relative to the repository root, where the API server is started (cwd "..").
const python = process.env.PYTHON ?? (process.platform === "win32" ? ".venv\\Scripts\\python.exe" : ".venv/bin/python");
const apiPort = 8011;
const webPort = 5181;

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://127.0.0.1:${webPort}`, trace: "retain-on-failure", reducedMotion: "reduce" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile.spec.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: [
    {
      command: `${python} scripts/make_demo_data.py --db data/analytics/e2e.duckdb && ${python} -m uvicorn api.main:app --port ${apiPort}`,
      cwd: "..",
      env: { JMI_DB: "data/analytics/e2e.duckdb" },
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${webPort} --strictPort`,
      env: { JMI_API: `http://127.0.0.1:${apiPort}` },
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
