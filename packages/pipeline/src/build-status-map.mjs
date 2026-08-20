#!/usr/bin/env node
/**
 * Turns an amategeko.gov.rw export into the status map the loader requires.
 *
 *   npm run status:build -w @mylo/pipeline -- <export.json> [--manifest <path>]
 *
 * `load-gazette.mjs` refuses to run without a status source, because nothing
 * inside a Gazette PDF says whether its law is still in force and the site
 * separates 1,411 laws that are from 658 that are not. This is the other half of
 * that: it produces the map, and — more importantly — it checks that the map and
 * the corpus are talking about the same laws.
 *
 * **Matching is the real work here, not fetching.** A status map that silently
 * matches nothing is worse than no map at all: the loader would find no entry for
 * any law, fall back to `active`, and report a large "assumed" count that looks
 * like a configuration problem rather than a correctness one. The site writes
 * numbers as "N° 31/2007", "Nº 02/2007", "31/2007 of 25/07/2007"; the parser
 * emits "31/2007". So both sides are normalised and the overlap is reported as a
 * number, and this exits non-zero when the overlap is implausible.
 *
 * The export itself has to be captured from the site — the same record-and-run
 * interception used to collect the PDFs. Any JSON array of objects works; the
 * field names are discovered rather than assumed, because the site's shape is
 * not part of this repo's contract and will change without warning.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Law numbers, reduced to the form the parser emits.
 *
 * "N° 31/2007", "Nº31/2007", "31/2007 of 25/07/2007" and "31 / 2007" are the
 * same law. Any trailing date is dropped: the site often prints the promulgation
 * date inside the same field, and it is not part of the identifier.
 */
export function normaliseLawNumber(raw) {
  if (raw == null) return null;
  const text = String(raw);
  const match = text.match(
    /\b(?:N\s*[°ºo]?\s*)?(\d{1,4}\s*(?:bis|ter)?)\s*\/\s*(\d{2,4})\b/i,
  );
  if (!match) return null;
  const serial = match[1].replace(/\s+/g, "").toLowerCase();
  const year = match[2].length === 2 ? `20${match[2]}` : match[2];
  return `${serial}/${year}`;
}

/**
 * Maps whatever the site calls it onto `law_status`.
 *
 * Unrecognised values are reported rather than guessed. `draft` is deliberately
 * not inferred from anything: a law that has not commenced and a law that has
 * been repealed are both "not in force" on the site and mean different things to
 * a reader, so anything that cannot be told apart stays unmapped for a person to
 * decide.
 */
/**
 * Negations are tested first, and this ordering is load-bearing.
 *
 * "Not in force" contains "in force". Tested in the obvious order, every
 * repealed law on the site reads as active — which is the exact outcome the
 * loader's refusal to guess exists to prevent, defeated one layer above it.
 * Caught in a five-record fixture; it would have been invisible in 1,400.
 */
const STATUS_WORDS = [
  [
    /\b(not\s*in\s*force|no\s*longer\s*in\s*force|non\s*en\s*vigueur|inactive|abrogated?|abrogée?)\b/i,
    "repealed",
  ],
  [/\b(repeal\w*|abrogat\w*|kurah\w*|vanwaho)\b/i, "repealed"],
  [/\b(amended|amend\w*|modifi\w*|vugurur\w*)\b/i, "amended"],
  [/\b(in\s*force|en\s*vigueur|active|current|dukurikiza)\b/i, "active"],
];

export function readStatus(value) {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? "active" : "repealed";
  const text = String(value);
  for (const [pattern, status] of STATUS_WORDS) {
    if (pattern.test(text)) return status;
  }
  return null;
}

/**
 * Finds the fields carrying the law number and the status.
 *
 * Discovered by scoring every key over the whole export rather than by hardcoding
 * names: the site's field names are not this repo's contract, and a hardcoded
 * `lawNumber` that silently becomes `law_no` next quarter produces an empty map
 * and no error.
 */
function discoverFields(records) {
  const keys = [...new Set(records.flatMap((r) => Object.keys(r)))];
  const score = (key, fn) =>
    records.filter((r) => fn(r[key]) != null).length / records.length;

  const numberKey = keys
    .map((k) => ({ k, hit: score(k, normaliseLawNumber) }))
    .sort((a, b) => b.hit - a.hit)[0];
  const statusKey = keys
    .map((k) => ({ k, hit: score(k, readStatus) }))
    .sort((a, b) => b.hit - a.hit)[0];

  return { numberKey, statusKey };
}

/** Alias for tests, so importing this module for its pure helpers is explicit. */

/**
 * Alias for tests. The helpers above are the fragile part of this script — a
 * law number written five ways is the same law, and "not in force" contains
 * "in force" — so they are worth testing directly.
 */
export const readStatusForTest = readStatus;

