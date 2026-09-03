-- What MyLo answered, and on what basis.
--
-- The vision document asks an audit trail to answer three questions: what did
-- the system see, what did it conclude, and why. This records all three — and
-- deliberately does not record who asked.
--
-- **No question text.** A question put to MyLo is someone's legal problem:
-- being prosecuted, losing land, an employer withholding pay. The retrieval
-- design already refuses to send such a question off the machine. Writing it to
-- a table that outlives the session, and that an administrator can read, is the
-- same disclosure with a slower fuse.
--
-- **And no hash of it either.** The obvious compromise — store a salted digest
-- so identical questions can be grouped — does not survive contact with the
-- input space. Legal questions are short and drawn from a small vocabulary, so
-- an attacker with the salt can enumerate candidate questions and match them.
-- A hash of a low-entropy input is not an anonymisation, it is a lookup key
-- waiting for a dictionary.
--
-- What remains is enough to audit the system without surveilling the person:
-- which corpus was loaded, which floors were in force, what was cited and at
-- what score. If someone reports that MyLo answered wrongly, this reconstructs
-- whether the answer was correct *given what MyLo held that day*. It cannot
-- reconstruct who asked, which is the point.
CREATE TABLE "answer_audit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  "language" "language" NOT NULL,
  -- 'shortlist' or 'none'. Declining is as much a decision as answering, and a
  -- rise in 'none' is the first sign that a floor has drifted or the corpus has
  -- shrunk.
  "kind" text NOT NULL,

  -- The state of the machine at the moment of the answer. Without these an
  -- audit entry says what was served and not whether serving it was right: the
  -- same query against a different corpus, or under a floor derived elsewhere,
  -- is a different system giving the same output.
  "corpus_fingerprint" text NOT NULL,
  "retrieval_config" text NOT NULL,
  "served_texts" integer NOT NULL,
  "score_floor" real NOT NULL,
  -- True when the floors did not describe the index they were applied to. An
  -- answer served under a stale floor is not necessarily wrong, but it was not
  -- served under a threshold anyone had calibrated, and that must be visible
  -- afterwards rather than inferred.
  "floors_stale" boolean NOT NULL,

  -- What was cited, as law number and article, with the score each earned.
  -- Structured rather than prose so a later question — "did we ever cite a
  -- repealed article" — is a query and not a reading exercise.
  "citations" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "top_score" real,
  -- The caveats the reader was shown. Part of the answer, so part of the record.
  "limitations" jsonb NOT NULL DEFAULT '[]'::jsonb,

  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX "answer_audit_created_idx" ON "answer_audit" ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "answer_audit_kind_idx" ON "answer_audit" ("kind","language");--> statement-breakpoint
-- Answers served while the floors were stale are the ones most worth finding
-- later, so they get their own path rather than a scan.
CREATE INDEX "answer_audit_stale_idx" ON "answer_audit" ("floors_stale") WHERE "floors_stale";
