# MyLo — the plan

What has to be true for MyLo to be worth trusting, in the order those things
have to become true. Written against the codebase as it stands, not from a blank
page: much of what follows is finishing work that is already half-done, and the
sequence is set by dependency and by risk rather than by what is pleasant to
build.

Two commitments shape every phase and are worth stating before the phases.

**Accuracy is not a feature here, it is the product.** A wrong restaurant
recommendation is annoying. A confidently wrong statement of the law can cost
someone their case, their land, or their liberty. Every phase below has a gate,
and a gate is a thing that must be measured, not a thing that must feel done.

**MyLo explains, organises and prepares. It does not represent.** It shows what
the law says in the language you think in, with the state's own wording attached.
It does not tell you what to argue, predict how a case will go, or stand between
you and a lawyer you should be talking to.

---

## Where it actually stands

Honest inventory, because the plan only makes sense against it.

| Area                                               | State                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Schema (citation, translation, review, moderation) | **Solid.** Structurally prevents an uncited answer                                             |
| Constitution ingestion                             | **Works.** 176 articles, 175 trilingual                                                        |
| General Gazette parser                             | **Works on 3 documents.** Not validated at 1,400                                               |
| Loader                                             | **Works.** Refuses to guess status; skips rather than invents                                  |
| Retrieval (character BM25, local)                  | **Works.** Measured against dense embeddings and chosen deliberately                           |
| "I don't know" floor                               | **Stale.** Derived against 527 texts, now serving 69                                           |
| Status filtering                                   | **Works.** Repealed and draft excluded from the index                                          |
| Explanations                                       | **Nothing approved.** Pipeline exists, no reviewer                                             |
| Question bank                                      | **525 drafts waiting.** English measured worth +36 recall@1; Kinyarwanda unusable as generated |
| Case law                                           | **Nothing.** No schema, no parser                                                              |
| Verification, moderation, referrals                | **Schema only.** No workflow, no interface                                                     |

The pattern in the original build was that everything requiring a judgement was
left as a stub. The pattern to avoid repeating is leaving everything requiring a
_person_ as a stub — Kinyarwanda review and practitioner verification are both in
that category, and neither is an engineering problem.

---

## Phase 0 — Close what is open

Small, unglamorous, and blocking. Nothing downstream is measurable until these
are done.

**0.1 Re-derive the score floors.** They are a property of the corpus, tokeniser
and BM25 parameters together, and the ones in `server.ts` were derived against
the Constitution alone. The boot warning and `/health.floorsStale` make this
visible; they do not fix it. Needs `eval:threshold-live` with a local model.
_Gate: `floorsStale: false`._

**0.2 Bulk-run the parser over the full corpus and read the warnings.** Three
documents proved the approach generalises past the Constitution. It did not prove
it survives 1,400 documents spanning six decades of typesetting. Run it, sort the
manifest by warning type, and fix by _family_ rather than by document — the
rotated-page bug affected every page of one law and would have affected every law
typeset that decade.
_Gate: a warning histogram, and a stated number for how many documents parse
clean. Not "it works" — a number._

**0.3 Get status from the source.** amategeko.gov.rw separates 1,411 laws in
force from 658 not in force. Nothing in the PDFs says which, and the loader
refuses to guess. Scrape that split into the status map the loader already
accepts.
_Gate: zero laws loaded under `--assume-active`._

**0.4 Decide the corpus licence question.** The Gazette is public; that is not the
same as clearance to redistribute a derived, parsed, queryable copy of it under a
product. This is a question for a lawyer, not a developer, and it is cheaper to
ask now than after launch.

---

## Phase 1 — A corpus that can be trusted

