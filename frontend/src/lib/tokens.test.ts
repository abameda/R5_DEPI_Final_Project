/// <reference types="node" />
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Read from disk: Vitest replaces CSS imports with an empty module.
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

/** Reads one custom property from the block that starts at `selector`. */
function token(selector: string, name: string): string {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  const m = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (start < 0 || !m) throw new Error(`--${name} not found in ${selector}`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Screen sharing compresses faint text first; the quietest text token keeps 5.5:1.
for (const [theme, selector] of [["light", ":root"], ["dark", ':root[data-theme="dark"]']] as const) {
  for (const ground of ["bg", "panel"]) {
    test(`${theme}: --ink-3 on --${ground} is at least 5.5:1`, () => {
      expect(contrast(token(selector, "ink-3"), token(selector, ground))).toBeGreaterThanOrEqual(5.5);
    });
  }
}
