# MyLo

> The Constitution of Rwanda, in the language you think in, with the article
> attached.

MyLo is for the person who has to deal with a law and cannot afford to have it
explained. It **explains, organises and prepares — it does not represent.** It
will show you what the law says and what the words mean; it will not tell you
what to argue or how your case will go, and where you need a lawyer its job is to
help you arrive ready, not to stand in for arriving.

Ask MyLo a question in Kinyarwanda, English or French. It finds the articles of
the Constitution that bear on it and shows you the state's own words — the text
as published in the Official Gazette, quoted exactly, with the law number,
gazette reference and current status attached.

When the Constitution does not address your question, MyLo says so. That is a
real answer, not a failure, and it is the one thing a legal tool must never get
wrong.

**Three rules shape the whole system.**

1. **No legal claim without a citation** to a specific article, in a specific
   language, at a specific point in time.
2. **Official text is served verbatim and is never model output.** That is what
   makes it quotable.
3. **Anything MyLo writes itself is marked as such**, and a plain-language
   explanation is withheld entirely until a person approves it.

---

## Quick start

**Prerequisites:** Node 22+ and Docker. A corpus is _not_ required to check out
the repository and run the tests — a committed fixture exercises the parser end
to end, so a clean clone can prove itself before anyone has a Gazette PDF.

```bash
npm install                # one lockfile, npm workspaces
npm test                   # parser, retrieval and privacy invariants
```

To run it against real law, add the corpus:

```bash
npm run stack:up                                  # PostgreSQL with pgvector
npm run db:migrate                                # schema from nothing; re-runnable
npm run corpus:gazette -- ~/path/to/gazette-pdfs  # parse
npm run corpus:triage                             # read what went wrong
npm run status:build -- <export.json>             # which laws are in force
npm run corpus:load-gazette -- --status packages/pipeline/out/status.json
npm run dev                                       # API and web client
```

The loader **refuses to run without a status source**. Nothing in a Gazette PDF
says whether its law is still in force, and amategeko.gov.rw lists 658 that are
not; loading them silently as active is the failure that refusal prevents. See
[`docs/SOURCES.md`](docs/SOURCES.md) for where to get the list.

| Service    | URL                          |
| ---------- | ---------------------------- |
| Web client | http://localhost:5173        |
| API        | http://localhost:5001/api/v1 |
| Health     | http://localhost:5001/health |

`/health` reports what is actually loaded — laws, articles and texts. If it
reports zero articles, the corpus steps have not run, and every question will
correctly answer "the Constitution does not address this".

---

## Repository layout

npm workspaces, one lockfile.

| Path                                       | What it is                                                   |
| ------------------------------------------ | ------------------------------------------------------------ |
| [`apps/api/`](apps/api/)                   | Fastify API — retrieval and cited answers                    |
| [`apps/web/`](apps/web/)                   | React reading surface                                        |
| [`packages/domain/`](packages/domain/)     | The Zod contract both sides import, so drift is a type error |
| [`packages/db/`](packages/db/)             | Drizzle schema and migrations                                |
| [`packages/corpus/`](packages/corpus/)     | Gazette PDF → structured trilingual corpus                   |
| [`packages/pipeline/`](packages/pipeline/) | Loading the corpus into the database                         |
| [`packages/eval/`](packages/eval/)         | The measurements that decided the architecture               |

`MyLo-Backend/` and `MyLo-frontend/` are the previous stack. They are kept until
the new one reaches parity and are reachable under `npm run legacy:dev`.

---

## Why it is built this way

Every significant choice here was measured rather than assumed, and the
measurements live in [`packages/eval/`](packages/eval/) so they can be re-run and
disagreed with. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) records the
reasoning; [`docs/ESSENCE.md`](docs/ESSENCE.md) records what the first version of
this project was reaching for; [`docs/PLAN.md`](docs/PLAN.md) records what has to
become true next, in the order it has to become true;
[`docs/SOURCES.md`](docs/SOURCES.md) records where the corpus comes from and what
each official deposit answers;
[`docs/AUDIT-AND-TELEMETRY.md`](docs/AUDIT-AND-TELEMETRY.md) records what MyLo
keeps about an answer, what it refuses to keep about the reader, and why voice
input is not built; [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) lists every
known blockage — closed, owned elsewhere, or open — so none of them is open
without being visible.

