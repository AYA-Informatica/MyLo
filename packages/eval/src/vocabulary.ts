#!/usr/bin/env node
/**
 * The vocabulary gap, measured against the retriever the API actually serves.
 *
 *   node --experimental-strip-types packages/eval/src/vocabulary.ts
 *
 * Phase 2.3. `docs/ARCHITECTURE.md` names one failure it could not fix: someone
 * asks about a "fair trial" and the Constitution words it as due process, so
 * character n-grams find nothing — the two phrases share no substring longer
 * than "r" and "t". Nothing lexical can bridge that, because the gap is not
 * spelling, it is that a right has a common name and a legal name.
 *
 * This imports `apps/api/src/retrieval.ts` rather than reimplementing BM25, so
 * what is measured is what a reader gets. A separate implementation would be
 * measuring a sibling of the retriever and reporting it as the retriever.
 *
 * Ground truth here was wrong twice on the first run — "search my house" was
 * pointed at Article 25 (a homeland and nationality) and "locked up" at Article
 * 28 (the right to seek asylum), so two apparent retrieval misses were the test
 * being wrong rather than the retriever. Hand-written expectations need checking
 * against the corpus exactly as much as generated ones do, and an unverified
 * ground truth makes a retriever look broken in whichever direction the author
 * already expected.
 *
 * The queries are hand-written rather than model-generated, and that is a
 * departure worth defending. Every other recall figure in this repo comes from a
 * model shown an article and asked to write a question about it — which
 * guarantees the question uses the article's own vocabulary, and so cannot
 * exhibit the failure being studied here. Generated questions are the wrong
 * instrument for this specific gap. They are also why the sample is small: these
 * are questions in the words an ordinary person would actually use, and there is
 * no way to produce those at scale without asking people, which is Phase 2.7.
 */
import pg from "pg";
import { Bm25Index, type Indexed } from "../../../apps/api/src/retrieval.ts";
import { SYNONYMS, expandQuery } from "@mylo/domain/synonyms";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";

type Language = "rw" | "en" | "fr";

interface Article {
  articleNumber: string;
  language: Language;
  heading: string | null;
  body: string;
}

/**
 * Questions in the words people use, paired with the article that answers them.
 *
 * Chosen so that the common name and the legal name differ. A question that
 * happens to use the Constitution's own wording would pass with or without any
 * of this and tells us nothing.
 */
const QUERIES: {
  lang: Language;
  query: string;
  expect: string;
  why: string;
}[] = [
  {
    lang: "en",
    query: "do I have the right to a fair trial",
    expect: "29",
    why: "the Constitution calls it due process of law",
  },
  {
    lang: "en",
    query: "can the police search my house without permission",
    expect: "23",
    why: "worded as respect for privacy of a person and of family",
  },
  {
    lang: "en",
    query: "am I innocent until proven guilty",
    expect: "29",
    why: "presumption of innocence sits inside due process",
  },
  {
    lang: "en",
    query: "can I be locked up without a reason",
    expect: "24",
    why: "worded as liberty and security of person",
  },
  {
    lang: "en",
    query: "can they take my land away from me",
    expect: "34",
    why: "worded as the right to private property",
  },
  {
    lang: "en",
    query: "can I say what I want in public",
    expect: "38",
    why: "worded as freedom of press and of expression",
  },
  {
    lang: "fr",
    query: "ai-je droit à un procès équitable",
    expect: "29",
    why: "French text says garanties judiciaires",
  },
  {
    lang: "rw",
    query: "mfite uburenganzira bwo kuburanishwa neza",
    expect: "29",
    why: "Kinyarwanda uses a different formulation again",
  },
];

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();

const { rows } = await db.query<Article>(`
  SELECT a.article_number AS "articleNumber", at.language, at.heading, at.body
    FROM article_texts at
    JOIN articles a ON a.id = at.article_id
    JOIN laws l     ON l.id = a.law_id
   WHERE l.law_number = 'CONSTITUTION-2023'
   ORDER BY a.ordinal
`);
await db.end();

const byLanguage = new Map<Language, Indexed<Article>[]>();
for (const row of rows) {
  const list = byLanguage.get(row.language) ?? [];
  // Same concatenation the API indexes: heading then body.
  list.push({ item: row, text: `${row.heading ?? ""} ${row.body}` });
  byLanguage.set(row.language, list);
}

const indexes = new Map<Language, Bm25Index<Article>>();
for (const [language, items] of byLanguage) {
  indexes.set(language, new Bm25Index(items));
}

function rankOf(lang: Language, query: string, expect: string): number | null {
  const hits = indexes.get(lang)!.search(query, 20);
  const at = hits.findIndex((h) => h.item.articleNumber === expect);
  return at === -1 ? null : at + 1;
}

console.log(
  `${rows.length} texts, ${QUERIES.length} term-of-art queries\n` +
    `${Object.keys(SYNONYMS).length} synonym groups\n`,
);

let baseHit1 = 0;
let baseHit5 = 0;
let expHit1 = 0;
let expHit5 = 0;

for (const q of QUERIES) {
  const before = rankOf(q.lang, q.query, q.expect);
  const after = rankOf(q.lang, expandQuery(q.query, q.lang), q.expect);

  if (before === 1) baseHit1 += 1;
  if (before !== null && before <= 5) baseHit5 += 1;
  if (after === 1) expHit1 += 1;
  if (after !== null && after <= 5) expHit5 += 1;

  const show = (r: number | null) => (r === null ? "miss" : `#${r}`);
  const moved = before !== after ? `  ${show(before)} -> ${show(after)}` : "";
  console.log(
    `  [${q.lang}] ${q.query}\n` +
      `        want art ${q.expect} (${q.why})\n` +
      `        base ${show(before).padEnd(5)} expanded ${show(after).padEnd(5)}${moved}`,
  );
}

const pct = (n: number) => `${((100 * n) / QUERIES.length).toFixed(0)}%`;
console.log(
  `\n              recall@1   recall@5\n` +
    `  baseline    ${pct(baseHit1).padStart(6)}     ${pct(baseHit5).padStart(6)}\n` +
    `  expanded    ${pct(expHit1).padStart(6)}     ${pct(expHit5).padStart(6)}`,
);
console.log(
  `\n${QUERIES.length} queries is not a validation set. It is enough to show the gap is\n` +
    `real and that expansion moves it, and not enough to tune anything on.`,
);
