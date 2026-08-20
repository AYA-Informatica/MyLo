#!/usr/bin/env node
/**
 * Golden-file regression checking for the Gazette parser.
 *
 *   npm run golden -w @mylo/corpus -- <corpus-dir>            # verify
 *   npm run golden -w @mylo/corpus -- <corpus-dir> --update    # re-record
 *
 * The parser is a pile of heuristics tuned against documents someone looked at.
 * Every one of them is a guess about typesetting that holds until it meets an
 * issue from a different decade, and the corpus is large enough that nobody will
 * read the output again once it is loaded.
 *
 * That combination is what makes a regression harness load-bearing rather than
 * hygienic. The heading-fonts fix is the worked example: refusing an
 * uninformative font signal recovered five texts on the document being looked at.
 * The same change, applied to 1,400 documents, could as easily have discarded
 * every heading in the corpus — and the only evidence either way would have been
 * a number in a log nobody diffed.
 *
 * So the shape of every parse is recorded and compared. Not the text itself: a
 * digest per article per language, which is enough to say *which* article changed
 * without committing a copy of the national corpus to git.
 *
 * The PDFs are deliberately not committed. Goldens name documents by filename and
 * are checked against whatever corpus directory is passed in, so this is a
 * regression check for the parser, not a fixture of the Gazette.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseInstrument } from "./gazette.mjs";
import { readdirSync, statSync } from "node:fs";
import { extname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const update = args.includes("--update");
const goldenPath = resolve(
  args[args.indexOf("--golden") + 1] && args.includes("--golden")
    ? args[args.indexOf("--golden") + 1]
    : join(here, "..", "golden", "parses.json"),
);
const corpusDir = resolve(
  args.find((a) => !a.startsWith("--") && a !== goldenPath) ?? ".",
);

const digest = (text) =>
  createHash("sha256")
    .update(text ?? "")
    .digest("hex")
    .slice(0, 12);

/**
 * The parse, reduced to what a regression should notice.
 *
 * Metadata and counts are kept whole because they are small and every one of
 * them is a claim about the document. Article text becomes a digest per
 * language: enough to detect and locate a change, small enough that a few
 * hundred documents stay reviewable in a diff.
 */
function shapeOf(parsed) {
  const articles = {};
  for (const article of parsed.articles) {
    const texts = {};
    for (const [language, text] of Object.entries(article.texts)) {
      texts[language] = {
        // Heading and body separately, because they are separately wrong in
        // different ways — a heading regression is a display bug, a body
        // regression is a misquotation of the law.
        heading: digest(text.heading),
        body: digest(text.body),
        bodyLength: text.body.length,
      };
    }
    articles[article.number] = texts;
  }

  return {
    lawNumber: parsed.source.lawNumber,
    instrument: parsed.source.instrument,
    origin: parsed.source.origin,
    promulgatedAt: parsed.source.promulgatedAt,
    languages: parsed.source.languages,
    titles: Object.fromEntries(
      Object.entries(parsed.source.titles ?? {}).map(([l, t]) => [
        l,
        digest(t),
      ]),
    ),
    stats: parsed.stats,
    warnings: parsed.warnings,
    articles,
  };
}

function pdfsUnder(target) {
  if (statSync(target).isFile()) return [target];
  return readdirSync(target, { recursive: true })
    .map((f) => join(target, f))
    .filter((f) => extname(f).toLowerCase() === ".pdf" && statSync(f).isFile());
}

