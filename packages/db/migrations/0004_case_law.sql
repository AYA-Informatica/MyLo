-- Case law.
--
-- Judgments are not laws, and the schema says so rather than reusing the law
-- tables with a flag. A statute states what the law is. A judgment states what
-- a court held, on particular facts, at a particular level of a hierarchy —
-- and a decision later overturned is exactly the thing that must never be
-- served as settled law.
CREATE TYPE "public"."court" AS ENUM(
  'supreme_court',
  'court_of_appeal',
  'high_court',
  'commercial_court',
  'intermediate_court',
  'primary_court'
);--> statement-breakpoint

CREATE TABLE "cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  -- As the registry assigns it: "RS/INJUST/RCOM 00006/2023/SC". Canonicalised,
  -- because the corpus contains "RS/ INJUST/RC 00004/2019/SC" with a stray
  -- space, and two spellings of one judgment become two nodes in a precedent
  -- graph that nothing links to.
  "case_number" text NOT NULL,
  "court" "court" NOT NULL,
  -- The bench as printed. Deliberately not split into individual judges: names
  -- recur across judgments with inconsistent spelling, and a wrong split
  -- invents a judge who did not sit.
  "bench" text,
  "decided_at" timestamp with time zone,
  -- Some judgments print a day and a month and no year. That is a gap in the
  -- source, and the year is not inferred from the case number — a case filed in
  -- 2022 is routinely decided in 2023, so inferring puts a confident wrong date
  -- on a judgment.
  "date_incomplete" boolean DEFAULT false NOT NULL,
  -- Whether a later decision overturned this one. Nothing populates it: no
  -- judgment in the corpus states that it was overturned, and it could only be
  -- established from a later judgment that says so. Present because the absence
  -- has to be representable, and because a reader must never be told a case is
  -- good law on the strength of MyLo not knowing otherwise.
  "overturned_by_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "cases_case_number_unique" UNIQUE("case_number")
);--> statement-breakpoint

-- One row per language, exactly as law_texts. The same judgment is published as
-- separate documents per language: one case number in this corpus has a
-- Kinyarwanda version and two English ones.
CREATE TABLE "case_texts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "case_id" uuid NOT NULL,
  "language" "language" NOT NULL,
  -- The party line, as the law report prints it: "BIMENYIMANA v NDERERIMANA".
  "title" text,
  -- The headnote's statement of the legal principle. This is the part a reader
  -- searching for "what does the law say about X" actually wants.
  "principle" text,
  "facts" text,
  "held" text,
  -- True for the court's own words. A judgment MyLo translated would be false,
  -- and would have to pass review before a reader saw it.
  "is_official" boolean DEFAULT true NOT NULL,
  "review_status" "review_status" DEFAULT 'approved' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "case_texts_case_id_language_unique" UNIQUE("case_id","language")
);--> statement-breakpoint

-- Which statute a judgment relied on, and which articles of it.
--
-- law_number is text rather than a foreign key on purpose. A judgment cites
-- whatever law it relied on, including laws MyLo does not hold — the corpus is
-- being loaded in pieces and always will be incomplete somewhere. A foreign key
-- would force dropping real citations to satisfy referential integrity, which
-- is the database preferring its own tidiness to the record.
CREATE TABLE "case_statute_citations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "case_id" uuid NOT NULL,
  "law_number" text NOT NULL,
  "article_number" text,
  CONSTRAINT "case_statute_citations_unique"
    UNIQUE("case_id","law_number","article_number")
);--> statement-breakpoint

-- Which earlier judgment a judgment relied on.
--
-- cited_case_number is text for the same reason: a court cites the precedents
-- it relied on, not the subset MyLo happens to hold.
CREATE TABLE "case_precedents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "citing_case_id" uuid NOT NULL,
  "cited_case_number" text NOT NULL,
  CONSTRAINT "case_precedents_unique" UNIQUE("citing_case_id","cited_case_number")
);--> statement-breakpoint

ALTER TABLE "case_texts" ADD CONSTRAINT "case_texts_case_id_cases_id_fk"
  FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "case_statute_citations" ADD CONSTRAINT "case_statute_citations_case_id_cases_id_fk"
  FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "case_precedents" ADD CONSTRAINT "case_precedents_citing_case_id_cases_id_fk"
  FOREIGN KEY ("citing_case_id") REFERENCES "public"."cases"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_overturned_by_id_cases_id_fk"
  FOREIGN KEY ("overturned_by_id") REFERENCES "public"."cases"("id") ON DELETE set null;--> statement-breakpoint

CREATE INDEX "cases_court_decided_idx" ON "cases" ("court","decided_at");--> statement-breakpoint
CREATE INDEX "case_statute_citations_law_idx" ON "case_statute_citations" ("law_number","article_number");--> statement-breakpoint
CREATE INDEX "case_precedents_cited_idx" ON "case_precedents" ("cited_case_number");
