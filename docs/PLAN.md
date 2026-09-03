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

**0.2a Segment Gazette issues into instruments — built 2026-09-03.** A
Gazette issue is a compilation: its `Ibirimo` index is lettered because one PDF
routinely carries several instruments. `gazette.mjs` takes the first law number
it finds and assigns every article to it, which against a real issue merges
unrelated instruments into one law without warning. The 2007 files that shaped
the parser came from amategeko, which splits issues; MINIJUST does not. See
docs/SOURCES.md.

**0.2 Bulk-run the parser over the full corpus and read the warnings.** Three
documents proved the approach generalises past the Constitution. It did not prove
it survives 1,400 documents spanning six decades of typesetting. Run it, sort the
manifest by warning type, and fix by _family_ rather than by document — the
rotated-page bug affected every page of one law and would have affected every law
typeset that decade.
_Gate: a warning histogram, and a stated number for how many documents parse
clean. Not "it works" — a number._

> **Sources investigated 2026-08-20.** RLRC and MINIJUST hold authoritative
> answers to 0.3, 1.3 and 2.3, on plain-HTML sites rather than amategeko's SPA.
> See [`docs/SOURCES.md`](SOURCES.md).

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

---

## Phase 2 — what is built

### 2.3 — the vocabulary gap, closed and measured

`docs/ARCHITECTURE.md` named one failure it could not fix: someone asks about a
"fair trial", the Constitution says "due process of law", and character n-grams
find nothing because the two phrases share no substring worth indexing. The gap
is not spelling — a right has a common name and a legal name, and only the legal
one is printed in the Gazette.

`@mylo/domain/synonyms` is a curated list of exactly that: everyday phrasing
against legal phrasing, per language, per concept. `eval:vocabulary` measures it
against the retriever the API actually serves, imported rather than
reimplemented.

```
              recall@1
  baseline       25%
  expanded      100%      (8 term-of-art queries)
```

Wired into `/api/v1/ask`. End to end, "do I have the right to a fair trial" now
returns Article 29, _Right to due process of law_, as its first citation.

**A hand-written list rather than embeddings**, for the reason the project
already settled: dense retrieval would also close this, and measured better in
English, but it needs a model resident when the question is asked — a GPU on the
server, or the reader's question travelling to someone else's. Reaching for it
here would quietly reverse a privacy decision to fix something a few dozen
curated lines also fix. The list is also auditable in a way a vector space is
not: every entry is a claim that two phrases name the same legal concept, and a
Rwandan lawyer can read it and disagree.

### Four things this got wrong first

- **The ground truth was wrong twice.** "Search my house" was pointed at Article
  25 and "locked up" at Article 24 — which are _homeland and nationality_ and
  _right to seek asylum_. Two apparent retrieval misses were the test being
  wrong. Hand-written expectations need checking against the corpus exactly as
  much as generated ones, and an unverified ground truth makes a retriever look
  broken in whichever direction its author already expected.
- **"Expansion can only help" is false, and this file claimed it.** A French
  query ranked the right article at #19 before expansion and _missed entirely_
  after, because the group contained "garanties judiciaires" — plausible, and
  absent from the corpus. Under BM25 every added term competes for weight, so a
  phrasing that does not occur is not neutral, it is noise. The Constitution's
  French heading is "garantie de justice".
- **The same in Kinyarwanda.** The guessed phrasing "kuburanishwa neza" appears
  nowhere; the Constitution says "ubutabera buboneye". Expansion moved that query
  from #10 to #8 while the guess stood, and to #1 once the real phrase was used.
- **The staleness check did not cover this at all.** Query expansion changes
  every score without changing a single article, so the corpus fingerprint stayed
  identical and the floors would have gone on reporting fresh. That is the exact
  failure the mechanism exists to prevent, reintroduced one level up. The
  fingerprint now covers retrieval configuration — n-gram size and the synonym
  groups themselves — and both the API and `eval:threshold-live` compute it from
  the same shared function.

### What this does not establish

