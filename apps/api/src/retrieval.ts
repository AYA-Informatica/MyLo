/**
 * Character n-gram BM25 retrieval.
 *
 * This is the retriever the evaluation actually selected, not a reasonable-
 * sounding default. recall@1 / recall@5, over the 129 articles usable in all
 * three languages (`npm run eval:sparse`):
 *
 *                  rw            en            fr
 *   dense    56.6 / 80.6   87.6 / 96.9   84.5 / 96.9
 *   words    63.6 / 87.6   68.2 / 89.1   69.8 / 91.5
 *   chars    75.2 / 93.0   72.1 / 91.5   71.3 / 91.5
 *   hybrid   70.5 / 91.5   82.2 / 96.1   82.9 / 95.3
 *
 * Character n-grams win in Kinyarwanda because the language is agglutinative:
 * "ubutegetsi", "bw'ubutegetsi" and "butegetsi" are one idea wearing different
 * prefixes, and a word index files them as three unrelated terms. Splitting into
 * overlapping character runs recovers the shared stem. Notably it beats the
 * multilingual embedding model outright there — 75.2% against 56.6% — while
 * losing to it in English and French.
 *
 * This file nonetheless serves character BM25 to all three languages. That is a
 * deliberate trade. Dense retrieval needs an embedding model resident at query
 * time, which means either a GPU on the server or the reader's question
 * travelling to someone else's — and a question about your rights is not a
 * neutral thing to send away. Character BM25 needs neither, and at 91.5%
 * recall@5 the shortlist the API actually returns is within five points of dense
 * in every language. Revisit if MyLo ever hosts its own embedding model.
 *
 * These numbers are also a reminder that the corpus is an input, not a constant.
 * Every figure above rose sharply — Kinyarwanda from 41.7% to 75.2% — when the
 * extractor stopped truncating headings that wrapped across a column. Nothing in
 * this file changed. Retriever tuning was never the lever it looked like.
 *
 * The whole corpus is held in memory. The Constitution is 254KB of text across
 * three languages, so an index rebuild is milliseconds and there is nothing to
 * gain from pushing this into the database yet. At a corpus large enough to
 * matter, Postgres does the same thing natively through pg_trgm.
 */

export interface Indexed<T> {
  readonly item: T;
  readonly text: string;
}

interface Posting {
  readonly termFreq: Map<string, number>;
  readonly length: number;
}

export const NGRAM = 4;

/** Overlapping character n-grams, punctuation and spacing removed. */
export function charNgrams(text: string, n = NGRAM): string[] {
  const s = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const out: string[] = [];
  for (let i = 0; i + n <= s.length; i += 1) out.push(s.slice(i, i + n));
  return out;
}

export class Bm25Index<T> {
  // Written as explicit fields rather than constructor parameter properties:
  // Node's --experimental-strip-types removes annotations without emitting code,
  // so a parameter property would have nothing to perform its assignment.
  readonly #entries: ReadonlyArray<Indexed<T>>;
  readonly #k1: number;
  readonly #b: number;
  readonly #postings: Posting[] = [];
  readonly #idf = new Map<string, number>();
  readonly #averageLength: number;

  constructor(entries: ReadonlyArray<Indexed<T>>, k1 = 1.5, b = 0.75) {
    this.#entries = entries;
    this.#k1 = k1;
    this.#b = b;

    const documentFreq = new Map<string, number>();

    for (const entry of entries) {
      const grams = charNgrams(entry.text);
      const termFreq = new Map<string, number>();
      for (const g of grams) termFreq.set(g, (termFreq.get(g) ?? 0) + 1);
      this.#postings.push({ termFreq, length: grams.length });
      for (const g of termFreq.keys())
        documentFreq.set(g, (documentFreq.get(g) ?? 0) + 1);
    }

    const n = entries.length;
    this.#averageLength =
      this.#postings.reduce((sum, p) => sum + p.length, 0) / (n || 1);

    for (const [term, df] of documentFreq) {
      this.#idf.set(term, Math.log((n - df + 0.5) / (df + 0.5) + 1));
    }
  }

  /** Best matches, highest score first. Zero-scoring entries are dropped. */
  search(query: string, limit: number): Array<{ item: T; score: number }> {
    const grams = charNgrams(query);
    if (grams.length === 0) return [];

    const scored = this.#postings.map((posting, i) => {
      let score = 0;
      for (const term of grams) {
        const freq = posting.termFreq.get(term);
        if (!freq) continue;
        const denominator =
          freq +
          this.#k1 *
            (1 -
              this.#b +
              (this.#b * posting.length) / (this.#averageLength || 1));
        score +=
          (this.#idf.get(term) ?? 0) * ((freq * (this.#k1 + 1)) / denominator);
      }
      return { item: this.#entries[i]!.item, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
