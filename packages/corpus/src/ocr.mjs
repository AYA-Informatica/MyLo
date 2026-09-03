#!/usr/bin/env node
/**
 * Turns a scanned Gazette issue into one the parser can read.
 *
 *   npm run ocr -w @mylo/corpus -- <in.pdf | dir> [--out <dir>] [--dpi 300]
 *
 * The parser reports `no text layer — scanned, needs OCR` and stops. Older
 * issues are the likeliest place that appears in bulk, and nothing converted
 * them, so those laws were simply unreachable.
 *
 * ## The English model reads Kinyarwanda, and that was not the expectation
 *
 * Tesseract ships no Kinyarwanda traineddata, which looked like a blocker: the
 * Gazette is trilingual and the language most readers need is the one with no
 * model. Measured on a three-column page, the `eng` model recovered all three
 * columns — Kinyarwanda words intact, `N°` intact, law numbers intact.
 *
 * That follows from what Tesseract does. It recognises Latin glyphs; the
 * language model only breaks ties between shapes it cannot separate. Kinyarwanda
 * is written in the same alphabet as English, so the glyph work transfers even
 * though the vocabulary does not.
 *
 * The caveat is real and worth stating rather than discovering later: that
 * measurement was on a clean render. On a degraded scan the language model earns
 * its keep, and it is the Kinyarwanda column that will suffer most, because
 * nothing can rescue an ambiguous glyph in a language the model has never seen.
 * So OCR'd Kinyarwanda deserves more suspicion than OCR'd English from the same
 * page, and that is a reviewer's judgement rather than a parser's.
 *
 * ## Why a searchable PDF rather than text
 *
 * Tesseract can emit plain text, and that would throw away the thing the parser
 * depends on most: position. Column detection, line assembly and the title/body
 * distinction are all geometric. A searchable PDF keeps the page and adds an
 * invisible text layer, so everything downstream runs unchanged and a converted
 * issue is parsed by exactly the same code as a born-digital one.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

/**
 * 300 by default. Below about 200 Tesseract's accuracy falls off sharply on
 * body text at Gazette point sizes; much above 300 costs time and disk for
 * little gain.
 */
const DPI = String(flag("dpi", "300"));
const outDir = resolve(flag("out", join(here, "..", "out", "ocr")));
const target = resolve(
  args.find(
    (a, i) => !a.startsWith("--") && args[i - 1]?.startsWith("--") !== true,
  ) ?? ".",
);

function have(command) {
  try {
    execFileSync("which", [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

for (const command of ["tesseract", "pdftoppm"]) {
  if (!have(command)) {
    console.error(
      `${command} is not installed.\n` +
        `  Debian/Ubuntu:  apt-get install tesseract-ocr poppler-utils\n` +
        `  macOS:          brew install tesseract poppler`,
    );
    process.exit(1);
  }
}

/** Whether a PDF already has text. Converting one that does would lose fidelity. */
async function hasTextLayer(path) {
  const doc = await getDocument({
    data: new Uint8Array(readFileSync(path)),
    useSystemFonts: true,
  }).promise;
  for (let p = 1; p <= Math.min(doc.numPages, 5); p += 1) {
    const content = await (await doc.getPage(p)).getTextContent();
    if (content.items.some((i) => i.str.trim())) return true;
  }
  return false;
}

const pdfs = statSync(target).isFile()
  ? [target]
  : readdirSync(target, { recursive: true })
      .map((f) => join(target, f))
      .filter(
        (f) => extname(f).toLowerCase() === ".pdf" && statSync(f).isFile(),
      );

mkdirSync(outDir, { recursive: true });
console.log(`Checking ${pdfs.length} document(s) at ${DPI} dpi\n`);

let converted = 0;
let skipped = 0;
let failed = 0;

for (const pdf of pdfs) {
  const name = basename(pdf, ".pdf");
  const out = join(outDir, `${name}.pdf`);

  try {
    if (await hasTextLayer(pdf)) {
      console.log(`  skip     ${name} — already has text`);
      skipped += 1;
      continue;
    }

    const work = join(outDir, `.work-${name}`);
    mkdirSync(work, { recursive: true });
    try {
      execFileSync("pdftoppm", ["-r", DPI, "-png", pdf, join(work, "p")], {
        stdio: "ignore",
      });

      const pages = readdirSync(work)
        .filter((f) => f.endsWith(".png"))
        .sort();
      if (pages.length === 0) throw new Error("rasterised to no pages");

      // One searchable PDF per page, then concatenated. Tesseract takes a list
      // file for multi-page input, which keeps page order explicit rather than
      // relying on shell globbing.
      const list = join(work, "pages.txt");
      writeFileSync(list, pages.map((p) => join(work, p)).join("\n"));
      execFileSync(
        "tesseract",
        [list, join(outDir, name), "-l", "eng", "pdf"],
        { stdio: "ignore" },
      );

      // Verified rather than assumed: a converted file that still has no text
      // is a failure that would otherwise be discovered by the parser much
      // later, reported as the same warning it started with.
      if (!(await hasTextLayer(out))) {
        throw new Error("produced no text layer");
      }

      console.log(`  ocr      ${name} — ${pages.length} page(s)`);
      converted += 1;
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  } catch (err) {
    console.log(`  FAILED   ${name}: ${err.message}`);
    if (existsSync(out)) rmSync(out, { force: true });
    failed += 1;
  }
}

console.log(
  `\n${converted} converted, ${skipped} already had text, ${failed} failed.` +
    (converted
      ? `\nOutput in ${outDir}. Parse it exactly as you would a born-digital issue.` +
        `\n\nOCR'd Kinyarwanda deserves more suspicion than OCR'd English from the` +
        `\nsame page: Tesseract has no Kinyarwanda model, so an ambiguous glyph in` +
        `\nthat column has nothing to rescue it. Treat these as needing review.`
      : ""),
);