Eight queries is not a validation set, and the same person wrote both the queries
and the synonym list. That is close enough to tuning on the test set to be worth
saying out loud. What it establishes is that the gap is real, that it is
closeable locally without sending questions anywhere, and roughly what the shape
of the fix is. Phase 2.7 — real questions from people who are not building this —
is what would make the number mean something.

**The Kinyarwanda entries remain the weak point, and the reason is instructive.**
The two halves of a synonym group are not equally verifiable: the legal name can
be checked against the Gazette by anyone, and the everyday name cannot be checked
against anything except a speaker. Every Kinyarwanda phrasing here that describes
how a _person would ask_ is a guess, marked NEEDS REVIEW. This is Phase 3.1
arriving early, in a place nobody expected it.

---

## Phase 3/4 — what the reader can see

### The reader could not judge the answer

Two gaps, both the same shape: MyLo knew something that changed how much weight
an answer could bear, and did not pass it on.

**`score` was exposed with nothing to compare it against.** Whether 45 is a
strong match or a marginal one depends entirely on the floor, so a client
rendering a confidence indicator was inventing the scale. Citations now carry
`scoreFloor` beside `score` — the number below which MyLo would have declined
to answer at all.

**`effective_from` never reached the reader.** Phase 1.2 made the date correct
in the database and stopped there. A reader asking whether a law applied to
something that happened to them needs it, and it is not the date printed in the
law's title.

### `limitations`, and why the Constitution does not get one

`AskResponse` now carries a closed set of caveats derived from the citations
actually served, so they cannot drift from what was sent:

- `unresolved_repeals` — a later law may have repealed part of this one without
  saying so
- `partial_law` — MyLo holds only part of it, and the articles that qualify this
  one may be among the missing
- `unofficial_translation` — this wording is MyLo's, not the state's
- `unreviewed_explanation` — no person has checked the plain-language version

`unresolved_repeals` is the Phase 1.1 finding finally reaching a reader. The
Gazette's standard closing formula repeals "all previous legal provisions
contrary to this law" and names none, so for any ordinary law **"in force" means
"not itself repealed" and cannot mean "nothing later has partly undone it"**.

It is deliberately not applied to the Constitution, which is revised by a
procedure it sets out itself rather than swept aside by a later law's closing
article. Claiming the caveat there would be false caution — and a caveat that
appears on every answer is one readers stop reading, which costs more than it
buys.

Verified end to end: a Constitution answer returns `limitations: []`; an answer
citing Law N°02/2007 returns `["unresolved_repeals"]` with
`effectiveFrom: 2007-03-15`, `score: 105.6`, `scoreFloor: 32`.

One bug on the way: the column was added to the direct-article query and not to
the one the index is built from, so every `/ask` citation reported a null
effective date while the database held the right value. Two queries select the
same shape and only one was edited — the same class of near-miss as the golden
harness updating its record side but not its compare side.

### The caveat had to reach the screen

Adding `limitations` to the API moved the gap rather than closing it: a field
nothing renders is a field nobody reads.

Three changes in `apps/web`:

- **`unresolved_repeals` is rendered**, once per answer, after the citations.
  Deliberately not per citation. `partial_law` and `unofficial_translation` are
  already shown against the specific article they qualify, which is the better
  place — a caveat attached to the text it describes gets read, and one collected
  in a list at the bottom does not. `unresolved_repeals` cannot be placed that
  way because it is not a fact about any article; it is a statement about what
  MyLo cannot determine from the corpus at all.
- **`effectiveFrom` appears in the source line.** For Law N°02/2007 that is 54
  days after the date printed in its own title.
- **The interface stopped calling the corpus "the Constitution."** The tagline
  and the disclaimer both did, in all three languages — accurate while one law
  was loaded, and a false description the moment it was not. The same wording bug
  the API notices had, still live in the UI two phases after it was fixed on the
  server.

The Kinyarwanda for the new caveat is marked NEEDS REVIEW along with everything
else in that file. It states a limit of the corpus, so getting it wrong misleads
about what MyLo knows rather than merely reading awkwardly.

---

## Where the bottleneck actually is now

