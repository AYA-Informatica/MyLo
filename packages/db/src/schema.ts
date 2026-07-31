/**
 * MyLo domain schema.
 *
 * Shaped by one rule, from docs/ARCHITECTURE.md:
 *
 *   No legal claim without a citation to a specific article, in a specific
 *   language, at a specific point in time.
 *
 * The previous schema could not express that — its retrieval corpus was a flat
 * table of PDF chunks with no link to any law — so the assistant could not cite
 * what it was reading. Here an uncited legal answer is not representable.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/* ────────────────────────────────────────────────────────────── vocabulary ── */

/**
 * Kinyarwanda is first because it is the language most people who need MyLo
 * actually read. The official text of a law is frequently not in it, which is
 * precisely the gap the product exists to close.
 */
export const language = pgEnum("language", ["rw", "en", "fr"]);

/**
 * Where a law comes from. In Rwanda this is a real distinction with consequences
 * for a law's authority and for what may amend it.
 */
export const lawOrigin = pgEnum("law_origin", [
  "presidential",
  "parliamentary",
  "ministerial",
  "judicial",
  "administrative",
]);

/**
 * A legal corpus is temporal. Telling someone about a repealed law is worse than
 * telling them nothing, so status is never optional.
 */
export const lawStatus = pgEnum("law_status", [
  "draft",
  "active",
  "amended",
  "repealed",
]);

/**
 * Whether every article of a law is present, or only some of them.
 *
 * A partially loaded law is more dangerous than an absent one. Someone asking
 * about the minimum age of marriage and receiving article 12 of Law N° 32/2016
 * has no way to see that 249 other articles of the same law exist, several of
 * which qualify it — so a fragment reads as the complete answer.
 *
 * `partial` is the default deliberately. Completeness is a claim about the
 * corpus that has to be asserted by whatever loaded it, never assumed by
 * omission.
 */
export const lawCoverage = pgEnum("law_coverage", ["partial", "complete"]);

/** Editorial state for any text a machine produced and a human must sign off. */
export const reviewStatus = pgEnum("review_status", [
  "draft",
  "in_review",
  "approved",
  "rejected",
]);

export const accountStatus = pgEnum("account_status", [
  "active",
  "suspended",
  "deleted",
]);

export const orgKind = pgEnum("org_kind", [
  "law_firm",
  "ngo",
  "school",
  "company",
  "public_body",
]);

/** A badge that is never re-checked is worse than no badge. Hence expiry + revoked. */
export const verificationStatus = pgEnum("verification_status", [
  "pending",
  "under_review",
  "verified",
  "rejected",
  "suspended",
  "revoked",
  "expired",
]);

export const questionStatus = pgEnum("question_status", [
  "open",
  "answered",
  "referred",
  "resolved",
  "withdrawn",
]);

/** Who produced an answer. The distinction is load-bearing, not cosmetic. */
export const answerKind = pgEnum("answer_kind", [
  "assistant",
  "practitioner",
  "moderator",
]);

export const reportReason = pgEnum("report_reason", [
  // The sharpest harm this platform can do: wrong law, stated confidently.
  "legal_inaccuracy",
  "outdated_law",
  "unqualified_advice",
  "impersonation",
  "spam",
  "harassment",
  "other",
]);

export const reportStatus = pgEnum("report_status", [
  "open",
  "triaged",
  "upheld",
  "dismissed",
]);

/* ─────────────────────────────────────────────────────────────── identity ── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    /** scrypt (node:crypto) — see docs/ARCHITECTURE.md on dropping bcrypt. */
    passwordHash: text("password_hash"),
    displayName: text("display_name").notNull(),
    /** Interface language, independent of any law's language. */
    locale: language("locale").notNull().default("rw"),
    isAdmin: boolean("is_admin").notNull().default(false),
    status: accountStatus("status").notNull().default("active"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [unique("users_email_key").on(t.email)],
);

/** External identity providers, so a user is not limited to one. */
export const userIdentities = pgTable(
  "user_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    subject: text("subject").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("user_identities_provider_subject_key").on(t.provider, t.subject),
  ],
);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: orgKind("kind").notNull(),
  name: text("name").notNull(),
  /** Company/bar registration number, as filed with the relevant register. */
  registrationNumber: text("registration_number"),
  bio: text("bio"),
  websiteUrl: text("website_url"),
  contactEmail: text("contact_email"),
  phone: text("phone"),
  district: text("district"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const orgMembers = pgTable(
  "org_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 'owner' may manage membership and answer on the organisation's behalf. */
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.userId] })],
);

