# Limitations

Every known blockage and limitation, what it costs, and who can clear it. Kept
here rather than scattered through the plan so that nothing is open without being
visible.

Three states: **closed** (solved, with the evidence), **owned elsewhere** (cannot
be solved from a repository — it needs a machine, a person, or a decision), and
**open** (solvable, not yet done).

---

## Closed

### Segmentation had never met a real PDF — closed 2026-09-03

Segmentation was tested against hand-written lists of lines. A list of lines
models a document; it proves the boundary rules and proves nothing about column
splitting, line assembly from word-level items, or how the two interact.

`packages/corpus/fixtures/gazette-issue-2099.pdf` is now a committed PDF with the
shape of a real issue — three parallel columns, a trilingual `Ibirimo` index with
dot leaders and lettered sections, two instruments of different kinds, titles
printed twice, recitals citing another law, and article numbering restarting at
the second instrument. `make-issue.py` generates it.

**It found four real bugs on its first run**, none of which the line-based tests
could reach:

- **`\b` cannot close after an accented letter.** JavaScript's `\b` is defined
  against `\w`, which is ASCII-only, so `\bARRÊTÉ\b` never matches — after the
  final É there is no transition for the closing boundary to find. Every French
  instrument ending in an accent was invisible in every language stream. The
  French title block was the only one of three that failed to segment.
- **Index entries wrap**, so the dot leaders and the law number land on different
  lines. Requiring both on one line found nothing, which reads as "this issue has
  no index" rather than as a wrapping problem.
- **Instrument type was read from recitals.** A law reciting `Isubiye ku Itegeko
Ngenga n° 007/2018.OL` was classified as an organic law — and since nearly
  every instrument recites the Constitution, almost anything could have been
  classified as one. The comment above `TITLE_BLOCK_LINES` warned about exactly
  this and the code did it anyway; the fixture turned the warning into a failing
  case.
- **Order numbers were still being read as years** in the metadata reader. The
  kind was known and not passed, so `Presidential Order n° 099/01` became
  `99/2001`.

### A fresh clone could not rebuild anything — closed 2026-09-03

Source PDFs live outside version control for good reasons, so every derived
artefact was unreproducible from the repository alone. Invisible on a machine
with a Downloads folder full of issues; total in CI or a new checkout.

The fixture is committed, is 4.6 KB, and is authored here rather than taken from
the Gazette — so it carries none of the licensing question that keeps the real
corpus out. A clean clone can now run the parser end to end.

### CI could not run the golden harness — closed 2026-09-03

Same cause. `npm test` now includes an end-to-end parse of the fixture, so the
strongest structural check runs in CI rather than only locally.

### Two key-collision bugs — closed 2026-09-03

`.OL` was dropped, collapsing `Organic Law N° 001/2026.OL` onto the key of an
ordinary `Law N° 001/2026`. Orders were read as `serial/year` when they are
`serial/category`, inventing dates and merging every order sharing a code.
Both would have corrupted `law_number`, the key everything hangs off. Both were
invisible against amategeko extracts and were found by pointing the code at real
documents.

### Retrieval did not survive corpus growth — closed 2026-09-03

Measured with `eval:scale`: at 40,000 documents the retriever took 178ms per
query and 672MB, extrapolating to ~667ms and ~2.5GB per language at the real
corpus size, with a ~28s rebuild on every boot. `search` walked every document
on every query — there was no inverted index despite document frequencies being
computed — and memory went the same way, one Map per document.

Transposed to a term-to-documents index: 31.2ms and 340MB at 40,000, ~117ms and
~1.3GB extrapolated. Ranking is unchanged, verified by identical on-topic and
noise scores at all four corpus sizes and pinned by a test on exact scores.

### The review gate had never been tested — closed 2026-09-03

The rule that nothing generated reaches a reader unapproved was enforced by one
`AND` in one join and had never been exercised, because no explanation had ever
existed. `eval:gate` now walks draft, approved and rejected against the real
database and the API's own query, and checks that a row inserted without a status
defaults to draft. It always rolls back.

### A caveat that could never fire — closed 2026-09-03

`unreviewed_explanation` was unreachable, since unreviewed explanations are not
served. Replaced with `no_explanation`, which fires when an article has no
approved plain-language version — the gap that matters to a reader without a
lawyer. Verified on a live answer.

### The decline was a dead end — closed 2026-09-03

MyLo told readers to find a verified law firm and offered no way to reach one.
`POST /api/v1/unanswered` records what it could not answer, on request, refusing
anything answerable so it does not become a log of every question. Private by
default, expiring, deletable only with a handle the reader is given once, and
holding nothing identifying — all enforced in the schema rather than the handler.

