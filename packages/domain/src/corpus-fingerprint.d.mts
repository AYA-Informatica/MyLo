/**
 * Types for `corpus-fingerprint.mjs`.
 *
 * The implementation is plain JavaScript so the pipeline's .mjs scripts, which
 * run under plain node, can import the same file the TypeScript API does — the
 * whole point being that the two cannot disagree about what corpus the score
 * floors describe. This keeps the API's side of that typed.
 */

/** Statuses whose text is served to readers: in force, or in force as amended. */
export declare const SERVED_STATUSES: readonly string[];

/** Returns `{law_number, language, texts}` rows. Takes served statuses as $1. */
export declare const CORPUS_SHAPE_SQL: string;

export interface CorpusShapeRow {
  law_number: string;
  language: string;
  texts: number;
}

export interface CorpusFingerprint {
  fingerprint: string;
  laws: number;
  texts: number;
}

export declare function fingerprintCorpusShape(
  rows: CorpusShapeRow[],
): CorpusFingerprint;
