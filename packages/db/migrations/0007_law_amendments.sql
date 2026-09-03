-- Which law amends which, and which articles it touches.
--
-- Deliberately not `laws.superseded_by_id`. Amending and superseding are
-- different acts and collapsing them would lose the difference: a law that
-- amends articles 3 and 4 of another leaves the rest of it standing and in
-- force, while superseding replaces it. Recording an amendment as supersession
-- would take a law that still binds people and mark it dead.
--
-- Populated from two sources of different strength, kept apart rather than
-- merged. A title states the law's declared purpose — "AMENDING LAW N° X" — and
-- is the stronger claim. A recital only records that the drafters looked at
-- something, and nearly every instrument recites the Constitution, so reading
-- recitals as amendments would have the whole corpus amending it.
CREATE TYPE "public"."amendment_source" AS ENUM('title', 'recital');--> statement-breakpoint

CREATE TABLE "law_amendments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "amending_law_id" uuid NOT NULL,
  -- Text, not a foreign key, for the reason case citations are: a law amends
  -- whatever it amends, including laws the corpus does not yet hold. A foreign
  -- key would force dropping real amendments to satisfy referential integrity,
  -- which is the database preferring its own tidiness to the record.
  "amended_law_number" text NOT NULL,
  -- Null when the amendment names a law but no specific article.
  "article_number" text,
  "source" "amendment_source" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "law_amendments_unique"
    UNIQUE("amending_law_id","amended_law_number","article_number")
);--> statement-breakpoint

ALTER TABLE "law_amendments" ADD CONSTRAINT "law_amendments_amending_law_id_laws_id_fk"
  FOREIGN KEY ("amending_law_id") REFERENCES "public"."laws"("id") ON DELETE cascade;--> statement-breakpoint

-- "What amends this law?" is the question a reader has, so it gets the index.
CREATE INDEX "law_amendments_target_idx"
  ON "law_amendments" ("amended_law_number","article_number");
