#!/usr/bin/env node
/**
 * Runs the judgment parser over a directory and writes one parse per document.
 *
 *   npm run ingest:judgments -w @mylo/corpus -- <dir> [--out <dir>]
 *
 * Separate from `judgment.mjs` so the parser can be imported — by the loader,
 * by tests, by the golden harness — without a CLI running at import time. That
 * was a real defect in `build-status-map.mjs`: a module that does work when
 * imported cannot be tested.
 */
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJudgment, pdfsUnder } from "./judgment.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outDir = resolve(
  outIndex === -1 ? join(here, "..", "out", "judgments") : args[outIndex + 1],
);
const positional = args.filter(
  (a, i) => !a.startsWith("--") && !(outIndex !== -1 && i === outIndex + 1),
);
const target = resolve(positional[0] ?? ".");

const files = pdfsUnder(target);

// Cleared rather than merged into, for the reason the Gazette parser was: output
// is named after what the parse found, so a parser fix that changes what it
// finds leaves the old file behind under the old name, and the loader reads the
// directory.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

console.log(`Parsing ${files.length} judgment(s)\n`);

const manifest = [];
let clean = 0;

for (const file of files) {
  try {
    const parsed = await parseJudgment(file);

    // Named by case number *and* language: the same judgment is published as
    // separate files per language, and one case number in this corpus has a
    // Kinyarwanda version and two English ones. Keying on the number alone
    // would have them overwrite each other.
    const slug = `${parsed.source.caseNumber ?? basename(file, ".pdf")}-${
      parsed.source.language ?? "unknown"
    }`
      .replace(/[^\w-]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    let path = join(outDir, `${slug}.json`);
    let n = 2;
    while (manifest.some((m) => m.path === path)) {
      path = join(outDir, `${slug}-${n}.json`);
      n += 1;
    }
    writeFileSync(path, JSON.stringify(parsed, null, 2));

    manifest.push({
      path,
      file: parsed.source.file,
      caseNumber: parsed.source.caseNumber,
      court: parsed.source.court,
      language: parsed.source.language,
      decidedAt: parsed.source.decidedAt,
      statutes: parsed.citations.statutes.length,
      cases: parsed.citations.cases.length,
      warnings: parsed.warnings,
    });

    if (parsed.warnings.length === 0) clean += 1;
    console.log(
      `${parsed.warnings.length ? "!" : " "} ${(parsed.source.caseNumber ?? "—").padEnd(28)} ` +
        `${(parsed.source.language ?? "??").padEnd(3)} ` +
        `${(parsed.source.court ?? "—").padEnd(17)} ` +
        `${String(parsed.citations.statutes.length).padStart(2)}st ` +
        `${String(parsed.citations.cases.length).padStart(2)}cs  ` +
        parsed.warnings.join("; "),
    );
  } catch (err) {
    manifest.push({ file: basename(file), error: err.message });
    console.log(`! ${basename(file)}: ${err.message}`);
  }
}

writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(
  `\n${clean}/${files.length} parsed without warnings. ` +
    `Manifest: ${join(outDir, "manifest.json")}`,
);
