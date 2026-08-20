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

> **Status, 2026-08-20.** Tooling for 0.1–0.3 is built and tested; the steps
> themselves need a machine with the corpus and a local model on it. 0.4 needs a
> lawyer. See "Phase 0 — what is built" at the end of this document.

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

> **Ordering correction.** 1.4 is written last and has to run first. 1.1 means
> changing the parser against 1,400 documents nobody will read again once loaded,
> and without goldens a fix that recovers five texts can destroy five thousand
> with no evidence either way. Built 2026-08-20 — see "Phase 1 — what is built".

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

---

## Phase 0 — what is built

The four items in Phase 0 all need something this repo cannot reach on its own: a
local model, the 1,400 PDFs, the live site, and a lawyer. What could be built is
the tooling each step runs through, and the checks that stop each one failing
quietly.

### 0.1 — floors are now an artifact, not a constant

`eval:threshold-live` printed its floors for a person to paste into `server.ts`,
next to a second hand-maintained constant recording which corpus they described.
Two numbers, in a different package from the script that derives them, that must
be updated together — and when they aren't, nothing errors. The answers just
quietly get worse.

The evaluation now writes `packages/pipeline/out/score-floors.json`, and the API
reads it. Three consequences:

- **The API refuses to start without it.** Character BM25 always ranks something,
  so an uncalibrated floor means every off-topic question gets a confident
  citation. That is the one failure mode that looks exactly like working
  correctly, so it is fatal rather than defaulted. Verified: exit 1, with the
  command to derive them.
- **Staleness is detected by corpus shape, not size.** `SERVED_STATUSES` and the
  fingerprint live in `@mylo/domain/corpus-fingerprint`, imported by both the API
  and the evaluation so they cannot drift. The fingerprint covers which laws are
  present in which languages with how many texts, because swapping one law for
  another of the same size leaves a count identical and the index completely
  different.
- **The floors file is committed**, so a change to them appears in review as a
  diff rather than as a silent behaviour shift.

### 0.2 — `corpus:triage`, so 1,400 warnings can be read

A bulk run produces one line per document, which nobody reads — and that is how a
corpus quietly ends up half-parsed, because the failures that matter are the ones
that repeat and a scrolling log makes a systematic failure look like noise. The
rotated-page bug is the worked example: per document it reads as one bad parse,
grouped it is a family with one cause and one fix.

`triage.mjs` groups warnings into families, ranks them by frequency, and tags each
with what it costs — `blocks load`, `corrupts text`, `incomplete`, `degrades
retrieval`, `needs a person`. It ends by stating how many warnings fall in
families that stop a document loading at all, because those set the ceiling on
corpus size and should be fixed before anything that only degrades quality.

**This produces the number Phase 0.2 is gated on.** On the three-document sample:
33.3% clean, three blocking warnings, all on the 1962 declaration.

### 0.3 — `status:build`, and why matching is the hard part

The loader already refuses to run without a status source. This builds that
source from a site export — and the fetching is not the risk. A status map that
silently matches nothing looks healthy at every step, and the loader then finds no
entry for any law, falls back to `active`, and reports a large assumed count that
reads as a configuration problem rather than a correctness one.

So field names are discovered by scoring every key across the export rather than
hardcoded (the site's shape is not this repo's contract), law numbers are
normalised on both sides, and the overlap with the parsed manifest is reported as
a number. **Below 50% overlap it refuses to write**, because a low overlap is far
more likely to be a normalisation mismatch than a corpus the national register
genuinely does not hold, and the two are indistinguishable from the counts alone.

One bug worth recording, found by a five-record fixture and invisible in 1,400:
**"Not in force" contains "in force".** Tested in the obvious order, every
repealed law on the site reads as active — the exact outcome the loader's refusal
to guess exists to prevent, defeated one layer above it. Negations are now tested
first, and the ordering is commented as load-bearing.

The export still has to be captured from the site with the same record-and-run
interception that collected the PDFs.

### 0.4 — not an engineering task

Whether a parsed, queryable derivative of the Gazette can be redistributed under a
product is a question for a lawyer. It is cheaper to ask now than after launch.

---

## Phase 1 — what is built

### 1.4 first, because 1.1 is not safe without it

`corpus:golden` records the shape of every parse and diffs it on the next run.
Not the text — a digest per article per language, which locates a change without
committing a copy of the national corpus to git. Changes are reported worst-first
and in reader-facing terms: `lost` before `body` before `heading`, because in a
diff of 1,400 documents the only question that matters first is whether anything
lost text.

Proved by regression rather than asserted: reverting the heading-fonts fix and
re-running reports `texts lost: 1/rw, 1/en, 9/en, 22/rw, 22/en` and `41 article
body/bodies changed`, and exits non-zero. Restoring it returns to clean.

A change is not automatically a bug — a parser fix should change something. The
harness makes the change a claim someone has to read and re-record, instead of a
number in a log nobody diffs.

The PDFs are deliberately not committed, so goldens name documents by filename
and run against whatever corpus directory is passed. This is a regression check
for the parser, not a fixture of the Gazette.

### CI was green and meant nothing

