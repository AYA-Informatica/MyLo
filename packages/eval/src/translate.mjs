#!/usr/bin/env node
/**
 * Scores candidate models on Kinyarwanda legal translation.
 *
 *   npm run eval:translate -- [--models gemma3:4b,qwen3:4b] [--n 40]
 *
 * The question this answers is the one that decides MyLo's architecture: does a
 * model small enough to self-host actually speak Kinyarwanda well enough to be
 * trusted with law? Everything else — fine-tuning, hosting, cost — is downstream
 * of that, and it has been argued about rather than measured.
 *
 * The test set is the Constitution itself. Each item gives a model the official
 * English text of an article and asks for Kinyarwanda; the output is scored
 * against the Kinyarwanda the Rwandan state actually published. That is a real
 * reference, in the exact domain and register MyLo operates in — not a generic
 * benchmark.
 *
 * Translation is a proxy for what MyLo does, not the thing itself: the product
 * answers questions from retrieved articles rather than translating them. It is
 * used because it is the one task here with unambiguous ground truth. Read the
 * scores as a measure of Kinyarwanda legal-language competence, and read the
 * dumped samples for everything a number cannot capture.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chrf } from "./chrf.mjs";
import { generate, tidy } from "./providers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out");
const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const models = flag("models", "gemma3:4b").split(",").filter(Boolean);
const sampleSize = Number.parseInt(flag("n", "30"), 10);

const pairsPath = join(here, "..", "..", "corpus", "out", "parallel.jsonl");
const allPairs = readFileSync(pairsPath, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l))
  .filter((p) => p.from === "en" && p.to === "rw");

/**
 * Deterministic spread across the document rather than a random sample, so runs
 * are comparable and no model is judged on an easier slice than another.
 * Very short articles are skipped — chrF is noisy on a single clause.
 */
const usable = allPairs.filter(
  (p) => p.source.length > 200 && p.target.length > 200,
);
const step = Math.max(1, Math.floor(usable.length / sampleSize));
const sample = usable.filter((_, i) => i % step === 0).slice(0, sampleSize);

const PROMPT = (source) =>
  `Translate the following article of the Constitution of Rwanda from English into Kinyarwanda.

Reply with the Kinyarwanda translation only. Do not add commentary, notes, or the English text.

English:
${source}

Kinyarwanda:`;

const results = [];
mkdirSync(outDir, { recursive: true });

console.log(`Test set  ${sample.length} articles, English → Kinyarwanda`);
console.log(
  `Reference official Kinyarwanda, Official Gazette n° Special of 04/08/2023`,
);
console.log(`Metric    chrF++ (0-100, higher is better)\n`);

// A control: score the English source against the Kinyarwanda reference. Any
// model that cannot beat this by a wide margin is not translating at all.
const controlScores = sample.map((p) => chrf(p.source, p.target));
const controlMean =
  controlScores.reduce((a, b) => a + b, 0) / controlScores.length;
console.log(
  `  control (untranslated English vs Kinyarwanda): ${controlMean.toFixed(1)}\n`,
);

for (const model of models) {
  const scores = [];
  const samples = [];
  let totalSeconds = 0;
  let totalTokens = 0;
  let failures = 0;

  process.stdout.write(`  ${model.padEnd(18)} `);

  for (const pair of sample) {
    try {
      const {
        text,
        seconds,
        tokens: evalCount,
      } = await generate(model, PROMPT(pair.source));
      const hypothesis = tidy(text);
      const score = chrf(hypothesis, pair.target);
      scores.push(score);
      totalSeconds += seconds;
      totalTokens += evalCount;
      samples.push({
        article: pair.article,
        score,
        hypothesis,
        reference: pair.target,
      });
      process.stdout.write(".");
    } catch (err) {
      failures += 1;
      process.stdout.write("x");
      samples.push({
        article: pair.article,
        error: String(err.message ?? err),
      });
    }
  }

  const mean = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const tokensPerSecond = totalSeconds > 0 ? totalTokens / totalSeconds : 0;

  results.push({
    model,
    mean,
    median,
    tokensPerSecond,
    failures,
    n: scores.length,
  });
  writeFileSync(
    join(outDir, `translate-${model.replace(/[:/]/g, "-")}.json`),
    JSON.stringify({ model, mean, median, samples }, null, 2),
  );

  console.log(
    ` chrF++ ${mean.toFixed(1).padStart(5)} (median ${median.toFixed(1)})` +
      `  ${tokensPerSecond.toFixed(1)} tok/s` +
      (failures ? `  ${failures} failed` : ""),
  );
}

console.log("\n─────────────────────────────────────────────────────────");
results.sort((a, b) => b.mean - a.mean);
for (const r of results) {
  console.log(
    `  ${r.model.padEnd(18)} chrF++ ${r.mean.toFixed(1).padStart(5)}   ${r.tokensPerSecond.toFixed(1).padStart(5)} tok/s   n=${r.n}`,
  );
}

console.log(`\nPer-article outputs written to packages/eval/out/.`);
console.log(
  `Read them. A score says how close the wording is; only a Kinyarwanda speaker\n` +
    `can say whether the meaning survived, and meaning is what matters in law.`,
);
