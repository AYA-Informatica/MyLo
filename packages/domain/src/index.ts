/**
 * The contract between the API and the web client.
 *
 * Defined once here and imported by both, so a payload change becomes a type
 * error in the client rather than a production surprise. The previous build
 * described its wire format twice — Joi on the server, hand-written interfaces
 * in the browser — and the two drifted.
 *
 * The shapes encode the project's one rule: an answer carries citations, or it
 * is not an answer about the law. `Citation` has no optional article, and
 * `AskResponse` distinguishes "here is what the law says" from "the corpus does
 * not answer this" as different outcomes rather than as an empty list.
 */
import { z } from "zod";

/** Kinyarwanda first — the language most people who need MyLo actually read. */
export const languageSchema = z.enum(["rw", "en", "fr"]);
export type Language = z.infer<typeof languageSchema>;

export const LANGUAGE_NAMES: Record<Language, string> = {
  rw: "Ikinyarwanda",
  en: "English",
  fr: "Français",
};

/**
 * A law's standing at the moment of asking. Served with every citation, because
 * telling someone about a repealed law is worse than telling them nothing.
 */
export const lawStatusSchema = z.enum([
  "draft",
  "active",
  "amended",
  "repealed",
]);
export type LawStatus = z.infer<typeof lawStatusSchema>;

/**
 * Whether the corpus holds all of a law's articles.
 *
 * Travels with every citation because a correct quotation of a fragment is
 * still a misleading answer: someone shown one article of a 250-article law has
 * no way to see the others that qualify it. When this is `partial`, the reader
 * is told so rather than left to assume completeness.
 */
export const lawCoverageSchema = z.enum(["partial", "complete"]);
export type LawCoverage = z.infer<typeof lawCoverageSchema>;

/**
 * One article, quoted as the state published it.
 *
 * `officialText` is verbatim from the Gazette and never model output — that is
 * what makes it quotable. `explanation` is the plain-language layer and is only
 * ever present when a human has approved it; an unreviewed draft is withheld
 * rather than shown with a caveat.
 */
export const citationSchema = z.object({
  lawNumber: z.string(),
  lawTitle: z.string(),
  gazetteRef: z.string().nullable(),
  lawStatus: lawStatusSchema,
  lawCoverage: lawCoverageSchema,
  articleNumber: z.string(),
  heading: z.string().nullable(),
  officialText: z.string(),
  language: languageSchema,
  /** True when this text is the state's own wording rather than a translation. */
  isOfficial: z.boolean(),
  explanation: z.string().nullable(),
  /**
   * When this law started binding people.
   *
   * Not the date printed in its title. A Rwandan law is signed, published, and
   * commences, and those are three dates — Law N°02/2007 was signed 54 days
   * before it took effect. A reader asking whether a law applied to something
   * that happened to them needs the third.
   */
  effectiveFrom: z.string().nullable(),
  /** Retrieval score, exposed so the client can be honest about confidence. */
  score: z.number(),
  /**
   * The score below which MyLo would have declined to answer at all.
   *
   * Shipped alongside the score because the score alone means nothing: whether
   * 45 is a strong match or a marginal one depends entirely on the floor, and a
   * client that renders a confidence bar without it is inventing the scale.
   */
  scoreFloor: z.number(),
});
export type Citation = z.infer<typeof citationSchema>;

export const askRequestSchema = z.object({
  question: z.string().min(3).max(500),
  language: languageSchema.default("rw"),
  limit: z.number().int().min(1).max(10).default(5),
});
export type AskRequest = z.infer<typeof askRequestSchema>;

/**
 * How the system answered.
 *
 * `shortlist` is the honest default at current retrieval accuracy: the top
 * article is right about 42% of the time in Kinyarwanda but the right one is in
 * the top five about 70% of the time, so offering candidates tells the truth
 * where a single confident answer would not.
 *
 * `none` is a first-class outcome, not a failure. When the corpus cannot answer,
 * saying so and offering a referral is the correct behaviour — the previous
 * build filled this gap with a web search and presented the result as law.
 */
export const answerKindSchema = z.enum(["shortlist", "none"]);
export type AnswerKind = z.infer<typeof answerKindSchema>;

/**
 * What MyLo cannot tell the reader about this answer.
 *
 * Not a disclaimer. Each of these is a specific, known limit of the corpus that
 * changes how much weight the answer can bear, and a reader who cannot see them
 * has no way to know which parts to check elsewhere.
 *
 * The reason this is a list rather than prose is that the limits are
 * per-response: a complete law in force with an approved explanation carries
 * none of them, and one held only in part carries several.
 */
export const limitationSchema = z.enum([
  /**
   * A later law may have repealed part of this one without saying so.
   *
   * The Gazette's standard closing formula is "all previous legal provisions
   * contrary to this law are hereby abrogated" — it names no target, and
   * resolving it would mean deciding which provisions of which other laws
   * contradict it, which is interpretation. So "in force" means "not itself
   * repealed", and cannot mean "nothing later has partly undone it".
   */
  "unresolved_repeals",
  /** MyLo holds only part of this law; the articles that qualify it may be missing. */
  "partial_law",
  /** This text is a translation MyLo produced, not the state's own wording. */
  "unofficial_translation",
  /**
   * No plain-language explanation exists for this article yet.
   *
   * This replaces `unreviewed_explanation`, which could never fire: an
   * unreviewed explanation is not served at all, so there is nothing for the
   * reader to be cautioned about. The real gap is the opposite one, and it is
   * the one that matters most to the person MyLo is for — someone facing a court
   * process without a lawyer gets the state's own wording and nothing to help
   * them read it, and is not told that help is missing rather than unnecessary.
   */
  "no_explanation",
]);
export type Limitation = z.infer<typeof limitationSchema>;

export const askResponseSchema = z.object({
  kind: answerKindSchema,
  question: z.string(),
  language: languageSchema,
  /** See {@link limitationSchema}. Empty when the answer carries no known caveat. */
  limitations: z.array(limitationSchema).default([]),
  citations: z.array(citationSchema),
  /**
   * Shown to the reader in their own language. Deliberately part of the
   * contract: what MyLo says when it does not know is a product decision, not a
   * client-side afterthought.
   */
  notice: z.string(),
});
export type AskResponse = z.infer<typeof askResponseSchema>;

/**
 * Addressing one article.
 *
 * `lawNumber` is required, not optional. Article numbers are unique within a
 * law and meaningless across the corpus — "article 3" names 176 different
 * provisions once more than one law is loaded — so a route keyed on the number
 * alone answered with whichever row the planner returned first. That was
 * invisible while the Constitution was the only law and is a wrong citation now
 * that it is not.
 */
export const articleParamsSchema = z.object({
  lawNumber: z.string().min(1).max(32),
  articleNumber: z.string().min(1).max(16),
  language: languageSchema.default("rw"),
});

export const healthSchema = z.object({
  status: z.literal("ok"),
  corpus: z.object({
    laws: z.number().int(),
    articles: z.number().int(),
    texts: z.number().int(),
    /** Texts a reader can actually reach: excludes repealed and draft laws. */
    served: z.number().int(),
    /** Index size the score floors were derived against. */
    floorsDerivedAgainst: z.number().int(),
    /**
     * True when the served index has moved since the floors were derived, which
     * means MyLo may answer questions it should decline. Surfaced rather than
     * logged because a miscalibrated floor produces ordinary-looking answers.
     */
    floorsStale: z.boolean(),
  }),
});
export type Health = z.infer<typeof healthSchema>;
