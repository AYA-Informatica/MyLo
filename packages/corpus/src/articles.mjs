/**
 * Article parsing, shared by every Gazette instrument.
 *
 * This is the core lifted out of `constitution.mjs` unchanged in behaviour, so
 * that the Constitution and the other ~1,400 laws are parsed by one piece of
 * code rather than two that drift. The Constitution is not a special document
 * structurally — it is set in the same three parallel columns, with the same
 * heading grammar, as every ordinary law in the Gazette.
 *
 * What is *not* shared lives in the callers: the Constitution has no law number
 * and one known gazette reference, while an ordinary law carries both in its
 * title block and has to have them read out of the document.
 */

/**
 * Article headings.
 *
 * Kinyarwanda is unambiguous ("Ingingo ya"). English and French are not: for
 * every numbered article both languages print exactly "Article 10:", so no
 * pattern can tell them apart — only content can, which is what
 * `detectLatinLanguage` is for.
 *
 * Article 1 is the one case that *is* distinguishable, because all three
 * languages spell it out: "mbere", "one", "premier".
 */
export const RW_HEADING = /^Ingingo\s+ya\s+(mbere|\d+)\s*:\s*(.*)$/i;
export const LATIN_HEADING = /^Article\s+(premier|one|first|\d+)\s*:\s*(.*)$/i;

/** Justified columns leave runs of spaces mid-word-boundary; collapse them. */
export const clean = (s) => s.replace(/\s+/g, " ").trim();

const EN_MARKERS =
  /\b(the|shall|of|and|is|are|which|this|for|from|with|any|has|been|to)\b/gi;
const FR_MARKERS =
  /\b(le|la|les|des|du|de|est|sont|qui|que|cette|dans|pour|par|aux|une|un|être|sur)\b/gi;

/**
 * Kinyarwanda is recognised positively rather than by elimination.
 *
 * Eliminating English and French would classify an empty or numeric stream as
 * Kinyarwanda, which is how a blank third column becomes a language.
 */
const RW_MARKERS =
  /\b(mu|ku|cyangwa|n[a']|ry[a']|by[a']|w[a']|y[a']|iyi|iri|ibi|uyu|kandi|ariko|igihe|ubwo|itegeko|ingingo)\b/gi;

/**
 * Tells English from French by function-word frequency.
 *
 * Necessary because the two cannot be told apart by their headings — both print
 * "Article 10:". Accents are not used as the signal because accented characters
 * also appear in Kinyarwanda proper nouns and in English quotations of French
 * terms, whereas "the/shall/of" against "les/des/qui" is decisive at this length.
 *
 * Returns `null` when genuinely undecidable, so the caller can decline rather
 * than guess.
 */
export function detectLatinLanguage(text) {
  const en = (text.match(EN_MARKERS) ?? []).length;
  const fr = (text.match(FR_MARKERS) ?? []).length;
  if (en === fr) return null;
  return en > fr ? "en" : "fr";
}

/**
 * Classifies a whole stream by scoring its text against all three languages.
 *
 * Used instead of trusting column order. `constitution.mjs` assumed the Gazette
 * sets the columns Kinyarwanda, English, French and mapped position straight to
 * language; its own comments record that the order is *not* stable across the
 * document, and it carried a `detectLatinLanguage` helper that was never wired
 * up. On the Constitution the assumption happens to hold — 352 texts, none
 * mislabelled — but it is an assumption being made 1,400 more times, on
 * documents nobody has checked, where a swap means an article is served to a
 * reader labelled as a language it is not.
 */
export function classifyStream(lines) {
  const sample = lines
    .slice(0, 400)
    .map((l) => l.text)
    .join(" ");
  if (!sample.trim()) return null;

  const scores = {
    rw: (sample.match(RW_MARKERS) ?? []).length,
    en: (sample.match(EN_MARKERS) ?? []).length,
    fr: (sample.match(FR_MARKERS) ?? []).length,
  };
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === 0) return null;
  return { language: ranked[0][0], scores };
}

export function parseHeading(line) {
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
    const spelled = raw === "premier" || raw === "one" || raw === "first";
    const number = spelled ? 1 : Number.parseInt(raw, 10);
    if (!Number.isFinite(number)) return null;
    const lang = raw === "premier" ? "fr" : raw === "one" ? "en" : "und";
    return { lang, number, heading: clean(latin[2]) };
  }

  return null;
}

