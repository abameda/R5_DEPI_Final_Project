# Bosla logo — usage guide

**Bosla** (بوصلة, Egyptian Arabic for *compass*). The mark is the **b** of bosla: its bowl is a compass
dial and the needle points north-east, with the north half lit amber. One idea: *the name and the
direction in one letter.*

## Files (`final/`)

| File | Use |
|---|---|
| `bosla-horizontal.svg` | Primary logo: the **bosla** wordmark, where the compass-b is the first letter |
| `bosla-horizontal-ar.svg` | Arabic lockup, read right to left: mark on the right, بوصلة to its left |
| `bosla-stacked.svg` | Square spaces: the mark above *Bosla* and *بوصلة* |
| `bosla-symbol.svg` | The mark alone, from 32 px up |
| `bosla-symbol-small.svg` | Small-size cut with a solid needle, for 16–24 px |
| `bosla-favicon.svg`, `bosla-app-icon.svg` | Navy tile with a white mark (favicon: solid needle) |
| `*-reversed.svg` | White on navy or dark backgrounds |
| `*-black.svg` | One colour: print, stamps, embroidery, fax |
| `web/` | `favicon.ico` (16/32/48), PNG favicons, `apple-touch-icon.png`, `icon-192/512.png` |

The lettering is drawn as fixed shapes from Readex Pro 600 (Arabic weight 500 in the stacked version).
It is licensed under OFL 1.1, which allows logo use. No live text, filters or images are used.

## Construction

- 256-unit grid; one **stroke unit = 30** shared by the stem, the dial ring and the wordmark's weight.
- Dial: outer r 72, counter r 42, centred at (128, 160). The stem is the dial's west wall.
- Needle: a rhombus 66 × 26 at exactly 45°, split by a 4-unit pivot gap. North half amber, south half ink.
- Wordmark: the x-height equals the dial's height (144), on the dial's baseline; there are 14 units of
  space between the b and the o.

## Colour

The palette is the product's own theme tokens (`frontend/src/styles.css`), so the mark in the app and the
exported files are identical.

| Role | Hex | RGB | Site token |
|---|---|---|---|
| Ink (mark, wordmark) | `#0e1525` | 14 21 37 | `--ink` |
| Amber (north needle) | `#d9891a` | 217 137 26 | `--warn-fill` |
| Navy (tile, dark ground) | `#0f1b33` | 15 27 51 | `--rail` |
| White (reversed mark) | `#f3f5fa` | 243 245 250 | `--rail-ink` |

CMYK and Pantone values still need to be matched for print; check them on a press proof.

## Rules

- **Clear space:** the dial's ring width (30 units) on every side, measured from the mark's outer edge.
- **Minimum size:** symbol 16 px (use the small cut below 32 px); horizontal lockup 72 px wide; stacked 48 px wide.
- **Backgrounds:** use the colour mark on white or light grey. On navy or any dark background, use the
  reversed (white) version. Over photos, use one-colour white or black.
- **Never:** place the colour mark on amber (the needle disappears); recolour the needle; rotate the needle
  away from 45°; set "Bosla" in another typeface next to the mark; add a shadow, outline or gradient;
  put the mark next to a capital "B" (it already is the b).

## In the product

`frontend/src/components/Shell.tsx` `BrandMark` draws the small cut on the theme's `--rail` tile
(`--rail-ink` mark, `--warn-fill` needle), so it follows light and dark themes. The `frontend/public/`
folder has `favicon.svg`, `favicon.ico` and `apple-touch-icon.png` from this kit.

## Open items

- A professional trademark search before public launch (not done).
- Print colour matching (CMYK/Pantone).
- An `og:image` social preview made from the horizontal lockup.

Created by [abdelhmeed.com](https://abdelhmeed.com)
