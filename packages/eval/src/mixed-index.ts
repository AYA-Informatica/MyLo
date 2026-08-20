#!/usr/bin/env node
/**
 * One index or two: does mixing judgments with statutes damage either?
 *
 *   node --experimental-strip-types packages/eval/src/mixed-index.ts
 *
 * The question is not stylistic. `apps/api` builds one BM25 index per language
 * over article texts, and case law now exists in the same database. Adding it to
 * that index is one line. Whether it should be added is measurable, and this
 * measures it rather than arguing it.
 *
 * Two things make the answer non-obvious.
 *
 * **Length.** Articles average 470 characters; a judgment's facts and holding
 * average 7,012 and reach 43,595. BM25 normalises for length through `b`, set to
 * 0.75 here, but that is a correction, not an equaliser — a fifteenfold
 * disparity in one index is well outside what it was tuned for.
 *
 * **Different questions.** "What does the law say about X" and "has a court
 * decided X" are different asks with the same words. A shared index answers both
 * with whichever document happens to score higher, which is not a judgment
 * anyone made.
 */
import pg from "pg";
import { Bm25Index, type Indexed } from "../../../apps/api/src/retrieval.ts";
import { expandQuery } from "@mylo/domain/synonyms";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";

type Language = "rw" | "en" | "fr";

interface Doc {
  kind: "article" | "case";
  ref: string;
  language: Language;
  text: string;
}

/**
 * Statute questions with a known correct article, from `eval:vocabulary`.
 *
 * Reused deliberately: these already pass at rank 1 against an articles-only
 * index, so any movement here is caused by the judgments and nothing else.
 */
const STATUTE_QUERIES: { lang: Language; query: string; expect: string }[] = [
  { lang: "en", query: "do I have the right to a fair trial", expect: "29" },
  {
    lang: "en",
    query: "can the police search my house without permission",
    expect: "23",
  },
  { lang: "en", query: "am I innocent until proven guilty", expect: "29" },
  { lang: "en", query: "can I be locked up without a reason", expect: "24" },
  { lang: "en", query: "can they take my land away from me", expect: "34" },
  { lang: "en", query: "can I say what I want in public", expect: "38" },
  {
    lang: "rw",
    query: "mfite uburenganzira bwo kuburanishwa neza",
    expect: "29",
  },
];

/**
 * Questions a reader would bring to case law rather than to a statute.
 *
 * Written from holdings actually present in the corpus, so each has a real
 * answer to find. There is no claim these are representative — they are enough
 * to show whether judgments are reachable at all in each configuration.
 */
const CASE_QUERIES: { lang: Language; query: string; expect: RegExp }[] = [
  {
    lang: "en",
    query: "can the supreme court hear a case about invalidating an auction",
    expect: /RCOM 00006\/2023/,
  },
  {
    lang: "en",
    query: "does issuing a cheque prove a debt was paid",
    expect: /RCOM 00001\/2024/,
  },
  {
    lang: "rw",
    query: "impanuka y akazi umukozi ajya ku kazi",
    expect: /RS\/INJUST\/RSOC 00002\/2022/,
  },
];

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();

const { rows: articles } = await db.query<{
  ref: string;
  language: Language;
  text: string;
}>(`
  SELECT a.article_number AS ref, at.language,
         coalesce(at.heading,'') || ' ' || at.body AS text
    FROM article_texts at
    JOIN articles a ON a.id = at.article_id
    JOIN laws l     ON l.id = a.law_id
   WHERE l.status = ANY(ARRAY['active','amended']::law_status[])
`);

const { rows: cases } = await db.query<{
  ref: string;
  language: Language;
  text: string;
}>(`
  SELECT c.case_number AS ref, ct.language,
         coalesce(ct.title,'') || ' ' || coalesce(ct.held,'') || ' ' || coalesce(ct.facts,'') AS text
    FROM case_texts ct
    JOIN cases c ON c.id = ct.case_id
`);
await db.end();

const docs: Doc[] = [
  ...articles.map((r) => ({ ...r, kind: "article" as const })),
  ...cases.map((r) => ({ ...r, kind: "case" as const })),
];

function indexOf(subset: Doc[], language: Language) {
  const entries: Indexed<Doc>[] = subset
    .filter((d) => d.language === language)
    .map((d) => ({ item: d, text: d.text }));
  return entries.length ? new Bm25Index(entries) : null;
}

const articlesOnly = new Map<Language, Bm25Index<Doc> | null>();
const casesOnly = new Map<Language, Bm25Index<Doc> | null>();
const shared = new Map<Language, Bm25Index<Doc> | null>();
for (const lang of ["rw", "en", "fr"] as Language[]) {
  articlesOnly.set(
    lang,
    indexOf(
      docs.filter((d) => d.kind === "article"),
      lang,
    ),
  );
  casesOnly.set(
    lang,
    indexOf(
      docs.filter((d) => d.kind === "case"),
      lang,
    ),
  );
  shared.set(lang, indexOf(docs, lang));
}

