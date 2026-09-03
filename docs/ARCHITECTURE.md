# MyLo — architecture of the rebuild

Companion to [ESSENCE.md](ESSENCE.md), which says what MyLo is for and what the
first attempt got right and wrong. This says how the rebuild is put together, and
why each choice was made rather than the obvious alternative.

Decisions are recorded with their reasoning because the reasoning is what stays
useful when the choice is revisited.

---

## The organising principle

Everything below follows from one rule:

> **No legal claim without a citation to a specific article, in a specific
> language, at a specific point in time.**

The first attempt failed because its retrieval corpus was a pile of unattributed
PDF chunks with no link to the structured Gazette — so the assistant could not
cite a law, because it did not know which law it was reading. This time the
schema makes an uncited answer impossible to represent.

That single constraint decides most of what follows.

---

## Choices

### Monorepo with npm workspaces

```
apps/
  api/        HTTP surface
  web/        Browser client
packages/
  domain/     Zod schemas + inferred types — the shared contract
  db/         Drizzle schema, migrations, queries
brand/        Logo sources and render script
docs/
```

The first attempt kept two disconnected projects, so the wire format was
described twice — once in the API and once by hand in the client — and the two
drifted. `packages/domain` makes the contract a single artifact that both sides
import. A payload change becomes a type error in the client rather than a
production surprise.

Workspaces were _deliberately avoided_ in the previous repo because hoisting can
break native modules. That objection is now moot: `bcrypt` and `pm2` are both
gone (see below), and nothing left in the tree compiles native code.

### Drizzle, not Sequelize

The retrieval layer lives or dies on vector queries. Under Sequelize every one of
them was a hand-written SQL string with manually formatted vector literals and no
type checking at all:

