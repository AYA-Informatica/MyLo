# Limitations

Every known blockage and limitation, what it costs, and who can clear it. Kept
here rather than scattered through the plan so that nothing is open without being
visible.

Three states: **closed** (solved, with the evidence), **owned elsewhere** (cannot
be solved from a repository — it needs a machine, a person, or a decision), and
**open** (solvable in code, not yet done).

Last audited against the code on 2026-09-03, which is how the two security gaps
below were found. A list like this decays into reassurance if it is only ever
appended to.

---

## Closed

### Retrieval did not survive corpus growth

`eval:scale` measured it: 178ms per query and 672MB at 40,000 documents,
extrapolating to ~667ms, ~2.5GB per language and a ~28s rebuild on every boot at
the ~150,000 texts the full corpus implies. `search` walked every document on
every query — no inverted index, despite document frequencies being computed —
and memory followed, one Map per document.

Transposed to a term-to-documents index: 31ms and 340MB at 40,000, ~117ms and
~1.3GB extrapolated. Ranking is unchanged, verified by identical on-topic and
noise scores at every size and pinned by a test on exact scores.

### The review gate had never been tested

The rule that nothing generated reaches a reader unapproved was enforced by one
`AND` in one join and had never been exercised, because no explanation had ever
existed. `eval:gate` now walks draft, approved and rejected against the real
database and the API's own query — copied rather than imported, since a test that
imports what it tests cannot catch a change to it — and checks that a row
inserted without a status defaults to draft. It always rolls back.

### A caveat that could never fire

`unreviewed_explanation` was unreachable: unreviewed explanations are not served,
so there was nothing to caution about, and a caveat that cannot fire reads as
coverage. Replaced with `no_explanation`, which fires when an article has no
approved plain-language version — the gap that matters to a reader without a
lawyer.

### The decline was a dead end

MyLo told readers to find a verified law firm and offered no way to reach one.
`POST /api/v1/unanswered` records what it could not answer, on request, refusing
anything answerable so it does not become a log of every question. Private by
default, expiring, deletable only with a handle the reader is given once, holding
nothing identifying — all enforced in the schema rather than the handler.

### Segmentation had never met a real PDF; a clone could not rebuild; CI could not run goldens

One committed fixture closed all three. `fixtures/gazette-issue-2099.pdf` is
authored here rather than taken from the Gazette, so it carries none of the
licensing question that keeps the real corpus out. It found four bugs on its
first run, including that JavaScript's `\b` cannot close after an accented
letter — so `\bARRÊTÉ\b` never matches, and every French instrument ending in an
accent was invisible.

### Targeted amendments

`extractAmendments` reads the title ("AMENDING LAW N° X") and the recitals
("Isubiye ku Itegeko n° X ... mu ngingo zaryo, iya 3 n'iya 4"), keeping them
apart: a title is the law's declared purpose, while nearly every instrument
recites the Constitution, so reading recitals as amendments would have the whole
corpus amending it. Stored in `law_amendments`, deliberately not
`superseded_by_id` — amending articles 3 and 4 leaves the rest standing.

### Scanned issues

`corpus:ocr` emits a searchable PDF rather than text, because position is what
column detection depends on, so a converted issue parses through the same code as
a born-digital one. The assumption that blocked this was wrong: Tesseract ships
no Kinyarwanda model, but the English one recovered all three columns, because it
recognises Latin glyphs and only uses the language model to break ties.

### No deployment story

`Dockerfile`, `docker-compose.yml`, `.env.example`, `npm run db:migrate`. The
schema builds from nothing in one command and re-running is safe; previously the
only way was running every `.sql` by hand in order and remembering which had been
applied — which works once, on one machine, and is why nothing had ever been
deployed.

### Two key-collision bugs

`.OL` was dropped, collapsing `Organic Law N° 001/2026.OL` onto the key of an
ordinary `Law N° 001/2026`. Orders were read as `serial/year` when they are
`serial/category`, inventing dates and merging every order sharing a code. Both
would have corrupted `law_number`, the key everything hangs off.

### The four found by auditing, closed the same day

Recorded on 2026-09-03 and closed on 2026-09-03. They are listed because finding
them was the point of auditing rather than appending, and because two arrived
during the same session that recorded them.

**No rate limiting.** Two of six routes write, and `POST /api/v1/unanswered`
inserted a row on an unauthenticated request. Flooding it would not merely waste
disk: it holds what readers could not get answered, so filling it buries the only
signal MyLo has about which law to ingest next. Reads are generous (120/min — a
person working through a legal problem asks a lot of questions and must not be
throttled for it) and writes are tight (10/hour — nobody legitimately records
fifty unanswerable questions an hour). Keyed on IP, which is the weakest key and
the only one available, since requiring an account to ask a legal question would
exclude the people this exists for. Verified: ten writes pass, the eleventh 429s.