/**
 * Verification as a state machine with an expiry, naming what was checked and by
 * whom. The previous build had a `isVerified` badge in the UI backed by nothing.
 */
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    status: verificationStatus("status").notNull().default("pending"),
    /** The authority the claim was checked against, e.g. 'rwanda_bar_association'. */
    register: text("register"),
    /** Reference to the evidence seen — a certificate number, a file, a URL. */
    evidenceRef: text("evidence_ref"),
    note: text("note"),
    decidedBy: uuid("decided_by").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    /** Verification is a claim about the present. It must be re-checked. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("verifications_org_status_idx").on(t.organizationId, t.status)],
);

/* ───────────────────────────────────────────────────────── legal taxonomy ── */

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Stable machine key, e.g. 'family'. Display names live in domain_texts. */
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("domains_slug_key").on(t.slug)],
);

/** Domain names are user-facing, so they are translated like everything else. */
export const domainTexts = pgTable(
  "domain_texts",
  {
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    language: language("language").notNull(),
    name: text("name").notNull(),
    description: text("description"),
  },
  (t) => [primaryKey({ columns: [t.domainId, t.language] })],
);

/* ────────────────────────────────────────────────────────── legal corpus ── */

/**
 * A law as a legal instrument, holding only what is language-independent.
 * The words live in `lawTexts`. That separation is what lets the system say
 * "these rows are the same law in different languages".
 */
export const laws = pgTable(
  "laws",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** e.g. "N° 66/2018". Unique within the corpus. */
    lawNumber: text("law_number").notNull(),
    origin: lawOrigin("origin").notNull(),
    domainId: uuid("domain_id").references(() => domains.id, {
      onDelete: "set null",
    }),
    status: lawStatus("status").notNull().default("active"),
    /**
     * Whether the corpus holds all of this law's articles. Read by the API and
     * shown to the reader, so a citation drawn from a fragment says so.
     */
    coverage: lawCoverage("coverage").notNull().default("partial"),
    /** Where this text can be found in the official Gazette. */
    gazetteRef: text("gazette_ref"),
    gazetteUrl: text("gazette_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** Publication and commencement are different dates and both matter. */
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    repealedAt: timestamp("repealed_at", { withTimezone: true }),
    /** The instrument that replaced this one, when status is amended/repealed. */
    supersededById: uuid("superseded_by_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("laws_law_number_key").on(t.lawNumber),
    index("laws_status_idx").on(t.status),
    index("laws_domain_idx").on(t.domainId),
  ],
);

/**
 * The words of a law, one row per language.
 *
 * `isOfficial` marks the text as published by the state. Anything else is a
 * translation and must say where it came from and who checked it — a
 * mistranslated legal text is a harm, not a typo.
 */
export const lawTexts = pgTable(
  "law_texts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawId: uuid("law_id")
      .notNull()
      .references(() => laws.id, { onDelete: "cascade" }),
    language: language("language").notNull(),
    title: text("title").notNull(),
    preamble: text("preamble"),
    isOfficial: boolean("is_official").notNull().default(false),
    /** The official text this was translated from, when not official itself. */
    translationOfId: uuid("translation_of_id"),
    translatedBy: text("translated_by"),
    reviewStatus: reviewStatus("review_status").notNull().default("draft"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("law_texts_law_language_key").on(t.lawId, t.language)],
);

/**
 * Articles are the unit of citation. "The labour law covers this" is useless;
 * "Article 12 of Law N° 66/2018 says this" is an answer.
 */
export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawId: uuid("law_id")
      .notNull()
      .references(() => laws.id, { onDelete: "cascade" }),
    /** As printed, e.g. "12" or "12 bis" — not necessarily numeric. */
    articleNumber: text("article_number").notNull(),
    /** Sort key, since article numbers do not sort lexically. */
    ordinal: integer("ordinal").notNull(),
    /** Set for sub-articles, so structure is preserved rather than flattened. */
    parentArticleId: uuid("parent_article_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("articles_law_number_key").on(t.lawId, t.articleNumber),
    index("articles_law_ordinal_idx").on(t.lawId, t.ordinal),
  ],
);