```ts
// the old code — a template string, and the shape of the result was a lie
`SELECT id, content, embedding <#> $1::vector AS distance FROM documents ...`;
```

Drizzle is SQL-first, so those queries stay legible, but they are typed and
composable, and pgvector is first-class. Migrations are generated from the schema
rather than hand-written and kept in sync by discipline.

The old migrations also could not be rolled back — `db:migrate:undo:all` failed on
a foreign-key ordering problem — which is what happens when migrations are
hand-maintained.

### Fastify, not Express

Schema-first validation, so the Zod contract in `packages/domain` is enforced at
the edge instead of re-implemented per route. Express 5 also gave `req.params` a
`string | string[]` type that the old codebase fought at every controller.

### Zod as the single source of truth

One definition per concept, used for runtime validation on the server, inferred
types on both sides, and form validation in the client. The old stack had Joi on
the server and hand-written TypeScript interfaces in the browser describing the
same payloads.

### `node:crypto` scrypt, not bcrypt

Password hashing moves to `scrypt` from Node's standard library. It is a memory-
hard KDF, it is in the platform, and it removes the last native compile from the
tree — which is what makes workspaces safe and CI fast. `bcrypt` also locked
`node_modules` on Windows and broke `npm ci` mid-run.

### No pm2, no Redis at the start

pm2 was a process manager wrapped around a single server, configured with a
hardcoded absolute container path. A container runtime already supervises
processes.

Redis backed sessions and an email queue. Auth is stateless JWT, and there is no
job worth queueing yet. Redis returns when something actually needs it, not
before.

### React + Vite kept; TanStack Query instead of RTK Query

The client stack was the healthiest part of the original and is worth keeping.
RTK Query is replaced because most of its endpoint boilerplate existed to
re-declare types that `packages/domain` now owns.

### Postgres + pgvector kept

Correct choice, already in place, already proven. Keeping the corpus and its
embeddings in one database is what allows a retrieval result to join straight back
to its article, its law, and that law's current status — in one query, honestly.

---

## What the schema has to solve

The first build deferred four decisions every time they came up. The schema
answers all four structurally, so they cannot be deferred again.

### 1. Citation

Chunks hang off articles, not files. `article_chunks.article_id` is `NOT NULL`, so
a retrieved chunk always resolves to _law + article + language_. An answer records
its citations in `answer_citations`; an answer with none is not a legal answer and
the API will not serve it as one.

### 2. Translation

A law is separated from its text. `laws` holds what is language-independent —
number, origin, domain, status, dates. `law_texts` and `article_texts` hold the
words, one row per language, each marked official or a translation, each carrying
its provenance and review state.

This is what lets the system say _these three rows are the same law_, which a
per-row `language` enum could never express. It matters because a mistranslated
legal text is a harm, not a typo, so a translation must be attributable.

Kinyarwanda is listed first in the language enum, deliberately. It is the language
most people who need MyLo actually read.

### 3. Verification

`verifications` is a state machine with an expiry, naming the register a claim was
checked against and who checked it. A badge nobody re-checks is worse than no
badge, because people rely on it.

### 4. Moderation

`reports` exists from the start, and `legal_inaccuracy` is one of its reasons.
Wrong law stated confidently by a plausible human is the platform's sharpest harm,
and the first build had no table for it at all.

---

## What is deliberately not carried over

**The web-search fallback.** When retrieval found nothing, the old service queried
DuckDuckGo and handed the abstract to the model as legal context, so a question
about someone's arrest could be answered from an unattributed web snippet in the
same shape as a grounded answer.

The correct behaviour when the corpus cannot answer is to say so and offer the
question to a verified firm — which is the referral mechanism the four-role model
already implies. `referrals` exists for exactly this. The gap in the assistant is
the business opportunity, not something to paper over.

**Unreviewed AI text presented as authoritative.** `explanations` carries a review
status. A generated plain-language summary is a draft until a human approves it.

---

## Still open

These are product decisions, not technical ones, and the schema is shaped to
accept any answer rather than to presume one:

- **Where the corpus comes from.** Partly answered — see "Beyond the
  Constitution" below. `packages/corpus/src/gazette.mjs` parses arbitrary Gazette
  instruments rather than one hand-written document, which is what the rest of
  this line used to say was missing. What is still open is loading them: the
  loader is Constitution-shaped, and nothing yet writes a parsed ordinary law
  into `laws` / `articles`.
- **Who verifies practitioners**, against which register, and how often.
- **Whether an official Kinyarwanda text exists** for a given law, or whether MyLo
  is producing the first one — which carries very different responsibility.

---

## What the vertical slice measured

The first end-to-end path — a question typed in Kinyarwanda, answered with cited
articles — is built: `packages/domain` holds the Zod contract, `apps/api` serves
retrieval over the loaded Constitution, `apps/web` is the reading surface.
Building it settled three questions that speculation had not.

**Corpus quality dominates retriever choice, by a wide margin.** The Gazette sets
article headings in a narrow column, so a heading longer than the column wraps —
and the parser was keeping only its first line, filing the remainder at the front
of the body. Fifteen Kinyarwanda headings were stored truncated. Repairing that in
`extract-columns.mjs`, using the fact that the Gazette sets headings in a
different typeface from bodies, moved Kinyarwanda retrieval from 41.7% to 75.2%
recall@1. No retriever code changed. Every hour spent tuning k1 and b would have
been an hour not spent reading the corpus it was tuning against.

The corollary is a standing rule: before tuning a model, read what it is being fed.

**"I don't know" has to be engineered, and its threshold measured.** Character
BM25 always ranks something. Asked how to bake banana bread, the API happily
returned three articles of the Constitution — the top one scoring 6.0, but
scoring. The `none` branch existed in the code and was unreachable in practice,
which made the honesty promise decorative.

`npm run eval:threshold` derives the score floor from two measured distributions:
real questions against fluent off-topic ones, in all three languages. Two
scale-free alternatives were tried and both lost to a raw floor; the script still
measures them so the next person does not retry them. The floor now rejects all
off-topic questions while keeping 97% of the hardest real ones, and it is
re-derived whenever the corpus, tokeniser or BM25 parameters change — because it
is a property of all three together, not a constant.

**Privacy costs about five points of recall@5, and is worth it.** Dense
embeddings beat character BM25 in English (87.6% vs 72.1% recall@1) and French.
They also require an embedding model resident at query time — a GPU on the
server, or the reader's question sent to someone else's. A question about your
own rights is not a neutral thing to send away. At recall@5, where the shortlist
the API actually returns is decided, the gap narrows to under five points in
every language. MyLo keeps the local retriever.

## Known gaps in the slice

- **Lexical retrieval cannot bridge vocabulary it does not share.** "Do I have the
  right to a fair trial?" misses, because the Constitution words it as due
  process. This is the case the question bank was built for — matching a question
  against generated questions rather than against legal prose — and that
  hypothesis is still untested.
- **No explanations are approved yet**, so every citation currently shows official
  text alone. The review workflow exists in the schema and has no interface.
- **A hand-typed smoke-test fixture** (law `N° 32/2016`, one English article) is
  still in the development database. It is not sourced from the Gazette and
  should be deleted before any real use.

---

## The question bank, measured

The bank was designed on an assumption stated in its own comments and never
tested: that matching a question to a _question_ is easier than matching it to
legal prose. `npm run eval:question-index` tests it. Two different models read
each article independently — one writes the questions that go into the bank, the
other writes the question used as the query — so the bank cannot win by
recognising its own register.

Over 100 articles, English, recall@1 / recall@5:

```
  baseline (prose)      29.0 / 50.0     what production does today
  question bank         52.0 / 77.0     bank replaces prose
  augmented             60.0 / 80.0     bank appended to prose
  fused (RRF)           48.0 / 73.0
