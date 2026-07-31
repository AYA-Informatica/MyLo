#!/usr/bin/env node
/**
 * Does matching a question to a question beat matching it to legal prose?
 *
 *   npm run eval:question-index -- [--articles 80] [--model gemma3:12b]
 *
 * This is the load-bearing assumption behind the question bank, and it has been
 * asserted in comments since the bank was designed without ever being measured.
 *
 * The motivating failure is concrete. Asked "Do I have the right to a fair
 * trial?", the API returns articles about health, employment and public service
 * — because the Constitution words that guarantee as due process, and a lexical
 * retriever cannot bridge vocabulary it does not share. The claim is that a bank
 * of natural questions sits in the reader's vocabulary rather than the
 * drafter's, so the same query lands next to a stored question instead of
 * against prose that never uses its words.
 *
 * Protocol. Two different models read each article independently. One writes the
 * questions that go into the bank; the other writes the question used as the
 * user's query. The query model never sees the bank, and the two never share a
 * generation call.
 *
 * The first version of this used one model for both and held out one of its
 * three questions. That was not good enough: a query and its siblings came from
 * the same weights reading the same article in the same breath, so they shared
 * vocabulary and sentence shape, and the bank could score well by recognising
 * its own register rather than by understanding a question. Splitting the models
 * removes most of that. Real questions from real people would remove the rest,
 * and should replace this when they exist.
 *
 *   baseline    query -> BM25 over article prose        (what production does)
 *   bank        query -> BM25 over banked questions     (the hypothesis)
 *   augmented   query -> BM25 over prose + questions    (the realistic deployment)
 *   fused       bank and baseline, by reciprocal rank   (do they complement?)
 *
 * `augmented` is included because replacing prose with questions is not the only
 * way to use a bank, and probably not the sensible one: appending each article's
 * questions to its indexed text keeps everything the prose already matched and
 * adds the reader's vocabulary on top. If the bank helps at all, it should help
 * most here.
 *
 * An article's bank score is the best of its questions, not their sum: a
 * question either matches or it does not, and summing would reward articles
 * simply for having more phrasings.
 *
 * Honest limits. Both models still read the same article to produce their
 * questions, so a query is guaranteed to be answerable and to concern the exact
 * text indexed — a real reader's question may be vague, compound, or about
 * something the Constitution never addresses. Treat these numbers as retrieval
 * accuracy given a well-formed answerable question, which is the best case.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "./providers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "..", "out");

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const MODEL = flag("model", "gemma3:12b");
/**
 * The model that writes the held-out queries, deliberately not the one that
 * writes the bank.
 *
 * With one model doing both, a query and its siblings come from the same weights
 * reading the same article in the same call, so they share vocabulary and
 * sentence shape that a real reader will not — and the bank scores well by
 * recognising its own register rather than by understanding the question. Using
 * a different model for the queries removes most of that, and is the closest
 * approximation to a stranger's phrasing available without collecting real
 * questions from real people, which is what should eventually replace it.
 */
const QUERY_MODEL = flag("query-model", "gemma3:4b");
const N = Number.parseInt(flag("articles", "80"), 10);
const LANGS = ["rw", "en", "fr"];

const corpus = JSON.parse(
  readFileSync(
    join(here, "..", "..", "corpus", "out", "constitution.json"),
    "utf8",
  ),
);

const usable = corpus.articles.filter((a) =>
  LANGS.every(
    (l) => a.texts[l]?.heading?.length > 6 && a.texts[l]?.body?.length > 200,
  ),
);
const items = usable.slice(0, N);

/* ── retrieval, identical to what the API serves ──────────────────────────── */

const charNgrams = (text, n = 4) => {
  const s = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const out = [];
  for (let i = 0; i + n <= s.length; i += 1) out.push(s.slice(i, i + n));
  return out;
};

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

/** Reciprocal rank fusion of several per-article score vectors. */
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

/* ── question generation, cached ──────────────────────────────────────────── */

const ASK_PROMPT = (heading, body) =>
  `An article of the Constitution of Rwanda is below.

Title: ${heading}
Text: ${body}

Write the 3 questions an ordinary Rwandan citizen — not a lawyer — would ask that THIS article answers. Use everyday words, not legal terms. Write each question on its own line, with no numbering, no bullets and no commentary.`;

const parseQuestions = (text) =>
  text
    .split("\n")
    .map((l) => l.replace(/^\s*[-*\d.)\]]+\s*/, "").trim())
    .filter((l) => l.length > 12 && l.length < 240)
    .filter((l) => l.includes("?"))
    .slice(0, 3);

