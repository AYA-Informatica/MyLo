/**
 * Column-aware text extraction for the trilingual Gazette layout.
 *
 * The Constitution is printed in three parallel columns — Kinyarwanda, English,
 * French — and a naive text extraction reads across them, splicing fragments of
 * one language into another. That is merely untidy for prose and disqualifying
 * for law: an "English" article carrying a stray French clause would produce a
 * citation that misquotes the state's own text.
 *
 * So columns are separated geometrically instead. Every text item in a PDF
 * carries a transform matrix whose 5th and 6th entries are its x and y position;
 * grouping items by x recovers the columns, and sorting each column by
 * descending y recovers reading order within it.
 *
 * Column boundaries are derived per page rather than hardcoded, because margins
 * shift slightly across a 149-page document.
 */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/** Page furniture that repeats in every column and belongs to none of them. */
const FURNITURE =
  /^(Official Gazette n°|Igazeti ya Leta|Journal Officiel|Umwaka wa|Year \d|\d+\s*[èe]me Ann[ée]e)/i;

/**
 * Splits one page's text items into three columns.
 *
 * Uses the observed span of the page's own x positions rather than fixed
 * coordinates, so a shifted margin doesn't silently move a language.
 */
function splitIntoColumns(items) {
  const positioned = items
    .filter((i) => i.str.trim())
    .map((i) => ({ text: i.str, x: i.transform[4], y: i.transform[5] }));

  if (positioned.length === 0) return [[], [], []];

  const xs = positioned.map((i) => i.x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const width = max - min || 1;
  const third = width / 3;

  const columns = [[], [], []];
  for (const item of positioned) {
    const band = Math.min(2, Math.floor((item.x - min) / third));
    columns[band].push(item);
  }
  return columns;
}

/**
 * Reassembles one column into text.
 *
 * Items on the same visual line share a y within a small tolerance; they are
 * joined with spaces, and lines are ordered top to bottom (descending y, since
 * PDF origin is bottom-left).
 */
function columnToLines(items, yTolerance = 3) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
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
    .map((line) =>
      line.parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((line) => line && !FURNITURE.test(line) && !/^\d{1,3}$/.test(line));
}

/**
 * Extracts the document as three language streams.
 *
 * Returns `{ rw, en, fr }`, each an array of lines in reading order across the
 * whole document. Column position maps to language by the Gazette's own layout:
 * Kinyarwanda left, English centre, French right.
 */
export async function extractColumns(pdfBytes) {
  const doc = await getDocument({ data: pdfBytes, useSystemFonts: true })
    .promise;
  const streams = [[], [], []];

  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const columns = splitIntoColumns(content.items);
    for (let c = 0; c < 3; c += 1) {
      streams[c].push(...columnToLines(columns[c]));
    }
  }

  return {
    rw: streams[0],
    en: streams[1],
    fr: streams[2],
    pages: doc.numPages,
  };
}
