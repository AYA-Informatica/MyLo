#!/usr/bin/env node
/**
 * Where does "I don't know" begin?
 *
 *   npm run eval:threshold
 *
 * BM25 over character n-grams always returns something. Ask the Constitution
 * how to bake banana bread and it will happily rank 176 articles, because every
 * long legal text shares four-character runs with every English sentence. The
 * top hit scored 6.0 and was presented as a shortlist — which makes the promise
 * that MyLo says "the corpus does not answer this" a promise the code does not
 * keep.
 *
 * A score floor fixes it, but the floor has to be derived rather than guessed:
 * too high and real questions get refused, too low and nonsense gets cited.
 *
 * So this measures the two distributions that matter.
 *
 *   signal  every article heading, used as a query. Ground-truthed by the
 *           Gazette, and the shape of a real question — short, topical.
 *   noise   questions with no answer in the Constitution: recipes, football,
 *           weather, personal chat. Written in all three languages so the floor
 *           is not tuned to English.
 *
 * The floor is placed to keep almost all signal while rejecting all noise. It is
 * reported per language because the scales genuinely differ: Kinyarwanda's
 * agglutination produces longer shared n-gram runs and therefore higher scores,
 * so a single global constant would be wrong in two languages out of three.
 *
 * Two scale-free alternatives were tried and both lost, so the raw floor stays.
 * They are still measured here, because knowing what does not work is worth as
 * much as knowing what does, and the next person will otherwise try them again:
 *
 *   top / corpus median   meaningless. For an off-topic query most articles
 *                         score exactly zero, so the median is zero and the
 *                         ratio is infinite — the noise looks maximally
 *                         confident.
 *   top / runner-up mean  plausible but weaker everywhere. In English it can
 *                         only reject all noise by refusing 96% of real
 *                         questions. Article bodies overlap each other heavily,
 *                         so even a correct hit rarely stands far clear of its
 *                         neighbours.
 *
 * Caveat on the signal set: headings are short, and a short query produces few
 * n-grams and therefore a low score. Real typed questions are longer sentences
 * and score much higher — "Ese umuntu afite uburenganzira bwo kugira umutungo
 * bwite?" scores 99.9 against a heading-derived median of 42.6. The retention
 * percentages below are therefore a pessimistic bound, measured on the hardest
 * and shortest queries the corpus can produce.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const LANGS = ["rw", "en", "fr"];
const NGRAM = 4;

const corpus = JSON.parse(
  readFileSync(
    join(here, "..", "..", "corpus", "out", "constitution.json"),
    "utf8",
  ),
);

/**
 * Questions a real person might type that the Constitution cannot answer.
 *
 * Deliberately not adversarial gibberish — gibberish is easy to reject. These
 * are fluent, well-formed sentences in each language, several of them brushing
 * against legal-sounding vocabulary ("permis", "amafaranga", "police"), because
 * the floor has to survive the near-misses rather than the obvious ones.
 */
const NOISE = {
  rw: [
    "Nshaka kumenya uko batetse umutsima w'ibitoke",
    "Ni ryari umukino w'Amavubi utangira?",
    "Ikirere kizaba kimeze gute ejo i Kigali?",
    "Amafaranga y'ikawa angahe ku isoko?",
    "Mbwira inkuru nziza y'urwenya",
    "Nshaka kugura telefone nshya, iyihe nziza?",
  ],
  en: [
    "How do I make banana bread?",
    "What time does the football match start?",
    "What is the weather in Kigali tomorrow?",
    "Recommend me a good restaurant downtown",
    "How do I fix a flat bicycle tyre?",
    "Tell me a joke about programmers",
  ],
  fr: [
    "Comment faire du pain aux bananes ?",
    "À quelle heure commence le match de football ?",
    "Quel temps fera-t-il demain à Kigali ?",
    "Recommande-moi un bon restaurant",
    "Comment réparer un pneu de vélo ?",
    "Raconte-moi une blague",
  ],
};

const charNgrams = (text, n = NGRAM) => {
  const s = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const out = [];
  for (let i = 0; i + n <= s.length; i += 1) out.push(s.slice(i, i + n));
  return out;
};