Worth stating plainly: `.github/workflows/ci.yml` builds and tests
`MyLo-Backend` and `MyLo-frontend` — the original codebase `ESSENCE.md` exists to
extract lessons from, still in the tree at 217 tracked files. **Nothing in
`apps/` or `packages/` was covered.** Every commit in this rewrite has passed CI
without CI having looked at it.

There is now a `monorepo` job running typecheck, format check, and tests. Whether
to delete the legacy jobs and the legacy tree is a call for someone who knows
what still depends on them; the comment in the workflow says not to read them as
coverage.

### Unit tests for the parts that have already been wrong

`corpus:golden` is the stronger check and cannot run in CI, because the corpus is
not committed and whether a parsed derivative of the Gazette may be redistributed
is Phase 0.4's open question. So CI covers the pure logic instead — heading
grammar, stream classification, law-number normalisation — which is reachable
without a PDF and is where the guesses live.

Several are regressions for bugs that actually shipped, which is the point:

- **"Not in force" contains "in force".** Matching the positive case first marked
  every repealed law on the register as active.
- **An empty stream is not a language.** Recognising Kinyarwanda by eliminating
  English and French made a blank column classify confidently as Kinyarwanda.
- **A numbered Latin heading does not claim a language.** English and French both
  print `Article 10:` — identical strings — so a parser that guessed would be
  right half the time and confident always.

One design flaw surfaced while writing them: `build-status-map.mjs` ran its CLI
at import, so importing it for its helpers exited the process. A module that
cannot be imported cannot be tested, and it now guards its entry point.

### 1.1 — amendments, and the form they actually take

`corpus:amendments` extracts the provisions by which one law changes another, or
commences itself, and classifies each by whether it can be resolved.

**The plan assumed the wrong problem.** It expected amendments to read "Article
12 of Law N° 66/2018 is amended as follows" — prose, but prose naming a target.
Some do. Neither sampled law does. Both close identically, and it appears to be
the Gazette's standard form:

```
Art 22  All previous legal provisions contrary to this law are hereby abrogated.
Art 23  This law comes into force on the day of publication in the Official Gazette.
```

A blanket repeal names no target. "All provisions contrary to this law" cannot
become an edge in a graph, because resolving it means deciding which provisions
of 1,400 other laws contradict this one — that is legal interpretation, and this
repository should not be doing it. Organic Law 31/2007 goes further: Article 3
substitutes a penalty "in all the legislative texts in force", a corpus-wide edit
of unknown extent.

On the sample: **5 provisions, 3 of them unresolvable, all blanket.**

**The consequence is a product consequence, not a data one.** `supersededById`
will be sparse no matter how good the extraction gets, so "this law is in force"
cannot by itself mean "nothing later has partly undone it". A reader has to be
told that — which makes this a UI requirement in Phase 4, not just a gap in
Phase 1.

Two bugs found while building it, both worth recording because they are the same
shape as each other and as the status-map bug from Phase 0:

- **A law mentioning its own commencement is not commencing.** "Before the
  commencement of this Organic Law" appears in transitional clauses and
  substitutions, and in Kinyarwanda that is "mbere y'uko iri tegeko ngenga
  ritangira gukurikizwa" — the commencement formula verbatim, distinguished only
  by what precedes it. Matching on presence classified a penalty substitution and
  a savings clause as commencement provisions. Commencement patterns are now
  self-referential and reject a match preceded by before/avant/mbere.
- **The script read its own output back in as a law** on the second run, because
  it writes `provisions.json` into the directory it scans.

The recurring lesson across all three: in legal text, the phrase that names a
thing is usually contained inside the phrase that negates, defers, or qualifies
it. Presence is not the signal; context is.

### 1.2 — point-in-time, and a date that was wrong by 54 days

`effective_from` answers "was this law in force on date X". It was being set to
the date in the law's title — the day it was signed — and that is not when a
Rwandan law starts binding anyone.

Law N°02/2007 is "of 20/01/2007" in its own title, appears in "J.O. n° 6 du
15/03/2007", and its Article 23 says it comes into force **on the day of
publication**. The three dates are signing, publication, and commencement, and
the corpus was recording the first as if it were the third. Demonstrated against
the database: "was 02/2007 in force on 1 February 2007?" answered yes, and the
correct answer is no. Wrong in the direction that matters — claiming a law bound
people before it did.

Three changes:

- **The running header is no longer thrown away.** "J.O. n° 6 du 15/03/2007" was
  being filtered as furniture, and the gazette reference then recovered from the
  already-filtered body text — which found a fragment of the title and recorded
  that as the reference. `extractAuto` now returns furniture, and the publication
  date is read from it.
- **`effective_from` is derived from the law's own commencement article**, using
  the Phase 1.1 extractor. On publication, it takes the Gazette date; otherwise
  the date the article states.
- **`published_at` and `effective_from` are separate facts again.** The loader
  was writing one value into both columns.

The golden harness earned its place here twice. It correctly reported the new
warnings on the 1962 declaration as the only change to existing parses. And when
the date fields were added to it, the first attempt silently failed to guard them
— the record side was updated and the compare side was not, because the formatter
had collapsed the field list onto one line and the edit matched nothing. Caught
by deliberately reverting `effective_from` to the signing date and seeing the
harness report `3/3 unchanged`. It now reports
`effectiveFrom: 2007-03-15 -> 2007-01-20` and exits non-zero.

A regression harness that is not itself tested is a source of false confidence.
