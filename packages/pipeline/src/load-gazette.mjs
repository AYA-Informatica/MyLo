#!/usr/bin/env node
/**
 * Loads parsed Gazette instruments into the database.
 *
 *   npm run load:gazette -w @mylo/pipeline -- [dir] --status <status.json>
 *   npm run load:gazette -w @mylo/pipeline -- [dir] --assume-active
 *
 * `load-corpus.mjs` loads exactly one document: the Constitution, with its law
 * number and its three titles written into the script by hand. That is fine for
 * one instrument and impossible for 1,400, which is why the corpus stayed empty
 * the first time. This reads whatever `gazette.mjs` produced and writes it,
 * taking every field from the parse rather than from the source of this file.
 *
 * Two rules it will not bend.
 *
 * **It refuses to guess status.** `laws.status` defaults to 'active', and the
 * schema comment on it says why that matters: telling someone about a repealed
 * law is worse than telling them nothing. amategeko.gov.rw separates its corpus
 * into 1,411 laws in force and 658 not in force, and none of that is printed
 * inside the PDFs — it is site metadata. So status must come from a map the
 * caller supplies, or the caller must say `--assume-active` out loud and see the
 * count of laws it is asserting that about. Silently defaulting would file 658
 * dead laws as live.
 *
 * **It will not load a fragment as if it were whole.** `coverage` comes from the
 * parse, and a document whose articles do not run 1..N is written as 'partial'
 * so the reader is told. A correct quotation of an incomplete law is still a
 * misleading answer.
 *
 * Everything written is `isOfficial` and `approved`: this is the state's own
 * wording in the state's own languages. Anything MyLo generates later enters as
 * `draft` and must be reviewed.
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
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : (args[i + 1] ?? true);
};
const has = (name) => args.includes(`--${name}`);

const statusPath = flag("status");
const assumeActive = has("assume-active");
const dryRun = has("dry-run");

const positional = args.filter((a, i) => {
  if (a.startsWith("--")) return false;
  const previous = args[i - 1];
  return !(previous === "--status");
});
const target = resolve(
  positional[0] ?? join(here, "..", "..", "corpus", "out", "gazette"),
);

/**
 * Status per law number, e.g. `{ "02/2007": "active", "31/2007": "repealed" }`.
 *
 * Expected to be produced from amategeko.gov.rw's own in-force / not-in-force
 * split rather than assembled by hand.
 */
const statusMap = statusPath
  ? JSON.parse(readFileSync(resolve(statusPath), "utf8"))
  : {};

if (!statusPath && !assumeActive) {
  console.error(
    "Refusing to load without a status source.\n" +
      "  --status <file.json>  law number -> active|amended|repealed|draft\n" +
      "  --assume-active       assert that every law loaded is in force\n\n" +
      "laws.status defaults to 'active'. amategeko.gov.rw lists 658 laws that\n" +
      "are not in force, and nothing in the PDFs says which. Loading them\n" +
      "silently as active is the failure this flag exists to prevent.",
  );
  process.exit(1);
}

/**
 * The parses in a directory, identified by what they are rather than by what
 * they are not.
 *
 * Sidecars — the run manifest, the provisions report — live alongside the
 * parses, and an ignore list has to be updated by every tool that adds one. It
 * was not, twice. Parses carry `kind: "gazette-parse"`; anything else is skipped
 * without needing to be known about in advance.
 */
function parsedFilesUnder(path) {
  const candidates = statSync(path).isFile()
    ? [path]
    : readdirSync(path)
        .filter((f) => extname(f) === ".json")
        .map((f) => join(path, f));

  return candidates.filter((file) => {
    try {
      return JSON.parse(readFileSync(file, "utf8")).kind === "gazette-parse";
    } catch {
      return false;
    }
  });
}

/**
 * Whether a parse is fit to become rows.
 *
 * A document with no law number cannot be keyed, and one with no articles has
 * nothing citable in it — the 1962 declaration in the sample corpus is both.
 * Neither is an error in the parser; they are documents this schema does not
 * model, and skipping them loudly is better than inventing a key.
 */
function loadable(parsed) {
  const reasons = [];
  if (!parsed.source.lawNumber) reasons.push("no law number");
  if (!parsed.source.origin) reasons.push("instrument type not recognised");
  if (parsed.articles.length === 0) reasons.push("no articles");
  if (!Object.keys(parsed.source.titles ?? {}).length) reasons.push("no title");
  return reasons;
}

const files = parsedFilesUnder(target);
const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();

let loaded = 0;
let skipped = 0;
let articlesTotal = 0;
let textsTotal = 0;
let amendmentLinks = 0;
const assumed = [];

