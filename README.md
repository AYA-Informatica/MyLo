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

**Prerequisites:** Node 22+, Docker Desktop, and the Gazette PDF of the
Constitution at the repository root.

```bash
npm install                # one lockfile, npm workspaces
npm run stack:up           # PostgreSQL with pgvector
npm run db:migrate         # create the schema
npm run corpus:build       # parse the Gazette PDF -> 176 articles, 3 languages
npm run corpus:load        # load it into the database
npm run dev                # API and web client together
```

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
each official deposit answers.

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

| Script                             | What it does                                    |
| ---------------------------------- | ----------------------------------------------- |
| `npm run dev`                      | API and web client together                     |
| `npm run build`                    | Production build of the web client              |
| `npm run typecheck`                | Type-check every workspace                      |
| `npm run format`                   | Prettier across the repo                        |
| `npm run stack:up` / `stack:down`  | Start / stop PostgreSQL                         |
| `npm run db:migrate`               | Apply Drizzle migrations                        |
| `npm run db:studio`                | Browse the database                             |
| `npm run corpus:build`             | Parse the Constitution into a structured corpus |
| `npm run corpus:gazette -- <path>` | Parse any Gazette law, or a directory of them   |
| `npm run corpus:load`              | Load the corpus into the database               |
| `npm run eval:sparse`              | Compare lexical, dense and hybrid retrieval     |
| `npm run eval:threshold`           | Re-derive the score floor for "I don't know"    |

Review and the question bank live in `@mylo/pipeline`:

| Script                                      | What it does                           |
| ------------------------------------------- | -------------------------------------- |
| `npm run build:questions -w @mylo/pipeline` | Generate the question bank (resumable) |
| `npm run review:export -w @mylo/pipeline`   | Write drafts to a file for review      |
| `npm run review:import -w @mylo/pipeline`   | Apply the decisions in that file       |
| `npm run eval:bank-lift -w @mylo/pipeline`  | What the bank is worth, per language   |
| `npm run prune:unsourced -w @mylo/pipeline` | Remove laws held only in part          |

Re-run `eval:threshold` after any change to the corpus, the tokeniser or the BM25
parameters — **including approving banked questions**, which lengthen indexed
documents and shift every IDF weight. The floor is a property of all of them
together, not a constant.

---

## Where it is honest about itself

- **Lexical retrieval cannot bridge vocabulary it does not share.** Indexing
  citizen-written questions alongside the official text closes much of this gap
  — +36 points recall@1 in English, +6 in French — and none of it in
  Kinyarwanda, where prose-only retrieval was already the strongest of the three
  and the generated questions are weak enough to add noise.

  It does not close the gap for legal terms of art. "Do I have the right to a
  fair trial?" still misses: the Constitution words that guarantee as due
  process (article 29), and the banked questions ask "if I'm accused of
  something, what rights do I have?" — so the query's vocabulary matches neither.
  A reader who has picked up a legal phrase from somewhere else is in a third
  vocabulary, and nothing lexical spans all three. This is the clearest argument
  for a curated synonym layer over legal terms.

- **No explanations are approved yet**, so citations currently show official text
  alone. `review:export` / `review:import` is the mechanism; 525 banked questions
  are waiting on it, and nothing generated is served until someone decides.
- **Only the Constitution is loaded.** `laws.coverage` marks any law the corpus
  holds only part of, and the reader is told, because a correct quotation of a
  fragment is still a misleading answer.
- **Other laws can now be parsed and loaded.** `corpus:gazette` reads ordinary
  and organic laws out of the Gazette — number, date, instrument type, and
  trilingual articles — and `corpus:load-gazette` writes them into the database.
  It will not start without a status source: nothing in a Gazette PDF says
  whether its law is still in force, and amategeko.gov.rw lists 658 that are
  not. Three documents is not a validation of 1,400; every parse carries its own
  warnings and the run writes a manifest, so a bulk run is meant to be read
  rather than trusted. See docs/ARCHITECTURE.md, "Beyond the Constitution".
- **Case law is untouched.** Judgments have a different structure and are not
  uniformly trilingual the way laws are. Separate schema, separate parser,
  neither written.

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
