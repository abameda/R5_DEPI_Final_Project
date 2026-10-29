import { expect, test } from "vitest";
import { withoutSkill } from "./profile";

test("removing a skill ignores case, matching how ticks are shown", () => {
  expect(withoutSkill(["sql", "Python"], "SQL")).toEqual(["Python"]);
  expect(withoutSkill(["SQL", "Sql", "R"], "sql")).toEqual(["R"]);
});
