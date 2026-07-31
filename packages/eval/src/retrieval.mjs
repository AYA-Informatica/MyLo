#!/usr/bin/env node
/**
 * Can a Kinyarwanda query find the right article — and does it matter which
 * language the index is in?
 *
 *   npm run eval:retrieval -- [--models bge-m3,nomic-embed-text]
 *
 * This is the load-bearing question for the design where understanding happens
 * locally and only explanation is outsourced. That split puts all its weight on
 * retrieval: if the wrong article comes back, a perfect explanation of it is
 * still the wrong answer, and nothing downstream repairs it.
 *
 * The first version of this measured each language against itself and found
 * Kinyarwanda retrieving at roughly a third of English accuracy. But a
 * multilingual embedding model places all languages in one vector space, so
 * query and index need not be the same language — and if English embeddings are
 * simply better, a Kinyarwanda question searched against the English index
 * should borrow that quality, with the Kinyarwanda text of the winning article
 * served to the reader regardless.
 *
 * So this reports the full query-language x index-language matrix. The diagonal
 * is monolingual retrieval; everything off it is the cross-lingual option.
 *
 * Test construction. Each article's own heading is the query and article bodies
 * are the corpus, with the correct answer being the article the heading came
 * from. Headings are short natural phrases — "Amahame remezo", "Uburenganzira ku
 * mutungo bwite" — much closer to how someone searches than a paragraph, and
 * every pair is ground-truthed by the Gazette rather than by judgement.
 *
 * Only articles usable in all three languages are scored, so every cell of the
 * matrix runs over the identical set and the numbers are directly comparable.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const models = flag("models", "bge-m3").split(",").filter(Boolean);
const LANGS = ["rw", "en", "fr"];

const corpus = JSON.parse(
  readFileSync(
    join(here, "..", "..", "corpus", "out", "constitution.json"),
    "utf8",
  ),
);

/** Articles usable in every language, so all cells score the same set. */
const items = corpus.articles.filter((a) =>
  LANGS.every(
    (l) => a.texts[l]?.heading?.length > 6 && a.texts[l]?.body?.length > 200,
  ),
);

async function embed(model, input) {
  const res = await fetch(`${OLLAMA}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, input }),
  });
  if (!res.ok)
    throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const body = await res.json();
  return body.embeddings?.[0] ?? body.embedding;
}

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cosine = (a, b) =>
  dot(a, b) / (Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b)) || 1);

console.log(`Task    retrieve the right article from a short query`);
console.log(`Corpus  ${items.length} articles usable in all three languages`);
console.log(`Chance  ${(100 / items.length).toFixed(1)}% at rank 1\n`);

for (const model of models) {
  console.log(`  ${model}`);

  // One embedding pass: every article body and every heading, in every language.
  const docs = {};
  const queries = {};
  try {
    for (const lang of LANGS) {
      docs[lang] = [];
      queries[lang] = [];
      for (const a of items)
        docs[lang].push(await embed(model, a.texts[lang].body));
      for (const a of items)
        queries[lang].push(await embed(model, a.texts[lang].heading));
    }
  } catch (err) {
    console.log(`    failed: ${String(err.message).slice(0, 80)}\n`);
    continue;
  }

  const score = (queryLang, indexLang) => {
    let hit1 = 0;
    let hit5 = 0;
    for (let q = 0; q < items.length; q += 1) {
      const ranked = docs[indexLang]
        .map((d, i) => ({ i, s: cosine(queries[queryLang][q], d) }))
        .sort((a, b) => b.s - a.s);
      const rank = ranked.findIndex((r) => r.i === q) + 1;
      if (rank === 1) hit1 += 1;
      if (rank <= 5) hit5 += 1;
    }
    return { r1: (100 * hit1) / items.length, r5: (100 * hit5) / items.length };
  };

  console.log(
    `    recall@1 — rows are the query language, columns the index searched`,
  );
  console.log(
    `              ` + LANGS.map((l) => `idx:${l}`.padStart(9)).join(""),
  );
  const best = { r1: -1 };
  for (const q of LANGS) {
    const cells = LANGS.map((i) => {
      const s = score(q, i);
      if (q === "rw" && s.r1 > best.r1) Object.assign(best, s, { index: i });
      return `${s.r1.toFixed(1)}%`.padStart(9);
    });
    console.log(`      query:${q}` + cells.join(""));
  }

  const rwrw = score("rw", "rw");
  console.log(
    `\n    Kinyarwanda question: same-language index ${rwrw.r1.toFixed(1)}%  →  ` +
      `best index (${best.index}) ${best.r1.toFixed(1)}%   recall@5 ${best.r5.toFixed(1)}%\n`,
  );
}

console.log(
  `A Kinyarwanda reader is served the Kinyarwanda text either way — the index\n` +
    `language only decides which vectors the search runs against, never what the\n` +
    `person reads.`,
);
