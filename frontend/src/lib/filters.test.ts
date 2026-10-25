import { describe, expect, it } from "vitest";
import { activeCount, drillHref, EMPTY_FILTERS, filterBody, filterParams, isFilterKey, parseFilters } from "./filters";
import { fmtPct, fmtPp, fmtUsd } from "./format";

describe("URL filter state", () => {
  it("round-trips through the query string", () => {
    const sp = new URLSearchParams("country=Egypt&country=Qatar&role=Mobile&q=flutter&salary=advertised&provenance=observed&tab=pairs");
    const f = parseFilters(sp);
    expect(f.country).toEqual(["Egypt", "Qatar"]);
    expect(f.role).toEqual(["Mobile"]);
    expect(f.q).toBe("flutter");
    expect(f.salary).toBe("advertised");
    expect(f.provenance).toBe("observed");
    expect(new URLSearchParams(filterParams(f)).toString())
      .toBe("country=Egypt&country=Qatar&role=Mobile&q=flutter&salary=advertised&provenance=observed");
  });

  it("drops unknown or default scalar values", () => {
    const f = parseFilters(new URLSearchParams("salary=any&provenance=all&salary=bogus"));
    expect(f.salary).toBeUndefined();
    expect(f.provenance).toBeUndefined();
    expect(filterParams(f)).toEqual([]);
  });

  it("does not count the provenance switch as an active filter", () => {
    expect(activeCount({ ...EMPTY_FILTERS, provenance: "observed" })).toBe(0);
    expect(activeCount({ ...EMPTY_FILTERS, country: ["Egypt"], skill: ["SQL"] })).toBe(2);
  });

  it("drills down: keeps other filters, narrows the drilled facet, adds skills", () => {
    const cur = { ...EMPTY_FILTERS, country: ["Egypt"], role: ["Data Engineering", "Data Analysis & BI"], skill: ["SQL"] };
    expect(drillHref("/explorer", cur, { role: "Data Engineering" }))
      .toBe("/explorer?country=Egypt&role=Data+Engineering&skill=SQL");
    expect(drillHref("/explorer", cur, { skill: "Python" }))
      .toBe("/explorer?country=Egypt&role=Data+Engineering&role=Data+Analysis+%26+BI&skill=SQL&skill=Python");
    expect(drillHref("/skills", EMPTY_FILTERS, {}, { view: "SQL Server" })).toBe("/skills?view=SQL+Server");
  });

  it("builds JSON bodies without defaults", () => {
    expect(filterBody({ ...EMPTY_FILTERS, market: ["Arab"], provenance: "all" })).toEqual({ market: ["Arab"] });
  });

  it("separates filter keys from page-local keys", () => {
    expect(isFilterKey("country")).toBe(true);
    expect(isFilterKey("tab")).toBe(false);
    expect(isFilterKey("page")).toBe(false);
  });
});

describe("formatting", () => {
  it("keeps small shares visible", () => {
    expect(fmtPct(0.0004)).toBe("0.04%");
    expect(fmtPct(0.4567)).toBe("45.7%");
    expect(fmtPct(null)).toBe("—");
  });
  it("signs percentage-point gaps", () => {
    expect(fmtPp(3.21)).toBe("+3.2 pp");
    expect(fmtPp(-1)).toBe("−1.0 pp");
  });
  it("abbreviates salaries", () => {
    expect(fmtUsd(112104)).toBe("$112k");
    expect(fmtUsd(9542)).toBe("$9.5k");
  });
});
