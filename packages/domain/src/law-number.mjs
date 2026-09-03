/**
 * What a law number is, in one place.
 *
 * `laws.law_number` is the key everything else hangs off — citations, the status
 * map, the loader's upsert, the reader's "Law N°02/2007" in a footer. Two
 * components that disagree about how to write one do not fail; they simply never
 * match, and the symptom is a status map that covers nothing or a law loaded
 * twice under two spellings.
 *
 * That had already happened. The parser read "N° 5/62" as `5/62` and the status
 * map read the same string as `5/2062`, because one left two-digit years alone
 * and the other assumed every century was the twenty-first. A 1962 law became a
 * 2062 law on one side of the pipeline and not the other.
 *
 * ## The century problem
 *
 * The Gazette writes years both ways: "N° 02/2007" and "N° 5/62" are both real
 * forms, and Rwanda's legal corpus runs from independence in 1962 to now, so a
 * two-digit year genuinely spans two centuries.
 *
 * Guessing from the number alone needs a pivot, and every pivot is arbitrary.
 * So the pivot is the fallback, not the method: when the document states its own
 * promulgation date — which the title block almost always does, with four digits
 * — that year decides the century and no guess is involved.
 */

/**
 * Law numbers as the Gazette prints them.
 *
 * The degree sign is set inconsistently (°, º, plain "o", or omitted) and the
 * spacing around it is not reliable either, so both are optional. `bis` and
 * `ter` are part of the serial, not decoration: Law N°12bis/2011 is a different
 * law from Law N°12/2011.
 *
 * `.OL` marks an organic law and is part of the number, not a label. Organic
 * laws are numbered in their own series, so `Organic Law N° 001/2026.OL` and a
 * `Law N° 001/2026` are two different instruments that both begin at 001 each
 * year. Dropping the suffix collapsed them onto one key — found on a live 2026
 * issue, where `ITEGEKO NGENGA N° 001/2026.OL` cites `Itegeko Ngenga
 * n°007/2018.OL`, and both would have collided with any ordinary law of the same
 * serial. `law_number` is the key everything hangs off, so that is two laws
 * loaded as one.
 */
export const LAW_NUMBER_PATTERN =
  /\b(?:N\s*[°ºo]?\s*)?(\d{1,4})\s*(bis|ter)?\s*\/\s*(\d{2,4})(\.OL)?\b/i;

/**
 * The same number, but only where it is unambiguously a citation.
 *
 * The `N°` marker is optional above because the field being normalised is
 * already known to hold a law number — including one this pipeline canonicalised
 * earlier, which has no marker at all. Inside an article body it is the
 * opposite: prose is dense with bare numerals — dates, sub-paragraph numbers,
 * sums — and "5/2007" mid-sentence is far more often a date than a citation. So
 * scanning prose requires the marker.
 *
 * These were one pattern briefly, and it broke the thing it was meant to fix:
 * requiring the marker everywhere meant an already-canonical "02/2007" no longer
 * normalised to itself, and the status map's coverage check silently read 0/0.
 */
export const CITED_LAW_PATTERN =
  /\bN\s*[°ºo]\s*(\d{1,4})\s*(bis|ter)?\s*\/\s*(\d{2,4})\b/gi;

/**
 * Where a two-digit year stops meaning 19xx and starts meaning 20xx.
 *
 * Only consulted when the document does not state a four-digit year of its own.
 * Rwanda's corpus begins in 1962, so anything at or above this reads as
 * twentieth century. The upper side has headroom until 2030, at which point this
 * needs revisiting — which is why it is a named constant and not a literal
 * buried in an expression.
 */
export const CENTURY_PIVOT = 30;

/**
 * Reduces a law number to its canonical form: `serial/yyyy`, lowercase.
 *
 * `context.year` should be the four-digit year the document states for itself,
 * when one is known. It resolves the century exactly rather than by pivot, and
 * is ignored when it disagrees with an unambiguous four-digit year already in
 * the number.
 *
 * Returns `null` rather than a guess when there is no law number to find, so a
 * caller can tell "this document has no number" from "this document has an
 * unusual one".
 */
export function normaliseLawNumber(raw, { year } = {}) {
  if (raw == null) return null;
  const match = String(raw).match(LAW_NUMBER_PATTERN);
  if (!match) return null;

  const [, serial, suffix, rawYear, organic] = match;

  let resolved;
  if (rawYear.length === 4) {
    resolved = rawYear;
  } else if (year && String(year).length === 4) {
    // The document's own date settles it. "N° 5/62" in a law dated 10/03/1962
    // is 1962 and needs no pivot.
    const stated = String(year);
    resolved =
      stated.slice(2) === rawYear.padStart(2, "0")
        ? stated
        : centuryFromPivot(rawYear);
  } else {
    resolved = centuryFromPivot(rawYear);
  }

  return `${serial.replace(/^0+(?=\d)/, "").padStart(2, "0")}${
    suffix ? suffix.toLowerCase() : ""
  }/${resolved}${organic ? ".OL" : ""}`;
}

function centuryFromPivot(twoDigit) {
  const n = Number.parseInt(twoDigit, 10);
  return n >= CENTURY_PIVOT
    ? `19${twoDigit.padStart(2, "0")}`
    : `20${twoDigit.padStart(2, "0")}`;
}
