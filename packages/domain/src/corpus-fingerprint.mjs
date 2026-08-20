/**
 * What index the score floors describe.
 *
 * The floor below which MyLo says it does not know is a property of the corpus,
 * the tokeniser and the BM25 parameters together. Change any of them and the
 * scores move, so the floor has to move with them — and the documented failure
 * mode is that it does not fail loudly when it doesn't. It quietly answers
 * questions it should decline.
 *
 * Detecting that requires the API and the evaluation to agree on what "the same
 * corpus" means, which is why this lives in one file that both import rather
 * than being written twice. Plain JavaScript so it can be imported both by the
 * TypeScript API and by the pipeline's .mjs scripts, which run under plain node.
 *
 * A count alone is not enough. Swapping one law for another of the same size
 * leaves the count identical and the index completely different, so the
 * fingerprint is taken over which laws are present, in which languages, with how
 * many texts each — the things that actually move IDF weights.
 */

/**
 * The statuses whose text is served to readers.
 *
 * `active` and `amended` are in force; an amended law still binds, as amended.
 * `repealed` and `draft` are not, and are excluded from the index rather than
 * from the results — a repealed article left in the index still shifts every
 * IDF weight, so a floor derived with it present describes a corpus the reader
 * cannot reach.
 *
 * Exported so the API's filter and the evaluation's filter cannot drift apart.
 */
export const SERVED_STATUSES = ["active", "amended"];

/**
 * The shape of the index, as rows of `{law_number, language, texts}`.
 *
 * Ordered deterministically so the same corpus always hashes the same way
 * regardless of what the query planner feels like doing.
 */
export const CORPUS_SHAPE_SQL = `
  SELECT l.law_number, at.language, count(*)::int AS texts
    FROM article_texts at
    JOIN articles a ON a.id = at.article_id
    JOIN laws l     ON l.id = a.law_id
   WHERE l.status = ANY($1)
   GROUP BY l.law_number, at.language
   ORDER BY l.law_number, at.language
`;

/**
 * A short stable digest of that shape.
 *
 * Deliberately not a cryptographic hash of the corpus text: the question is
 * whether the *index* has changed shape, not whether a typo was fixed in an
 * article. FNV-1a keeps this dependency-free on both sides.
 */
export function fingerprintCorpusShape(rows) {
  const canonical = rows
    .map((r) => `${r.law_number}:${r.language}:${r.texts}`)
    .join("|");

  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return {
    fingerprint: hash.toString(16).padStart(8, "0"),
    laws: new Set(rows.map((r) => r.law_number)).size,
    texts: rows.reduce((sum, r) => sum + r.texts, 0),
  };
}