export const articleTexts = pgTable(
  "article_texts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    language: language("language").notNull(),
    heading: text("heading"),
    body: text("body").notNull(),
    isOfficial: boolean("is_official").notNull().default(false),
    translationOfId: uuid("translation_of_id"),
    translatedBy: text("translated_by"),
    reviewStatus: reviewStatus("review_status").notNull().default("draft"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("article_texts_article_language_key").on(t.articleId, t.language),
  ],
);

/**
 * Plain-language explanation of a law or article — the product's headline promise,
 * which the previous schema had no column for anywhere.
 *
 * Machine-drafted and human-approved: `reviewStatus` gates display. An
 * unreviewed explanation is a draft, never an authority.
 */
export const explanations = pgTable(
  "explanations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Exactly one of these is set; enforced by a check constraint in migration. */
    lawId: uuid("law_id").references(() => laws.id, { onDelete: "cascade" }),
    articleId: uuid("article_id").references(() => articles.id, {
      onDelete: "cascade",
    }),
    language: language("language").notNull(),
    body: text("body").notNull(),
    /** Rough target audience, so the same article can be explained twice. */
    readingLevel: text("reading_level").notNull().default("general"),
    generatedByModel: text("generated_by_model"),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    reviewStatus: reviewStatus("review_status").notNull().default("draft"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("explanations_article_lang_idx").on(t.articleId, t.language),
    index("explanations_law_lang_idx").on(t.lawId, t.language),
    // An explanation explains exactly one thing. Allowing both, or neither, would
    // let a plain-language claim float free of the text it is supposed to explain.
    check(
      "explanations_one_subject",
      sql`num_nonnulls(${t.lawId}, ${t.articleId}) = 1`,
    ),
  ],
);

/* ──────────────────────────────────────────────────────────── retrieval ── */

/**
 * The retrieval corpus.
 *
 * `articleId` is NOT NULL, and that is the whole point: a retrieved chunk always
 * resolves to law + article + language, so every grounded answer can cite. The
 * old `documents` table was keyed by filename and could cite nothing.
 */