// Everything below runs only when this file is the entry point. Without the
// guard, importing the module for its helpers executes the CLI and exits, which
// is what happened the first time a test imported it — and is a good argument
// against a module doing work at import time.
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? null : args[i + 1];
  };

  const exportPath = args.find(
    (a) => !a.startsWith("--") && a !== flag("manifest"),
  );
  if (!exportPath) {
    console.error(
      "usage: status:build <export.json> [--manifest <manifest.json>] [--out <status.json>]",
    );
    process.exit(1);
  }

  const manifestPath = resolve(
    flag("manifest") ??
      join(here, "..", "..", "corpus", "out", "gazette", "manifest.json"),
  );
  const outPath = resolve(
    flag("out") ?? join(here, "..", "out", "status.json"),
  );

  const raw = JSON.parse(readFileSync(resolve(exportPath), "utf8"));
  const records = Array.isArray(raw)
    ? raw
    : (raw.data ?? raw.results ?? raw.items);
  if (!Array.isArray(records) || records.length === 0) {
    console.error("Export is not a non-empty array of records.");
    process.exit(1);
  }

  const { numberKey, statusKey } = discoverFields(records);
  console.log(`Export     ${records.length} records from ${exportPath}`);
  console.log(
    `Fields     number "${numberKey.k}" (${(100 * numberKey.hit).toFixed(0)}% parse) ` +
      `status "${statusKey.k}" (${(100 * statusKey.hit).toFixed(0)}% parse)\n`,
  );

  const statuses = {};
  const unmapped = [];
  const unnumbered = [];
  const conflicts = [];

  for (const record of records) {
    const number = normaliseLawNumber(record[numberKey.k]);
    if (!number) {
      unnumbered.push(record[numberKey.k]);
      continue;
    }
    const status = readStatus(record[statusKey.k]);
    if (!status) {
      unmapped.push(`${number}: ${JSON.stringify(record[statusKey.k])}`);
      continue;
    }
    if (statuses[number] && statuses[number] !== status) {
      conflicts.push(`${number}: ${statuses[number]} vs ${status}`);
      continue;
    }
    statuses[number] = status;
  }

  const byStatus = {};
  for (const s of Object.values(statuses)) byStatus[s] = (byStatus[s] ?? 0) + 1;
  console.log(`Mapped     ${Object.keys(statuses).length} laws`);
  for (const [s, n] of Object.entries(byStatus))
    console.log(`             ${s.padEnd(9)} ${n}`);
  if (unnumbered.length)
    console.log(
      `Unnumbered ${unnumbered.length} records — no law number found`,
    );
  if (unmapped.length)
    console.log(
      `Unmapped   ${unmapped.length} laws — status value not recognised`,
    );
  if (conflicts.length)
    console.log(`Conflicts  ${conflicts.length} laws given two statuses`);

  for (const [label, list] of [
    ["unrecognised status values", unmapped],
    ["conflicting statuses", conflicts],
  ]) {
    if (list.length)
      console.log(`\n  first ${label}: ${list.slice(0, 5).join("; ")}`);
  }

  /**
   * The check that matters: does this map cover the corpus that was parsed?
   *
   * Everything above can look healthy while the two sides name laws differently,
   * in which case the loader finds no entry for anything and quietly assumes every
   * law is active. That is the failure this whole step exists to prevent, so it is
   * measured rather than hoped for.
   */
  let exitCode = 0;
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const corpus = manifest
      .map((e) => normaliseLawNumber(e.lawNumber))
      .filter(Boolean);
    const unique = [...new Set(corpus)];
    const covered = unique.filter((n) => statuses[n]);
    const missing = unique.filter((n) => !statuses[n]);
    const share = unique.length ? covered.length / unique.length : 0;

    console.log(
      `\nCoverage   ${covered.length}/${unique.length} parsed laws have a status ` +
        `(${(100 * share).toFixed(1)}%)`,
    );
    if (missing.length) {
      console.log(`  first missing: ${missing.slice(0, 8).join(", ")}`);
    }

    // A low overlap is far more likely to be a normalisation mismatch than a
    // corpus genuinely absent from the national register, and the two are
    // indistinguishable from the counts alone — so this stops rather than warns.
    if (share < 0.5) {
      console.log(
        `\nRefusing to write: fewer than half the parsed laws matched.\n` +
          `That is much more likely to be a law-number mismatch between the export\n` +
          `and the parser than a corpus the register does not hold. Compare a few\n` +
          `of the missing numbers above against the export before trusting this.`,
      );
      exitCode = 1;
    }
  } else {
    console.log(
      `\nNo manifest at ${manifestPath} — writing without a coverage check.\n` +
        `Run the parser first if you want one; an unchecked map can match nothing.`,
    );
  }

  if (exitCode === 0) {
    writeFileSync(outPath, JSON.stringify(statuses, null, 2) + "\n");
    console.log(`\nWrote ${outPath}`);
    console.log(`  npm run corpus:load-gazette -- --status ${outPath}`);
  }

  process.exit(exitCode);
}