**Retrieval is lexical, not neural.** Character n-gram BM25 beats a multilingual
embedding model outright in Kinyarwanda — 75.2% against 56.6% recall@1 — because
the language is agglutinative, and character runs recover stems that a word index
files as unrelated terms. Dense embeddings do win in English and French, and are
still not used: they need a model resident at query time, which means a GPU on
the server or the reader's question travelling to someone else's. A question
about your own rights is not a neutral thing to send away.

**The corpus mattered more than the retriever.** The Gazette prints three
languages in parallel columns, so text extraction has to be geometric or it
splices French clauses into English articles. Headings wrap, and a parser that
kept only their first line stored fifteen Kinyarwanda headings truncated.
Repairing that moved Kinyarwanda retrieval from 41.7% to 75.2% without changing a
line of retrieval code.

**"I don't know" is engineered, and its threshold is measured.** A lexical index
always ranks something, so the score floor below which MyLo declines to answer is
derived from measured distributions of real and off-topic questions
(`npm run eval:threshold`), not chosen. It rejects every off-topic question while
keeping 97% of the hardest real ones.

**No model writes law.** Small models corrupt Kinyarwanda legal wording, which
the evaluation measured before the architecture came to depend on it. So the
model navigates, the state's text is served verbatim, and plain-language
explanations are human-reviewed before anyone sees them.

---

## Scripts

### Everyday

| Script               | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | API and web client together                   |
| `npm test`           | Unit tests (no database or corpus needed)     |
| `npm run typecheck`  | Type-check every workspace                    |
| `npm run format`     | Prettier across the repo                      |
| `npm run stack:up`   | Start PostgreSQL with pgvector                |
| `npm run db:migrate` | Build the schema from nothing; safe to re-run |

### Building the corpus

Statutes, in the order they are run:

| Script                                        | What it does                                          |
| --------------------------------------------- | ----------------------------------------------------- |
| `npm run corpus:ocr -- <path>`                | Scanned issues -> searchable PDFs the parser can read |
| `npm run corpus:gazette -- <path>`            | Parse issues into instruments, articles and metadata  |
| `npm run corpus:triage`                       | What went wrong, grouped by family and severity       |
| `npm run corpus:golden -- <path> [--update]`  | Diff a parse against the recorded one                 |
| `npm run corpus:amendments`                   | Which law amends which, and which articles            |
| `npm run status:build -- <export.json>`       | Build the in-force map the loader requires            |
| `npm run corpus:load-gazette -- --status <f>` | Load parsed laws into the database                    |

Case law is parsed and stored but **not served** — see `docs/PLAN.md`:

| Script                              | What it does                               |
| ----------------------------------- | ------------------------------------------ |
| `npm run corpus:judgments -- <dir>` | Parse judgments, with their citation graph |
| `npm run corpus:load-cases`         | Load them into the database                |

The Constitution has its own parser, kept because it is one document with one
known gazette reference: `npm run corpus:build` then `npm run corpus:load`.

### Measuring

| Script                                          | What it answers                                       |
| ----------------------------------------------- | ----------------------------------------------------- |
| `npm run eval:gate`                             | Does anything unapproved reach a reader? Run it first |
| `npm run eval:scale -- --max 40000`             | Does retrieval survive corpus growth                  |
| `npm run eval:vocabulary`                       | Does the synonym layer close the terms-of-art gap     |
| `npm run eval:mixed-index`                      | One index or two, for statutes and case law           |
| `npm run eval:sparse`                           | Lexical against dense retrieval                       |
| `npm run eval:threshold-live -w @mylo/pipeline` | Re-derive the "I don't know" floor                    |
| `npm run eval:bank-lift -w @mylo/pipeline`      | What the question bank is worth, per language         |

### Review

Nothing generated is served until a person approves it.

| Script                                      | What it does                           |
| ------------------------------------------- | -------------------------------------- |
| `npm run build:questions -w @mylo/pipeline` | Generate the question bank (resumable) |
| `npm run review:export -w @mylo/pipeline`   | Write drafts to a file for review      |
| `npm run review:import -w @mylo/pipeline`   | Apply the decisions in that file       |
| `npm run prune:unsourced -w @mylo/pipeline` | Remove laws held only in part          |