Nine commits sit on a branch, verified against a two-law corpus and the
Constitution, on a machine that is not the one this will run on. Everything
downstream of Phase 0.2 rests on that: the synonym layer was measured on the
Constitution against eight queries one person wrote, the score floors describe an
index of 527 texts, and the parser has met three documents out of roughly 1,400.

The next genuinely informative thing is not another feature. It is running
`corpus:gazette` over the real corpus and reading `corpus:triage`, because that
single number — how many of 1,400 documents parse clean — determines whether the
rest of this plan is built on sand.

---

## Hardening pass

No new features. A review for defects that do not need the corpus to find, plus
robustness against the documents the three-file sample never contained.

### Five real bugs

**A 1962 law became a 2062 law.** Two-digit years were assumed twenty-first
century, so "N° 5/62" normalised to `5/2062` — and only on one side of the
pipeline, because the parser left two-digit years alone while the status map
converted them. Rwanda's corpus starts at independence. Two components
disagreeing about a key do not error; they never match, and the symptom would
have been a status map that covered nothing.

There is now one definition of a law number, in `@mylo/domain/law-number`, used
by the parser, the status map and the amendment extractor. The century comes
from the document's own four-digit promulgation year where it has one, so
nothing is guessed when the document says; the pivot is the fallback and is a
named constant with a note that it needs revisiting by 2030.

**Consolidating on one pattern then broke the thing it fixed.** The shared
pattern required the "N°" marker, so a number this pipeline had already
canonicalised no longer normalised to itself, and the status map's coverage check
silently read 0/0 while both sides held the same laws. Normalising is now
idempotent and tested as such. There are two patterns: lenient for a field known
to hold a law number, strict for scanning prose — where a bare "5/2007" is far
more often a date than a citation.

**A global regex was being shared across calls.** `CITED_LAW_PATTERN` carries
`lastIndex`, so reusing the exported object would have skipped matches in every
article after the first.

**Coverage of 0/0 was treated as a failed match** and blocked writing a
perfectly good status map when the parser simply had not been run.

**Sidecars were being read as laws, for the third time.** The output directory
holds a manifest and a provisions report alongside the parses, and consumers glob
it. Twice the fix was to add a filename to an ignore list in one place, and twice
it failed to generalise — the next tool to write a sidecar did not know to update
every reader. Parses now carry `kind: "gazette-parse"`, so identification is
opt-in by the thing being identified rather than opt-out by everything else.

### Robustness against documents the sample did not contain

Tested directly rather than assumed: empty files, non-PDF bytes, truncated PDFs
and an image-only scan.

Corrupt files were already handled — the run reports them and continues. The scan
was not. It produced **eight** warnings at once (no articles, no number, no
instrument, no dates, unclassified columns) and none of them named the actual
problem, which is that no parser can read a scan. In a 1,400-document run that is
the most likely bulk failure and it would have been scattered across every
family.

A document with no text layer now reports one warning — `no text layer —
scanned, needs OCR` — and `corpus:triage` gives it its own severity and its own
line, plus a **parser success rate that excludes scans**. Counting them as parser
failures would understate the parser and hide the fact that the fix is OCR rather
than code.

### The pattern worth naming

Five of the last several bugs are one shape: **two code paths that must agree,
where only one was changed.** The golden harness updating its record side and not
its compare side. `effective_from` added to one of two identical SELECTs. The
parser and the status map disagreeing about years. Two directory readers, one
taught about sidecars. Where possible these have been fixed by removing the pair
— one shared definition, one discriminator — rather than by editing the second
copy, because editing the second copy is what failed the previous three times.

### What this pass could not do

It found defects in logic. It could not touch the assumptions, which is where the
larger risk is: whether the parser survives 1,400 documents, whether retrieval
holds at 300x the corpus, whether a synonym list tuned on the Constitution helps
with land law. Those fall to data, and the code being clean does not make them
more likely to be true.

---

## Phase 5 — case law

84 judgments parsed, 73 distinct cases loaded, with a citation graph.

### Judgments are the opposite of the Gazette

Laws are three parallel columns and every law carries all three languages.
Judgments are **single-column and one language per document** — and the same
judgment is published as separate files per language. One case number in this
corpus has a Kinyarwanda version and two English ones, which is why `case_texts`
is keyed on `(case_id, language)` exactly as `law_texts` is, and why 84 files
became 73 cases and 77 texts rather than 84 of anything.