const rankIn = (
  index: Bm25Index<Doc> | null,
  lang: Language,
  query: string,
  hit: (d: Doc) => boolean,
) => {
  if (!index)
    return { rank: null as number | null, top: null as Doc | null, score: 0 };
  const hits = index.search(expandQuery(query, lang), 20);
  const at = hits.findIndex((h) => hit(h.item));
  return {
    rank: at === -1 ? null : at + 1,
    top: hits[0]?.item ?? null,
    score: hits[0]?.score ?? 0,
  };
};

const show = (r: number | null) => (r === null ? "miss" : `#${r}`);

console.log(
  `${articles.length} article texts, ${cases.length} case texts\n` +
    `articles avg ${Math.round(articles.reduce((n, r) => n + r.text.length, 0) / articles.length)} chars, ` +
    `cases avg ${Math.round(cases.reduce((n, r) => n + r.text.length, 0) / cases.length)} chars\n`,
);

console.log(
  "STATUTE QUESTIONS — does adding case law displace the right article?\n",
);
let keptRank1 = 0;
let lostRank1 = 0;
for (const q of STATUTE_QUERIES) {
  const isTarget = (d: Doc) => d.kind === "article" && d.ref === q.expect;
  const before = rankIn(articlesOnly.get(q.lang)!, q.lang, q.query, isTarget);
  const after = rankIn(shared.get(q.lang)!, q.lang, q.query, isTarget);
  if (before.rank === 1 && after.rank === 1) keptRank1 += 1;
  if (before.rank === 1 && after.rank !== 1) lostRank1 += 1;

  const topKind = after.top?.kind ?? "—";
  console.log(
    `  ${show(before.rank).padEnd(5)} -> ${show(after.rank).padEnd(5)}  ` +
      `top hit now: ${topKind.padEnd(7)} ${after.top?.ref ?? ""}   ${q.query}`,
  );
}

console.log(
  `\n  ${keptRank1}/${STATUTE_QUERIES.length} statute questions still answer at rank 1; ${lostRank1} displaced\n`,
);

console.log("CASE QUESTIONS — are judgments reachable, and where?\n");
for (const q of CASE_QUERIES) {
  const isTarget = (d: Doc) => d.kind === "case" && q.expect.test(d.ref);
  const own = rankIn(casesOnly.get(q.lang)!, q.lang, q.query, isTarget);
  const mixed = rankIn(shared.get(q.lang)!, q.lang, q.query, isTarget);
  console.log(
    `  own index ${show(own.rank).padEnd(5)}  shared ${show(mixed.rank).padEnd(5)}  ` +
      `top in shared: ${(mixed.top?.kind ?? "—").padEnd(7)}   ${q.query}`,
  );
}

/**
 * Score scale, which decides whether one floor can serve both.
 *
 * The "I don't know" threshold is a raw BM25 score compared against a constant.
 * If judgments and articles score on different scales for the same query, no
 * single number can be the floor for both — it would be simultaneously too high
 * for one and too low for the other, and the failure would be silent.
 */
console.log("\nSCORE SCALE — can one floor serve both?\n");
for (const lang of ["en", "rw"] as Language[]) {
  const probes =
    lang === "en"
      ? ["fair trial", "contract payment obligation", "banana bread recipe"]
      : ["ubutabera buboneye", "amasezerano yo kwishyura", "uburyo bwo guteka"];
  for (const probe of probes) {
    const a = articlesOnly.get(lang)!.search(expandQuery(probe, lang), 1)[0];
    const c = casesOnly.get(lang)?.search(expandQuery(probe, lang), 1)[0];
    console.log(
      `  [${lang}] ${probe.padEnd(30)} article ${(a?.score ?? 0).toFixed(1).padStart(7)}   ` +
        `case ${(c?.score ?? 0).toFixed(1).padStart(7)}`,
    );
  }
}

/**
 * The same noise the floors were derived from, scored against each corpus.
 *
 * This is the measurement that decides the question. The floor is a single
 * constant per language compared against a raw BM25 score, and it exists so
 * MyLo can say it does not know. If judgments and articles put noise at
 * different heights, one constant cannot sit above both — it will be too high
 * for one corpus and too low for the other, and being too low means confidently
 * citing something irrelevant.
 */
const { NOISE } = await import("./noise-questions.mjs");

console.log(
  "\nNOISE CEILING — the height a wrong answer reaches in each corpus\n",
);
for (const lang of ["rw", "en", "fr"] as Language[]) {
  const questions: string[] = NOISE[lang] ?? [];
  const peak = (index: Bm25Index<Doc> | null) => {
    if (!index) return null;
    const scores = questions.map(
      (q) => index.search(expandQuery(q, lang), 1)[0]?.score ?? 0,
    );
    return {
      max: Math.max(...scores),
      mean: scores.reduce((a, b) => a + b, 0) / scores.length,
    };
  };

  const a = peak(articlesOnly.get(lang)!);
  const c = peak(casesOnly.get(lang)!);
  if (!a || !c) {
    console.log(`  [${lang}] no case texts in this language`);
    continue;
  }
  const ratio = c.max / (a.max || 1);
  console.log(
    `  [${lang}] ${questions.length} noise questions — ` +
      `articles peak ${a.max.toFixed(1).padStart(6)} (mean ${a.mean.toFixed(1)})   ` +
      `cases peak ${c.max.toFixed(1).padStart(6)} (mean ${c.mean.toFixed(1)})   ` +
      `ratio ${ratio.toFixed(2)}x`,
  );
}