async function questionsFor(lang, model) {
  mkdirSync(cacheDir, { recursive: true });
  const fingerprint = createHash("sha256")
    .update(
      model +
        items
          .map((a) => `${a.texts[lang].heading}|${a.texts[lang].body}`)
          .join(""),
    )
    .digest("hex")
    .slice(0, 12);
  const path = join(
    cacheDir,
    `questions-${lang}-${model.replace(/[:/]/g, "-")}-${fingerprint}.json`,
  );
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));

  const out = [];
  for (let i = 0; i < items.length; i += 1) {
    const t = items[i].texts[lang];
    process.stdout.write(
      `\r    generating ${lang} ${i + 1}/${items.length}…   `,
    );
    let qs = [];
    try {
      const { text } = await generate(model, ASK_PROMPT(t.heading, t.body), {
        maxTokens: 300,
      });
      qs = parseQuestions(text);
    } catch (err) {
      process.stdout.write(
        `\n    article ${items[i].number} failed: ${err.message}\n`,
      );
    }
    out.push(qs);
  }
  process.stdout.write("\r".padEnd(48) + "\r");
  writeFileSync(path, JSON.stringify(out));
  return out;
}

/* ── run ──────────────────────────────────────────────────────────────────── */

console.log(`Task    a citizen's question -> the article that answers it`);
console.log(`Corpus  ${items.length} articles`);
console.log(`Bank    ${MODEL} writes the banked questions`);
console.log(
  `Query   ${QUERY_MODEL} writes the held-out queries, independently`,
);
console.log(`Chance  ${(100 / items.length).toFixed(1)}% at rank 1\n`);

const row = (name, s) =>
  `    ${name.padEnd(22)} recall@1 ${s.r1.toFixed(1).padStart(5)}%   recall@5 ${s.r5.toFixed(1).padStart(5)}%`;

for (const lang of process.argv.includes("--all") ? LANGS : ["en"]) {
  const generated = await questionsFor(lang, MODEL);
  const queries = await questionsFor(lang, QUERY_MODEL);

  // Only articles with a held-out query and at least one sibling can be scored.
  // Scoring the rest would silently compare different test sets.
  const scorable = items
    .map((_, i) => i)
    .filter((i) => generated[i]?.length >= 2 && queries[i]?.length >= 1);

  const prose = items.map(
    (a) => `${a.texts[lang].heading} ${a.texts[lang].body}`,
  );
  const bm25Prose = buildBm25(prose);

  // The bank: every question except each article's held-out first one.
  const bankTexts = [];
  const bankOwner = [];
  generated.forEach((qs, i) => {
    (qs ?? []).forEach((q) => {
      bankTexts.push(q);
      bankOwner.push(i);
    });
  });
  const bm25Bank = buildBm25(bankTexts);

  /** Per-article scores from the bank: an article scores as its best question. */
  const bankScores = (query) => {
    const perQuestion = bm25Bank(query);
    const best = new Array(items.length).fill(0);
    perQuestion.forEach((s, qi) => {
      const owner = bankOwner[qi];
      if (s > best[owner]) best[owner] = s;
    });
    return best;
  };

  const evaluate = (scoreFor) => {
    let hit1 = 0;
    let hit5 = 0;
    for (const q of scorable) {
      const ranked = scoreFor(q)
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

  const query = (q) => queries[q][0];

  console.log(
    `  ${lang}   ${scorable.length} articles scorable, ${bankTexts.length} questions banked`,
  );
  // Each article's indexed text plus its own banked questions.
  const bm25Augmented = buildBm25(
    items.map((a, i) => `${prose[i]} ${(generated[i] ?? []).join(" ")}`),
  );

  const baseline = evaluate((q) => bm25Prose(query(q)));
  const bank = evaluate((q) => bankScores(query(q)));
  const augmented = evaluate((q) => bm25Augmented(query(q)));
  const fused = evaluate((q) =>
    fuse([bm25Prose(query(q)), bankScores(query(q))]),
  );

  console.log(row("baseline (prose)", baseline));
  console.log(row("question bank", bank));
  console.log(row("augmented", augmented));
  console.log(row("fused (RRF)", fused));
  console.log(
    `    lift (bank)      recall@1 ${(bank.r1 - baseline.r1 >= 0 ? "+" : "") + (bank.r1 - baseline.r1).toFixed(1)} pts` +
      `   recall@5 ${(bank.r5 - baseline.r5 >= 0 ? "+" : "") + (bank.r5 - baseline.r5).toFixed(1)} pts\n`,
  );
}

console.log(
  `A bank that wins is worth its generation cost and its review burden. One that\n` +
    `only ties is a large amount of machinery for nothing, and the honest move is\n` +
    `to drop it rather than keep it because it was already built.`,
);
