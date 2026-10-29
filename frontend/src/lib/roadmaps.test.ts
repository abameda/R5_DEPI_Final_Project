import { expect, test } from "vitest";
import { roadmapLinks } from "./roadmaps";

test("maps roles to roadmap.sh and skips unmapped ones", () => {
  expect(roadmapLinks("Data Analysis & BI").map((l) => l.href)).toEqual(["https://roadmap.sh/data-analyst", "https://roadmap.sh/bi-analyst"]);
  expect(roadmapLinks("Mobile").map((l) => l.href)).toEqual(["https://roadmap.sh/android", "https://roadmap.sh/ios"]);
  expect(roadmapLinks("IT Support & Networking")).toEqual([]);
});
