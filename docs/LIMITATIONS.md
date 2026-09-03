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

## Open

Solvable in code, not yet done. Listed so they are not mistaken for closed.

- **The fixture is a model, not a specimen.** It encodes the structure observed
  in a real 2026 issue, but the first genuine multi-instrument PDF will contain
  something it does not model. `instrumentsInIssue` is in the manifest so the
  bulk run reports whether the segmenter finds one instrument per file
  everywhere — which, for MINIJUST, would itself be the warning sign.
- **Targeted amendments are extractable and not yet extracted.** A live 2026 law
  recites `Isubiye ku Itegeko n° 017/2020 ... mu ngingo zaryo, iya 3 n'iya 4` —
  target law and target articles, stated. The recital formula is the pattern;
  `supersededById` remains unpopulated.
- **Scanned issues need OCR.** Detected and reported as its own warning family
  with its own severity, and nothing converts them.
- **`cases.overturned_by_id` is null for every row**, deliberately — no judgment
  states it was overturned. It becomes populatable only from later judgments that
  say so.
- **Domain classification is unpopulated.** The RLRC taxonomy of 1,002
  instruments is the source; nothing reads it yet.
- **No deployment story.** The API, the web client and the database run locally
  and have never been deployed anywhere.