/** The same BM25 the API serves, so the numbers here are the numbers there. */
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

  const N = docs.length;
  const idf = new Map();
  for (const [t, df] of docFreq)
    idf.set(t, Math.log((N - df + 0.5) / (df + 0.5) + 1));

  return (query) => {
    const q = charNgrams(query);
    const scores = [];
    for (let i = 0; i < termFreq.length; i += 1) {
      let score = 0;
      for (const t of q) {
        const f = termFreq[i].get(t);
        if (!f) continue;
        const denom = f + k1 * (1 - b + (b * lengths[i]) / (avgLen || 1));
        score += (idf.get(t) ?? 0) * ((f * (k1 + 1)) / denom);
      }
      scores.push(score);
    }
    scores.sort((x, y) => y - x);
    const top = scores[0] ?? 0;

    // How far the winner stands clear of its nearest rivals. An answerable
    // question has a peak; an unanswerable one produces a flat ranking of
    // equally irrelevant articles, because every long legal text shares some
    // character runs with every sentence.
    //
    // The denominator is the runner-up pack rather than the corpus median: for
    // an off-topic query most articles score exactly zero, so a corpus-wide
    // median is zero and the ratio is meaninglessly infinite. Ranks 2..10 are
    // always populated when rank 1 is.
    const pack = scores.slice(1, 10);
    const packMean = pack.reduce((a, x) => a + x, 0) / (pack.length || 1);
    return { top, peak: packMean > 0 ? top / packMean : top > 0 ? 99 : 0 };
  };
}

const quantile = (sorted, q) =>
  sorted.length === 0
    ? 0
    : sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

console.log(`Task    separate answerable questions from unanswerable ones`);
console.log(`Signal  every article heading, as a query`);
console.log(
  `Noise   ${NOISE.en.length} fluent off-topic questions per language\n`,
);

/** Best separator of two sorted distributions, and how cleanly it separates. */
function bestCut(signal, noise) {
  const candidates = [...new Set([...signal, ...noise])].sort((a, b) => a - b);
  let best = { cut: 0, kept: 0, rejected: 0, score: -1 };
  for (const c of candidates) {
    const kept = signal.filter((s) => s >= c).length;
    const rejected = noise.filter((n) => n < c).length;
    // Weight noise rejection heavily: citing the Constitution at someone asking
    // about football is a worse failure than declining a real question, because
    // one misleads and the other merely disappoints.
    const score = kept / signal.length + 2 * (rejected / noise.length);
    if (score > best.score) best = { cut: c, kept, rejected, score };
  }
  return best;
}

const report = (label, signal, noise, fmt = (x) => x.toFixed(1)) => {
  const s = [...signal].sort((a, b) => a - b);
  const n = [...noise].sort((a, b) => a - b);
  const { cut, kept, rejected } = bestCut(s, n);
  console.log(
    `    ${label.padEnd(7)} signal p05 ${fmt(quantile(s, 0.05)).padStart(6)}  ` +
      `median ${fmt(quantile(s, 0.5)).padStart(6)}   ` +
      `noise max ${fmt(n[n.length - 1]).padStart(6)}`,
  );
  console.log(
    `            cut ${fmt(cut)}  →  keeps ${((100 * kept) / s.length).toFixed(1)}% of real, ` +
      `rejects ${((100 * rejected) / n.length).toFixed(0)}% of noise`,
  );
  return { cut, keptPct: (100 * kept) / s.length };
};

const chosen = {};

for (const lang of LANGS) {
  const usable = corpus.articles.filter(
    (a) =>
      a.texts[lang]?.heading?.length > 6 && a.texts[lang]?.body?.length > 200,
  );
  const bodies = usable.map(
    (a) => `${a.texts[lang].heading} ${a.texts[lang].body}`,
  );
  const rank = buildBm25(bodies);

  const signal = usable.map((a) => rank(a.texts[lang].heading));
  const noise = NOISE[lang].map((q) => rank(q));

  console.log(`  ${lang}   (${usable.length} articles)`);
  const raw = report(
    "raw",
    signal.map((r) => r.top),
    noise.map((r) => r.top),
  );
  report(
    "peak",
    signal.map((r) => r.peak),
    noise.map((r) => r.peak),
    (x) => `${x.toFixed(2)}x`,
  );
  // Sit a little below the measured cut. The cut is the best separator on six
  // noise samples, and six is few enough that landing exactly on it would be
  // fitting the sample rather than the phenomenon. Erring low means MyLo
  // occasionally offers a weak shortlist instead of occasionally refusing a
  // real question — and the shortlist is honest about its own confidence.
  chosen[lang] = Math.round(raw.cut * 0.95);
  console.log("");
}

console.log(`SCORE_FLOOR = ${JSON.stringify(chosen)}`);
console.log(
  `\nBelow the floor MyLo answers "the Constitution does not address this" and\n` +
    `offers a referral, which is the one answer it can always give honestly.\n` +
    `Re-run this after any change to the corpus, the tokeniser or k1/b — the\n` +
    `floor is a property of all three together, not a constant of nature.`,
);
