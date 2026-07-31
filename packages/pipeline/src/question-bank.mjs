#!/usr/bin/env node
/**
 * Builds the curated question bank from the Constitution.
 *
 *   npm run build:questions -- [--model gemma3:12b] [--articles 5]
 *
 * For each article it generates the questions an ordinary person would actually
 * ask that the article answers, phrased in all three official languages, and
 * links them to the article. Everything lands as `draft`: nothing generated here
 * is served until a person approves it.
 *
 * Why a bank rather than live retrieval every time. Matching a question to a
 * *question* is far easier than matching it to legal prose — "nshobora
 * gushyingirwa mfite imyaka 17?" shares almost no vocabulary with an article
 * that never says "17", but it sits right next to a stored question about the
 * minimum age of marriage. The bank is therefore the retrieval index, and the
 * cache, and the review surface, all at once.
 *
 * On model risk. The evaluation in packages/eval found that small models corrupt
 * Kinyarwanda legal wording, which is why explanations must be human-written or
 * human-approved. Questions are different in kind: a banked question is an index
 * key, never an assertion. A clumsy one degrades matching; it cannot state the
 * law incorrectly, because it states nothing. So a weaker model is acceptable
 * here in a way it is not for explanations — and review still catches the rest.
 *
 * The concept is generated once from the English text, where models are most
 * reliable, and then phrased in Kinyarwanda and French with that language's
 * official article supplied as vocabulary. Grounding measurably reduces invented
 * words (lift 42.3 in the grounded evaluation), and it keeps the three phrasings
 * bound to one question rather than producing three unrelated ones.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { generate } from "@mylo/eval/providers";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const MODEL = flag("model", "gemma3:12b");
const LIMIT = Number.parseInt(flag("articles", "0"), 10); // 0 = all
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";

const corpus = JSON.parse(
  readFileSync(
    join(here, "..", "..", "corpus", "out", "constitution.json"),
    "utf8",
  ),
);

const ASK_PROMPT = (heading, body) =>
  `An article of the Constitution of Rwanda is below.

Title: ${heading}
Text: ${body}

Write the 3 questions an ordinary Rwandan citizen — not a lawyer — would ask that THIS article answers. Use everyday words, not legal terms. Write each question on its own line, with no numbering, no bullets and no commentary.`;

const PHRASE_PROMPT = (question, officialText, languageName) =>
  `Here is the same article of the Constitution of Rwanda, in ${languageName}:

"""
${officialText}
"""

Write this question in ${languageName}, using the vocabulary of the text above:

${question}

Reply with the ${languageName} question only. No commentary.`;

/** Splits a model's reply into candidate questions. */
function parseQuestions(text) {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*[-*\d.)\]]+\s*/, "").trim())
    .filter((l) => l.length > 12 && l.length < 240)
    .filter((l) => l.includes("?"))
    .slice(0, 3);
}

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();

/** Articles already in the database, keyed by their printed number. */
const { rows: dbArticles } = await db.query(
  `SELECT a.id, a.article_number FROM articles a
   JOIN laws l ON l.id = a.law_id
   WHERE l.law_number = $1`,
  ["CONSTITUTION-2023"],
);
const articleIdByNumber = new Map(
  dbArticles.map((r) => [r.article_number, r.id]),
);

if (articleIdByNumber.size === 0) {
  console.error(
    "No Constitution articles found in the database.\n" +
      "Load the corpus first — the question bank links to article rows, and a\n" +
      "question that cannot cite an article is exactly what this design forbids.",
  );
  await db.end();
  process.exit(1);
}

const candidates = corpus.articles.filter(
  (a) =>
    a.texts.en &&
    a.texts.rw &&
    a.texts.fr &&
    articleIdByNumber.has(String(a.number)),
);
const targets = LIMIT > 0 ? candidates.slice(0, LIMIT) : candidates;

console.log(`Model     ${MODEL}`);
console.log(
  `Articles  ${targets.length} (of ${corpus.articles.length} in the corpus)`,
);
console.log(`Status    every row written as draft, pending human review\n`);

let created = 0;
let skipped = 0;

/**
 * Articles that already have banked questions.
 *
 * Generating the whole Constitution in three languages is roughly 1,200 model
 * calls and over an hour, so the run has to survive being interrupted. Without
 * this check a restart would re-ask every article it had already done and bank
 * a second, near-duplicate set — which is worse than wasted time, because
 * duplicate questions quietly bias retrieval toward whichever articles happened
 * to be generated twice.
 */
const { rows: doneRows } = await db.query(
  `SELECT DISTINCT a.article_number
     FROM question_bank_articles qba
     JOIN articles a ON a.id = qba.article_id`,
);
const alreadyBanked = new Set(doneRows.map((r) => r.article_number));
if (alreadyBanked.size > 0) {
  console.log(
    `Resuming  ${alreadyBanked.size} article(s) already banked, skipping them\n`,
  );
}

for (const article of targets) {
  const articleId = articleIdByNumber.get(String(article.number));

  if (alreadyBanked.has(String(article.number))) {
    skipped += 1;
    continue;
  }

  process.stdout.write(`  art ${String(article.number).padStart(3)} `);

  let questions = [];
  try {
    const { text } = await generate(
      MODEL,
      ASK_PROMPT(article.texts.en.heading, article.texts.en.body),
      { maxTokens: 300 },
    );
    questions = parseQuestions(text);
  } catch (err) {
    console.log(`generation failed: ${String(err.message).slice(0, 60)}`);
    skipped += 1;
    continue;
  }

  if (questions.length === 0) {
    console.log("no usable questions");
    skipped += 1;
    continue;
  }

  for (const english of questions) {
    // Phrase the same question in the other two languages, grounded in the
    // official text so the model reuses real vocabulary instead of inventing it.
    const phrasings = { en: english };
    for (const [lang, name] of [
      ["rw", "Kinyarwanda"],
      ["fr", "French"],
    ]) {
      try {
        const { text } = await generate(
          MODEL,
          PHRASE_PROMPT(english, article.texts[lang].body, name),
          { maxTokens: 160 },
        );
        const line = text.split("\n").find((l) => l.trim().length > 8);
        if (line) phrasings[lang] = line.trim();
      } catch {
        // A missing phrasing is survivable — the question still works in the
        // languages that succeeded, and review will fill the gap.
      }
    }

    const { rows } = await db.query(
      `INSERT INTO question_bank (review_status) VALUES ('draft') RETURNING id`,
    );
    const questionId = rows[0].id;

    for (const [lang, body] of Object.entries(phrasings)) {
      await db.query(
        `INSERT INTO question_bank_texts (question_id, language, body, generated_by_model)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (question_id, language) DO NOTHING`,
        [questionId, lang, body, MODEL],
      );
    }

    await db.query(
      `INSERT INTO question_bank_articles (question_id, article_id, ordinal)
       VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`,
      [questionId, articleId],
    );
    created += 1;
  }

  console.log(`${questions.length} questions`);
}

const { rows: counts } = await db.query(
  `SELECT language, count(*)::int AS n FROM question_bank_texts GROUP BY language ORDER BY language`,
);

console.log(
  `\nCreated  ${created} banked questions` +
    (skipped ? `, ${skipped} articles skipped` : ""),
);
for (const c of counts) console.log(`  ${c.language}: ${c.n} phrasings`);
console.log(
  `\nAll draft. Nothing here is served until reviewed — and the questions that\n` +
    `turn out to have no good article are the most useful rows in the table, because\n` +
    `they map what people need to know that the Constitution alone does not answer.`,
);

await db.end();
