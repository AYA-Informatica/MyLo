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

/**
 * The faces the Gazette sets headings in, learned from the document.
 *
 * Measured across the Kinyarwanda stream, two faces appear on heading lines and
 * two never do — the split is total, 0% of 2,794 body-face lines against 456
 * heading-face ones — so membership is read off the document rather than
 * hardcoded to font ids that would change with the next Gazette issue.
 *
 * Not sufficient on its own: one of the two heading faces is also used inside
 * body paragraphs, which is why `absorbContinuation` needs a second stop signal.
 */
function headingFontsOf(lines) {
  const fonts = new Set();
  for (const line of lines) {
    if (!parseHeading(line.text)) continue;
    for (const f of line.fonts) fonts.add(f);
  }
  return fonts;
}

/** The Gazette numbers every article's paragraphs; "(1)" opens the body. */
const BODY_STARTS = /^\s*\(\s*\d+\s*\)/;

/**
 * Collects the lines a wrapped heading spills onto.
 *
 * A heading wider than its column wraps, and nothing in the words marks where it
 * ends — "Ingingo ya 61: Inzego z'Ubutegetsi bwa / Leta" reads as a complete
 * phrase after the first line, which is how 15 Kinyarwanda headings came to be
 * stored truncated with their own tails buried at the front of the body text.
 *
 * Two signals bound it. The line must be set entirely in heading faces, and it
 * must not open the numbered body. Either alone is too weak: the body's first
 * line sometimes uses a heading face, and a heading's tail carries no marker of
 * its own.
 */
function absorbContinuation(lines, start, headingFonts) {
  const collected = [];
  let j = start;
  while (j < lines.length && collected.length < MAX_HEADING_WRAP) {
    const line = lines[j];
    const onlyHeadingFaces = [...line.fonts].every((f) => headingFonts.has(f));
    if (!onlyHeadingFaces || BODY_STARTS.test(line.text)) break;
    if (parseHeading(line.text)) break;
    collected.push(line.text);
    j += 1;
  }
  return { continuation: collected, next: j };
}

/**
 * Lines a heading may wrap onto. Column width allows a heading of roughly this
 * length; a cap keeps a mis-detection from swallowing a whole article.
 */
const MAX_HEADING_WRAP = 2;

/** Parses one language's line stream into { number -> {heading, body} }. */
function parseStream(lines, lang) {
  const out = new Map();
  const headingFonts = headingFontsOf(lines);

  for (let i = 0; i < lines.length; i += 1) {
    const head = parseHeading(lines[i].text);
    if (!head) continue;

    const { continuation, next: j } = absorbContinuation(
      lines,
      i + 1,
      headingFonts,
    );

    const body = [];
    for (let k = j; k < lines.length; k += 1) {
      if (parseHeading(lines[k].text)) break;
      body.push(lines[k].text);
    }
    const text = {
      heading: clean([head.heading, ...continuation].join(" ")),
      body: clean(body.join(" ")),
    };

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
