#!/usr/bin/env node
/**
 * Parses the Constitution of the Republic of Rwanda into an article-aligned,
 * trilingual corpus.
 *
 *   npm run ingest:constitution -- <path-to.pdf>
 *
 * Source: Official Gazette n° Special of 04/08/2023 — the authoritative
 * publication, which prints all three official languages in parallel columns.
 * Text extraction yields them as consecutive blocks per article, always in the
 * order Kinyarwanda → English → French.
 *
 * That ordering is what makes this corpus valuable beyond retrieval: the same
 * article in three languages, published together by the state, is an aligned
 * parallel text. It is simultaneously
 *
 *   - the retrieval corpus (article_texts, one row per language),
 *   - the reference for evaluating any model's Kinyarwanda legal register, and
 *   - supervision for teaching a model MyLo's voice.
 *
 * Every text produced here is `isOfficial: true` — this is the state's own
 * wording, not a translation MyLo produced. That distinction is load-bearing;
 * see docs/ARCHITECTURE.md on translation provenance.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractColumns } from "./extract-columns.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out");

/**
 * Article headings.
 *
 * Kinyarwanda is unambiguous ("Ingingo ya"). English and French are not: for
 * every numbered article both languages print exactly "Article 10:", so no
 * pattern can tell them apart. Only document order can — the Gazette sets the
 * columns Kinyarwanda, English, French, and extraction preserves that order.
 * So a numbered heading is parsed as `und` (undetermined) and resolved later by
 * position within its article group.
 *
 * Article 1 is the one case that *is* distinguishable, because all three
 * languages spell it out: "mbere", "one", "premier".
 */
const RW_HEADING = /^Ingingo\s+ya\s+(mbere|\d+)\s*:\s*(.*)$/i;
const LATIN_HEADING = /^Article\s+(premier|one|\d+)\s*:\s*(.*)$/i;

/** Justified columns leave runs of spaces mid-word-boundary; collapse them. */
const clean = (s) => s.replace(/\s+/g, " ").trim();

/**
 * Tells English from French by function-word frequency.
 *
 * Necessary because the two cannot be told apart by their headings — both print
 * "Article 10:" — and, as it turns out, not by column order either: the Gazette
 * does not keep English and French in a fixed order across the whole document.
 * Assuming it did silently mislabelled roughly half the articles, swapping the
 * two languages. Content is the only reliable signal.
 *
 * Function words are used rather than accents because accented characters also
 * appear in Kinyarwanda proper nouns and in English quotations of French terms,
 * whereas "the/shall/of" and "les/des/qui" are decisive at this text length.
 */
const EN_MARKERS =
  /\b(the|shall|of|and|is|are|which|this|for|from|with|any|has|been|to)\b/gi;
const FR_MARKERS =
  /\b(le|la|les|des|du|de|est|sont|qui|que|cette|dans|pour|par|aux|une|un|être|sur)\b/gi;

function detectLatinLanguage(text) {
  const en = (text.match(EN_MARKERS) ?? []).length;
  const fr = (text.match(FR_MARKERS) ?? []).length;
  if (en === fr) return null; // genuinely undecidable — caller decides
  return en > fr ? "en" : "fr";
}

function parseHeading(line) {
  const rw = line.match(RW_HEADING);
  if (rw) {
    const raw = rw[1].toLowerCase();
    return {
      lang: "rw",
      number: raw === "mbere" ? 1 : Number.parseInt(raw, 10),
      heading: clean(rw[2]),
    };
  }

  const latin = line.match(LATIN_HEADING);
  if (latin) {
    const raw = latin[1].toLowerCase();
    const number =
      raw === "premier" || raw === "one" ? 1 : Number.parseInt(raw, 10);
    if (!Number.isFinite(number)) return null;
    const lang = raw === "premier" ? "fr" : raw === "one" ? "en" : "und";
    return { lang, number, heading: clean(latin[2]) };
  }

  return null;
}

const pdfPath = resolve(
  process.argv[2] ??
    join(here, "..", "..", "..", "Constitutuion_of_the_Republic_of_Rwanda.pdf"),
);

// Each column is one language, separated geometrically. This is what removes
// the cross-language contamination that a linear text read produces — and it
// also means language no longer has to be guessed from content.
const streams = await extractColumns(new Uint8Array(readFileSync(pdfPath)));
const pages = streams.pages;

/** Parses one language's line stream into { number -> {heading, body} }. */
function parseStream(lines, lang) {
  const out = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    const head = parseHeading(lines[i]);
    if (!head) continue;

    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (parseHeading(lines[j])) break;
      body.push(lines[j]);
    }
    const text = { heading: head.heading, body: clean(body.join(" ")) };

    // The table of contents lists every heading with no text beneath it; the
    // real article appears later with its body. Last substantive one wins.
    if (text.body.length > 40) out.set(head.number, text);
  }
  return out;
}

const byLang = {
  rw: parseStream(streams.rw, "rw"),
  en: parseStream(streams.en, "en"),
  fr: parseStream(streams.fr, "fr"),
};

const numbers = new Set([
  ...byLang.rw.keys(),
  ...byLang.en.keys(),
  ...byLang.fr.keys(),
]);
const articles = new Map();
for (const number of numbers) {
  const texts = {};
  for (const lang of ["rw", "en", "fr"]) {
    const t = byLang[lang].get(number);
    if (t) texts[lang] = t;
  }
  articles.set(number, { number, texts });
}

const ordered = [...articles.values()].sort((a, b) => a.number - b.number);
const complete = ordered.filter((a) => a.texts.rw && a.texts.en && a.texts.fr);
const partial = ordered.filter(
  (a) => !(a.texts.rw && a.texts.en && a.texts.fr),
);

mkdirSync(outDir, { recursive: true });

const corpus = {
  source: {
    title: "Constitution of the Republic of Rwanda",
    gazetteRef: "Official Gazette n° Special of 04/08/2023",
    publishedAt: "2023-08-04",
    origin: "parliamentary",
    languages: ["rw", "en", "fr"],
    isOfficial: true,
  },
  stats: {
    pages,
    articlesFound: ordered.length,
    articlesTrilingual: complete.length,
    articlesIncomplete: partial.length,
  },
  articles: ordered,
};

writeFileSync(
  join(outDir, "constitution.json"),
  JSON.stringify(corpus, null, 2),
);

// The aligned pairs are what a translation evaluation scores against, and what
// teaches legal register. Emitted separately so they can be used without
// re-parsing.
const pairs = [];
for (const a of complete) {
  for (const [from, to] of [
    ["en", "rw"],
    ["fr", "rw"],
    ["en", "fr"],
  ]) {
    pairs.push({
      article: a.number,
      from,
      to,
      source: a.texts[from].body,
      target: a.texts[to].body,
      sourceHeading: a.texts[from].heading,
      targetHeading: a.texts[to].heading,
    });
  }
}
writeFileSync(
  join(outDir, "parallel.jsonl"),
  pairs.map((p) => JSON.stringify(p)).join("\n"),
);

console.log(`Source   ${corpus.source.gazetteRef}`);
console.log(`Pages    ${pages}`);
console.log(
  `Articles ${ordered.length} found, ${complete.length} with all three languages`,
);
if (partial.length) {
  console.log(
    `         incomplete: ${partial.map((a) => `${a.number}(${Object.keys(a.texts).join("/")})`).join(", ")}`,
  );
}
console.log(`Pairs    ${pairs.length} aligned translation pairs`);
console.log(`\nWrote    out/constitution.json`);
console.log(`         out/parallel.jsonl`);