### What they add that laws did not: a citation graph that is actually stated

Every judgment ends its headnote with what it relied on, by number:

```
Statutes and statutory instruments referred to:
  Law n0 22/2018 of 29/04/2018 ..., article 158 and 260.
Case laws referred to:
  RS/INJUST/RC 00024/2018/CS decided on 21/02/2020, involving ...
```

That is the opposite of Phase 1.1's blanket repeals, which named nothing and
could not be resolved at all. Across the corpus: **217 statute links and 104
precedent links**, with Law N°22/2018 — the civil, commercial, labour and
administrative procedure code — relied on by 28 of 73 judgments.

Only 3 of 91 precedent citations point at judgments MyLo holds. That is expected
and is why `cited_case_number` is text rather than a foreign key: a court cites
the precedents it relied on, not the subset a corpus happens to contain, and a
foreign key would force dropping real citations to satisfy referential
integrity.

### Getting there: 62 → 73 → 80 of 84

Each step was a defect the documents revealed rather than one reasoning found.

**Word-level items joined without spaces.** pdfjs emits judgments as separate
word items, so joining them directly produced `Incamakey'ikibazo:` and every
Kinyarwanda section marker stopped matching. The Gazette parser has always
inserted spaces from x-gaps; **writing a second reader without it reproduced a
solved bug in a new file** — the same shape as every paired-code-path failure in
this project, arriving this time as a copy that was never made.

**Section markers without colons.** One judgment writes `Held 1. The prescription
of...`, the marker running straight into a numbered holding. Requiring a colon
dropped its holding entirely. Markers are now matched as leading phrases.

**Registry typos, everywhere.** `Nzeri` for Nzeli (September), `Ugushyungo` and
`Uguhyingo` for Ugushyingo (November), `y'kibazo` and `y'icyibazo` for
`y'ikibazo`, and `statutory nstruments` for instruments — that last one silently
produced an _empty statute list_ rather than an error. These are listed
explicitly rather than fuzzy-matched, because a fuzzy month matcher that is wrong
files a judgment under the wrong month silently, and a missing month is visible.

**The citation list ran to the end of the document.** This was the worst of them.
Citation lists sit at the end of the headnote and are followed immediately by the
full judgment, which discusses many case numbers that were never cited as
authority. One judgment reported **ten** cited precedents where it had listed
four, the extras being procedural references from its own history. A wrong edge
in a precedent graph is worse than a missing one: it asserts a court relied on a
decision it merely mentioned. Lists now end where the citations stop.

Corpus-wide citation counts _fell_ from 175/274 to 128/104 when this was fixed.
The lower numbers are the correct ones.

### What is deliberately not populated

`cases.overturned_by_id` exists and is null for every row. No judgment in the
corpus states that it was overturned; that could only be established from a later
judgment saying so. It is present because the absence has to be representable —
and because **a reader must never be told a case is good law on the strength of
MyLo not knowing otherwise.** This is the same reasoning that made the law loader
refuse to guess `status`, reached from the opposite direction: there, a register
existed and had to be consulted; here, none exists and the silence has to be
carried through to the reader.

Two judgments name a court in their header that disagrees with the court encoded
in their case number. Loaded using the case number, since the registry assigns
it, and both are reported by name for a person to look at rather than silently
resolved.

### One index or two — measured, and the answer is "not yet either"

`eval:mixed-index` builds both configurations against the real corpus and asks
what each costs. Three findings, in increasing order of consequence.

**Mixing does not damage statute retrieval.** This was the main worry and it is
answered: **7/7 statute questions still answer at rank 1** with 77 judgments in
the index, none displaced. The 15× length disparity — articles average 478
characters, judgments 7,048 — is handled by BM25's length normalisation better
than expected. Judgments were reachable too, and one case question actually
improved from #2 to #1 in the mixed index.

So the intuition that started this ("long documents will swamp short ones") was
wrong, and would have led to the right decision for the wrong reason.

