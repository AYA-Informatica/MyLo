#!/usr/bin/env node
/**
 * Regenerates the MyLo wordmark as vector outlines inside brand/lockup.svg.
 *
 *   node brand/wordmark.mjs [path/to/LibreBaskerville-Regular.ttf]
 *
 * You only need to run this to change the wordmark's text, size or tracking.
 * Ordinary rendering (`npm run brand:render`) does not need the font at all,
 * because the outlines are baked into lockup.svg — which is the whole point.
 * Live <text> would silently fall back to a different serif on any machine
 * missing the font, so the logo would not be the same shape everywhere.
 *
 * Font: Libre Baskerville by Impallari Type, under the SIL Open Font License 1.1
 * (https://openfontlicense.org). Chosen for its high x-height and sturdy strokes,
 * which hold up where a more delicate serif would break down.
 *
 * The font file is not vendored — fetch it from Google Fonts when you need it:
 *   https://fonts.google.com/specimen/Libre+Baskerville
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const here = dirname(fileURLToPath(import.meta.url));

const TEXT = "MyLo";
const SIZE = 158; // cap height reads a touch smaller than Georgia at the same size
const TRACKING = 4; // a little air, echoing the original letterspaced wordmark
const CENTRE_X = 320; // lockup canvas is 640 wide
const BASELINE_Y = 486;

const fontPath = process.argv[2] || join(here, "LibreBaskerville-Regular.ttf");
const font = opentype.parse(
  readFileSync(fontPath).buffer
    ? readFileSync(fontPath)
    : readFileSync(fontPath),
);
const scale = SIZE / font.unitsPerEm;

// Lay the glyphs out by hand rather than via getPath(), so fonts whose OpenType
// feature tables opentype.js cannot fully parse still render.
const glyphs = [...TEXT].map((ch) => font.charToGlyph(ch));
const advances = glyphs.map((g) => g.advanceWidth * scale);
const totalWidth =
  advances.reduce((a, b) => a + b, 0) + TRACKING * (glyphs.length - 1);

let x = CENTRE_X - totalWidth / 2;
const paths = glyphs.map((g, i) => {
  const d = g.getPath(x, BASELINE_Y, SIZE).toPathData(2);
  x += advances[i] + TRACKING;
  return `    <path d="${d}" fill="INK" />`;
});

const svg = readFileSync(join(here, "lockup.svg"), "utf8");
const START = "<!-- WORDMARK:START -->";
const END = "<!-- WORDMARK:END -->";

if (!svg.includes(START) || !svg.includes(END)) {
  console.error(`lockup.svg is missing the ${START} / ${END} markers.`);
  process.exit(1);
}

const before = svg.slice(0, svg.indexOf(START) + START.length);
const after = svg.slice(svg.indexOf(END));
writeFileSync(
  join(here, "lockup.svg"),
  `${before}\n${paths.join("\n")}\n  ${after}`,
);

console.log(`Wordmark "${TEXT}" baked into lockup.svg`);
console.log(
  `  ${glyphs.length} glyphs, total width ${totalWidth.toFixed(1)}, centred on x=${CENTRE_X}`,
);