/**
 * What a *correct* case answer scores, against the floor derived from articles.
 *
 * The noise ceiling above says an article-derived floor sits too high for case
 * law. This says whether that costs anything: a correct judgment scoring below
 * the floor is not a ranking problem, it is MyLo declining to answer a question
 * it can answer, with a judgment it holds.
 */
const ARTICLE_FLOORS: Record<Language, number> = { rw: 36, en: 32, fr: 23 };

console.log("\nCORRECT CASE ANSWERS vs THE ARTICLE-DERIVED FLOOR\n");
for (const q of CASE_QUERIES) {
  const index = casesOnly.get(q.lang)!;
  const hits = index.search(expandQuery(q.query, q.lang), 20);
  const at = hits.findIndex((h) => q.expect.test(h.item.ref));
  const score = at === -1 ? 0 : hits[at].score;
  const floor = ARTICLE_FLOORS[q.lang];
  console.log(
    `  [${q.lang}] score ${score.toFixed(1).padStart(6)}  floor ${String(floor).padStart(3)}  ` +
      `${score >= floor ? "served" : "REJECTED — MyLo would decline"}   ${q.query}`,
  );
}

/**
 * Whether judgments should be indexed whole, or by section.
 *
 * The numbers above show correct case answers scoring *below* the noise ceiling
 * for their own corpus, which no floor can fix — a threshold cannot separate two
 * distributions that overlap.
 *
 * The likely cause is not the retriever but the unit. An article is already the
 * right size: one provision, one document, roughly 470 characters, and a query
 * matching it matches most of it. A judgment is indexed as one 7,000-character
 * document whose holding — the part that answers a question — may be 200 of
 * them. BM25 scores the whole document, so the signal is diluted by the
 * surrounding facts, procedural history and reasoning.
 *
 * Statutes come pre-chunked by the legislature. Judgments do not, and this tests
 * whether chunking them by section recovers the difference.
 */
console.log("\nWHOLE JUDGMENT vs SECTIONED — same queries, different unit\n");

const sectioned: Doc[] = [];
const { rows: sections } = await (async () => {
  const c = new pg.Client({ connectionString: DATABASE_URL });
  await c.connect();
  const r = await c.query<{
    ref: string;
    language: Language;
    part: string;
    text: string;
  }>(`
    SELECT c.case_number AS ref, ct.language, 'held' AS part,
           coalesce(ct.title,'') || ' ' || ct.held AS text
      FROM case_texts ct JOIN cases c ON c.id = ct.case_id
     WHERE ct.held IS NOT NULL
    UNION ALL
    SELECT c.case_number, ct.language, 'facts',
           coalesce(ct.title,'') || ' ' || ct.facts
      FROM case_texts ct JOIN cases c ON c.id = ct.case_id
     WHERE ct.facts IS NOT NULL
  `);
  await c.end();
  return r;
})();

for (const s of sections) {
  sectioned.push({
    kind: "case",
    ref: `${s.ref} (${s.part})`,
    language: s.language,
    text: s.text,
  });
}

const sectionIndexes = new Map<Language, Bm25Index<Doc> | null>();
for (const lang of ["rw", "en", "fr"] as Language[]) {
  sectionIndexes.set(lang, indexOf(sectioned, lang));
}

for (const q of CASE_QUERIES) {
  const whole = rankIn(casesOnly.get(q.lang)!, q.lang, q.query, (d) =>
    q.expect.test(d.ref),
  );
  const idx = sectionIndexes.get(q.lang)!;
  const hits = idx ? idx.search(expandQuery(q.query, q.lang), 20) : [];
  const at = hits.findIndex((h) => q.expect.test(h.item.ref));
  console.log(
    `  [${q.lang}] whole ${show(whole.rank).padEnd(5)} ` +
      `sectioned ${show(at === -1 ? null : at + 1).padEnd(5)} ` +
      `score ${(at === -1 ? 0 : hits[at].score).toFixed(1).padStart(6)}   ${q.query}`,
  );
}

const noisePeak = (lang: Language, index: Bm25Index<Doc> | null) => {
  if (!index) return 0;
  const questions: string[] = NOISE[lang] ?? [];
  return Math.max(
    ...questions.map(
      (q) => index.search(expandQuery(q, lang), 1)[0]?.score ?? 0,
    ),
  );
};
console.log(
  `\n  noise ceiling, sectioned:  ` +
    (["rw", "en"] as Language[])
      .map((l) => `${l} ${noisePeak(l, sectionIndexes.get(l)!).toFixed(1)}`)
      .join("   "),
);