```

**The assumption was right about the effect and wrong about the mechanism.**
Replacing prose with the bank is not the way to use it — the winner is
`augmented`, where each article's indexed text is its official wording _plus_ its
generated questions. Prose keeps everything it already matched; the questions add
the reader's vocabulary on top. That roughly doubles accuracy, and it is the
largest single improvement available to this system.

An earlier version of this evaluation used one model for both roles and held out
one of its three questions. It reported the bank _losing_ at rank 1. The model
had written three questions about three different facets of the article rather
than three phrasings of one, so a held-out question rarely resembled its
siblings. Splitting the models fixed the protocol, not the bank.

**What this does not measure.** Both models still read the same article, so every
query is answerable and concerns exactly the text indexed. A real reader's
question may be vague, compound, or about something the Constitution never
addresses. These are best-case numbers, and both models are from one family;
questions from real people should replace them.

The practical consequence: a generated question is an index key, never an
assertion, so it carries far less risk than a generated explanation. A clumsy
question degrades matching; it cannot state the law incorrectly, because it
states nothing. That is why the bank can be model-written while explanations
cannot.

---

## Review, and what the first review found

`npm run review:export` writes every draft item to a Markdown file with the
article it came from; `review:import` reads the decisions back. Nothing is
applied on export, so an abandoned review changes nothing, and an unrecognised
decision fails the whole file rather than silently reading as "skip" — a typo
must never quietly mean "leave it unpublished" to a reviewer who believes they
approved it.

A file rather than a terminal prompt, because there are several hundred items,
they are judged in batches against their source article, and a reviewer answering
one prompt at a time starts pressing approve. A file can be searched, corrected,
diffed, handed to a lawyer who does not use a terminal, and it leaves an artefact
of what was decided.

**The first export justified the gate immediately.** The English questions are
good — "Where does the power to run things come from?" against article 1 is
exactly the vocabulary bridge the bank exists to build, and approving it made
that query retrieve article 1 at a score of 116. The Kinyarwanda phrasings of the
same questions are not good. One is a mangled restatement of the article with a
question mark appended; another is close to nonsense. This is the same failure
the translation evaluation measured before any of this was built: small models
corrupt Kinyarwanda legal wording, and grounding the prompt in the official text
reduces it without fixing it.

That reading has since been measured, and it was right.

### What the bank is worth, per language

`npm run eval:bank-lift -w @mylo/pipeline` measures the bank in the database
rather than the idea of one: the real phrasings, in all three languages, against
queries written by a different and smaller model directly from each article, so a
query is never a paraphrase of a banked question. Over 129 articles, recall@1 /
recall@5:

```
         prose only     + bank        lift
  rw    58.1 / 79.8   58.1 / 78.3   +0.0 / -1.6
  en    26.4 / 46.5   62.8 / 89.1   +36.4 / +42.6
  fr    43.4 / 67.4   49.6 / 82.2   +6.2 / +14.7