for (const file of files) {
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const reasons = loadable(parsed);
  if (reasons.length) {
    console.log(`skip  ${parsed.source.file}: ${reasons.join(", ")}`);
    skipped += 1;
    continue;
  }

  const lawNumber = parsed.source.lawNumber;
  const status = statusMap[lawNumber] ?? "active";
  if (!statusMap[lawNumber]) assumed.push(lawNumber);

  // One transaction per law, not one for the batch: a bulk run over 1,400
  // documents should not lose 1,399 good loads to the last bad one, and each
  // law is independently meaningful.
  await db.query("BEGIN");
  try {
    const { rows: lawRows } = await db.query(
      `INSERT INTO laws (law_number, origin, status, coverage, gazette_ref, published_at, effective_from)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (law_number) DO UPDATE
         SET origin       = EXCLUDED.origin,
             status       = EXCLUDED.status,
             coverage     = EXCLUDED.coverage,
             gazette_ref    = EXCLUDED.gazette_ref,
             published_at   = EXCLUDED.published_at,
             effective_from = EXCLUDED.effective_from,
             updated_at     = now()
       RETURNING id`,
      [
        lawNumber,
        parsed.source.origin,
        status,
        parsed.stats.coverage,
        parsed.source.gazetteRef,
        // Published, then effective — deliberately different columns fed by
        // different facts. `published_at` is when it appeared in the Gazette;
        // `effective_from` is when its own commencement article says it starts
        // binding. These used to be the same value, and both were the *signing*
        // date, which for Law N°02/2007 is 54 days before either is true.
        parsed.source.publishedAt ?? parsed.source.promulgatedAt,
        parsed.source.effectiveFrom ?? parsed.source.promulgatedAt,
      ],
    );
    const lawId = lawRows[0].id;

    for (const [language, title] of Object.entries(parsed.source.titles)) {
      await db.query(
        `INSERT INTO law_texts (law_id, language, title, is_official, review_status)
         VALUES ($1, $2, $3, true, 'approved')
         ON CONFLICT (law_id, language) DO UPDATE
           SET title = EXCLUDED.title, updated_at = now()`,
        [lawId, language, title],
      );
    }

    let articleCount = 0;
    let textCount = 0;
    for (const article of parsed.articles) {
      const { rows: artRows } = await db.query(
        `INSERT INTO articles (law_id, article_number, ordinal)
         VALUES ($1, $2, $3)
         ON CONFLICT (law_id, article_number) DO UPDATE SET ordinal = EXCLUDED.ordinal
         RETURNING id`,
        [lawId, String(article.number), article.number],
      );
      const articleId = artRows[0].id;
      articleCount += 1;

      for (const [language, text] of Object.entries(article.texts)) {
        await db.query(
          `INSERT INTO article_texts (article_id, language, heading, body, is_official, review_status)
           VALUES ($1, $2, $3, $4, true, 'approved')
           ON CONFLICT (article_id, language) DO UPDATE
             SET heading = EXCLUDED.heading, body = EXCLUDED.body, updated_at = now()`,
          [articleId, language, text.heading, text.body],
        );
        textCount += 1;
      }
    }

    // Amendments are replaced wholesale for this law rather than merged: a
    // re-parse that finds fewer targets than before means the earlier parse was
    // wrong, and leaving its rows behind would keep asserting an amendment the
    // parser no longer believes in.
    await db.query(`DELETE FROM law_amendments WHERE amending_law_id = $1`, [
      lawId,
    ]);
    for (const amendment of parsed.amends ?? []) {
      const articles = amendment.articles.length ? amendment.articles : [null];
      for (const article of articles) {
        await db.query(
          `INSERT INTO law_amendments
             (amending_law_id, amended_law_number, article_number, source)
           VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [lawId, amendment.lawNumber, article, amendment.source],
        );
        amendmentLinks += 1;
      }
    }

    if (dryRun) await db.query("ROLLBACK");
    else await db.query("COMMIT");

    loaded += 1;
    articlesTotal += articleCount;
    textsTotal += textCount;
    console.log(
      `load  ${lawNumber.padEnd(12)} ${String(articleCount).padStart(4)} articles  ` +
        `${textCount} texts  ${parsed.stats.coverage}  ${status}` +
        (parsed.warnings.length ? `  [${parsed.warnings.join("; ")}]` : ""),
    );
  } catch (err) {
    await db.query("ROLLBACK");
    skipped += 1;
    console.log(`fail  ${lawNumber}: ${err.message}`);
  }
}

await db.end();

console.log(
  `\n${loaded} loaded, ${skipped} skipped — ${articlesTotal} articles, ` +
    `${textsTotal} official texts, ${amendmentLinks} amendment link(s)` +
    (dryRun ? " (dry run, rolled back)" : ""),
);

// Printed at the end rather than per law so it is a number the operator sees
// once and has to reckon with, instead of a line they scroll past 658 times.
if (assumed.length) {
  console.log(
    `\n${assumed.length} law(s) had no status supplied and were written as 'active'.\n` +
      `Supply --status to correct this. A repealed law served as live is the\n` +
      `sharpest wrong answer this corpus can give.`,
  );
}
