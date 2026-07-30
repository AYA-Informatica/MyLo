#!/usr/bin/env node
/**
 * Renders the MyLo brand assets from the SVG sources in this directory.
 *
 *   npm run brand:render
 *
 * The SVGs are the source of truth; every PNG in the apps is generated from them,
 * so the brand can be re-cut at any size without redrawing anything. Colours are
 * tokenised as INK and SUN in the sources and substituted here, which is why one
 * source yields both the navy and the reversed-white variants.
 *
 * Outputs are written straight into the apps:
 *
 *   MyLo-frontend/src/assets/Logodark.png  navy lockup, for light backgrounds
 *   MyLo-frontend/src/assets/Logo.png      white lockup, for dark backgrounds
 *   MyLo-frontend/public/favicon.png       rounded-square app icon
 *   MyLo-Backend/public/logo.png           navy lockup for HTML email
 *
 * Logo.png and Logodark.png keep the filenames the MenyaLo assets used, and the
 * lockup keeps their aspect ratio, so they drop into the existing layouts without
 * touching a single component.
 */
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

export const INK = "#1e355c"; // carried over from the MenyaLo mark
export const SUN = "#e8a33d";
const PAPER = "#ffffff";

const paint = (svg, ink, sun = SUN) =>
  svg.replaceAll("INK", ink).replaceAll("SUN", sun);

const mark = readFileSync(join(here, "mark.svg"), "utf8");
const lockup = readFileSync(join(here, "lockup.svg"), "utf8");

/** Navy rounded square with the mark reversed out of it, for the browser tab. */
const appIcon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <rect width="512" height="512" rx="112" fill="${INK}" />
  <g transform="translate(58, 75) scale(3.3)">
    <circle cx="60" cy="31" r="15" fill="${SUN}" />
    <path d="M60 72 C 44 58, 24 56, 8 56 L 8 90 C 26 90, 44 92, 60 94 Z" fill="${PAPER}" />
    <path d="M60 72 C 76 58, 96 56, 112 56 L 112 90 C 94 90, 76 92, 60 94 Z" fill="${PAPER}" />
  </g>
</svg>`;

const targets = [
  {
    out: "MyLo-frontend/src/assets/Logodark.png",
    svg: paint(lockup, INK),
    width: 1280,
    note: "navy lockup (light backgrounds)",
  },
  {
    out: "MyLo-frontend/src/assets/Logo.png",
    svg: paint(lockup, PAPER),
    width: 1280,
    note: "white lockup (dark backgrounds)",
  },
  {
    out: "MyLo-frontend/public/favicon.png",
    svg: appIcon(512),
    width: 512,
    note: "app icon / favicon",
  },
  {
    // Email clients will not render SVG, and many refuse data: URIs, so HTML mail
    // needs a raster served over http from the API itself.
    out: "MyLo-Backend/public/logo.png",
    svg: paint(lockup, INK),
    width: 320,
    note: "email logo (served by the API)",
  },
];

for (const { out, svg, width, note } of targets) {
  const dest = join(root, out);
  mkdirSync(dirname(dest), { recursive: true });
  const info = await sharp(Buffer.from(svg))
    .resize({ width })
    .png({ compressionLevel: 9 })
    .toFile(dest);
  console.log(
    `  ${out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)}kB  — ${note}`,
  );
}

console.log("\nBrand assets rendered.");