**1.1 Amendment and repeal relationships.** `supersededById` exists and is
unpopulated. Binary in-force/not-in-force is the floor, not the goal: a reader
needs to know that the article they are reading was amended in 2019 and by what.
This is also the hardest data problem in the project, because amendment
relationships are stated in prose inside the amending law ("Article 12 of Law
N° 66/2018 is amended as follows") and are not structured anywhere.
_Gate: a measured extraction rate on a hand-checked sample, and an honest
statement of what fraction is unresolved._

**1.2 Point-in-time queries.** The organising rule already says "at a specific
point in time," and `effectiveFrom` / `repealedAt` are in the schema. Nothing
uses them. A dispute from 2021 is governed by the law as it stood in 2021.

**1.3 Domain classification.** `domains` exists and is unused. Needed for
filtering, for routing referrals to firms that practise in the area, and — see
2.2 — possibly for retrieval itself.

**1.4 A corpus regression harness.** Freeze the parse of a few dozen
representative documents as golden files. Any parser change is then checked
against them. Without this, the heading-fonts fix that recovered five texts could
just as easily have silently destroyed five thousand across the full corpus, and
nobody would have known.
_Gate: exists and runs in CI._

---

## Phase 2 — Retrieval that finds the right article

This is where accuracy is won or lost, and the current numbers are honest about
being incomplete.

**2.1 Scale is a real, unaddressed problem.** The served index today is 69 texts.
The Constitution alone was 527. The full corpus is roughly 1,400 laws averaging
tens of articles across three languages — on the order of 150,000 texts, some 300
times the largest index ever measured. `buildIndexes()` loads every row in one
query at boot and holds one in-memory BM25 index per language. That is a
reasonable design for 527 rows and an open question at 150,000, in memory, in
boot time, and in retrieval quality: BM25 behaves differently when the corpus is
300× larger and far more topically diverse. **Every recall number in
`docs/ARCHITECTURE.md` was measured on the Constitution and none of them transfer
automatically.**
_Gate: re-run `eval:sparse`, `eval:bank-lift` and `eval:threshold-live` on the
full corpus. Treat the results as new findings, not confirmations._

**2.2 Two-stage retrieval, if the numbers demand it.** Searching 150,000 articles
flat may not be viable. The likely shape is law-level or domain-level narrowing
first, article-level ranking second. Do not build this on speculation — build it
if and only if 2.1 shows flat retrieval degrading.

**2.3 The vocabulary gap — the known, named failure.** "Do I have the right to a
fair trial?" still misses, because the Constitution words it as due process and
the banked questions ask it a third way. Character n-grams have no notion that
the two name the same right, and nothing lexical does. The architecture doc
already reaches the conclusion: a curated synonym layer over legal terms of art —
small, auditable, and local. Dense embeddings would also solve it and were
rejected because they send the reader's question off the machine, which is a
privacy decision this project has already made and should not quietly reverse.
_Gate: a measured lift on a set of term-of-art queries, of which "fair trial" is
one._

**2.4 Approve the English and French question bank.** Measured: +36.4 recall@1 in
English, +14.7 recall@5 in French. This is the largest single improvement
available and it is waiting on a reviewer, not on code.

**2.5 Do not approve the generated Kinyarwanda bank.** Measured at +0.0 / −1.6 —
it buys nothing and costs a little, because the phrasings are produced by
translating English questions with a small model and they are poor. Kinyarwanda
needs questions written by a Kinyarwanda speaker. Until then the language keeps
its index on official text alone, which is already the strongest of the three.

**2.6 Settle the Kinyarwanda morphology question.** Stems+chars beat chars by 4.7
points at rank 1, on ten disagreements, p = 0.11. The direction is right and the
evidence is not sufficient. Roughly two dozen more disagreements at the same
ratio would settle it — which means this is blocked on 2.7, not on more code.

**2.7 Collect real questions from real people.** This is named in the
architecture doc as the weakest link in every number in it, and it is. Every
recall figure rests on questions written by a model about an article it had just
read — best-case queries, guaranteed answerable, in one register. Real questions
are vague, compound, and often about things the corpus does not address.
_Gate: a held-out set of real questions, from people who are not building this._

---

## Phase 3 — Clarity: saying what the law means

The retrieval half is "which article." This half is "what does it say," and it is
the product's headline promise.

**3.1 Recruit a Kinyarwanda legal reviewer.** Not a nice-to-have and not
deferrable. The evaluation already measured that small models corrupt Kinyarwanda
legal wording, and the first review export confirmed it — one generated question
was close to nonsense. The rule the architecture settled on is that a person is
responsible for every Kinyarwanda word a reader sees. That rule has no
implementation until someone is doing it. **This is the single most likely
project-level failure: everything else here can be built alone, and this cannot.**

**3.2 Build the review interface.** The mechanism exists as
`review:export` / `review:import` over a Markdown file — deliberately, so it can
be handed to a lawyer who does not use a terminal. That is the right primitive
and it is not yet a workflow anyone outside the repo can use.

**3.3 Ship explanations behind the gate.** Generated, marked as generated,
withheld until approved, shown alongside the verbatim official text and never
instead of it. `explanations.reviewStatus` already enforces this.

**3.4 Confidence, honestly.** The vision document asks for high/medium/requires-
review. The truthful version of that is not a model's self-reported confidence —
it is retrieval score against the measured floor, plus whether an explanation has
been human-approved, plus whether the law's coverage is partial. All three are
already in the data.

---

## Phase 4 — The reader's surface

**4.1 Show what the reader needs to judge the answer.** Law status, coverage,
whether the text is official or a translation, when the law took effect. All in
the schema; the interface is what turns it into something a person can act on.

**4.2 Make the boundary visible.** Explain, organise, prepare. The interface
should make it obvious that MyLo is not representing anyone — not as a disclaimer
nobody reads, but in how answers are framed.

**4.3 Referral when the corpus cannot answer.** `referrals` exists precisely
because "I don't know" should hand off rather than trail away. This is also the
business model — the gap in the assistant is the opportunity, not something to
paper over.

**4.4 Case preparation.** The founding case was someone who needed to understand
what was about to happen to her in court. Helping a person organise their
questions, their documents, and their timeline before they see whatever help they
can get is closer to that need than any amount of retrieval polish. Deliberately
placed after the corpus is trustworthy, because it is worthless on top of an
untrustworthy one.

---

## Phase 5 — Case law

Separate schema and separate parser, and genuinely new scope.

Judgments are structured differently from statutes — court, case number, bench,
date, a legal-principle headnote, facts, holding — and, unlike laws, they are
**not uniformly trilingual**: sampled decisions include pure-English and
pure-Kinyarwanda judgments, so language must be detected per document.

The harder question is not parsing but citation semantics. A statute says what
the law is. A judgment says what a court held, on particular facts, at a
particular level of the hierarchy — and a High Court decision that was later
overturned is exactly the kind of thing that must never be served as settled law.
The `status` / `supersededBy` thinking that laws needed has a direct analogue
here, and it is more subtle.

---

## Phase 6 — Trust infrastructure

**6.1 Verification.** The four-role model rests on it and `verifications` is a
state machine with an expiry that nothing drives. The open question is not
technical: verified by whom, against which register — the Rwanda Bar Association? —
and re-checked how often. A badge nobody re-checks is worse than no badge,
because people rely on it.

**6.2 Moderation.** `reports` exists with `legal_inaccuracy` as a reason,
correctly identifying that confidently-stated wrong law is the sharpest harm the
platform can do. Needs a queue, an owner, and a response time.

**6.3 Audit.** `auditLog` exists. For a legal tool, "what did MyLo show this
person, on what date, from which version of the corpus" is a question that will
eventually be asked seriously.

---

## What could sink this, ranked

1. **No Kinyarwanda legal reviewer.** The language most readers need is the one
   where generation is measurably unsafe and no automated path exists. Everything
   else here is solvable alone.
2. **Amendment relationships prove unextractable at scale.** Then MyLo can say a
   law is in force but not reliably what it currently says — a much weaker
   product, and one that has to be honest about being weaker.
3. **Retrieval quality does not survive 300× corpus growth.** Possible, and
   currently unmeasured. Phase 2.1 exists to find out early rather than late.
4. **Parser coverage stalls in the long tail.** Older Gazette issues, scans
   without text layers, instruments that are not article-structured at all — the
   1962 declaration is already an example.
5. **Regulatory pushback.** Less likely for a tool that explains rather than
   advises, which is one more reason the boundary is worth holding.

---

## The acceptance test

Unchanged from `ESSENCE.md`, and still the right one. Three questions an ordinary
person cannot currently answer about their own legal system:

1. What law just changed, and does it affect me?
2. Which law protects me?
3. Which law punishes me if I get this wrong?

If MyLo answers all three, with citations, in Kinyarwanda, it has succeeded
regardless of what it is built from. Note that question 1 requires Phase 1.1 —
amendment tracking — which is the phase most likely to be quietly skipped.
