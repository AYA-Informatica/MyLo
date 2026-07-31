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
  articleNumber: z.string(),
  heading: z.string().nullable(),
  officialText: z.string(),
  language: languageSchema,
  /** True when this text is the state's own wording rather than a translation. */
  isOfficial: z.boolean(),
  explanation: z.string().nullable(),
  /** Retrieval score, exposed so the client can be honest about confidence. */
  score: z.number(),
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

export const askResponseSchema = z.object({
  kind: answerKindSchema,
  question: z.string(),
  language: languageSchema,
  citations: z.array(citationSchema),
  /**
   * Shown to the reader in their own language. Deliberately part of the
   * contract: what MyLo says when it does not know is a product decision, not a
   * client-side afterthought.
   */
  notice: z.string(),
});
export type AskResponse = z.infer<typeof askResponseSchema>;

export const articleParamsSchema = z.object({
  articleNumber: z.string().min(1).max(16),
  language: languageSchema.default("rw"),
});

export const healthSchema = z.object({
  status: z.literal("ok"),
  corpus: z.object({
    laws: z.number().int(),
    articles: z.number().int(),
    texts: z.number().int(),
  }),
});
export type Health = z.infer<typeof healthSchema>;
