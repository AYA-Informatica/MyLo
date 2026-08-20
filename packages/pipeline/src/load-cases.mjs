#!/usr/bin/env node
/**
 * Loads parsed judgments into the database.
 *
 *   npm run load:cases -w @mylo/pipeline -- [dir]
 *
 * Deliberately simpler than the law loader in one respect and stricter in
 * another.
 *
 * Simpler: it does not refuse to run without a status source. `laws.status`
 * needed that because amategeko.gov.rw publishes which laws are in force and
 * nothing in a PDF says so, making a silent default to `active` a lie the source
 * could have corrected. No equivalent register exists for judgments, and
 * `cases.overturned_by_id` is left null because it is genuinely unknown — not
 * because it was skipped. The difference matters downstream: MyLo must never
 * tell a reader a case is good law on the strength of not knowing otherwise.
 *
 * Stricter: a judgment with no case number is not loaded at all. A law without a
 * number is unkeyable; a judgment without one is unkeyable *and* uncitable,
 * since the number is how one judgment refers to another.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const target = resolve(
  args.find((a) => !a.startsWith("--")) ??
    join(here, "..", "..", "corpus", "out", "judgments"),
);

/** Parses identify themselves; sidecars do not need to be listed. */
function parsesUnder(path) {
  const candidates = statSync(path).isFile()
    ? [path]
    : readdirSync(path)
        .filter((f) => extname(f) === ".json")
        .map((f) => join(path, f));

  return candidates.filter((file) => {
    try {
      return JSON.parse(readFileSync(file, "utf8")).kind === "judgment-parse";
    } catch {
      return false;
    }
  });
}

function loadable(parsed) {
  const reasons = [];
  if (!parsed.source.caseNumber) reasons.push("no case number");
  if (!parsed.source.court) reasons.push("court not identified");
  if (!parsed.source.language) reasons.push("language not identified");
  if (!parsed.sections.held && !parsed.sections.facts) {
    reasons.push("neither holding nor facts");
  }
  return reasons;
}

const files = parsesUnder(target);
const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();

let loaded = 0;
let skipped = 0;
let texts = 0;
let statuteLinks = 0;
let precedentLinks = 0;
const conflicts = [];

for (const file of files) {
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const reasons = loadable(parsed);
  if (reasons.length) {
    console.log(`skip  ${parsed.source.file}: ${reasons.join(", ")}`);
    skipped += 1;
    continue;
  }

  const s = parsed.source;
  await db.query("BEGIN");
  try {
    const { rows } = await db.query(
      `INSERT INTO cases (case_number, court, bench, decided_at, date_incomplete)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (case_number) DO UPDATE
         SET court           = EXCLUDED.court,
             bench           = COALESCE(EXCLUDED.bench, cases.bench),
             decided_at      = COALESCE(EXCLUDED.decided_at, cases.decided_at),
             date_incomplete = EXCLUDED.date_incomplete,
             updated_at      = now()
       RETURNING id`,
      [
        s.caseNumber,
        s.court,
        s.bench,
        s.decidedAt,
        Boolean(
          parsed.warnings?.some((w) =>
            w.startsWith("decision date incomplete"),
          ),
        ),
      ],
    );
    const caseId = rows[0].id;

    // One text per language. A second file in a language already loaded is a
    // duplicate download, not new information — this corpus contains one such
    // pair — so it updates rather than erroring, and only where it has more to
    // say.
    await db.query(
      `INSERT INTO case_texts (case_id, language, title, principle, facts, held, is_official, review_status)
       VALUES ($1, $2, $3, $4, $5, $6, true, 'approved')
       ON CONFLICT (case_id, language) DO UPDATE
         SET title     = COALESCE(EXCLUDED.title, case_texts.title),
             principle = COALESCE(EXCLUDED.principle, case_texts.principle),
             facts     = COALESCE(EXCLUDED.facts, case_texts.facts),
             held      = COALESCE(EXCLUDED.held, case_texts.held),
             updated_at = now()`,
      [
        caseId,
        s.language,
        s.title,
        parsed.sections.principle ?? null,
        parsed.sections.facts,
        parsed.sections.held,
      ],
    );
    texts += 1;

    for (const statute of parsed.citations.statutes) {
      // A statute cited without a specific article still records the link: that
      // this judgment relied on that law is useful even when it does not say
      // which part.
      const articles = statute.articles.length ? statute.articles : [null];
      for (const article of articles) {
        await db.query(
          `INSERT INTO case_statute_citations (case_id, law_number, article_number)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [caseId, statute.lawNumber, article],
        );
        statuteLinks += 1;
      }
    }

    for (const cited of parsed.citations.cases) {
      await db.query(
        `INSERT INTO case_precedents (citing_case_id, cited_case_number)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [caseId, cited],
      );
      precedentLinks += 1;
    }

    if (dryRun) await db.query("ROLLBACK");
    else await db.query("COMMIT");

    loaded += 1;
    const courtConflict = parsed.warnings?.find((w) =>
      w.startsWith("court name"),
    );
    if (courtConflict) conflicts.push(`${s.caseNumber}: ${courtConflict}`);

    console.log(
      `load  ${s.caseNumber.padEnd(28)} ${s.language}  ${s.court.padEnd(17)} ` +
        `${String(parsed.citations.statutes.length).padStart(2)}st ` +
        `${String(parsed.citations.cases.length).padStart(2)}cs` +
        (courtConflict ? "  [court conflict]" : ""),
    );
  } catch (err) {
    await db.query("ROLLBACK");
    skipped += 1;
    console.log(`fail  ${s.caseNumber}: ${err.message}`);
  }
}

// How much of the precedent graph points at judgments MyLo actually holds. The
// rest are real citations to decisions outside the corpus, which is expected and
// is why cited_case_number is text rather than a foreign key.
const { rows: reach } = await db.query(`
  SELECT count(*)::int AS total,
         count(c.id)::int AS resolved
    FROM case_precedents p
    LEFT JOIN cases c ON c.case_number = p.cited_case_number
`);

await db.end();

console.log(
  `\n${loaded} loaded, ${skipped} skipped — ${texts} texts, ` +
    `${statuteLinks} statute links, ${precedentLinks} precedent links` +
    (dryRun ? " (dry run, rolled back)" : ""),
);

if (reach[0].total) {
  const { total, resolved } = reach[0];
  console.log(
    `\nPrecedent graph: ${resolved}/${total} citations point at judgments in the\n` +
      `corpus. The rest cite decisions MyLo does not hold — real citations to\n` +
      `real cases, which is why they are stored as numbers rather than dropped.`,
  );
}

if (conflicts.length) {
  console.log(
    `\n${conflicts.length} judgment(s) where the court named in the header\n` +
      `disagrees with the court encoded in the case number. Loaded using the\n` +
      `case number, since the registry assigns it, but a person should look:\n` +
      conflicts.map((c) => `  ${c}`).join("\n"),
  );
}