```

**English is transformed and Kinyarwanda is not helped at all.** Two things
compound in Kinyarwanda. Character n-grams already suit an agglutinative
language, so prose-only retrieval there is the strongest of the three and there
is simply less headroom — 58.1% against English's 26.4%. And the banked
Kinyarwanda phrasings are poor, because they are produced by translating an
English question into Kinyarwanda with a small model. The slight negative at
recall@5 is the honest shape of that: a bad question is not a neutral row, it is
noise competing for rank.

The mirror image explains English. Legal English is the furthest from how English
speakers actually ask things, so prose alone is weakest there and the bridge is
worth most.

Three consequences, none of them optional:

- **Approve English.** +36 points at rank 1 and +43 at rank 5 is the largest
  improvement available anywhere in this system.
- **Approve French on the strength of recall@5.** +6.2 at rank 1 is modest, but
  +14.7 at rank 5 is not, and the shortlist is what a reader actually sees.
- **Do not approve Kinyarwanda as generated.** It buys nothing and costs a
  little. Those questions need a Kinyarwanda speaker or a stronger model. Until
  then the language keeps its index on official text alone — which is exactly
  what unreviewed drafts already produce, so the safe state is the default state.

This is why review is per item rather than per batch, and why the earlier
English-only number should not have been trusted to transfer. It did not.

The generated English questions being useful and the generated Kinyarwanda ones
being unusable is not a surprise to be worked around. It is the same finding that
shaped the whole architecture, showing up in a new place: the model navigates,
and a person is responsible for every Kinyarwanda word a reader sees.

### What the bank did not fix

The case that motivated it. "Do I have the right to a fair trial?" still returns
articles about clean environment, national culture and freedom of association.

Article 29 is the answer and is titled "Right to due process of law". Its banked
questions are "If I'm accused of something, what rights do I have?" and "Can I be
punished for something that wasn't a crime when I did it?". The query matches
neither the article's vocabulary nor the bank's, because it uses a third one: a
legal term of art the reader picked up somewhere else. The bank was built to
bridge citizen language to drafter language, and "fair trial" belongs to neither.

Character n-grams have no notion that "fair trial" and "due process" name the
same right. Nothing lexical does. The options are a curated synonym layer over
legal terms of art — small, auditable, and it stays local — or dense embeddings,
which were rejected for sending the reader's question off the machine. The
synonym layer is the one that fits this system.

Worth stating plainly because the aggregate number is good and could paper over
it: +36 points recall@1 in English is real and this specific failure is also
real, and "Can the police search my house without permission?" now correctly
returns article 23 on privacy, which it did not before. A measurement that
improves the average does not repair every case, and the motivating example is
the one most likely to be assumed fixed.

---

## Kinyarwanda morphology: promising, unproven, not shipped

`Material for understanding Kinyarwanda/` holds four documents. Assessed honestly:
the "Rwandan Dictionary" is a 2006 blog post with reader comments, written in
ad-hoc phonetic spelling ("OoRahShahKeeKee?" for _Urashaka iki?_) that cannot
even be string-matched against the Gazette's orthography; the phrase list and the
alphabet notes are correct but tiny and contain no legal vocabulary. None of them
can train anything — fine-tuning needs orders of magnitude more text, and the
register is tourist and trainee, not law.

The 223-page Peace Corps trainee grammar is different, and not for its
vocabulary. It documents the morphology: sixteen noun classes working in
singular/plural pairs, nouns as `augment + nominal prefix + root` (u-mu-ganga,
a-ba-ntu), verbs as `verbal prefix + root + final vowel` (ba-vur-a, du-sukur-a).

That is precisely the structure character n-grams have been exploiting by
accident. So `rw-morphology.mjs` does it deliberately — a rule-based stemmer with
no lexicon, which collapses 8 of 10 singular/plural pairs to a shared root. The
two it misses need phonology rules cannot see: `urwego` against `inzego`, where a
nasal turns `rw` into `nz`.

`npm run eval:tokenizer -w @mylo/pipeline`, on the live index and the same
citizen-style questions used everywhere else:

```
  chars(4)         58.1 / 78.3      what production indexes today
  words            52.7 / 76.0      -5.4 / -2.3
  stems            55.0 / 79.1      -3.1 / +0.8
  stems + chars    62.8 / 79.8      +4.7 / +1.6
