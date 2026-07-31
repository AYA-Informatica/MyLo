#!/usr/bin/env node
/**
 * Is knowing Kinyarwanda morphology better than not knowing it?
 *
 *   npm run eval:tokenizer -w @mylo/pipeline -- [--articles 129]
 *
 * Character n-grams retrieve Kinyarwanda better than words or embeddings, and
 * the reason given has always been that overlapping character runs recover the
 * stem that agglutination hides — by accident, without knowing the language.
 *
 * The trainee grammar in `Material for understanding Kinyarwanda` documents the
 * sixteen noun classes and the verb structure that produce those prefixes. So
 * the accident can be done on purpose. This measures whether that is better,
 * against the same articles and the same citizen-style questions used
 * everywhere else, so the numbers sit beside the existing ones.
 *
 *   chars(4)        what production indexes today
 *   words           plain word tokens, the thing agglutination defeats
 *   stems           roots from the documented noun classes, plus surface forms
 *   stems + chars   both, since they fail differently
 *
 * A rule-based stemmer with no lexicon collapses 8 of 10 singular/plural pairs
 * correctly; the two it misses need phonology it cannot see ("urwego" against
 * "inzego"). Whether that residue matters is what this answers.
 *
 * The honest bar is high. Character n-grams need no linguistic knowledge, no
 * maintenance, and work identically in all three languages. A stemmer is
 * Kinyarwanda-only code that someone has to keep correct, so it has to earn its
 * place with a clear margin rather than a rounding difference.
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { stemTokens } from "@mylo/eval/rw-morphology";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "..", "out");

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const N = Number.parseInt(flag("articles", "129"), 10);
const QUERY_MODEL = flag("model", "gemma3:4b");
const LANG = "rw";
const LANGS = ["rw", "en", "fr"];
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";

const db = new pg.Pool({ connectionString: DATABASE_URL });

/* ── tokenisers ───────────────────────────────────────────────────────────── */

const chars = (text, n = 4) => {
  const s = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const out = [];
  for (let i = 0; i + n <= s.length; i += 1) out.push(s.slice(i, i + n));
  return out;
};

const words = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((w) => w.length > 2);

const stemsAndChars = (text) => [...stemTokens(text), ...chars(text)];

function buildBm25(documents, tokenise, { k1 = 1.5, b = 0.75 } = {}) {
  const docs = documents.map(tokenise);
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
    const q = tokenise(query);
    return termFreq.map((tf, i) => {
      let score = 0;
      for (const t of q) {
        const f = tf.get(t);
        if (!f) continue;
        const denom = f + k1 * (1 - b + (b * lengths[i]) / (avgLen || 1));
        score += (idf.get(t) ?? 0) * ((f * (k1 + 1)) / denom);
      }
      return score;
    });
  };
}

/* ── corpus and bank, as the API sees them ────────────────────────────────── */

const { rows: articleRows } = await db.query(
  `SELECT a.id, a.ordinal, at.language, at.heading, at.body
     FROM articles a
     JOIN article_texts at ON at.article_id = a.id
     JOIN laws l ON l.id = a.law_id
    WHERE l.law_number = 'CONSTITUTION-2023'
    ORDER BY a.ordinal`,
);
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

/** The same citizen-style questions the other evaluations use. */
const fingerprint = createHash("sha256")
  .update(
    QUERY_MODEL +
      items
        .map((a) => `${a.texts[LANG].heading}|${a.texts[LANG].body}`)
        .join(""),
  )
  .digest("hex")
  .slice(0, 12);
const queryPath = join(
  cacheDir,
  `bank-queries-${LANG}-${QUERY_MODEL.replace(/[:/]/g, "-")}-${fingerprint}.json`,
);
if (!existsSync(queryPath)) {
  console.error(
    `No cached questions at ${queryPath}.\nRun eval:bank-lift first with the same --articles.`,
  );
  await db.end();
  process.exit(1);
}
const queries = JSON.parse(readFileSync(queryPath, "utf8"));
const scorable = items.map((_, i) => i).filter((i) => queries[i]?.length > 10);

const documents = items.map((a) => {
  const t = a.texts[LANG];
  const qs = bank.get(`${a.id}:${LANG}`) ?? [];
  return `${t.heading ?? ""} ${t.body} ${qs.join(" ")}`;
});

