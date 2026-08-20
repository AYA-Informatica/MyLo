/** Types for `law-number.mjs`. Plain JS so .mjs pipeline scripts and the TS API share one definition. */
/** Lenient: for a field already known to hold a law number, marker optional. */
export declare const LAW_NUMBER_PATTERN: RegExp;
/** Strict and global: for finding citations inside prose, marker required. */
export declare const CITED_LAW_PATTERN: RegExp;
export declare const CENTURY_PIVOT: number;
/** Canonicalises to `serial/yyyy`. `year` resolves a two-digit century exactly. */
export declare function normaliseLawNumber(
  raw: string | null | undefined,
  context?: { year?: string | number },
): string | null;
