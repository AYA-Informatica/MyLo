-- What MyLo was asked and could not answer, when the reader asks it to remember.
--
-- Declining is the right behaviour and it is currently a dead end. The notice
-- says "you may wish to ask a verified law firm" and offers no way to reach one,
-- which is the least useful thing to say to the person this exists for: someone
-- facing a court process precisely because they cannot afford a lawyer.
--
-- Two things come out of recording the gap. It is the queue a verified firm
-- would answer from once firms exist. And before that, it is the only honest
-- measure of what people need that the corpus does not cover — which is the
-- argument for which law to ingest next, and is worth more than a guess about
-- which laws matter.
--
-- ## Why this may hold a question when answer_audit may not
--
-- `answer_audit` deliberately stores no question text, on the grounds that a
-- question put to MyLo is somebody's legal problem. That reasoning is unchanged
-- and this is not an exception to it.
--
-- The difference is the act, not the data. The audit records every answer
-- without asking, as a property of the system running. This records one question
-- because the reader asked MyLo to carry it forward on their behalf — a
-- disclosure they chose, for a purpose they wanted, which is a different thing
-- from ambient logging of everyone.
--
-- So the rules here are the ones consent implies rather than the ones storage
-- allows:
--
--   * nothing is written unless the reader explicitly asks;
--   * it is private by default — `questions.is_public` defaults to true and that
--     default is wrong for a legal problem, so this table does not use it;
--   * it can be deleted by the person who created it, which is why the handle
--     below exists and why it is the only way to reach the row;
--   * and it expires, because a gap in the corpus stops being useful long before
--     a record of someone's legal trouble stops being sensitive.
CREATE TABLE "unanswered" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  -- The question, as asked. Stored only because the reader asked for it to be.
  "body" text NOT NULL,
  "language" "language" NOT NULL,

  -- What MyLo held when it could not answer. The same fields the audit keeps,
  -- so a gap can be told apart from a stale floor after the fact: a question
  -- that failed under a miscalibrated threshold is not evidence of a missing
  -- law.
  "corpus_fingerprint" text NOT NULL,
  "served_texts" integer NOT NULL,
  "score_floor" real NOT NULL,
  "floors_stale" boolean NOT NULL,
  "top_score" real,

  -- The reader's own handle on this row. Not a user id: there are no accounts,
  -- and requiring one to report a gap would exclude exactly the people this is
  -- for. Random, given to the reader once, and the only way to delete the row.
  "handle" text NOT NULL,

  -- Private unless the reader says otherwise. The opposite of questions.is_public.
  "is_public" boolean DEFAULT false NOT NULL,

  -- Deleted after this date whether or not anyone acts on it.
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,

  CONSTRAINT "unanswered_handle_unique" UNIQUE("handle")
);--> statement-breakpoint

CREATE INDEX "unanswered_created_idx" ON "unanswered" ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "unanswered_open_idx" ON "unanswered" ("expires_at") WHERE "resolved_at" IS NULL;
