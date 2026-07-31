#!/usr/bin/env node
/**
 * Loads the parsed Constitution into the database.
 *
 *   npm run load:corpus
 *
 * This is the step docs/ESSENCE.md named as the first build's largest unsolved
 * problem: nothing ingested the Gazette, so laws existed only if an admin typed
 * them in. Here the official text becomes rows — one law, 176 articles, and up
 * to three official texts per article.
 *
 * Everything written is marked `isOfficial` and `approved`: this is the state's
 * own wording in all three languages, not a translation MyLo produced. Anything
 * MyLo generates later — explanations, banked questions — enters as `draft` and
 * must be reviewed. The distinction is the whole basis for trusting a citation.
 *
 * Re-running is safe. Rows are upserted on their natural keys, so the loader can
 * be run again after a parser fix without duplicating the corpus.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";

/** Stable identifier for the instrument. The Constitution has no law number. */
const LAW_NUMBER = "CONSTITUTION-2023";

const corpus = JSON.parse(
  readFileSync(
    join(here, "..", "..", "corpus", "out", "constitution.json"),
    "utf8",
  ),
);

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();
await db.query("BEGIN");

try {
  const { rows: lawRows } = await db.query(
    `INSERT INTO laws (law_number, origin, status, gazette_ref, published_at, effective_from)
     VALUES ($1, 'parliamentary', 'active', $2, $3, $3)
     ON CONFLICT (law_number) DO UPDATE
       SET gazette_ref = EXCLUDED.gazette_ref, updated_at = now()
     RETURNING id`,
    [LAW_NUMBER, corpus.source.gazetteRef, corpus.source.publishedAt],
  );
  const lawId = lawRows[0].id;

  // Titles, one per language, taken from the document's own headings.
  const TITLES = {
    rw: "ITEGEKO NSHINGA RYA REPUBULIKA Y’U RWANDA",
    en: "CONSTITUTION OF THE REPUBLIC OF RWANDA",
    fr: "CONSTITUTION DE LA RÉPUBLIQUE DU RWANDA",
  };
  for (const [lang, title] of Object.entries(TITLES)) {
    await db.query(
      `INSERT INTO law_texts (law_id, language, title, is_official, review_status)
       VALUES ($1, $2, $3, true, 'approved')
       ON CONFLICT (law_id, language) DO UPDATE SET title = EXCLUDED.title`,
      [lawId, lang, title],
    );
  }

  let articleCount = 0;
  let textCount = 0;

  for (const article of corpus.articles) {
    const { rows: artRows } = await db.query(
      `INSERT INTO articles (law_id, article_number, ordinal)
       VALUES ($1, $2, $3)
       ON CONFLICT (law_id, article_number) DO UPDATE SET ordinal = EXCLUDED.ordinal
       RETURNING id`,
      [lawId, String(article.number), article.number],
    );
    const articleId = artRows[0].id;
    articleCount += 1;

    for (const lang of ["rw", "en", "fr"]) {
      const text = article.texts[lang];
      if (!text) continue;
      await db.query(
        `INSERT INTO article_texts (article_id, language, heading, body, is_official, review_status)
         VALUES ($1, $2, $3, $4, true, 'approved')
         ON CONFLICT (article_id, language) DO UPDATE
           SET heading = EXCLUDED.heading, body = EXCLUDED.body, updated_at = now()`,
        [articleId, lang, text.heading, text.body],
      );
      textCount += 1;
    }
  }

  await db.query("COMMIT");

  console.log(`Loaded  ${corpus.source.gazetteRef}`);
  console.log(`        law ${LAW_NUMBER}`);
  console.log(`        ${articleCount} articles, ${textCount} official texts`);

  // Scoped to the law just loaded. A database-wide count read as a description
  // of this load and disagreed with it — 177 English texts for a 176-article
  // law — because it was silently including every other law in the corpus.
  const { rows: check } = await db.query(
    `SELECT at.language, count(*)::int AS n
       FROM article_texts at
       JOIN articles a ON a.id = at.article_id
      WHERE a.law_id = $1
      GROUP BY at.language
      ORDER BY at.language`,
    [lawId],
  );
  for (const c of check) console.log(`        ${c.language}: ${c.n}`);
} catch (err) {
  await db.query("ROLLBACK");
  console.error("Load failed, rolled back:", err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
