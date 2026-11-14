import { expect, test } from "vitest";
import { EMPTY_FILTERS, type Filters } from "./filters";
import { dialAngle, matchFilters } from "./match";

const base: Filters = { ...EMPTY_FILTERS, country: ["Egypt"], market: ["Arab"], region: ["Arab"], role: ["Backend"], seniority: ["Junior"], provenance: "observed" };

test("the global match strips every location filter and the role, and keeps the rest", () => {
  const f = matchFilters(base, "global", "egypt", "all");
  expect([f.country, f.market, f.region, f.role]).toEqual([[], [], [], []]);
  expect(f.provenance).toBe("observed");
  expect(f.seniority).toEqual(["Junior"]);
});

test("a local match applies the profile's location instead of the page's", () => {
  const f = matchFilters(base, "local", "remote", "all");
  expect(f.market).toEqual(["Remote"]);
  expect(f.country).toEqual([]);
  expect(f.region).toEqual([]);
  expect(matchFilters(base, "local", "egypt", "all").country).toEqual(["Egypt"]);
});

test("recent keeps only the 2024–26 collection; all clears any cohort", () => {
  expect(matchFilters(EMPTY_FILTERS, "global", "any", "recent").cohort).toEqual(["collected_2026"]);
  expect(matchFilters({ ...EMPTY_FILTERS, cohort: ["kaggle_2023"] }, "global", "any", "all").cohort).toEqual([]);
});

test("the dial angle runs from -90° at 0% to 90° at 100%", () => {
  expect([dialAngle(0), dialAngle(0.5), dialAngle(1), dialAngle(2), dialAngle(-1), dialAngle(NaN)]).toEqual([-90, 0, 90, 90, -90, -90]);
});
