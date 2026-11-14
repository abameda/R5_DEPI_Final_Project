import { expect, test } from "vitest";
import { broaderWhere, readProfile, whereFilters, withoutSkill } from "./profile";

test("removing a skill ignores case, matching how ticks are shown", () => {
  expect(withoutSkill(["sql", "Python"], "SQL")).toEqual(["Python"]);
  expect(withoutSkill(["SQL", "Sql", "R"], "sql")).toEqual(["R"]);
});

test("each place maps to the filters that select it", () => {
  expect(whereFilters("egypt")).toEqual({ country: ["Egypt"] });
  expect(whereFilters("arab")).toEqual({ market: ["Arab"] });
  expect(whereFilters("remote")).toEqual({ market: ["Remote"] });
  expect(whereFilters("international")).toEqual({ market: ["International"] });
  expect(whereFilters("any")).toEqual({});
});

test("a place too small to show widens one step at a time", () => {
  expect(broaderWhere("egypt")).toBe("arab");
  expect(broaderWhere("arab")).toBe("any");
  expect(broaderWhere("remote")).toBe("any");
  expect(broaderWhere("international")).toBe("any");
  expect(broaderWhere("any")).toBeNull();
});

test("profiles saved before 'where' existed read as anywhere", () => {
  expect(readProfile('{"role":"Backend","skills":["SQL"]}')).toEqual({ role: "Backend", skills: ["SQL"], where: "any" });
  expect(readProfile('{"role":"Backend","skills":[],"where":"mars"}').where).toBe("any");
  expect(readProfile('{"role":"","skills":[],"where":"egypt"}').where).toBe("egypt");
  expect(readProfile(null)).toEqual({ role: "", skills: [], where: "any" });
  expect(readProfile("{not json").where).toBe("any");
});