**One floor cannot serve both.** The "I don't know" threshold is a single
constant per language compared against a raw BM25 score. Measured against the
same noise set the floors were derived from, judgments put noise _lower_ than
articles do — 0.70× in English, 0.62× in Kinyarwanda — so an article-derived
floor sits too high for case law. The cost is concrete: **two of three correct
case answers score below it** (21.9 and 18.3 against floors of 32 and 36). That
is not a ranking problem. It is MyLo declining to answer a question it can
answer, with a judgment it holds.

**Case retrieval is not good enough to ship, and a floor cannot fix it.** The
correct case answers score _below the noise ceiling of their own corpus_ — 21.9
against 22.0 in English, 18.3 against 26.5 in Kinyarwanda. A threshold cannot
separate two distributions that overlap. Whatever number is chosen, it either
rejects real judgments or admits irrelevant ones, and admitting them means
citing a judgment confidently at the same score a question about banana bread
reaches.

Sectioning the judgments — indexing holding and facts separately rather than one
7,000-character document — was the obvious hypothesis, since statutes come
pre-chunked by the legislature and judgments do not. It is not the fix: English
improved marginally (21.9 → 27.0 against a noise ceiling that also rose to 25.5)
and Kinyarwanda got worse (#6 → #13).

**Decision: keep case law out of the served index for now.** Store it, parse it,
build the citation graph from it — all of that is done and is useful on its own.
Do not retrieve from it until it can be told apart from noise. Wiring it up today
would mean shipping citations to judgments at scores indistinguishable from
irrelevance, which is precisely the failure the floor exists to prevent, and it
would be invisible to a reader because a wrong citation looks exactly like a
right one.

**What would settle it**: real case-law questions from people who are not
building this (Phase 2.7), and a proper threshold derivation for case law of the
kind `eval:threshold-live` does for statutes. Three hand-written queries are
enough to show a problem and not enough to solve one. There is also a reason to
be careful beyond the numbers: a holding is not the law, and a reader shown one
in the same list as a statute may reasonably read it as one.

---

## 0.2a — segmenting a Gazette issue

`issue.mjs` splits an issue into its instruments before any article parsing
happens. `parseIssue` returns one parse per instrument; `parseInstrument` remains
for a single document and is what the golden harness uses, so the goldens assert
that a one-instrument file still comes out exactly as before.

**The naive signal is wrong, and wrong in the mirror-image way.** "A law number
appears, so a new instrument starts" fails because every law's recitals cite the
laws it was made under or amends — `Isubiye ku Itegeko Ngenga n°007/2018.OL ryo
ku wa 08/09/2018`. Those carry an instrument keyword and a law number and are not
boundaries. Segmenting on them cuts an instrument apart at its own preamble,
which is harder to notice than the merge it was meant to fix.

The Gazette separates them typographically: a title block is set in capitals, a
recital is not. Segmentation requires all three of an instrument keyword, a law
number, and title casing — any two of those occur in recitals. The
`Ibirimo` index is then used as a check rather than as the basis: it is
authoritative about _what_ an issue holds and silent about where, so it answers
"did we find them all", which is the question that matters, because a missed
instrument is absorbed into its predecessor rather than lost visibly.

A repeated title is also not a boundary. The Gazette prints each title twice,
once above the instrument's own `ISHAKIRO` and again above its body, so a
boundary is only recorded where the law number _changes_.

### The bug segmentation found on the way

Testing it against a realistic issue surfaced something larger than the thing
being fixed: **orders are not numbered by year at all.**

Laws and organic laws are `serial/year`. Presidential and ministerial orders are
`serial/category`, where the second component identifies the issuing authority:

```
Presidential Order n° 472/06  of 6 October 1979
Presidential Order n° 56/01   of 4 October 2010
Presidential Order n° 10/01   of 05/06/2004
```

`472/06` is from 1979 and `56/01` from 2010. Reading the second component as a
year invents a date **and merges every order sharing a category code onto one
key** — and orders are the most numerous instrument in the Gazette, so this is
not an edge case. `normaliseLawNumber` now takes the instrument kind and
preserves the component verbatim for orders. Laws are unaffected: a two-digit
component there really is a year, and the document's own date resolves its
century.

This is the second key-collision bug found in two days by pointing the code at
real documents, after `.OL`. Both were invisible against the amategeko extracts
the parser was built from, and both would have corrupted `law_number` — the key
everything else hangs off.

### What is still not proven

**Update, same day.** The fixture is now a real PDF — `fixtures/gazette-issue-2099.pdf`,
generated by `make-issue.py`, committed, and parsed end to end in CI. It found
four bugs on its first run that the line-based tests could not reach, including
a `\b` that cannot close after an accented letter and so made every French
`ARRÊTÉ` invisible. See docs/LIMITATIONS.md.

What remains unproven is narrower: the fixture is a model of an issue, not a
specimen of one. The fixture encodes the trilingual
dot-leader index, lettered sections, doubled titles, recital citations and
restarting article numbers — but a fixture is a model of a document, and the
first real issue will find something it does not model.

That check belongs in the bulk run: `instrumentsInIssue` is now in the manifest,
and `corpus:triage` will show whether the segmenter is finding one instrument per
file everywhere, which for MINIJUST would itself be the warning sign.

---

## Phase 2.1 — does retrieval survive the corpus it is going to get

`eval:scale` builds the real retriever over corpora of increasing size and
measures what happens. It cannot say what recall will be on real Rwandan law —
that needs the corpus and real questions — but it answers the part that is a
property of the retriever rather than of the law, and that part was failing.

Documents are synthesised from the vocabulary and length distribution of the
real texts loaded. Scores, timings and score distributions scale with document
count, length and term frequency, and all of those are preserved; whether
article 29 answers a question about a fair trial is not, and is not asked.

### The answer was no, on all three counts

Measured, then extrapolated to ~150,000 texts (1,400 laws x 3 languages):

```
     docs   build     mem    query      -> extrapolated to 150,000
      500    169ms    15MB    8.9ms
    40000   7427ms   672MB  177.8ms        ~28s boot, ~2.5GB, ~667ms/query
```

A reader waiting two-thirds of a second per language, on a server holding two
and a half gigabytes of Maps per language, rebuilt over half a minute on every
restart, is not a deployable system. The plan said to build two-stage retrieval
"if and only if 2.1 shows flat retrieval degrading". It does.

### The cause was structural, and cheaper to fix than to work around

`search` walked **every** document on every query. Despite computing document
frequencies, there was no inverted index: a query scored all N documents and
discarded the zeros. Memory went the same way — one Map per document, so
per-Map overhead multiplied by document count.

Transposing to one term-to-documents map fixes both:

```
     docs    query            memory
    40000    177.8 -> 31.2ms  672 -> 340MB     (5.7x faster, 2x smaller)
             ~667  -> ~117ms  ~2.5 -> ~1.3GB   extrapolated to 150,000
```

**Nothing about ranking changed**, which is the part that had to be true. Across
all four corpus sizes the on-topic and noise top scores are identical before and
after — 62.4/14.2, 59.3/14.4, 69.3/21.8, 78.0/22.7 — because the arithmetic is
untouched and only the traversal differs. A test now pins the exact score of a
fixed query against a fixed corpus, since a performance change that moves scores
would silently re-tune the floor those scores are compared against.

### What this does not fix

~117ms per query and ~1.3GB per language is workable and is not comfortable. Two
things remain, and both are now measurable rather than speculative:

- **Boot still rebuilds the whole index.** ~21s extrapolated, on every restart,
  before the API serves anything. A persisted index would remove it.
- **The noise ceiling rises with corpus size.** Measured: 14.2 at 500 documents,
  22.7 at 40,000. The floor is a fixed absolute number derived at 527. As the
  corpus grows, noise climbs toward it, and past some size a fixed floor stops
  separating and starts admitting. That is a stronger statement than "the floors
  are stale": it suggests **an absolute floor may be the wrong mechanism**, and
  that the threshold should be relative to the corpus or to the score
  distribution of the query itself. `eval:threshold-live` should be re-run at
  full corpus size before that is decided, but the trend is already visible.
