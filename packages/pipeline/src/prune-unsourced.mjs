#!/usr/bin/env node
/**
 * Removes laws the corpus cannot stand behind.
 *
 *   npm run prune:unsourced -w @mylo/pipeline [-- --apply]
 *
 * MyLo's one rule is that every legal claim carries a citation to a specific
 * article, in a specific language, at a specific point in time. A law flagged
 * `partial` cannot satisfy the spirit of that even when each individual article
 * is quoted correctly, because the reader cannot see what is missing.
 *
 * The case that prompted this: a single English article of Law N° 32/2016
 * (minimum age of marriage) typed in by hand while the schema was being built.
 * It carries a genuine Gazette reference, so it looks sound in isolation — but
 * it is 1 article of roughly 250, and someone asking about marriage would have
 * received it as though it were the answer, with no signal that the rest of the
 * law exists or qualifies it. A correct quotation of a fragment is still a
 * misleading answer.
 *
 * Laws loaded by `load-corpus` assert `complete`; anything arriving another way
 * keeps the schema's `partial` default. So this prunes what nothing vouched for,
 * rather than pattern-matching the one row that happens to be wrong today.
 *
 * Reports by default and deletes only with `--apply`, because a corpus deletion
 * should be read before it is run.
 */
import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";
const apply = process.argv.includes("--apply");

const db = new pg.Pool({ connectionString: DATABASE_URL });

const { rows: fragments } = await db.query(`
  SELECT l.id,
         l.law_number,
         l.status,
         l.gazette_ref,
         count(DISTINCT a.id)::int AS articles,
         count(at.id)::int         AS texts
    FROM laws l
    LEFT JOIN articles a       ON a.law_id = l.id
    LEFT JOIN article_texts at ON at.article_id = a.id
   WHERE l.coverage = 'partial'
   GROUP BY l.id, l.law_number, l.status, l.gazette_ref
   ORDER BY l.law_number
`);

if (fragments.length === 0) {
  console.log(
    "Nothing to prune. Every law in the corpus is marked complete by whatever loaded it.",
  );
  await db.end();
  process.exit(0);
}

console.log(`Laws with partial coverage: ${fragments.length}\n`);
for (const l of fragments) {
  console.log(
    `  ${l.law_number.padEnd(20)} ${String(l.articles).padStart(3)} articles, ` +
      `${String(l.texts).padStart(3)} texts   ${l.gazette_ref ?? "(no gazette ref)"}`,
  );
}

if (!apply) {
  console.log(`\nNothing deleted. Re-run with --apply to remove them.`);
  await db.end();
  process.exit(0);
}

// One transaction: articles and texts cascade from the law, so a partial delete
// would leave orphaned article rows pointing at nothing.
try {
  await db.query("BEGIN");
  const { rowCount } = await db.query(
    `DELETE FROM laws WHERE id = ANY($1::uuid[])`,
    [fragments.map((l) => l.id)],
  );
  await db.query("COMMIT");
  console.log(`\nDeleted ${rowCount} law(s).`);

  const { rows } = await db.query(
    `SELECT count(*)::int AS laws,
            (SELECT count(*)::int FROM articles)      AS articles,
            (SELECT count(*)::int FROM article_texts) AS texts
       FROM laws`,
  );
  const r = rows[0];
  console.log(
    `Corpus now: ${r.laws} law(s), ${r.articles} articles, ${r.texts} texts.`,
  );
} catch (err) {
  await db.query("ROLLBACK");
  console.error("Prune failed, rolled back:", err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
