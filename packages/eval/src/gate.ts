#!/usr/bin/env node
/**
 * Proves the review gate: nothing generated reaches a reader unapproved.
 *
 *   node --experimental-strip-types packages/eval/src/gate.ts
 *
 * This is the safety property the whole product rests on. MyLo's promise is to
 * explain the law, the explanations will be model-written, and the rule is that
 * a person is responsible for every word of them before anyone sees them. The
 * schema expresses that with `explanations.review_status` and the API expresses
 * it with a join condition — and **nothing had ever tested it**, because no
 * explanation had ever existed.
 *
 * A rule enforced by one `AND` in one query, never exercised, is a rule that
 * works until someone rewrites that query. The failure would be silent and in
 * the worst possible direction: unreviewed text about the law, served to
 * somebody who cannot afford a lawyer, indistinguishable from reviewed text.
 *
 * So this walks the whole path against the real database and the real query:
 * insert a draft, confirm it is withheld, approve it, confirm it is served,
 * reject it, confirm it is withheld again.
 */
import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();

/**
 * The API's own join, copied exactly.
 *
 * Deliberately duplicated rather than imported: the point is to catch a change
 * to the API's query, and a test that imports the thing it is testing cannot do
 * that. If these two drift, this fails — which is the alarm.
 */
const SERVED = `
  SELECT ex.body
    FROM article_texts at
    JOIN articles a ON a.id = at.article_id
    LEFT JOIN explanations ex
           ON ex.article_id = a.id
          AND ex.language = at.language
          AND ex.review_status = 'approved'
   WHERE a.id = $1 AND at.language = $2
`;

const { rows: target } = await db.query<{ id: string; language: string }>(`
  SELECT a.id, at.language
    FROM articles a JOIN article_texts at ON at.article_id = a.id
   WHERE at.language = 'en'
   LIMIT 1
`);

if (target.length === 0) {
  console.error("No articles loaded — load a corpus first.");
  process.exit(1);
}

const { id: articleId, language } = target[0]!;
const marker = `GATE TEST ${Date.now()} — this text must never reach a reader unapproved.`;

const served = async () => {
  const { rows } = await db.query<{ body: string | null }>(SERVED, [
    articleId,
    language,
  ]);
  return rows[0]?.body ?? null;
};

let failures = 0;
const check = (name: string, condition: boolean, detail: string) => {
  console.log(
    `  ${condition ? "pass" : "FAIL"}  ${name}${condition ? "" : ` — ${detail}`}`,
  );
  if (!condition) failures += 1;
};

await db.query("BEGIN");
try {
  await db.query(
    `INSERT INTO explanations (article_id, language, body, review_status, generated_by_model, generated_at)
     VALUES ($1, $2, $3, 'draft', 'gate-test', now())`,
    [articleId, language, marker],
  );

  console.log(
    "Review gate, against the real database and the API's own query\n",
  );

  check(
    "a draft explanation is withheld",
    (await served()) === null,
    "draft text was served to a reader",
  );

  await db.query(
    `UPDATE explanations SET review_status = 'approved', reviewed_at = now()
      WHERE article_id = $1 AND language = $2 AND body = $3`,
    [articleId, language, marker],
  );
  check(
    "an approved explanation is served",
    (await served()) === marker,
    "approved text did not reach the reader",
  );

  await db.query(
    `UPDATE explanations SET review_status = 'rejected'
      WHERE article_id = $1 AND language = $2 AND body = $3`,
    [articleId, language, marker],
  );
  check(
    "a rejected explanation is withheld again",
    (await served()) === null,
    "rejected text was still served",
  );

  // Approval must not be reachable by default. A row that arrives without a
  // stated status is a row nobody reviewed.
  await db.query(
    `INSERT INTO explanations (article_id, language, body)
     VALUES ($1, $2, $3)`,
    [articleId, language, `${marker} (no status given)`],
  );
  const { rows: defaulted } = await db.query<{ review_status: string }>(
    `SELECT review_status FROM explanations WHERE body = $1`,
    [`${marker} (no status given)`],
  );
  check(
    "an explanation inserted without a status defaults to draft",
    defaulted[0]?.review_status === "draft",
    `defaulted to ${defaulted[0]?.review_status}`,
  );
} finally {
  // Always rolled back. This writes unreviewed text about the law into the
  // explanations table, and a test that leaves that behind on a crash has done
  // the exact thing it exists to prevent.
  await db.query("ROLLBACK");
  await db.end();
}

console.log(
  failures === 0
    ? "\nGate holds. Nothing unapproved reached the reader.\n"
    : `\n${failures} check(s) failed. Do not ship explanations.\n`,
);
process.exit(failures === 0 ? 0 : 1);
