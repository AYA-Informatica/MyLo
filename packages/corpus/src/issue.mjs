/**
 * Splitting a Gazette issue into the instruments it contains.
 *
 * A Gazette issue is a compilation, not a document. Every issue opens with an
 * `Ibirimo / Summary / Sommaire` index, and that index is lettered — `A.
 * Amategeko/ Laws/ Lois` — because one PDF routinely carries several
 * instruments of different kinds. One March 2026 issue holds a Presidential
 * Order, a Prime Minister's Order and a Ministerial Order together.
 *
 * `gazette.mjs` was written against files from amategeko, which splits issues
 * into one instrument per file. MINIJUST does not. Given a real issue the parser
 * took the first law number it found and assigned every article in the document
 * to it, so several unrelated instruments merged into one law with its articles
 * renumbering from 1 partway through — and nothing warned, because each
 * individual step looked correct.
 *
 * ## Why title case, and not law numbers alone
 *
 * The obvious signal is "a law number appears, so a new instrument starts". It
 * is wrong. Every law's recitals cite the laws it was made under or amends:
 *
 *     Ishingiye ku Itegeko Nshinga rya Repubulika y'u Rwanda...
 *     Isubiye ku Itegeko Ngenga n°007/2018.OL ryo ku wa 08/09/2018...
 *
 * Those carry an instrument keyword and a law number and are not boundaries.
 * Segmenting on them would cut an instrument into pieces at its own preamble —
 * the mirror image of the bug being fixed, and harder to notice.
 *
 * The Gazette distinguishes them typographically: a title block is set in
 * capitals, a recital citation is not. `ITEGEKO NGENGA N° 001/2026.OL` opens an
 * instrument; `Isubiye ku Itegeko Ngenga n°007/2018.OL` cites one. That
 * distinction is what this uses, and it is checked against the index count
 * rather than trusted.
 */
import {
  normaliseLawNumber,
  LAW_NUMBER_PATTERN,
} from "@mylo/domain/law-number";

/**
 * Instrument keywords, in all three languages.
 *
 * Broader than the type detection in `gazette.mjs` because the job here is only
 * "does this line open an instrument", not "which kind". Kept deliberately
 * loose: a missed boundary merges two laws, which is the failure being fixed.
 */
const INSTRUMENT_WORD =
  /\b(ITEGEKO|LAW|LOI|ITEKA|ORDER|ARR[ÊE]T[ÉE]|AMABWIRIZA|REGULATIONS?|R[ÈE]GLEMENT|D[ÉE]CRET|DECREE)\b/i;

/**
 * Which titles name an order rather than a law.
 *
 * Needed because the two are numbered differently: an order's second number
 * component is a category code, not a year. Reading `n° 472/06` as 2006 invents
 * a date for a 1979 instrument and merges every order sharing that code.
 */
const ORDER_KIND = [
  [
    /ITEKA\s+RYA\s+MINISITIRI\s+W[’']INTEBE|PRIME\s+MINISTER|PREMIER\s+MINISTRE/i,
    "prime_ministerial_order",
  ],
  [
    /ITEKA\s+RYA\s+PEREZIDA|PRESIDENTIAL\s+ORDER|ARR[ÊE]T[ÉE]\s+PR[ÉE]SIDENTIEL/i,
    "presidential_order",
  ],
  [
    /ITEKA\s+RYA\s+MINISITIRI|MINISTERIAL\s+ORDER|ARR[ÊE]T[ÉE]\s+MINIST[ÉE]RIEL/i,
    "ministerial_order",
  ],
];

const kindOf = (text) =>
  ORDER_KIND.find(([pattern]) => pattern.test(text))?.[1] ?? null;

/**
 * Index entries, which are excluded before anything else.
 *
 * The front-matter index lists every instrument in the issue, in all three
 * languages, with a page number after a run of dot leaders. Those lines contain
 * both an instrument keyword and a law number, so they look exactly like title
 * blocks — and there are three of them per instrument, which would triple the
 * boundary count.
 *
 * The dot-leader run is the reliable marker. It is what a table of contents has
 * and body text does not.
 */
const INDEX_ENTRY = /[.…·]{3,}\s*\d{1,4}\s*$/;

/** The index's own heading, and its section letters. */
const INDEX_HEADING =
  /^(Ibirimo|Summary|Sommaire)\b|^[A-Z]\.\s*(Amategeko|Laws?|Lois)\b/i;

/**
 * How capitalised a line must be to count as a title block.
 *
 * Titles are set in full capitals and recitals are in sentence case, so the
 * threshold has wide margin either side. Measured over letters only, because
 * law numbers and punctuation carry no case and would dilute a raw ratio.
 */
const TITLE_CAPS_RATIO = 0.75;

function capsRatio(text) {
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 4) return 0;
  const upper = letters.replace(/[^A-ZÀ-Þ]/g, "").length;
  return upper / letters.length;
}

