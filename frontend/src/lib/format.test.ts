import { expect, test } from "vitest";
import { advertRel, isWebLink } from "./format";

test("only http(s) adverts are links", () => {
  expect(isWebLink("https://example.com/job/1")).toBe(true);
  expect(isWebLink("javascript:alert(1)")).toBe(false);
  expect(isWebLink(null)).toBe(false);
});

test("Remote OK links are followed as its terms ask; every other advert is nofollow", () => {
  expect(advertRel("https://remoteok.com/remote-jobs/123")).toBe("noopener");
  expect(advertRel("https://www.remoteok.com/remote-jobs/123")).toBe("noopener");
  expect(advertRel("https://remoteok.com.evil.test/x")).toBe("noopener noreferrer nofollow");
  expect(advertRel("https://himalayas.app/companies/x/jobs/y")).toBe("noopener noreferrer nofollow");
});
