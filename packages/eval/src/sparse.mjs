#!/usr/bin/env node
/**
 * Lexical and hybrid retrieval, against the dense baseline.
 *
 *   npm run eval:sparse
 *
 * Dense embeddings retrieve Kinyarwanda at 19.7% recall@1 against 58.3% for
 * English, and the cross-lingual matrix showed the ceiling is the Kinyarwanda
 * vectors themselves rather than alignment between languages. So the question
 * here is whether meaning has to be encoded at all: legal Kinyarwanda vocabulary
 * is distinctive and repeated, which is the situation where plain lexical
 * matching often beats a weak embedding.
 *
 * Three retrievers, same test set, same ground truth:
 *
 *   BM25 over words       the standard lexical baseline
 *   BM25 over characters  because Kinyarwanda is agglutinative — "ubutegetsi",
 *                         "bw'ubutegetsi" and "butegetsi" are the same idea
 *                         wearing different prefixes, and a word-level index
 *                         treats them as three unrelated terms. Character
 *                         n-grams recover the shared stem. This is the same
 *                         reasoning that made chrF the right translation metric.
 *   Hybrid                dense + best sparse, fused by reciprocal rank
 *
 * Fusion is reciprocal rank rather than a weighted score sum, because the two
 * retrievers produce scores on incomparable scales — cosine similarity against
 * BM25 — and normalising them introduces a tuning knob that would need its own
 * validation set. Ranks need no such calibration.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "..", "out");
const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";
const EMBED_MODEL = "bge-m3";
const LANGS = ["rw", "en", "fr"];

const corpus = JSON.parse(
  readFileSync(
    join(here, "..", "..", "corpus", "out", "constitution.json"),
    "utf8",
  ),
);
const items = corpus.articles.filter((a) =>
  LANGS.every(
    (l) => a.texts[l]?.heading?.length > 6 && a.texts[l]?.body?.length > 200,
  ),
);

/* ── tokenisers ───────────────────────────────────────────────────────────── */

const words = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((w) => w.length > 2);

/** Overlapping character n-grams, whitespace removed. */
const chars = (text, n = 4) => {
  const s = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const out = [];
  for (let i = 0; i + n <= s.length; i += 1) out.push(s.slice(i, i + n));
  return out;
};

/* ── BM25 ─────────────────────────────────────────────────────────────────── */

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

  const N = docs.length;
  const idf = new Map();
  for (const [t, df] of docFreq)
    idf.set(t, Math.log((N - df + 0.5) / (df + 0.5) + 1));

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

/* ── dense, cached so iteration is cheap ──────────────────────────────────── */

async function embed(input) {
  const res = await fetch(`${OLLAMA}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input }),
  });
  if (!res.ok) throw new Error(`embed ${res.status}`);
  const body = await res.json();
  return body.embeddings?.[0] ?? body.embedding;
}

async function denseVectors(lang) {
  mkdirSync(cacheDir, { recursive: true });
  const path = join(
    cacheDir,
    `vectors-${EMBED_MODEL}-${lang}-${items.length}.json`,
  );
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));

  process.stdout.write(`    embedding ${lang}… `);
  const docs = [];
  const queries = [];
  for (const a of items) docs.push(await embed(a.texts[lang].body));
  for (const a of items) queries.push(await embed(a.texts[lang].heading));
  writeFileSync(path, JSON.stringify({ docs, queries }));
  console.log("cached");
  return { docs, queries };
}

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cosine = (a, b) =>
  dot(a, b) / (Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b)) || 1);

/* ── scoring ──────────────────────────────────────────────────────────────── */

/** recall@1 and @5 given a function returning per-document scores for query q. */
function evaluate(scoreFor) {
  let hit1 = 0;
  let hit5 = 0;
  for (let q = 0; q < items.length; q += 1) {
    const ranked = scoreFor(q)
      .map((s, i) => ({ i, s }))
      .sort((a, b) => b.s - a.s);
    const rank = ranked.findIndex((r) => r.i === q) + 1;
    if (rank === 1) hit1 += 1;
    if (rank <= 5) hit5 += 1;
  }
  return { r1: (100 * hit1) / items.length, r5: (100 * hit5) / items.length };
}

/** Reciprocal rank fusion of several score vectors. */
function fuse(scoreVectors, k = 60) {
  const ranks = scoreVectors.map((scores) => {
    const order = scores.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s);
    const r = new Array(scores.length);
    order.forEach((o, position) => {
      r[o.i] = position + 1;
    });
    return r;
  });
  return items.map((_, i) => ranks.reduce((sum, r) => sum + 1 / (k + r[i]), 0));
}

/* ── run ──────────────────────────────────────────────────────────────────── */

console.log(
  `Task    retrieve the right article from a short query, same language`,
);
console.log(`Corpus  ${items.length} articles usable in all three languages`);
console.log(`Chance  ${(100 / items.length).toFixed(1)}% at rank 1\n`);

const row = (name, s) =>
  `    ${name.padEnd(24)} recall@1 ${s.r1.toFixed(1).padStart(5)}%   recall@5 ${s.r5.toFixed(1).padStart(5)}%`;

for (const lang of LANGS) {
  console.log(`  ${lang}`);
  const bodies = items.map((a) => a.texts[lang].body);
  const headings = items.map((a) => a.texts[lang].heading);

  const bm25Words = buildBm25(bodies, words);
  const bm25Chars = buildBm25(bodies, (t) => chars(t, 4));

  const wordScores = evaluate((q) => bm25Words(headings[q]));
  const charScores = evaluate((q) => bm25Chars(headings[q]));

  const { docs, queries } = await denseVectors(lang);
  const denseScores = evaluate((q) => docs.map((d) => cosine(queries[q], d)));

  // Fuse dense with whichever sparse retriever did better on this language.
  const betterSparse = charScores.r1 >= wordScores.r1 ? bm25Chars : bm25Words;
  const hybridScores = evaluate((q) =>
    fuse([docs.map((d) => cosine(queries[q], d)), betterSparse(headings[q])]),
  );

  console.log(row("dense (bge-m3)", denseScores));
  console.log(row("sparse BM25 words", wordScores));
  console.log(row("sparse BM25 chars(4)", charScores));
  console.log(row("hybrid (RRF)", hybridScores));
  console.log("");
}

console.log(
  `If a lexical index matches or beats the dense one in Kinyarwanda, the practical\n` +
    `consequence is large: it needs no embedding model, no GPU, no training, and it\n` +
    `runs inside Postgres.`,
);
