/**
 * Layout detection for Gazette documents.
 *
 * `extract-columns.mjs` assumes three columns and splits every page into equal
 * thirds of its observed x span. That is right for the Constitution and wrong
 * for the corpus as a whole: the Gazette also carries instruments published in
 * one language only — treaties filed in English, presidential declarations from
 * 1962 filed in French — and cutting a single full-width column into thirds does
 * not fail loudly. It shreds each line into three fragments and files them as
 * three languages, producing confident trilingual nonsense.
 *
 * Detecting the columns geometrically was tried first and abandoned, which is
 * recorded here so it is not retried. The obvious signal is the gutter: find the
 * vertical whitespace between columns and split there. Measured on real Gazette
 * pages, the gutters run about 10pt on a 792pt page — narrower than the
 * indentation inside a justified paragraph — and the title block spans all three
 * columns anyway, so a coverage histogram over a whole page shows one
 * uninterrupted band. Start-x clustering fails for the same reason: items are
 * word-level, so their left edges scatter across the full width.
 *
 * So the layout is decided by outcome instead of by geometry. Split the document
 * both ways, ask which split yields streams that are coherent languages, and
 * keep that one. A three-column split of a French-only document produces three
 * streams of shredded French; a one-column read of a trilingual document
 * produces one stream in which all three languages interleave. Both are visible
 * in the classification, which is the test that actually matters — the parser
 * does not care where the columns are, only that each stream is one language.
 */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { classifyStream } from "./articles.mjs";

const GAP_IS_SPACE = 1;

const FURNITURE =
  /^(Official Gazette n°|Igazeti ya Leta|Journal Officiel|J\.?O\.?\s*n°|Umwaka wa|Year \d|\d+\s*[èe]me Ann[ée]e)/i;

/** Column counts the Gazette actually uses, tried in order of preference. */
const CANDIDATES = [3, 1];

/**
 * Puts a page's items into visual coordinates, whatever its rotation.
 *
 * Not optional, and not a detail. Gazette PDFs are not all in one orientation:
 * the Constitution is unrotated, and Law N°02/2007 — an ordinary law from the
 * same corpus — has `/Rotate 90` on every page. Read from the raw transform,
 * its columns run along y and its lines along x, so splitting on x cuts *across*
 * the lines rather than between the columns. It does not throw; it returns three
 * streams of shuffled words that still look like text.
 *
 * The viewport already encodes the rotation, so converting through it makes
 * every page look the same to everything downstream. Viewport y grows downward,
 * which is why reading order below sorts ascending rather than descending.
 */
function toVisualSpace(items, viewport) {
  return items
    .filter((i) => i.str.trim())
    .map((i) => {
      const [x, y] = viewport.convertToViewportPoint(
        i.transform[4],
        i.transform[5],
      );
      return {
        text: i.str,
        x,
        y,
        width: i.width ?? 0,
        font: i.fontName ?? "",
      };
    });
}

function splitIntoColumns(positioned, columns) {
  const buckets = Array.from({ length: columns }, () => []);
  if (positioned.length === 0) return buckets;
  if (columns === 1) return [positioned];

  // Equal division of the page's own observed x span, per page, so a shifted
  // margin does not silently move a language. This is the Constitution parser's
  // approach, and it parses all 176 of its articles correctly.
  const xs = positioned.map((i) => i.x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const band = (max - min || 1) / columns;

  for (const item of positioned) {
    const index = Math.min(columns - 1, Math.floor((item.x - min) / band));
    buckets[index].push(item);
  }
  return buckets;
}

function columnToLines(items, yTolerance = 3) {
  // Ascending y: viewport coordinates put the origin at the top-left, so
  // reading order is top to bottom rather than the PDF's native bottom-up.
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  let current = null;

  for (const item of sorted) {
    if (current && Math.abs(current.y - item.y) <= yTolerance) {
      current.parts.push(item);
    } else {
      if (current) lines.push(current);
      current = { y: item.y, parts: [item] };
    }
  }
  if (current) lines.push(current);

  return lines
    .map((line) => {
      const parts = [...line.parts].sort((a, b) => a.x - b.x);
      let text = "";
      let cursor = null;
      for (const part of parts) {
        // A gap of about a character or more is a real space; anything smaller
        // is the renderer splitting one word across items.
        if (cursor !== null && part.x - cursor > GAP_IS_SPACE) text += " ";
        text += part.text;
        cursor = part.x + part.width;
      }
      return {
        text: text.replace(/\s+/g, " ").trim(),
        fonts: new Set(parts.map((p) => p.font)),
      };
    })
    .filter(
      (line) =>
        line.text && !FURNITURE.test(line.text) && !/^\d{1,3}$/.test(line.text),
    );
}

/**
 * Scores a candidate split by how cleanly its streams separate into languages.
 *
 * A split is valid when every stream carries text, every stream classifies, and
 * no two streams claim the same language. `confidence` is the margin between
 * each stream's winning language and its runner-up, averaged — a stream of
 * shredded French scores weakly against every language at once, so a wrong split
 * shows up as a thin margin rather than as an obvious error.
 */
function scoreSplit(streams) {
  const verdicts = streams.map(classifyStream);
  if (verdicts.some((v) => v === null)) return { valid: false, confidence: 0 };

  const languages = verdicts.map((v) => v.language);
  if (new Set(languages).size !== languages.length) {
    return { valid: false, confidence: 0 };
  }

  const margins = verdicts.map((v) => {
    const ranked = Object.values(v.scores).sort((a, b) => b - a);
    const total = ranked.reduce((s, n) => s + n, 0) || 1;
    return (ranked[0] - ranked[1]) / total;
  });

  return {
    valid: true,
    confidence: margins.reduce((s, m) => s + m, 0) / margins.length,
    languages,
  };
}

/**
 * Extracts a document as N streams, where N is measured rather than assumed.
 *
 * Returns `{ streams, columns, pages, languages, confidence, layoutResolved }`.
 * Streams are positional and carry no language label of their own — naming them
 * is the caller's job, and it is done by content, never by column order.
 */
export async function extractAuto(pdfBytes, { candidates = CANDIDATES } = {}) {
  const doc = await getDocument({ data: pdfBytes, useSystemFonts: true })
    .promise;

  const pages = [];
  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    pages.push(toVisualSpace(content.items, page.getViewport({ scale: 1 })));
  }

  let best = null;
  for (const columns of candidates) {
    const streams = Array.from({ length: columns }, () => []);
    for (const items of pages) {
      const buckets = splitIntoColumns(items, columns);
      for (let c = 0; c < columns; c += 1) {
        streams[c].push(...columnToLines(buckets[c]));
      }
    }

    const candidate = { columns, streams, ...scoreSplit(streams) };
    if (!best) best = candidate;

    // A valid split always beats an invalid one; between two valid splits the
    // more confident wins. Candidates are ordered most-columns-first and ties
    // keep the incumbent, because a trilingual document read as one column
    // still classifies as *a* language — whichever dominates — and would
    // otherwise look perfectly acceptable.
    if (
      (candidate.valid && !best.valid) ||
      (candidate.valid && best.valid && candidate.confidence > best.confidence)
    ) {
      best = candidate;
    }
  }

  return {
    streams: best.streams,
    columns: best.columns,
    pages: doc.numPages,
    languages: best.languages ?? [],
    confidence: best.confidence,
    layoutResolved: best.valid,
  };
}