---

## Deploying

```sh
cp .env.example .env          # POSTGRES_PASSWORD has no default, on purpose
docker compose up -d db
docker compose run --rm api npm run db:migrate
docker compose up -d
```

The image carries the corpus pipeline as well as the API, because loading a law
and re-deriving a floor are operational tasks against the deployed database
rather than things to do from a laptop pointed at production. Mount the Gazette
PDFs read-only with `CORPUS_DIR`.

The build **fails** without `packages/pipeline/out/score-floors.json`. That is
deliberate: character BM25 always ranks something, so an uncalibrated floor gives
every off-topic question a confident citation, and the refusal to start without
one has to survive containerisation rather than being defaulted away.

---

Re-run `eval:threshold` after any change to the corpus, the tokeniser or the BM25
parameters — **including approving banked questions**, which lengthen indexed
documents and shift every IDF weight. The floor is a property of all of them
together, not a constant.

---

## Where it is honest about itself

- **Legal terms of art are handled, and were the hardest part.** A reader asks
  about a "fair trial"; the Constitution words that guarantee as due process
  (article 29) and the two share no substring worth indexing. A curated synonym
  layer closes it — measured 25% to 100% recall@1 on eight term-of-art questions
  — and it is a hand-written list rather than embeddings, because embeddings
  would need a model resident when the question is asked, and a question about
  your own rights is not a neutral thing to send away.

  Eight queries written by one author is not a validation set. The Kinyarwanda
  entries are the weakest, for a reason worth naming: the legal name of a right
  can be checked against the Gazette by anyone, and the everyday name cannot be
  checked against anything except a speaker.

- **No explanations are approved yet**, so citations show official text alone,
  and the reader is told so rather than left to infer it. The pipeline below the
  generator is complete and tested — draft default, review file, import, gate,
  reader-facing caveat — and `eval:gate` proves nothing unapproved reaches a
  reader. What is missing is a Kinyarwanda legal reviewer, which is a hire and
  not a task.

- **A Gazette issue is a compilation.** One PDF routinely carries several
  instruments, so `corpus:gazette` segments before parsing anything. Without
  that, unrelated instruments merge into one law with articles renumbering from
  1 partway through, and nothing warns.

- **`laws.coverage` marks any law held only in part**, and the reader is told,
  because a correct quotation of a fragment is still a misleading answer.

- **"In force" cannot mean "nothing has undone it."** The Gazette's standard
  closing formula repeals "all previous legal provisions contrary to this law"
  and names none. Resolving that would mean deciding which provisions of which
  other laws contradict it, which is interpretation. Answers citing an ordinary
  law carry an `unresolved_repeals` caveat saying so.

- **Case law is stored and not served.** 84 judgments parse into a citation graph
  — 217 statute links, 104 precedent links — and retrieval over them was measured
  and declined: correct answers score below the noise ceiling of their own
  corpus, so no threshold separates them. Storing, parsing and graphing are
  useful on their own; citing at scores indistinguishable from irrelevance is
  not.

- **The floors are a property of the corpus, and the corpus keeps changing.**
  The API refuses to start without them and warns on every boot when the index
  it is serving is not the one they were derived against. Measured separately:
  the noise ceiling _rises_ with corpus size, so past some size a fixed absolute
  floor stops separating and starts admitting. Re-derive with
  `eval:threshold-live` before trusting a large corpus.

[`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) is the full inventory — closed,
owned elsewhere, or open — so nothing is open without being visible.

---

## Contributing

Branch off `main`. Run `npm run typecheck` and `npm run format` before opening a
PR.

If you change anything the evaluations cover — the corpus, the tokeniser,
retrieval parameters — re-run the relevant script in `packages/eval/` and update
the numbers quoted in the code comments. Those numbers are load-bearing: they are
why the architecture is shaped the way it is, and a stale one is worse than none.

---

## Licence

ISC. See [LICENSE](LICENSE).

MyLo began life as **MenyaLo**, built by Group 12 at the
[Solvit Africa Training Center](https://github.com/Solvit-Africa-Training-Center).
