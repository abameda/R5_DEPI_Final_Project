/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Screen sharing blurs small text: chart labels and axes stay at 13px or more.
// Heatmap cell labels (Geography) are the one exception: they sit inside cells and have a table view.
test("no chart text is smaller than 13px", () => {
  const dirs = ["../components", "../pages", "."].map((d) => new URL(`${d}/`, import.meta.url));
  const small: string[] = [];
  for (const dir of dirs) {
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".tsx") || (n.endsWith(".ts") && !n.endsWith(".test.ts")))) {
      readFileSync(new URL(f, dir), "utf8").split("\n").forEach((line, i) => {
        if (/fontSize: (\d|1[0-2])\b/.test(line) && !line.includes("heatmap-cell")) small.push(`${f}:${i + 1}`);
      });
    }
  }
  expect(small).toEqual([]);
});
