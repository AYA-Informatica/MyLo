#!/usr/bin/env node
/**
 * Where "I don't know" begins, for the index the API actually serves.
 *
 *   npm run eval:threshold-live -w @mylo/pipeline -- [--articles 130]
 *
 * `eval:threshold` in @mylo/eval derives the floor from the corpus file. That was
 * correct while the index was nothing but official text. It is no longer: the API
 * appends every approved banked question to the document it indexes, which
 * lengthens documents and shifts every IDF weight, and the corpus file knows
 * nothing about the bank or about what has been approved.
 *
 * So a floor derived there would come back looking healthy and describe an index
 * that no longer exists. This reads the database and builds documents exactly the
 * way `buildIndexes` in apps/api does — same join, same review filter, same
 * concatenation order — so the numbers describe what a reader will actually hit.
 *
 * The signal set is better here too. The corpus-file version uses article
 * headings as stand-in questions, because that is all a file contains, and
 * headings are much shorter and more formal than anything a person types. This
 * uses the citizen-style questions generated for `eval:bank-lift`, which are the
 * closest thing available to real traffic.
 *
 * A miscalibrated floor does not fail loudly. It quietly answers questions it
 * should decline, or declines ones it should answer, and both look like ordinary
 * results. Re-run this after approving or rejecting anything.
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { NOISE } from "@mylo/eval/noise-questions";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "..", "out");

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const N = Number.parseInt(flag("articles", "130"), 10);
const QUERY_MODEL = flag("model", "gemma3:4b");
const LANGS = ["rw", "en", "fr"];
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";

const db = new pg.Pool({ connectionString: DATABASE_URL });

const charNgrams = (text, n = 4) => {
  const s = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const out = [];
  for (let i = 0; i + n <= s.length; i += 1) out.push(s.slice(i, i + n));
  return out;
};

/** Returns the top score for a query — the number the floor is compared against. */
function buildBm25(documents, { k1 = 1.5, b = 0.75 } = {}) {
  const docs = documents.map((d) => charNgrams(d));
  const lengths = docs.map((d) => d.length);
  const avgLen = lengths.reduce((a, x) => a + x, 0) / (docs.length || 1);

  const termFreq = docs.map((d) => {
    const m = new Map();
    for (const t of d) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  });

  const docFreq = new Map();
  for (const tf of termFreq)
    for (const t of tf.keys()) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);

  const idf = new Map();
  for (const [t, df] of docFreq)
    idf.set(t, Math.log((docs.length - df + 0.5) / (df + 0.5) + 1));

  return (query) => {
    const q = charNgrams(query);
    let best = 0;
    for (let i = 0; i < termFreq.length; i += 1) {
      let score = 0;
      for (const t of q) {
        const f = termFreq[i].get(t);
        if (!f) continue;
        const denom = f + k1 * (1 - b + (b * lengths[i]) / (avgLen || 1));
        score += (idf.get(t) ?? 0) * ((f * (k1 + 1)) / denom);
      }
      if (score > best) best = score;
    }
    return best;
  };
}

/* ── the documents the API builds, rebuilt here ───────────────────────────── */

const { rows: articleRows } = await db.query(
  `SELECT a.id, a.ordinal, at.language, at.heading, at.body
     FROM articles a
     JOIN article_texts at ON at.article_id = a.id
     JOIN laws l ON l.id = a.law_id
    WHERE l.law_number = 'CONSTITUTION-2023'
    ORDER BY a.ordinal`,
);

// The API's filter, exactly: approved only.
const { rows: bankRows } = await db.query(
  `SELECT qba.article_id, qbt.language, qbt.body
     FROM question_bank qb
     JOIN question_bank_articles qba ON qba.question_id = qb.id
     JOIN question_bank_texts qbt    ON qbt.question_id = qb.id
    WHERE qb.review_status = 'approved'`,
);

const byArticle = new Map();
for (const r of articleRows) {
  const e = byArticle.get(r.id) ?? { id: r.id, ordinal: r.ordinal, texts: {} };
  e.texts[r.language] = { heading: r.heading, body: r.body };
  byArticle.set(r.id, e);
}

const bank = new Map();
for (const r of bankRows) {
  const key = `${r.article_id}:${r.language}`;
  bank.set(key, [...(bank.get(key) ?? []), r.body]);
}

const items = [...byArticle.values()]
  .filter((a) =>
    LANGS.every(
      (l) => a.texts[l]?.heading?.length > 6 && a.texts[l]?.body?.length > 200,
    ),
  )
  .sort((a, b) => a.ordinal - b.ordinal)
  .slice(0, N);

