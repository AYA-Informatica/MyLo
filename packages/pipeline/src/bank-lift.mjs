#!/usr/bin/env node
/**
 * Does the bank that actually exists help — and in which languages?
 *
 *   npm run eval:bank-lift -w @mylo/pipeline -- [--articles 100] [--model gemma3:4b]
 *
 * `eval:question-index` measured the idea of a question bank on questions it
 * generated itself, in English. This measures the artefact in the database, in
 * all three languages, which is a different thing in two ways that matter.
 *
 * The banked Kinyarwanda and French questions are not generated from the article
 * directly. They are written in English and then phrased into the other language
 * with that language's official text supplied as vocabulary, because generating
 * legal Kinyarwanda from scratch produces worse output than translating into it
 * with the real words in front of the model. So the English result does not
 * transfer, and the phrasing step is exactly what needs measuring.
 *
 * And the first review of this bank found the Kinyarwanda phrasings visibly
 * poor — one a restatement of the article with a question mark appended, another
 * close to nonsense. This puts a number on how much that costs.
 *
 * Queries come from a different and smaller model than the one that wrote the
 * bank, generated directly from the article in the target language, so a query
 * is never a paraphrase of a banked question and the bank cannot win by
 * recognising its own phrasing.
 *
 * Nothing here reads review status. It measures the bank's ceiling if every
 * question were approved, which is the number that should inform whether to
 * approve them.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { generate } from "@mylo/eval/providers";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "..", "out");

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const QUERY_MODEL = flag("model", "gemma3:4b");
const N = Number.parseInt(flag("articles", "100"), 10);
const LANGS = ["rw", "en", "fr"];
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";

const db = new pg.Pool({ connectionString: DATABASE_URL });

/* ── the same retrieval the API serves ────────────────────────────────────── */

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

/* ── the corpus and the bank, as they are in the database ─────────────────── */

const { rows: articleRows } = await db.query(
  `SELECT a.id, a.article_number, a.ordinal, at.language, at.heading, at.body
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
     JOIN question_bank_texts qbt    ON qbt.question_id = qb.id`,
);

const textsByArticle = new Map();
for (const r of articleRows) {
  const entry = textsByArticle.get(r.id) ?? {
    id: r.id,
    number: r.article_number,
    ordinal: r.ordinal,
    texts: {},
  };
  entry.texts[r.language] = { heading: r.heading, body: r.body };
  textsByArticle.set(r.id, entry);
}

const bankByArticle = new Map();
for (const r of bankRows) {
  const key = `${r.article_id}:${r.language}`;
  const list = bankByArticle.get(key) ?? [];
  list.push(r.body);
  bankByArticle.set(key, list);
}

/** Articles usable in every language, so all three columns score the same set. */
const items = [...textsByArticle.values()]
  .filter((a) =>
    LANGS.every(
      (l) => a.texts[l]?.heading?.length > 6 && a.texts[l]?.body?.length > 200,
    ),
  )
  .sort((a, b) => a.ordinal - b.ordinal)
  .slice(0, N);

/* ── independent queries ──────────────────────────────────────────────────── */

const QUERY_PROMPT = (heading, body, languageName) =>
  `An article of the Constitution of Rwanda is below, in ${languageName}.

Title: ${heading}
Text: ${body}

Write ONE question in ${languageName} that an ordinary citizen — not a lawyer — would ask that this article answers. Use everyday words. Reply with the question only, no commentary.`;

const LANGUAGE_NAMES = { rw: "Kinyarwanda", en: "English", fr: "French" };

async function queriesFor(lang) {
  mkdirSync(cacheDir, { recursive: true });
  const fingerprint = createHash("sha256")
    .update(
      QUERY_MODEL +
        items
          .map((a) => `${a.texts[lang].heading}|${a.texts[lang].body}`)
          .join(""),
    )
    .digest("hex")
    .slice(0, 12);
  const path = join(
    cacheDir,
    `bank-queries-${lang}-${QUERY_MODEL.replace(/[:/]/g, "-")}-${fingerprint}.json`,
  );
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));

  const out = [];
  for (let i = 0; i < items.length; i += 1) {
    const t = items[i].texts[lang];
    process.stdout.write(`\r    ${lang} queries ${i + 1}/${items.length}…   `);
    let q = "";
    try {
      const { text } = await generate(
        QUERY_MODEL,
        QUERY_PROMPT(t.heading, t.body, LANGUAGE_NAMES[lang]),
        { maxTokens: 120 },
      );
      q = (text.split("\n").find((l) => l.trim().length > 10) ?? "").trim();
    } catch {
      // A missing query drops that article from scoring rather than counting
      // as a miss, which would blame the retriever for a generator failure.
    }
    out.push(q);
  }
  process.stdout.write("\r".padEnd(44) + "\r");
  writeFileSync(path, JSON.stringify(out));
  return out;
}

/* ── run ──────────────────────────────────────────────────────────────────── */

console.log(`Task    a citizen's question -> the article that answers it`);
console.log(`Corpus  ${items.length} articles, from the database`);
console.log(`Bank    ${bankRows.length} banked phrasings, as generated`);
console.log(`Query   ${QUERY_MODEL}, writing directly in each language\n`);

const pct = (n, d) => (d === 0 ? 0 : (100 * n) / d);

for (const lang of LANGS) {
  const queries = await queriesFor(lang);
  const scorable = items
    .map((_, i) => i)
    .filter((i) => queries[i]?.length > 10);

  const prose = items.map(
    (a) => `${a.texts[lang].heading} ${a.texts[lang].body}`,
  );
  const banked = items.map(
    (a) => bankByArticle.get(`${a.id}:${lang}`)?.join(" ") ?? "",
  );
  const withBank = items.map((_, i) => `${prose[i]} ${banked[i]}`);

  const bm25Prose = buildBm25(prose);
  const bm25Augmented = buildBm25(withBank);

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
    return { r1: pct(hit1, scorable.length), r5: pct(hit5, scorable.length) };
  };

  const base = evaluate(bm25Prose);
  const aug = evaluate(bm25Augmented);
  const covered = banked.filter((b) => b.length > 0).length;

  const row = (name, s) =>
    `    ${name.padEnd(12)} recall@1 ${s.r1.toFixed(1).padStart(5)}%   recall@5 ${s.r5.toFixed(1).padStart(5)}%`;

  console.log(
    `  ${lang}   ${scorable.length} scorable, ${covered}/${items.length} articles have banked questions`,
  );
  console.log(row("prose only", base));
  console.log(row("+ bank", aug));
  const d1 = aug.r1 - base.r1;
  const d5 = aug.r5 - base.r5;
  console.log(
    `    lift         recall@1 ${(d1 >= 0 ? "+" : "") + d1.toFixed(1)} pts   ` +
      `recall@5 ${(d5 >= 0 ? "+" : "") + d5.toFixed(1)} pts\n`,
  );
}

console.log(
  `A language where the lift is small or negative should keep its index on\n` +
    `official text alone. Approving questions there costs review time and buys\n` +
    `nothing, and a bad question is noise in the index rather than a neutral row.`,
);

await db.end();
