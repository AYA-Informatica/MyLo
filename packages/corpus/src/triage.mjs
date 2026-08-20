#!/usr/bin/env node
/**
 * Reads a bulk parse manifest and says what went wrong, by family.
 *
 *   npm run triage -w @mylo/corpus -- [out/gazette/manifest.json]
 *
 * Running the parser over ~1,400 documents produces ~1,400 lines of output that
 * nobody reads. That is not a presentation problem — it is how a corpus quietly
 * ends up half-parsed, because the failures that matter are the ones that repeat
 * and a scrolling log makes a systematic failure look like noise.
 *
 * The rotated-page bug is the worked example. It affected every page of one law,
 * and would have affected every law typeset in that era. Per-document it reads as
 * one bad parse. Grouped, it is a family with a single cause and a single fix.
 *
 * So this groups rather than lists, and reports coverage as a number rather than
 * an impression. The gate for Phase 0.2 is that number.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const path = resolve(
  process.argv[2] ?? join(here, "..", "out", "gazette", "manifest.json"),
);

const manifest = JSON.parse(readFileSync(path, "utf8"));

/**
 * Collapses a warning to its family.
 *
 * Warnings carry specifics — which articles are missing, which languages failed
 * — and those specifics are what make every line unique and the whole log
 * unreadable. The family is what you fix.
 */
function family(warning) {
  if (warning.startsWith("missing articles")) return "missing articles";
  if (warning.startsWith("headings not separable"))
    return "headings not separable";
  if (warning.startsWith("columns disagree"))
    return "columns disagree on metadata";
  if (warning.startsWith("two columns classified")) return "column split wrong";
  if (/unclassified/.test(warning)) return "column unclassified";
  return warning;
}

/**
 * How badly a family bites, which is not the same as how often it occurs.
 *
 * A document with no articles yields nothing citable — it is out of the corpus.
 * A document with an unreadable law number cannot be keyed, so it is out too.
 * Missing headings degrade retrieval and display but the law still loads and can
 * still be quoted correctly, which is a different order of problem.
 */
const SEVERITY = {
  "no articles parsed": "blocks load",
  "no law number found": "blocks load",
  "instrument type not recognised": "blocks load",
  "column split wrong": "corrupts text",
  "column unclassified": "corrupts text",
  "missing articles": "incomplete",
  "columns disagree on metadata": "needs a person",
  "headings not separable": "degrades retrieval",
  "no promulgation date found": "incomplete",
  "no title": "blocks load",
};

const families = new Map();
const errored = [];
let clean = 0;
let articles = 0;
const languages = new Map();
const instruments = new Map();

for (const entry of manifest) {
  if (entry.error) {
    errored.push(entry);
    continue;
  }

  articles += entry.articles ?? 0;
  const langKey = (entry.languages ?? []).join("/") || "none";
  languages.set(langKey, (languages.get(langKey) ?? 0) + 1);
  instruments.set(
    entry.instrument ?? "unrecognised",
    (instruments.get(entry.instrument ?? "unrecognised") ?? 0) + 1,
  );

  if (!entry.warnings?.length) {
    clean += 1;
    continue;
  }

  for (const warning of entry.warnings) {
    const key = family(warning);
    const bucket = families.get(key) ?? { count: 0, examples: [] };
    bucket.count += 1;
    if (bucket.examples.length < 3) {
      bucket.examples.push(entry.lawNumber ?? entry.file);
    }
    families.set(key, bucket);
  }
}

const total = manifest.length;
const parsed = total - errored.length;
const pct = (n) => `${((100 * n) / (total || 1)).toFixed(1)}%`;

console.log(`Manifest  ${path}`);
console.log(`Documents ${total}`);
console.log(`Clean     ${clean} (${pct(clean)})  — parsed with no warnings`);
console.log(`Warned    ${parsed - clean} (${pct(parsed - clean)})`);
console.log(`Threw     ${errored.length} (${pct(errored.length)})`);
console.log(`Articles  ${articles} across the corpus\n`);

if (families.size) {
  console.log("By family, worst first:\n");
  const ranked = [...families.entries()].sort(
    (a, b) => b[1].count - a[1].count,
  );
  const width = Math.max(...ranked.map(([k]) => k.length));
  for (const [name, bucket] of ranked) {
    const severity = SEVERITY[name] ?? "unclassified";
    console.log(
      `  ${name.padEnd(width)}  ${String(bucket.count).padStart(5)}  ` +
        `${pct(bucket.count).padStart(6)}  ${severity.padEnd(19)} ` +
        `e.g. ${bucket.examples.join(", ")}`,
    );
  }
  console.log("");
}

if (errored.length) {
  console.log(`Threw, first ${Math.min(5, errored.length)}:\n`);
  for (const e of errored.slice(0, 5)) console.log(`  ${e.file}: ${e.error}`);
  console.log("");
}

const show = (label, map) => {
  const ranked = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(`${label}  ${ranked.map(([k, v]) => `${k} ${v}`).join("   ")}\n`);
};
show("Languages ", languages);
show("Instruments", instruments);

// The blocking families are the ones that decide corpus size, so they are the
// ones worth stating as a conclusion rather than leaving in a table.
const blocked = [...families.entries()]
  .filter(([name]) => SEVERITY[name] === "blocks load")
  .reduce((sum, [, b]) => sum + b.count, 0);

if (blocked) {
  console.log(
    `${blocked} warning(s) in families that prevent a document loading at all.\n` +
      `Those set the ceiling on corpus size — fix them before anything that\n` +
      `only degrades quality.`,
  );
} else if (clean === total) {
  console.log(
    "No warnings. Verify the sample is representative before trusting this.",
  );
}