**No authentication on `/api/v1/stats`.** It holds no question text and never
has, but answer volumes, decline rates and floor staleness describe the
operational state of a legal service, and "not as sensitive as the worst thing
here" is not an argument for public. It now requires a bearer token, compared at
full length so the time taken does not narrow it, and **returns 404 when no token
is configured** — unset means closed, the same choice the API makes about score
floors. Verified.

**`article_chunks` dropped.** It was designed for stored embeddings queried by
vector similarity, an architecture measured and not built. Dead schema reads as
intent: the next person would reasonably conclude chunking is part of the design
and either build toward it or avoid disturbing it. `answer_citations.chunk_id`
went with it, since it referenced a concept that no longer exists. The Drizzle
schema was updated in the same change, because a schema file that disagrees with
the database is its own bug. The other unused tables are kept deliberately —
they are ahead of their features rather than behind them.

**`eval:gate` runs in CI.** A new `invariants` job migrates from an empty
database, loads the committed fixture corpus, and runs the gate. It also proves
the migration runner works from nothing, which is what a deployment does on its
first boot. Rehearsed locally end to end before being committed.

### Case-law retrieval — closed as a decision, not a gap

Measured, not deferred: correct case answers score below the noise ceiling of
their own corpus, so no threshold separates them. Case law is stored, parsed and
graphed; it is not served.

---

## Owned elsewhere

Cannot be closed from a repository. Each names what would close it.

| Limitation                                                 | What would close it                                                                                                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parser has met 3 real Gazette documents, not 1,400         | A bulk run: `corpus:gazette` then `corpus:triage`, on a machine with the corpus                                                                      |
| Score floors describe a 527-text index                     | `eval:threshold-live`, which needs a local model                                                                                                     |
| No status source populated                                 | The RLRC "Laws of Rwanda" collection, captured and fed to `status:build`                                                                             |
| Retrieval numbers measured on the Constitution only        | Re-running the evals after the bulk load                                                                                                             |
| Synonym layer: 8 queries, one author                       | Real questions from people who are not building this                                                                                                 |
| Kinyarwanda everyday phrasing is guessed                   | A Kinyarwanda-speaking legal reviewer. **Still the most likely way this fails**                                                                      |
| Corpus redistribution rights unknown                       | A lawyer                                                                                                                                             |
| Voice input                                                | A local ASR model, a machine to run it, and a measurement on Kinyarwanda legal vocabulary                                                            |
| Boot rebuilds the whole index (~21s extrapolated)          | A persisted index, or a lazy per-language build                                                                                                      |
| A fixed absolute floor may be the wrong mechanism at scale | `eval:threshold-live` at full corpus size. The noise ceiling _rises_ with corpus size — 14.2 at 500 documents, 22.7 at 40,000, against a floor of 32 |

---

## Open

Solvable in code, not yet done.

### Carried forward

- **The fixture is a model, not a specimen.** It encodes the structure observed
  in a real 2026 issue; the first genuine multi-instrument PDF will contain
  something it does not model. `instrumentsInIssue` is in the manifest, so a bulk
  run reports whether the segmenter finds one instrument per file everywhere —
  which, for MINIJUST, would itself be the warning sign.
- **`laws.superseded_by_id` remains unpopulated.** Amendments are recorded now,
  but supersession is a different act and no instrument in the corpus performs
  one yet.
- **OCR quality is unmeasured on real scans.** Verified on a clean render; a
  degraded 1970s issue is the real test, and the Kinyarwanda column is where it
  will show first, since nothing can rescue an ambiguous glyph in a language the
  model has never seen.
- **`cases.overturned_by_id` is null for every row**, deliberately — no judgment
  states it was overturned. It becomes populatable only from later judgments that
  say so.
- **Domain classification is unpopulated.** The RLRC taxonomy of 1,002
  instruments is the source; nothing reads it yet.
- **No verified firms, so referrals have no recipient.** The queue exists and
  fills; nothing consumes it until organisations and verification are built.
- **Nothing has actually been deployed.** The image, compose file and migration
  runner exist and the schema builds from nothing; no instance has run outside a
  laptop, and the web client has no container of its own.
- **The legacy tree is still in the repository and still in CI.** `MyLo-Backend`
  and `MyLo-frontend` are 217 tracked files the monorepo replaces. A `monorepo`
  job now runs alongside them, but a green tick still includes jobs testing code
  nobody intends to ship.
