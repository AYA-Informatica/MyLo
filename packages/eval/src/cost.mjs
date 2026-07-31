#!/usr/bin/env node
/**
 * What MyLo actually costs to run against a hosted model.
 *
 *   npm run cost
 *
 * "Frontier models are expensive" is true per token and misleading as a budget,
 * because it prices the wrong thing. Most of what MyLo serves is a fixed corpus:
 * 176 articles that do not change between users or between questions. Explaining
 * them is paid for once and served forever. Only genuinely novel questions cost
 * anything per use.
 *
 * All figures below are computed from the real corpus, using a tokens-per-
 * character ratio measured against a live tokenizer rather than assumed — and
 * the Kinyarwanda ratio is the one that matters, because low-resource languages
 * tokenize badly and that inflates every Kinyarwanda request.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Characters per token, measured on this corpus via a live tokenizer.
 * Kinyarwanda is roughly 1.83x the token cost of English for the same content.
 */
const CHARS_PER_TOKEN = { en: 3.97, fr: 3.23, rw: 2.17 };

/** USD per million tokens. */
const PRICING = {
  "Claude Opus 5": { in: 5, out: 25 },
  "Claude Sonnet 5": { in: 3, out: 15 },
  "Claude Haiku 4.5": { in: 1, out: 5 },
  "self-hosted (Gemma 3 12B)": { in: 0, out: 0 },
};

const corpus = JSON.parse(
  readFileSync(
    join(here, "..", "..", "corpus", "out", "constitution.json"),
    "utf8",
  ),
);

const tokens = (chars, lang) => Math.ceil(chars / CHARS_PER_TOKEN[lang]);
const usd = (n) => (n < 0.01 ? `<$0.01` : `$${n.toFixed(2)}`);

/* ── one-off: explain every article, in every language ────────────────────── */

const INSTRUCTION_TOKENS = 180; // system + task wording per call
let explainIn = 0;
let explainOut = 0;
let explanations = 0;

for (const article of corpus.articles) {
  for (const lang of ["rw", "en", "fr"]) {
    const text = article.texts[lang];
    if (!text) continue;
    explanations += 1;
    // Input: the official article plus the instruction.
    explainIn += tokens(text.body.length, lang) + INSTRUCTION_TOKENS;
    // Output: a plain-language rendering, assumed 1.4x the source length —
    // explanations are longer than the law they explain.
    explainOut += tokens(text.body.length * 1.4, lang);
  }
}

console.log(`MyLo running cost, computed from the real corpus\n`);
console.log(
  `Corpus: ${corpus.articles.length} articles, ${explanations} article-language texts`,
);
console.log(
  `Tokenization (measured): en ${CHARS_PER_TOKEN.en} ch/tok · fr ${CHARS_PER_TOKEN.fr} · rw ${CHARS_PER_TOKEN.rw}`,
);
console.log(
  `  → Kinyarwanda costs ${(CHARS_PER_TOKEN.en / CHARS_PER_TOKEN.rw).toFixed(2)}x English per character\n`,
);

console.log(
  `ONE-OFF — plain-language explanation of the whole Constitution, all three languages`,
);
console.log(
  `  ${(explainIn / 1000).toFixed(0)}K input tokens, ${(explainOut / 1000).toFixed(0)}K output tokens\n`,
);
for (const [model, p] of Object.entries(PRICING)) {
  const cost = (explainIn / 1e6) * p.in + (explainOut / 1e6) * p.out;
  console.log(
    `    ${model.padEnd(28)} ${usd(cost).padStart(8)}   paid once, served forever`,
  );
}

/* ── recurring: a novel question answered from a retrieved article ────────── */

// A live answer sees the user's question plus the retrieved article, and
// replies in Kinyarwanda.
const QUESTION_TOKENS = tokens(160, "rw");
const RETRIEVED_TOKENS = tokens(473 * 2, "rw"); // two articles of context
const ANSWER_TOKENS = tokens(600, "rw");
const perIn = QUESTION_TOKENS + RETRIEVED_TOKENS + INSTRUCTION_TOKENS;
const perOut = ANSWER_TOKENS;

console.log(`\nPER QUESTION — only for questions not already answered`);
console.log(`  ${perIn} input tokens, ${perOut} output tokens (Kinyarwanda)\n`);
for (const [model, p] of Object.entries(PRICING)) {
  const per = (perIn / 1e6) * p.in + (perOut / 1e6) * p.out;
  const cents = per * 100;
  console.log(
    `    ${model.padEnd(28)} ${cents < 0.01 ? "  free" : cents.toFixed(2) + "¢"}` +
      `   ${p.in === 0 ? "" : `· 10k/mo ${usd(per * 10_000)} · 100k/mo ${usd(per * 100_000)}`}`,
  );
}

/* ── the point ────────────────────────────────────────────────────────────── */

const sonnet = PRICING["Claude Sonnet 5"];
const perQuestion = (perIn / 1e6) * sonnet.in + (perOut / 1e6) * sonnet.out;

console.log(`\nWith caching — the realistic shape`);
for (const hitRate of [0, 0.5, 0.8, 0.95]) {
  const monthly = perQuestion * 100_000 * (1 - hitRate);
  console.log(
    `    ${String(Math.round(hitRate * 100)).padStart(3)}% served from cache   ` +
      `100k questions/month on Sonnet 5: ${usd(monthly)}`,
  );
}

console.log(
  `\nCaching is not an optimisation here, it is the architecture. People ask the\n` +
    `same questions — arrest, eviction, dismissal, marriage age — and an answer\n` +
    `reviewed once is better than one generated fresh each time, because it can be\n` +
    `checked by a human before anyone relies on it.`,
);
