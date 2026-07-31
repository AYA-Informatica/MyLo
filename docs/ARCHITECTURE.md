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

- **Where the corpus comes from.** Nothing ingests the Gazette today. This remains
  the single largest unsolved problem, and it is upstream of everything.
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