const evaluate = (score) => {
  let hit1 = 0;
  let hit5 = 0;
  for (const q of scorable) {
    const ranked = score(queries[q])
      .map((s, i) => ({ i, s }))
      .sort((a, b) => b.s - a.s);
    const rank = ranked.findIndex((r) => r.i === q) + 1;
    if (rank === 1) hit1 += 1;
    if (rank <= 5) hit5 += 1;
  }
  return {
    r1: (100 * hit1) / scorable.length,
    r5: (100 * hit5) / scorable.length,
  };
};

console.log(`Task    a Kinyarwanda question -> the article that answers it`);
console.log(`Corpus  ${items.length} articles, index as the API builds it`);
console.log(
  `Queries ${scorable.length} citizen-style questions (${QUERY_MODEL})\n`,
);

const row = (name, s, base) => {
  const d1 = base ? s.r1 - base.r1 : 0;
  const d5 = base ? s.r5 - base.r5 : 0;
  const delta = base
    ? `   ${(d1 >= 0 ? "+" : "") + d1.toFixed(1)} / ${(d5 >= 0 ? "+" : "") + d5.toFixed(1)}`
    : "";
  return `    ${name.padEnd(16)} recall@1 ${s.r1.toFixed(1).padStart(5)}%   recall@5 ${s.r5.toFixed(1).padStart(5)}%${delta}`;
};

const baseline = evaluate(buildBm25(documents, (t) => chars(t, 4)));
console.log(row("chars(4)", baseline));
console.log(row("words", evaluate(buildBm25(documents, words)), baseline));
console.log(row("stems", evaluate(buildBm25(documents, stemTokens)), baseline));
console.log(
  row("stems + chars", evaluate(buildBm25(documents, stemsAndChars)), baseline),
);

/* ── is the difference real, or 129 queries of luck? ──────────────────────── */

/** Which query indices each tokeniser ranked correctly at position 1. */
function correctSet(score) {
  const hits = new Set();
  for (const q of scorable) {
    const scores = score(queries[q]);
    let best = 0;
    for (let i = 1; i < scores.length; i += 1)
      if (scores[i] > scores[best]) best = i;
    if (best === q) hits.add(q);
  }
  return hits;
}

/** Two-sided exact binomial probability of a split at least this lopsided. */
function binomialP(a, b) {
  const n = a + b;
  if (n === 0) return 1;
  const choose = (nn, k) => {
    let r = 1;
    for (let i = 0; i < k; i += 1) r = (r * (nn - i)) / (i + 1);
    return r;
  };
  let p = 0;
  for (let k = 0; k <= Math.min(a, b); k += 1) p += choose(n, k) * 0.5 ** n;
  return Math.min(1, 2 * p);
}

/*
 * McNemar's test on paired outcomes.
 *
 * Both tokenisers answer identical queries, so most results agree and carry no
 * information about which is better. Only the disagreements do. Comparing two
 * overall percentages as though they were independent samples would overstate
 * the evidence, and at this corpus size that is the difference between a finding
 * and a coincidence.
 */
const charsHits = correctSet(buildBm25(documents, (t) => chars(t, 4)));
const bothHits = correctSet(buildBm25(documents, stemsAndChars));
const onlyChars = [...charsHits].filter((q) => !bothHits.has(q)).length;
const onlyBoth = [...bothHits].filter((q) => !charsHits.has(q)).length;
const p = binomialP(onlyChars, onlyBoth);

console.log(
  `\n  chars(4) alone correct: ${onlyChars}     stems+chars alone correct: ${onlyBoth}` +
    `     (${onlyChars + onlyBoth} disagreements)`,
);
console.log(`  two-sided exact binomial  p = ${p.toFixed(4)}`);
console.log(
  p < 0.05
    ? `  Significant. The morphology is carrying real weight, not noise.`
    : `  NOT significant at ${scorable.length} queries. The gap is inside what chance can\n` +
        `  produce, so this is a reason to gather real queries — not a reason to ship\n` +
        `  Kinyarwanda-only code that someone has to keep correct forever.`,
);

console.log(
  `\nCharacter n-grams need no linguistic knowledge and no maintenance, and behave\n` +
    `the same in every language. Morphology is Kinyarwanda-only code somebody has\n` +
    `to keep correct, so a small win is not a win.`,
);

await db.end();