/** Cached citizen-style questions from eval:bank-lift, used as the signal set. */
function cachedQueries(lang) {
  const fingerprint = createHash("sha256")
    .update(
      QUERY_MODEL +
        items
          .map((a) => `${a.texts[lang].heading}|${a.texts[lang].body}`)
          .join(""),
    )
    .digest("hex")
    .slice(0, 12);
  const path = join(
    cacheDir,
    `bank-queries-${lang}-${QUERY_MODEL.replace(/[:/]/g, "-")}-${fingerprint}.json`,
  );
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

const quantile = (sorted, q) =>
  sorted.length === 0
    ? 0
    : sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

/**
 * Best separator of the two distributions.
 *
 * Noise rejection is weighted double: citing the Constitution at someone asking
 * about football misleads them, while declining a real question merely
 * disappoints, and those are not equally bad in a legal tool.
 */
function bestCut(signal, noise) {
  const candidates = [...new Set([...signal, ...noise])].sort((a, b) => a - b);
  let best = { cut: 0, kept: 0, rejected: 0, score: -1 };
  for (const c of candidates) {
    const kept = signal.filter((s) => s >= c).length;
    const rejected = noise.filter((n) => n < c).length;
    const score = kept / signal.length + 2 * (rejected / noise.length);
    if (score > best.score) best = { cut: c, kept, rejected, score };
  }
  return best;
}

console.log(`Index   ${items.length} articles, as the API builds them`);
console.log(
  `Bank    ${bankRows.length} approved phrasings appended to indexed text`,
);
console.log(`Signal  citizen-style questions (${QUERY_MODEL})`);
console.log(`Noise   ${NOISE.en.length} off-topic questions per language\n`);

const floors = {};
let missingCache = false;

for (const lang of LANGS) {
  const queries = cachedQueries(lang);
  if (!queries) {
    console.log(
      `  ${lang}   no cached questions — run eval:bank-lift first, same --articles`,
    );
    missingCache = true;
    continue;
  }

  const approved = items.filter(
    (a) => (bank.get(`${a.id}:${lang}`) ?? []).length > 0,
  ).length;

  const documents = items.map((a) => {
    const t = a.texts[lang];
    const qs = bank.get(`${a.id}:${lang}`) ?? [];
    // Same concatenation as apps/api buildIndexes: heading, body, questions.
    return `${t.heading ?? ""} ${t.body} ${qs.join(" ")}`;
  });

  const topScore = buildBm25(documents);
  const signal = queries
    .filter((q) => q && q.length > 10)
    .map((q) => topScore(q))
    .sort((a, b) => a - b);
  const noise = NOISE[lang].map((q) => topScore(q)).sort((a, b) => a - b);

  const { cut, kept, rejected } = bestCut(signal, noise);
  const noiseMax = noise[noise.length - 1];

  // Never below the loudest noise actually observed.
  //
  // An earlier version shrank the cut by 5% to avoid overfitting six noise
  // samples. That is defensible while signal and noise are far apart and
  // indefensible when they are not: with the Kinyarwanda cut at 35.1 and noise
  // reaching 34.2, the shrink produced a floor of 33 and a question about
  // cooking bananas came back citing the state budget article. A margin meant to
  // be cautious had guaranteed a known-bad query would pass.
  //
  // So the floor sits just above measured noise, and above the separator when
  // that is higher. Erring toward refusal is the right direction for a legal
  // tool: declining a real question disappoints, citing the Constitution at
  // someone asking about bread misleads.
  floors[lang] = Math.ceil(Math.max(cut, noiseMax * 1.02));

  console.log(`  ${lang}   ${approved}/${items.length} articles augmented`);
  console.log(
    `    signal  p05 ${quantile(signal, 0.05).toFixed(1)}   median ${quantile(signal, 0.5).toFixed(1)}` +
      `        noise max ${noise[noise.length - 1].toFixed(1)}`,
  );
  console.log(
    `    cut ${cut.toFixed(1)}  →  keeps ${((100 * kept) / signal.length).toFixed(1)}% of real, ` +
      `rejects ${((100 * rejected) / noise.length).toFixed(0)}% of noise\n`,
  );
}

if (!missingCache) {
  console.log(`SCORE_FLOOR = ${JSON.stringify(floors)}`);
  console.log(
    `\nPaste into apps/api/src/server.ts. These describe the live index including\n` +
      `approved questions — re-run after any further review decision.`,
  );
}

await db.end();
