#!/usr/bin/env node
/**
 * Measures whether a model can work with Kinyarwanda that is handed to it.
 *
 *   npm run eval:grounded -- [--models gemma3:4b] [--n 10]
 *
 * The translation eval asks a model to produce Kinyarwanda from nothing, and the
 * 4B candidates failed it by inventing vocabulary. But that is not MyLo's task.
 * MyLo retrieves the official Kinyarwanda article and asks the model to explain
 * it — the correct words are already in the context window, so the job is to
 * reuse and rearrange them rather than to recall them. That is a far lower bar,
 * and a model can fail the first test while passing this one.
 *
 * This measures the exact failure seen in translation: invented vocabulary.
 *
 *   grounding = share of the answer's content words that actually occur in the
 *               article it was given
 *
 * A high rate means the model is drawing on the real text. A low rate means it
 * is making words up, which in a legal answer is the difference between quoting
 * the Constitution and fabricating it.
 *
 * The floor is measured, not assumed: the same answer is scored against a
 * *different* article, which captures how much overlap comes from function words
 * and common morphology alone. Grounding only counts if it clears that floor.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out");
const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const models = flag("models", "gemma3:4b").split(",").filter(Boolean);
const sampleSize = Number.parseInt(flag("n", "8"), 10);

const corpus = JSON.parse(
  readFileSync(
    join(here, "..", "..", "corpus", "out", "constitution.json"),
    "utf8",
  ),
);
const usable = corpus.articles.filter(
  (a) => a.texts.rw && a.texts.rw.body.length > 300,
);
const step = Math.max(1, Math.floor(usable.length / sampleSize));
const sample = usable.filter((_, i) => i % step === 0).slice(0, sampleSize);

/**
 * Content words, lowercased. Kinyarwanda is agglutinative, so short tokens are
 * dropped: they are mostly particles and would inflate overlap on any pair of
 * texts regardless of whether the model grounded its answer.
 */
const contentWords = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s’']/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 5);

/** Share of `answer`'s content words that occur in `source`. */
function grounding(answer, source) {
  const words = contentWords(answer);
  if (words.length === 0) return { rate: 0, words: 0 };
  const vocabulary = new Set(contentWords(source));
  const hits = words.filter((w) => vocabulary.has(w)).length;
  return { rate: (100 * hits) / words.length, words: words.length };
}

const PROMPT = (article) =>
  `Dore ingingo y'Itegeko Nshinga rw'u Rwanda:

"""
${article}
"""

Sobanura iyi ngingo mu magambo yoroshye, mu Kinyarwanda. Koresha amagambo ari muri iyi ngingo. Subiza mu Kinyarwanda gusa.`;

async function generate(model, prompt) {
  const res = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      think: false,
      options: { temperature: 0, num_predict: 512 },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  return (body.response ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

mkdirSync(outDir, { recursive: true });

console.log(
  `Task      explain a retrieved Kinyarwanda article, in Kinyarwanda`,
);
console.log(`Test set  ${sample.length} articles`);
console.log(
  `Metric    grounding — % of answer's content words present in the article\n`,
);

const results = [];
for (const model of models) {
  const grounded = [];
  const floors = [];
  const samples = [];
  process.stdout.write(`  ${model.padEnd(14)} `);

  for (let i = 0; i < sample.length; i += 1) {
    const article = sample[i];
    // A different article, used to measure incidental overlap.
    const other = sample[(i + 1) % sample.length];
    try {
      const answer = await generate(model, PROMPT(article.texts.rw.body));
      const g = grounding(answer, article.texts.rw.body);
      const f = grounding(answer, other.texts.rw.body);
      grounded.push(g.rate);
      floors.push(f.rate);
      samples.push({
        article: article.number,
        grounding: g.rate,
        floor: f.rate,
        answer,
      });
      process.stdout.write(".");
    } catch (err) {
      process.stdout.write("x");
      samples.push({
        article: article.number,
        error: String(err.message ?? err),
      });
    }
  }

  const mean = (xs) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const g = mean(grounded);
  const f = mean(floors);
  results.push({
    model,
    grounding: g,
    floor: f,
    lift: g - f,
    n: grounded.length,
  });
  writeFileSync(
    join(outDir, `grounded-${model.replace(/[:/]/g, "-")}.json`),
    JSON.stringify({ model, grounding: g, floor: f, samples }, null, 2),
  );
  console.log(
    ` grounding ${g.toFixed(1).padStart(5)}%   floor ${f.toFixed(1).padStart(5)}%   lift ${(g - f).toFixed(1)}`,
  );
}

console.log("\n─────────────────────────────────────────────────────────");
for (const r of results.sort((a, b) => b.lift - a.lift)) {
  console.log(
    `  ${r.model.padEnd(14)} grounding ${r.grounding.toFixed(1)}%  floor ${r.floor.toFixed(1)}%  lift ${r.lift.toFixed(1)}`,
  );
}
console.log(
  `\nLift is the number that matters: how much more the answer draws on the article\n` +
    `it was given than on an unrelated one. Near zero means the model is not really\n` +
    `reading the text it was handed.`,
);
