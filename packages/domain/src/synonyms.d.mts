/**
 * Types for `synonyms.mjs`. Plain JavaScript so the evaluation's .mjs scripts
 * and the TypeScript API share one list — a synonym layer that differed between
 * what was measured and what is served would make every measurement a fiction.
 */
export declare const SYNONYMS: Record<string, Record<string, string[]>>;

/** Appends the other phrasings of any concept the query mentions. Additive. */
export declare function expandQuery(query: string, language: string): string;