/**
 * The faces the Gazette sets headings in, learned from the document rather than
 * hardcoded to font ids that change with the next issue.
 *
 * Also reports whether that signal is worth anything. On the Constitution the
 * split is near-total — heading faces appear on roughly a seventh of lines — and
 * `absorbContinuation` relies on it to find where a wrapped heading ends. On Law
 * N°02/2007 the Kinyarwanda and English columns set *every* line in a heading
 * face, so the test "is this line entirely in heading fonts?" is true of the
 * whole document and absorption runs off the end of the heading into the body.
 *
 * The visible damage is worse than a lost heading: the first line of the
 * article's text gets stored as its title and shown to a reader as one. So when
 * the signal carries no information it is refused rather than used, and the
 * caller is told, because an article with no heading is honest and an article
 * whose heading is a fragment of its own body is not.
 */
function headingFontsOf(lines) {
  const fonts = new Set();
  for (const line of lines) {
    if (!parseHeading(line.text)) continue;
    for (const f of line.fonts) fonts.add(f);
  }

  const entirely = lines.filter((l) =>
    [...l.fonts].every((f) => fonts.has(f)),
  ).length;
  const share = lines.length ? entirely / lines.length : 0;

  return { fonts, discriminative: share <= HEADING_FONT_CEILING, share };
}

/**
 * Above this share of lines set entirely in heading faces, the face is not a
 * heading marker. Measured: the Constitution sits near 0.14, and the two
 * non-discriminative columns of Law N°02/2007 sit at 1.00 and the discriminative
 * one at 0.24.
 */
const HEADING_FONT_CEILING = 0.5;

/** The Gazette numbers every article's paragraphs; "(1)" opens the body. */
const BODY_STARTS = /^\s*\(\s*\d+\s*\)/;

/**
 * Lines a heading may wrap onto. Column width allows a heading of roughly this
 * length; a cap keeps a mis-detection from swallowing a whole article.
 */
const MAX_HEADING_WRAP = 2;

/**
 * Collects the lines a wrapped heading spills onto.
 *
 * A heading wider than its column wraps, and nothing in the words marks where it
 * ends. Two signals bound it: the line must be set entirely in heading faces,
 * and it must not open the numbered body. Either alone is too weak.
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
 * Parses one language's line stream into `Map<number, {heading, body}>`.
 *
 * `minBody` exists because the table of contents lists every heading with no
 * text beneath it; the real article appears later with its body, and the last
 * substantive one wins. Ordinary laws have shorter articles than the
 * Constitution, so the floor is a parameter rather than a constant — but it
 * must stay above the longest table-of-contents entry or the contents page
 * overwrites the law.
 *
 * The default is lower than the Constitution parser's 40 because ordinary laws
 * have much shorter articles: on Law N°02/2007 a floor of 40 discarded four real
 * articles per language, and 10 recovers them. It is safe to go this low only
 * because a later entry overwrites an earlier one and the contents page is
 * printed first, so a genuine article always wins over its own listing.
 */
export function parseStream(lines, { minBody = 10 } = {}) {
  const out = new Map();
  const { fonts: headingFonts, discriminative } = headingFontsOf(lines);

  for (let i = 0; i < lines.length; i += 1) {
    const head = parseHeading(lines[i].text);
    if (!head) continue;

    const { continuation, next: j } = discriminative
      ? absorbContinuation(lines, i + 1, headingFonts)
      : { continuation: [], next: i + 1 };

    const body = [];
    for (let k = j; k < lines.length; k += 1) {
      if (parseHeading(lines[k].text)) break;
      body.push(lines[k].text);
    }
    const text = {
      heading: clean([head.heading, ...continuation].join(" ")),
      body: clean(body.join(" ")),
    };

    if (text.body.length > minBody) out.set(head.number, text);
  }
  out.headingsResolved = discriminative;
  return out;
}
