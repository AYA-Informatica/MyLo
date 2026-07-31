#!/usr/bin/env node
/**
 * Can a Kinyarwanda query find the right article?
 *
 *   npm run eval:retrieval -- [--models bge-m3,nomic-embed-text]
 *
 * This is the load-bearing question for the split where understanding happens
 * locally and only explanation is outsourced. That design puts all its weight on
 * local retrieval: if the wrong article comes back, a perfect explanation of it
 * is still the wrong answer, and no amount of downstream quality repairs it.
 *
 * It also does not depend on the chat model at all. Retrieval is the embedding
 * model's job, and Kinyarwanda embedding quality was completely untested here —
 * everything measured so far was generation.
 *
 * Test construction. Each article's own heading is the query and the corpus is
 * every article body in that language; the correct answer is the article the
 * heading came from. Headings are short natural phrases — "Amahame remezo",
 * "Uburenganzira ku mutungo bwite" — which is far closer to how someone
 * searches than a full paragraph is, and every pair is ground-truthed by the
 * Gazette itself rather than by anyone's judgement.
 *
 * Running all three languages over the same articles isolates the variable that
 * matters: any gap between English and Kinyarwanda is the language penalty, not
 * a property of the corpus.
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

const corpus = JSON.parse(
  readFileSync(
    join(here, "..", "..", "corpus", "out", "constitution.json"),
    "utf8",
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
const norm = (a) => Math.sqrt(dot(a, a));
const cosine = (a, b) => dot(a, b) / (norm(a) * norm(b) || 1);

console.log(
  `Task    retrieve the right article from a short query in the same language`,
);
console.log(`Corpus  ${corpus.articles.length} articles\n`);

for (const model of models) {
  console.log(`  ${model}`);

  for (const lang of ["en", "fr", "rw"]) {
    // Articles with both a usable heading and a body in this language.
    const items = corpus.articles.filter(
      (a) =>
        a.texts[lang]?.heading?.length > 6 && a.texts[lang]?.body?.length > 200,
    );
    if (items.length < 20) {
      console.log(`    ${lang}: too few usable articles (${items.length})`);
      continue;
    }

    let docVectors;
    let queryVectors;
    try {
      docVectors = [];
      for (const a of items)
        docVectors.push(await embed(model, a.texts[lang].body));
      queryVectors = [];
      for (const a of items)
        queryVectors.push(await embed(model, a.texts[lang].heading));
    } catch (err) {
      console.log(`    ${lang}: ${String(err.message).slice(0, 70)}`);
      continue;
    }

    let hit1 = 0;
    let hit5 = 0;
    let mrrSum = 0;

    for (let q = 0; q < items.length; q += 1) {
      const scored = docVectors
        .map((d, i) => ({ i, score: cosine(queryVectors[q], d) }))
        .sort((a, b) => b.score - a.score);
      const rank = scored.findIndex((s) => s.i === q) + 1;
      if (rank === 1) hit1 += 1;
      if (rank <= 5) hit5 += 1;
      mrrSum += 1 / rank;
    }

    const n = items.length;
    const chance = (100 / n).toFixed(1);
    console.log(
      `    ${lang}:  recall@1 ${((100 * hit1) / n).toFixed(1)}%   ` +
        `recall@5 ${((100 * hit5) / n).toFixed(1)}%   ` +
        `MRR ${(mrrSum / n).toFixed(3)}   (n=${n}, chance@1 ${chance}%)`,
    );
  }
  console.log("");
}

console.log(
  `recall@1 is the number that decides the architecture: how often the very first\n` +
    `article returned is the right one. recall@5 matters less on its own, but a large\n` +
    `gap between them means a re-ranking step would pay for itself.`,
);
