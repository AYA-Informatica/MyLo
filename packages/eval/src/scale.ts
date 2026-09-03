#!/usr/bin/env node
/**
 * Does retrieval survive the corpus it is going to get?
 *
 *   node --experimental-strip-types packages/eval/src/scale.ts [--max 150000]
 *
 * Phase 2.1. Every recall figure in this repository was measured on the
 * Constitution: 527 texts. The corpus MyLo is being built for is roughly 1,400
 * laws across three languages — on the order of 150,000 texts, some three
 * hundred times larger. `docs/PLAN.md` records that none of those numbers
 * transfer automatically. This measures the part that can be measured without
 * the corpus: how the retriever itself behaves as it grows.
 *
 * It cannot say what recall will be on real Rwandan law — that needs the real
 * corpus and real questions. It can say whether the design holds at that size,
 * and whether the "I don't know" floor still means anything, and both of those
 * are answerable now.
 *
 * ## What is synthetic and what is not
 *
 * The retriever is the real one, imported rather than reimplemented. The
 * documents are generated: vocabulary is drawn from the real Rwandan legal text
 * actually loaded, and lengths from the real distribution (articles average
 * about 470 characters), but the documents themselves are recombinations.
 *
 * That is enough for the questions asked here, which are about how BM25 responds
 * to corpus size, and not enough for a question about meaning. Scores, timings
 * and score *distributions* scale with the number and length of documents and
 * with term frequencies. Those are all preserved. Whether article 29 is the
 * right answer to a question about a fair trial is not, and is not asked.
 */
import pg from "pg";
import { Bm25Index, type Indexed } from "../../../apps/api/src/retrieval.ts";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";

const args = process.argv.slice(2);
const flag = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const MAX = flag("max", 150_000);

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();
const { rows } = await db.query<{ text: string }>(`
  SELECT coalesce(heading,'') || ' ' || body AS text FROM article_texts
`);
await db.end();

if (rows.length === 0) {
  console.error("No article_texts loaded — nothing to draw vocabulary from.");
  process.exit(1);
}

const realTexts = rows.map((r) => r.text);
const vocabulary = [
  ...new Set(
    realTexts
      .join(" ")
      .toLowerCase()
      .match(/[\p{L}’']+/gu) ?? [],
  ),
];
const lengths = realTexts.map((t) => t.length).sort((a, b) => a - b);
const medianLength = lengths[Math.floor(lengths.length / 2)];

/**
 * Deterministic generator, so a run is reproducible and two runs at different
 * sizes share their smaller corpus rather than differing in it.
 */
let seed = 0x2f6e2b1;
const random = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};

const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]!;

function synthesise(count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    // Length drawn around the real median rather than fixed: BM25 normalises by
    // document length against the corpus average, so a corpus of uniform-length
    // documents would flatter the scoring in a way the real one does not.
    const target = Math.max(80, medianLength * (0.4 + random() * 1.8));
    const words: string[] = [];
    let length = 0;
    while (length < target) {
      const word = pick(vocabulary);
      words.push(word);
      length += word.length + 1;
    }
    out.push(words.join(" "));
  }
  return out;
}

/** Queries drawn from real text, so they hit, plus noise that should not. */
const ON_TOPIC = realTexts
  .slice(0, 6)
  .map((t) => t.split(/\s+/).slice(2, 9).join(" "));
const NOISE = [
  "how do I bake banana bread at home",
  "what is the best football team in europe",
  "recipe for grilled fish and rice",
];

const sizes = [500, 2_000, 10_000, 40_000, MAX].filter(
  (n, i, a) => n <= MAX && a.indexOf(n) === i,
);

console.log(
  `Vocabulary ${vocabulary.length} words from ${realTexts.length} real texts, ` +
    `median length ${medianLength} chars\n`,
);
console.log(
  "     docs   build      mem    query   on-topic     noise   margin   floor@527",
);
console.log(
  "                                        (top)     (top)                holds?",
);

const baseline = { onTopic: 0, noise: 0 };

for (const size of sizes) {
  const corpus = synthesise(size);
  const entries: Indexed<number>[] = corpus.map((text, i) => ({
    item: i,
    text,
  }));

  if (global.gc) global.gc();
  const before = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  const index = new Bm25Index(entries);
  const buildMs = performance.now() - t0;
  const memMb = (process.memoryUsage().heapUsed - before) / 1024 / 1024;

  const q0 = performance.now();
  const onTopic = Math.max(
    ...ON_TOPIC.map((q) => index.search(q, 5)[0]?.score ?? 0),
  );
  const noise = Math.max(
    ...NOISE.map((q) => index.search(q, 5)[0]?.score ?? 0),
  );
  const queryMs = (performance.now() - q0) / (ON_TOPIC.length + NOISE.length);

  if (size === sizes[0]) {
    baseline.onTopic = onTopic;
    baseline.noise = noise;
  }

  // The floor derived on the Constitution was 32 for English. The question is
  // not whether it is exactly right but whether a *fixed* number can work at
  // all: if noise climbs past it as the corpus grows, the honesty mechanism
  // silently inverts and starts admitting everything.
  const holds = noise < 32 && onTopic >= 32;

  console.log(
    `${String(size).padStart(9)}  ${buildMs.toFixed(0).padStart(5)}ms  ` +
      `${memMb.toFixed(0).padStart(5)}MB  ${queryMs.toFixed(1).padStart(6)}ms  ` +
      `${onTopic.toFixed(1).padStart(9)}  ${noise.toFixed(1).padStart(8)}  ` +
      `${(onTopic - noise).toFixed(1).padStart(7)}   ${holds ? "yes" : "NO"}`,
  );
}

void baseline;