```

**It is not shipped, because +4.7 points is not yet a result.** The tokenisers
answer identical queries, so the meaningful evidence is the disagreements:
stems+chars alone correct on 8, chars alone correct on 2, ten in total. A
two-sided exact binomial gives p = 0.11. Comparing the two percentages as if they
were independent samples would have made this look far more convincing than it
is.

The direction is right and the ratio is 4:1. Roughly two dozen more disagreements
at that ratio would settle it. So this is an argument for collecting real
questions from real people, which is the weakest link in every number in this
document — not an argument for shipping Kinyarwanda-only code that somebody has
to keep correct forever on the strength of six extra correct answers.

Stemming alone loses at rank 1 and wins slightly at rank 5, which fits: it
generalises well enough to pull the right article into a shortlist and throws
away the surface detail that decides first place. Both together is the shape that
works, if anything does.

---

## Beyond the Constitution: parsing the rest of the Gazette

`constitution.mjs` reads one document. The corpus is roughly 1,400 laws, and
amategeko.gov.rw separates them into **1,411 in force and 658 not in force** —
which is worth stating because `laws.status` was designed expecting that
distinction to be inferred, and it turns out the source publishes it.

`gazette.mjs` parses any instrument, sharing its article grammar with the
Constitution through `articles.mjs` so the two cannot drift. Three things had to
change to go from one document to many, and each was found by running the parser
against real Gazette PDFs rather than by reasoning about them.

**Pages are not all the same way up.** Law N°02/2007 has `/Rotate 90` on every
page; the Constitution has none. Read from the raw text transform, a rotated
page's columns run along y and its lines along x, so splitting on x cuts across
the lines instead of between the columns. Nothing throws. The output is three
streams of shuffled words that still parse as text and still classify as
languages, and the first sign of trouble is an article that reads like nonsense
in a language it is not. Items are now converted through the page viewport, which
carries the rotation, so every page looks the same to everything downstream.

**Not every instrument is trilingual.** The Gazette also carries treaties filed
in English and presidential declarations from 1962 filed in French. Splitting one
of those into three columns shreds each line into thirds and files the pieces as
three languages. So the column count is decided by outcome rather than geometry:
split both ways, keep whichever produces streams that are coherent, distinct
languages. Geometric detection was tried first and does not work — the gutters
run about 10pt on a 792pt page, narrower than paragraph indentation, and the
title block spans all three columns anyway, so a coverage histogram shows one
uninterrupted band.

**Language is assigned by content, never by column order.** `constitution.mjs`
maps position straight to language, and its own comments record that the Gazette
does not keep English and French in a fixed order — it carried a
`detectLatinLanguage` helper for exactly this and never called it. On the
Constitution the assumption holds: 352 texts, none mislabelled, checked. But it
is an assumption made 1,400 more times on documents nobody has read, and a swap
serves an article labelled as a language it is not. `classifyStream` scores each
stream against all three languages and the caller names it from that.

### What it does, measured

Against three real documents — an ordinary law, an organic law, and a French-only
1962 declaration:

```
  02/2007   23 articles   en/fr/rw   complete    no warnings
  31/2007   10 articles   en/fr/rw   complete    no warnings
  1962       0 articles   fr         partial     not a numbered instrument