/**
 * Whether a line opens an instrument.
 *
 * Requires all three: an instrument keyword, a law number, and title casing.
 * Any two of them occur in recitals.
 */
function isTitleLine(text) {
  if (INDEX_ENTRY.test(text) || INDEX_HEADING.test(text)) return false;
  if (!INSTRUMENT_WORD.test(text)) return false;
  if (!LAW_NUMBER_PATTERN.test(text)) return false;
  return capsRatio(text) >= TITLE_CAPS_RATIO;
}

/**
 * Splits one language's line stream into instrument spans.
 *
 * Returns `[{lawNumber, from, to}]`, where `from` is the index of the title line
 * and `to` is exclusive.
 *
 * A law number recurring is not a new instrument: the Gazette prints each title
 * twice, once above the instrument's own table of contents and again above its
 * body. So a boundary is only recorded when the number *changes*, and a repeat
 * of the current number is treated as part of the same span.
 */
export function segmentStream(lines) {
  const boundaries = [];

  lines.forEach((line, index) => {
    const text = typeof line === "string" ? line : line.text;
    if (!isTitleLine(text)) return;

    const lawNumber = normaliseLawNumber(text, { kind: kindOf(text) });
    if (!lawNumber) return;

    const previous = boundaries[boundaries.length - 1];
    if (previous?.lawNumber === lawNumber) return;
    boundaries.push({ lawNumber, from: index });
  });

  return boundaries.map((b, i) => ({
    lawNumber: b.lawNumber,
    from: b.from,
    to: boundaries[i + 1]?.from ?? lines.length,
  }));
}

/**
 * The instruments the front-matter index says the issue contains.
 *
 * Used as a check on segmentation rather than as its basis. The index is
 * authoritative about *what* is in the issue and says nothing about where, so it
 * answers "did we find them all" — which is the question that matters, because
 * a missed instrument is silently absorbed into its predecessor.
 */
export function indexedInstruments(lines) {
  const found = new Set();
  for (const line of lines) {
    const text = typeof line === "string" ? line : line.text;
    if (!INDEX_ENTRY.test(text)) continue;
    if (!INSTRUMENT_WORD.test(text)) continue;
    const lawNumber = normaliseLawNumber(text, { kind: kindOf(text) });
    if (lawNumber) found.add(lawNumber);
  }
  return [...found];
}

/**
 * Segments every language stream and reconciles them.
 *
 * Each language carries its own title blocks for the same instruments, so the
 * three streams should agree on which law numbers are present. Disagreement
 * means a title block failed to parse in one language, and the union is taken so
 * a segment is never lost — but it is reported, because a language missing an
 * instrument's title is a language whose articles for it may be misattributed.
 */
export function segmentIssue(streams, { indexed = [] } = {}) {
  const perLanguage = new Map();
  for (const [language, lines] of Object.entries(streams)) {
    perLanguage.set(language, segmentStream(lines));
  }

  const order = [];
  for (const spans of perLanguage.values()) {
    for (const span of spans) {
      if (!order.includes(span.lawNumber)) order.push(span.lawNumber);
    }
  }

  const disagreements = [];
  for (const [language, spans] of perLanguage) {
    const here = spans.map((s) => s.lawNumber);
    const missing = order.filter((n) => !here.includes(n));
    if (missing.length) {
      disagreements.push(
        `${language} has no title block for ${missing.join(", ")}`,
      );
    }
  }

  // An instrument the index lists but no title block matched is the dangerous
  // case: its articles are still in the document and will be attributed to
  // whichever instrument precedes it.
  const unmatched = indexed.filter((n) => !order.includes(n));

  return {
    instruments: order.map((lawNumber) => ({
      lawNumber,
      spans: Object.fromEntries(
        [...perLanguage].map(([language, spans]) => [
          language,
          spans.find((s) => s.lawNumber === lawNumber) ?? null,
        ]),
      ),
    })),
    disagreements,
    unmatched,
  };
}