### Case-law retrieval — closed as a decision, not a gap

Measured, not deferred: correct case answers score below the noise ceiling of
their own corpus, so no threshold separates them. Case law is stored, parsed and
graphed; it is not served. See `docs/PLAN.md`.

---

## Owned elsewhere

These cannot be closed from a repository. Each names what would close it.

| Limitation                                          | What would close it                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Parser has met 3 real Gazette documents, not 1,400  | A bulk run: `corpus:gazette` then `corpus:triage`, on a machine with the corpus           |
| Score floors describe a 527-text index              | `eval:threshold-live`, which needs a local model                                          |
| No status source populated                          | The RLRC "Laws of Rwanda" collection, captured and fed to `status:build`                  |
| Retrieval numbers measured on the Constitution only | Re-running the evals after the bulk load                                                  |
| Synonym layer: 8 queries, one author                | Real questions from people who are not building this                                      |
| Kinyarwanda everyday phrasing is guessed            | A Kinyarwanda-speaking legal reviewer. **Still the most likely way this fails**           |
| Corpus redistribution rights unknown                | A lawyer                                                                                  |
| Voice input                                         | A local ASR model, a machine to run it, and a measurement on Kinyarwanda legal vocabulary |

---

## Recently closed from the open list

**Targeted amendments are now extracted.** `extractAmendments` reads both the
title ("AMENDING LAW N° X") and the recitals ("Isubiye ku Itegeko n° X ... mu
ngingo zaryo, iya 3 n'iya 4"), and the two are kept apart rather than merged: a
title states the law's declared purpose and is the stronger claim, while nearly
every instrument recites the Constitution, so reading recitals as amendments
would have the whole corpus amending it. Stored in `law_amendments`, deliberately
not in `laws.superseded_by_id` — amending articles 3 and 4 leaves the rest of a
law standing, and recording that as supersession would mark a living law dead.
Verified against the real 2026 wording; the two 2007 laws correctly yield none.

**Scanned issues can now be converted.** `corpus:ocr` rasterises and runs
Tesseract, emitting a _searchable PDF_ rather than text — position is what column
detection and line assembly depend on, so a converted issue is parsed by exactly
the same code as a born-digital one. Verified end to end: a page that reported
`no text layer — scanned, needs OCR` parsed afterwards into 2 instruments with
correct numbers and types.

The assumption that blocked this was wrong. Tesseract ships no Kinyarwanda model,
which looked fatal for a trilingual corpus; measured, the English model recovered
all three columns, because Tesseract recognises Latin glyphs and only uses the
language model to break ties. The caveat is real though: on a degraded scan the
language model earns its keep, and the Kinyarwanda column has nothing to rescue
an ambiguous glyph. **OCR'd Kinyarwanda deserves more suspicion than OCR'd
English from the same page** — a reviewer's judgement, not a parser's.

**There is a deployment story.** `Dockerfile`, `docker-compose.yml`,
`.env.example` and `npm run db:migrate`. The schema now builds from nothing in
one command and re-running is safe — previously the only way was to run every
`.sql` by hand in the right order and remember which had been applied, which
works exactly once, on one machine, and is why nothing had ever been deployed.
The image carries the corpus pipeline as well as the API, because loading a law
and re-deriving a floor are operational tasks against the deployed database, not
things to do from a laptop pointed at production. It refuses to build without
calibrated score floors, so that refusal survives containerisation.

## Open

Solvable in code, not yet done. Listed so they are not mistaken for closed.

- **The fixture is a model, not a specimen.** It encodes the structure observed
  in a real 2026 issue, but the first genuine multi-instrument PDF will contain
  something it does not model. `instrumentsInIssue` is in the manifest so the
  bulk run reports whether the segmenter finds one instrument per file
  everywhere — which, for MINIJUST, would itself be the warning sign.
- **`laws.superseded_by_id` remains unpopulated.** Amendments are now recorded,
  but supersession is a different act and no instrument in the corpus performs
  one yet.
- **OCR quality is unmeasured on real scans.** Verified on a clean render; a
  degraded 1970s issue is the real test, and the Kinyarwanda column is where it
  will show first.
- **`cases.overturned_by_id` is null for every row**, deliberately — no judgment
  states it was overturned. It becomes populatable only from later judgments that
  say so.
- **Domain classification is unpopulated.** The RLRC taxonomy of 1,002
  instruments is the source; nothing reads it yet.
- **No verified firms, so referrals have no recipient.** The queue exists and
  fills; nothing consumes it until organizations and verification are built.
- **Nothing has actually been deployed.** The image, compose file and migration
  runner exist and the schema builds from nothing; no instance has ever run
  outside a laptop, and the web client has no container of its own.