```

Law number, promulgation date, instrument type and origin are read out of the
title block in all three languages, and the columns agreeing on the number is
used as a free consistency check — disagreement is recorded, not resolved,
because a document whose columns disagree about its own number is exactly the
kind of thing a person should look at.

The 1962 declaration produces nothing and says so. That is correct: it has no
numbered articles, and a parser that invented some would be worse than one that
declines.

**The table-of-contents floor is now 10 characters, not 40.** Ordinary laws have
far shorter articles than the Constitution, and 40 silently discarded four real
articles per language from Law N°02/2007. Going this low is only safe because the
contents page is printed before the law and a later entry overwrites an earlier
one, so a genuine article always beats its own listing.

### Loading, and the two things the loader refuses to do

`load-gazette.mjs` writes any parse into `laws` / `law_texts` / `articles` /
`article_texts`, taking every field from the parse rather than from constants in
the script. It was run against a real Postgres with the real migrations, not
reasoned about: 2 laws, 33 articles, 99 official texts, trilingual and aligned.

**It refuses to guess status.** `laws.status` defaults to `active`, and the
schema comment on it says why that matters. Since amategeko.gov.rw holds 658 laws
that are not in force and nothing inside the PDFs says which, the loader will not
run at all without either a status map or an explicit `--assume-active`, and it
prints the count of laws it assumed about at the end. The default was the danger,
so the default is now refusal.

**It will not load a fragment as if it were whole.** `coverage` comes from the
parse. It also skips rather than invents: a document with no law number cannot be
keyed and one with no articles has nothing citable, which is what the 1962
declaration is, and it is skipped by name with the reason.

One transaction per law rather than per batch, so a bulk run over 1,400
documents does not lose 1,399 good loads to the last bad one.

### Two bugs the end-to-end run found

Neither was visible from reading the parse output, which is the argument for
loading into a real database rather than eyeballing JSON.

**Stale parses were loadable as real laws.** Output files are named after the law
number the parse found, so a parser fix that changes what it finds leaves the old
file behind under the old name. The loader reads the directory, so a superseded
parse was offered up beside the corrected one. `gazette.mjs` now clears its
output directory at the start of a run.

**Body text was being stored as article headings, and shown as titles.** The
Constitution sets headings in a distinguishable face and `absorbContinuation`
depends on it to find where a wrapped heading ends. Law N°02/2007 sets _every_
line of its Kinyarwanda and English columns in a heading face, so the test "is
this line entirely in heading fonts?" is true of the whole document and
absorption ran off the end of the heading into the article. The reader would have
seen the first line of the law's text presented as its title.

The heading-face share is now measured — the Constitution sits near 0.14, the two
broken columns at 1.00, the working one at 0.24 — and above 0.5 the signal is
refused rather than used, with `headings not separable in rw/en` recorded against
the document. An article with no heading is honest; an article whose heading is a
fragment of its own body is not. Refusing also recovered five texts that
absorption had been consuming.

### What this does not yet do

- **Three documents is not a validation.** Two parsed clean, which shows the
  approach generalises past the Constitution. It does not show it survives 1,400
  documents spanning six decades of typesetting. The manifest and per-document
  `warnings` exist to make a bulk run auditable — the next real step is to run it
  across the whole corpus and read the warnings, not to trust the sample.
- **`status` is not populated.** The source publishes in-force/not-in-force and
  the parser does not read it, because it is site metadata rather than something
  printed in the PDF.
- **Case law is untouched.** Court decisions have a different structure —
  court, case number, bench, a legal-principle headnote, facts, holding — and
  they are not uniformly trilingual the way laws are: sampled decisions include
  pure-English and pure-Kinyarwanda judgments. That is a separate schema and a
  separate parser, and neither exists.

---

## What a multi-law corpus broke in the API

Loading a second law made three things wrong that had been correct, and none of
them would have thrown. They are recorded together because they share a shape:
each was a reasonable simplification while the Constitution _was_ the corpus, and
each became a wrong answer the moment it was not.

**Article numbers do not identify anything on their own.** The article route
matched on `article_number` alone with `LIMIT 1`. "Article 3" exists in every
law, so the reader was shown whichever row the planner returned first, cited
confidently under the wrong instrument. The route is now
`/api/v1/laws/:lawNumber/articles/:articleNumber`, and `articleParamsSchema`
requires the law number rather than defaulting it — a route that can silently
answer about the wrong law should not typecheck.

**Repealed law was competing for rank.** `l.status` was selected and passed to
the client, but nothing filtered on it, so a repealed article could be retrieved
and cited beside live law. Only `active` and `amended` are indexed now — an
amended law still binds, as amended. The filter is at index build rather than on
the results, because a repealed article left in the index still shifts every IDF
weight, and because leaving it to the client to display correctly makes the UI
the last line of defence against citing dead law. Direct article lookup still
returns it, with its status: asking for a specific article of a specific law is a
different act from asking what the law is.

**MyLo was telling readers "the Constitution does not answer this"** about laws
it was holding. The notices named the Constitution because for one document that
was the same as naming the corpus. They now name the corpus.

### Making a stale score floor fail loudly

The floors are a property of the corpus, the tokeniser and the BM25 parameters
together, and the ones in `server.ts` were derived against the Constitution
alone. Adding laws shifts every IDF weight, so they are now stale — and the
documented failure mode is that a miscalibrated floor "does not fail loudly. It
quietly answers questions it should decline."

So it fails loudly now. The index size the floors were derived against is
recorded beside them, checked at boot, and logged as a warning on every start
until both are updated together. `/health` reports it too, alongside a `served`
count that is deliberately distinct from `texts`: what is stored and what a
reader can reach are no longer the same number, and a health check reporting only
table counts would say the corpus is fine while every question about a repealed
law correctly returns nothing.

Observed on the test corpus: `texts: 99, served: 69, floorsDerivedAgainst: 527,
floorsStale: true`.

**The floors have not been re-derived, and must be.** `eval:threshold-live`
needs a local model to generate its signal questions, and its cache is keyed on a
corpus fingerprint that the new laws invalidate. Until it is re-run, the warning
is accurate: MyLo may answer questions it should decline, and — visible in the
same test run — decline ones it should answer. A question about the rights of
disabled war veterans returned `none` against a loaded law that addresses exactly
that, because an English floor of 32 was derived against an index of 527 texts
and is being applied to one of 69.

---

## Retrieval: an inverted index, arrived at by measurement

The retriever was written as one term-map per document, scored by walking all of
them on every query. That is a reasonable shape for the Constitution, which is
527 texts, and it was never anything else until the corpus it is meant to hold
was measured.

`eval:scale` builds the real retriever over corpora of increasing size.
Documents are synthesised from the vocabulary and length distribution of the real
texts loaded — enough for questions about how BM25 responds to size, not enough
for questions about meaning, and none are asked. At 40,000 documents: 178ms per
query, 672MB, 7.4s to build, extrapolating to roughly 667ms, 2.5GB per language
and a 28s rebuild on every boot at the ~150,000 texts the full corpus implies.

The cause was structural rather than a matter of tuning. Despite computing
document frequencies, there was no inverted index: every query scored all N
documents and discarded the zeros. Memory followed the same shape — one Map per
document, so per-Map overhead multiplied by document count.

Transposing to a single term-to-documents map, with flat `[doc, freq]` pairs
rather than an object per posting, gives 31ms and 340MB at 40,000 — about 117ms
and 1.3GB extrapolated.

**Ranking is unchanged, and that was the requirement.** The arithmetic is
untouched and only the traversal differs, which is why the on-topic and noise top
scores are identical before and after at every corpus size measured. A test pins
the exact score of a fixed query against a fixed corpus, because a performance
change that quietly moved scores would re-tune the floor those scores are
compared against.

### The finding underneath the finding

The noise ceiling **rises with corpus size**: 14.2 at 500 documents, 22.7 at
40,000, against an English floor of 32 derived at 527. As the corpus grows, noise
climbs toward the floor, and past some size a fixed absolute number stops
separating and starts admitting.

That is a stronger statement than "the floors are stale". It suggests **an
absolute floor may be the wrong mechanism**, and that the threshold should be
relative to the corpus or to the score distribution of the query itself.
`eval:threshold-live` at full corpus size should settle it before anything is
redesigned, but the trend is already measurable.

---

## Case law

Judgments are the structural opposite of the Gazette: single-column, one language
per document, and the same judgment published as separate files per language.
They are stored, parsed and graphed — 84 documents into 73 cases, 217 statute
links and 104 precedent links — and **not served**.

That is a measurement, not a deferral. `eval:mixed-index` found that mixing them
into the statute index does not damage statute retrieval (7/7 questions still
answer at rank 1), but that correct case answers score _below the noise ceiling
of their own corpus_ — 21.9 against 22.0 in English, 18.3 against 26.5 in
Kinyarwanda. A threshold cannot separate two distributions that overlap, so no
floor makes case-law retrieval safe. Sectioning judgments by holding and facts,
the obvious hypothesis, helped English marginally and made Kinyarwanda worse.

The citation graph is useful without retrieval: it answers which statutes a court
relied on, which is the opposite direction from the one MyLo currently serves and
does not need a threshold to be correct.

`cases.overturned_by_id` is null for every row, deliberately. No judgment in the
corpus states that it was overturned; that can only come from a later judgment
saying so. **A reader must never be told a case is good law on the strength of
MyLo not knowing otherwise.**
