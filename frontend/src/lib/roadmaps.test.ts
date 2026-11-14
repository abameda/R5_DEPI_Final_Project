import { expect, test } from "vitest";
import { roadmapLinks, skillAnchor } from "./roadmaps";

test("maps roles to roadmap.sh and skips unmapped ones", () => {
  expect(roadmapLinks("Data Analysis & BI").map((l) => l.href)).toEqual(["https://roadmap.sh/data-analyst", "https://roadmap.sh/bi-analyst"]);
  expect(roadmapLinks("Mobile").map((l) => l.href)).toEqual(["https://roadmap.sh/android", "https://roadmap.sh/ios"]);
  expect(roadmapLinks("IT Support & Networking")).toEqual([]);
});

test("each roadmap skill has a stable anchor for links from the Compass", () => {
  expect(skillAnchor("Power BI")).toBe("skill-power-bi");
  expect(skillAnchor("C++")).toBe("skill-cplusplus");
  expect(skillAnchor("C#")).toBe("skill-csharp");
  expect(skillAnchor("C")).toBe("skill-c");
  expect(skillAnchor("Node.js")).toBe("skill-node-js");
  expect(skillAnchor("  SQL ")).toBe("skill-sql");
});