/** Differences between a recorded shape and a fresh one, in reader-facing terms. */
function compare(before, after) {
  const changes = [];
  const note = (severity, text) => changes.push({ severity, text });

  for (const field of ["lawNumber", "instrument", "origin", "promulgatedAt"]) {
    if (before[field] !== after[field]) {
      note("metadata", `${field}: ${before[field]} -> ${after[field]}`);
    }
  }

  const langsBefore = before.languages.join("/");
  const langsAfter = after.languages.join("/");
  if (langsBefore !== langsAfter) {
    note("metadata", `languages: ${langsBefore} -> ${langsAfter}`);
  }

  if (before.stats.coverage !== after.stats.coverage) {
    note(
      "coverage",
      `coverage: ${before.stats.coverage} -> ${after.stats.coverage}`,
    );
  }

  const numbersBefore = Object.keys(before.articles);
  const numbersAfter = Object.keys(after.articles);
  const lost = numbersBefore.filter((n) => !after.articles[n]);
  const gained = numbersAfter.filter((n) => !before.articles[n]);
  if (lost.length) note("lost", `articles lost: ${lost.join(", ")}`);
  if (gained.length) note("gained", `articles gained: ${gained.join(", ")}`);

  let bodiesChanged = 0;
  let headingsChanged = 0;
  const textLost = [];
  for (const number of numbersBefore) {
    const a = before.articles[number];
    const b = after.articles[number];
    if (!b) continue;
    for (const [language, text] of Object.entries(a)) {
      const now = b[language];
      if (!now) {
        textLost.push(`${number}/${language}`);
        continue;
      }
      if (text.body !== now.body) bodiesChanged += 1;
      if (text.heading !== now.heading) headingsChanged += 1;
    }
  }
  if (textLost.length) {
    note(
      "lost",
      `texts lost: ${textLost.slice(0, 10).join(", ")}${textLost.length > 10 ? ` (+${textLost.length - 10})` : ""}`,
    );
  }
  if (bodiesChanged)
    note("body", `${bodiesChanged} article body/bodies changed`);
  if (headingsChanged) note("heading", `${headingsChanged} heading(s) changed`);

  const warnBefore = new Set(before.warnings);
  const warnAfter = new Set(after.warnings);
  const newWarnings = [...warnAfter].filter((w) => !warnBefore.has(w));
  const goneWarnings = [...warnBefore].filter((w) => !warnAfter.has(w));
  if (newWarnings.length) note("warning", `new: ${newWarnings.join("; ")}`);
  if (goneWarnings.length)
    note("resolved", `resolved: ${goneWarnings.join("; ")}`);

  return changes;
}

const files = pdfsUnder(corpusDir);
if (files.length === 0) {
  console.error(`No PDFs under ${corpusDir}`);
  process.exit(1);
}

const fresh = {};
for (const file of files) {
  try {
    fresh[basename(file)] = shapeOf(await parseInstrument(file));
  } catch (err) {
    fresh[basename(file)] = { error: err.message };
  }
}

if (update) {
  mkdirSync(dirname(goldenPath), { recursive: true });
  writeFileSync(goldenPath, JSON.stringify(fresh, null, 2) + "\n");
  console.log(
    `Recorded ${Object.keys(fresh).length} parse(s) -> ${goldenPath}`,
  );
  console.log(
    `\nRead the diff before committing. --update records whatever the parser\n` +
      `currently does, including whatever it currently does wrong.`,
  );
  process.exit(0);
}

if (!existsSync(goldenPath)) {
  console.error(
    `No goldens at ${goldenPath}. Record them with --update, after checking\n` +
      `by hand that the current parses are actually correct.`,
  );
  process.exit(1);
}

const golden = JSON.parse(readFileSync(goldenPath, "utf8"));

const missing = Object.keys(golden).filter((f) => !fresh[f]);
const added = Object.keys(fresh).filter((f) => !golden[f]);
let changed = 0;

// Ordered worst-first, because the interesting question in a diff of 1,400
// documents is never "what moved" but "did anything lose text".
const SEVERITY_ORDER = [
  "lost",
  "metadata",
  "body",
  "coverage",
  "warning",
  "heading",
  "gained",
  "resolved",
];
const severityRank = (c) => SEVERITY_ORDER.indexOf(c.severity);

for (const [file, before] of Object.entries(golden)) {
  const after = fresh[file];
  if (!after) continue;

  if (before.error || after.error) {
    if (before.error !== after.error) {
      changed += 1;
      console.log(`~ ${file}\n    error: ${before.error} -> ${after.error}`);
    }
    continue;
  }

  const changes = compare(before, after).sort(
    (a, b) => severityRank(a) - severityRank(b),
  );
  if (changes.length === 0) continue;

  changed += 1;
  console.log(`~ ${file}`);
  for (const c of changes) console.log(`    [${c.severity}] ${c.text}`);
}

for (const f of missing) console.log(`- ${f} (in goldens, not in corpus)`);
for (const f of added) console.log(`+ ${f} (in corpus, not in goldens)`);

const total = Object.keys(golden).length;
console.log(
  `\n${total - changed}/${total} unchanged` +
    (changed ? `, ${changed} changed` : "") +
    (missing.length ? `, ${missing.length} missing` : "") +
    (added.length ? `, ${added.length} new` : ""),
);

if (changed || missing.length) {
  console.log(
    `\nA change here is not automatically a bug — a parser fix should change\n` +
      `something. It is a claim that needs reading: confirm each [lost] and\n` +
      `[body] line is an improvement, then re-record with --update.`,
  );
  process.exit(1);
}