export const articleChunks = pgTable(
  "article_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    articleTextId: uuid("article_text_id")
      .notNull()
      .references(() => articleTexts.id, { onDelete: "cascade" }),
    language: language("language").notNull(),
    /** Position within the article, so quotes can be located. */
    ordinal: smallint("ordinal").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    /** Which model produced the embedding — vectors are not comparable across models. */
    embeddingModel: text("embedding_model"),
    tokenCount: integer("token_count"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("article_chunks_text_ordinal_key").on(t.articleTextId, t.ordinal),
    index("article_chunks_article_idx").on(t.articleId),
    // HNSW over cosine distance; built in the migration where ops class is available.
    index("article_chunks_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

/* ──────────────────────────────────────────────────── the question bank ── */

/**
 * A curated question a citizen might actually ask, mapped to the article that
 * answers it. Distinct from `questions`, which records what people *did* ask.
 *
 * This is the retrieval index, not merely a cache. Matching a question to a
 * question is far easier than matching it to legal prose: "nshobora
 * gushyingirwa mfite imyaka 17?" shares almost no vocabulary with an article
 * that never says "17" or "can I", but it is close to a stored question asking
 * the minimum age of marriage. Same register, same words, same shape.
 *
 * It is also where the safety and the economics meet. An entry reviewed once
 * serves everyone who asks that question, so the common path costs nothing and
 * — more importantly — was checked by a person before anyone relied on it.
 */
export const questionBank = pgTable(
  "question_bank",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewStatus: reviewStatus("review_status").notNull().default("draft"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    /**
     * Set when review concludes the corpus does not actually answer this
     * question. Those are the most valuable rows in the table: they map what
     * people need to know and the Constitution alone does not cover.
     */
    unanswerable: boolean("unanswerable").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("question_bank_status_idx").on(t.reviewStatus)],
);

/**
 * The question as actually phrased, one row per language.
 *
 * Mirrors `law_texts`: the concept is language-independent, the wording is not.
 * Each phrasing carries its own embedding, because a Kinyarwanda question must
 * be matched against Kinyarwanda phrasings — cross-language vector similarity is
 * exactly where retrieval quietly degrades.
 */
export const questionBankTexts = pgTable(
  "question_bank_texts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionBank.id, { onDelete: "cascade" }),
    language: language("language").notNull(),
    body: text("body").notNull(),
    /** Alternative phrasings of the same question, to widen matching. */
    variants: jsonb("variants").$type<string[]>().default([]),
    embedding: vector("embedding", { dimensions: 1536 }),
    embeddingModel: text("embedding_model"),
    generatedByModel: text("generated_by_model"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("question_bank_texts_question_language_key").on(
      t.questionId,
      t.language,
    ),
    index("question_bank_texts_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

/**
 * Which articles answer a banked question.
 *
 * Many-to-many because real questions rarely respect article boundaries — asking
 * about detention touches arrest, liberty and due process at once. `ordinal`
 * orders them for display, most directly relevant first.
 */
export const questionBankArticles = pgTable(
  "question_bank_articles",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionBank.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    ordinal: smallint("ordinal").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.questionId, t.articleId] }),
    index("question_bank_articles_article_idx").on(t.articleId),
  ],
);

/* ──────────────────────────────────────────────── questions and answers ── */

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    askerId: uuid("asker_id").references(() => users.id, {
      onDelete: "set null",
    }),
    language: language("language").notNull().default("rw"),
    body: text("body").notNull(),
    domainId: uuid("domain_id").references(() => domains.id, {
      onDelete: "set null",
    }),
    status: questionStatus("status").notNull().default("open"),
    /** Public questions build the archive that makes the platform compound. */
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("questions_status_idx").on(t.status),
    index("questions_domain_idx").on(t.domainId),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    kind: answerKind("kind").notNull(),
    /** Null when the assistant answered. */
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Set when a practitioner answers on an organisation's behalf. */
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    language: language("language").notNull(),
    body: text("body").notNull(),
    model: text("model"),
    /**
     * Retrieval confidence for assistant answers. Low confidence is a referral
     * trigger, not something to hide behind fluent prose.
     */
    confidence: integer("confidence"),
    isAccepted: boolean("is_accepted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("answers_question_idx").on(t.questionId)],
);

/**
 * What an answer stands on.
 *
 * An assistant answer with no rows here has cited nothing and must not be served
 * as a legal answer. This table is the mechanical form of the project's one rule.
 */
export const answerCitations = pgTable(
  "answer_citations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    answerId: uuid("answer_id")
      .notNull()
      .references(() => answers.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "restrict" }),
    /** The chunk actually retrieved, kept for auditing what the model saw. */
    chunkId: uuid("chunk_id").references(() => articleChunks.id, {
      onDelete: "set null",
    }),
    /** The exact words relied on, so a reader can check rather than trust. */
    quote: text("quote"),
    ordinal: smallint("ordinal").notNull().default(0),
  },
  (t) => [
    unique("answer_citations_answer_article_key").on(t.answerId, t.articleId),
    index("answer_citations_article_idx").on(t.articleId),
  ],
);

/**
 * Where the assistant stops and a human starts.
 *
 * The old system filled this gap with a DuckDuckGo search. The gap is the
 * referral opportunity: citizens get an honest "not from the corpus", firms get a
 * qualified lead.
 */
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Why this question could not be answered from the corpus. */
    reason: text("reason"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("referrals_question_org_key").on(t.questionId, t.organizationId),
    index("referrals_org_idx").on(t.organizationId),
  ],
);

/** Which domains an organisation practises in — routes referrals. */
export const orgDomains = pgTable(
  "org_domains",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.domainId] })],
);

/** Which domains a person wants to hear about — drives the feed. */
export const userDomains = pgTable(
  "user_domains",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.domainId] })],
);

/* ─────────────────────────────────────────────────────────── moderation ── */

/**
 * Reports exist from day one, and `legal_inaccuracy` is a first-class reason.
 * Wrong law stated confidently is this platform's sharpest harm; the previous
 * build had no table for it at all.
 */
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** 'answer' | 'question' | 'explanation' | 'organization'. */
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    reporterId: uuid("reporter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: reportReason("reason").notNull(),
    detail: text("detail"),
    status: reportStatus("status").notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolution: text("resolution"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reports_subject_idx").on(t.subjectType, t.subjectId),
    index("reports_status_reason_idx").on(t.status, t.reason),
  ],
);

/**
 * Append-only record of consequential actions — verification decisions,
 * moderation outcomes, corpus edits. A legal-information platform should be able
 * to answer "who changed this, and when" about anything it asserts.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_log_subject_idx").on(t.subjectType, t.subjectId),
    index("audit_log_created_idx").on(sql`${t.createdAt} DESC`),
  ],
);
