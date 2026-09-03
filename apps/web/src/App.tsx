/**
 * MyLo, as a citizen meets it.
 *
 * The screen is arranged around one commitment: what the Constitution says is
 * shown verbatim and attributed, and anything MyLo adds is visibly separate from
 * it. So the official text gets the emphasis, its citation is always attached,
 * and a plain-language explanation appears in a distinct block — or not at all,
 * when no one has approved one.
 *
 * The "we don't know" state is rendered as a real answer rather than an empty
 * list, because for a legal tool it is one.
 */
import { useState, type FormEvent } from "react";
import {
  LANGUAGE_NAMES,
  type AskResponse,
  type Citation,
  type Language,
} from "@mylo/domain";
import { COPY } from "./copy.ts";
import { ask, recordUnanswered, withdrawUnanswered } from "./api.ts";

const LANGUAGES: Language[] = ["rw", "en", "fr"];

/**
 * What MyLo offers when it cannot answer.
 *
 * The decline used to end the conversation: it told the reader to find a
 * verified law firm and gave no way to reach one, which is the least useful
 * thing to say to someone facing a court process precisely because they cannot
 * afford a lawyer.
 *
 * Recording is an action the reader takes, never automatic. The audit trail
 * keeps no question text at all, on the grounds that a question here is
 * somebody's legal problem; the only thing that justifies keeping this one is
 * that they asked for it to be kept. A button makes that a choice. Doing it
 * silently would make it surveillance with a nicer name.
 *
 * The handle is shown once and never again, because it is the reader's only way
 * to withdraw what they just disclosed — so it belongs to them rather than being
 * something the server can look up on their behalf.
 */
function RecordUnanswered({
  question,
  language,
  copy,
}: {
  question: string;
  language: Language;
  copy: (typeof COPY)[Language];
}) {
  const [state, setState] = useState<
    "idle" | "saving" | "done" | "withdrawn" | "failed"
  >("idle");
  const [handle, setHandle] = useState<string | null>(null);

  if (state === "withdrawn") {
    return <p className="recorded">{copy.recordWithdrawn}</p>;
  }

  if (state === "done" && handle) {
    return (
      <div className="recorded" aria-live="polite">
        <p>{copy.recordDone}</p>
        <code className="handle">{handle}</code>
        <p className="handle-note">{copy.recordKeep}</p>
        <button
          type="button"
          className="link"
          onClick={() => {
            void withdrawUnanswered(handle).then(() => setState("withdrawn"));
          }}
        >
          {copy.recordWithdraw}
        </button>
      </div>
    );
  }

  return (
    <div className="record-offer">
      <p>{copy.recordAsk}</p>
      <button
        type="button"
        disabled={state === "saving"}
        onClick={() => {
          setState("saving");
          recordUnanswered({ question, language })
            .then((r) => {
              setHandle(r.handle);
              setState("done");
            })
            .catch(() => setState("failed"));
        }}
      >
        {state === "saving" ? copy.recordSaving : copy.recordAction}
      </button>
      {state === "failed" && <p className="error">{copy.recordFailed}</p>}
    </div>
  );
}

function CitationCard({
  citation,
  copy,
}: {
  citation: Citation;
  copy: (typeof COPY)[Language];
}) {
  const [showExplanation, setShowExplanation] = useState(true);

  return (
    <article className="citation">
      <header>
        <h2>
          {copy.article} {citation.articleNumber}
        </h2>
        {citation.heading && <p className="heading">{citation.heading}</p>}
      </header>

      {/*
        The official text is a blockquote and not a paragraph on purpose: it is
        someone else's words, quoted, and the markup should say so to a screen
        reader as clearly as the styling says it to everyone else.
      */}
      <blockquote className="official">
        <span className="label">
          {citation.isOfficial ? copy.official : copy.translation}
        </span>
        {citation.officialText}
      </blockquote>

      {citation.explanation ? (
        <section className="explanation">
          <button
            type="button"
            className="explanation-toggle"
            onClick={() => setShowExplanation((v) => !v)}
            aria-expanded={showExplanation}
          >
            {copy.explanation}
          </button>
          {showExplanation && <p>{citation.explanation}</p>}
        </section>
      ) : (
        <p className="no-explanation">{copy.noExplanation}</p>
      )}

      {/*
        A fragment quoted correctly is still a misleading answer, so the gap is
        named rather than left for the reader to infer from silence.
      */}
      {citation.lawCoverage === "partial" && (
        <p className="partial-law">{copy.partialLaw}</p>
      )}

      <footer className="source">
        {copy.source}: {citation.lawTitle} ({citation.lawNumber})
        {citation.gazetteRef ? ` — ${citation.gazetteRef}` : ""}
        {/*
          When the law started binding people, which is not the date printed in
          its title — a law is signed, published, then commences, and for
          Law N°02/2007 the first and last are 54 days apart. A reader asking
          whether a law applied to something that happened to them needs this
          one.
        */}
        {citation.effectiveFrom && (
          <span className="effective">
            {" "}
            · {copy.inForceSince} {citation.effectiveFrom}
          </span>
        )}
        {citation.lawStatus !== "active" && (
          <strong className="status"> · {citation.lawStatus}</strong>
        )}
      </footer>
    </article>
  );
}

export function App() {
  const [language, setLanguage] = useState<Language>("rw");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = COPY[language];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (question.trim().length < 3 || busy) return;

    setBusy(true);
    setError(null);
    try {
      setAnswer(await ask({ question: question.trim(), language, limit: 5 }));
    } catch {
      setAnswer(null);
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <span className="wordmark">MyLo</span>
          <nav aria-label="Language">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                className={l === language ? "lang active" : "lang"}
                aria-pressed={l === language}
                onClick={() => setLanguage(l)}
              >
                {LANGUAGE_NAMES[l]}
              </button>
            ))}
          </nav>
        </div>
        <p className="tagline">{copy.tagline}</p>
      </header>

      <form onSubmit={onSubmit} className="ask">
        <label className="sr-only" htmlFor="question">
          {copy.tagline}
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={copy.placeholder}
          rows={3}
          maxLength={500}
          onKeyDown={(e) => {
            // Enter asks; Shift+Enter makes a new line. A question is usually one
            // sentence, so the common case should not require reaching for a
            // button.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSubmit(e);
            }
          }}
        />
        <button type="submit" disabled={busy || question.trim().length < 3}>
          {busy ? copy.asking : copy.submit}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {answer && (
        <section className="answer" aria-live="polite">
          <p
            className={answer.kind === "none" ? "notice notice-none" : "notice"}
          >
            {answer.notice}
          </p>
          {answer.citations.map((c) => (
            <CitationCard
              key={`${c.lawNumber}-${c.articleNumber}-${c.language}`}
              citation={c}
              copy={copy}
            />
          ))}

          {/*
            Shown once, after the citations, and only for the limit that has no
            per-citation home. `partial_law` and `unofficial_translation` are
            already rendered against the specific article they apply to, which
            is the better place for them — a caveat attached to the text it
            qualifies is read, and one collected in a list at the bottom is not.

            `unresolved_repeals` cannot be placed that way, because it is not a
            fact about any article. It is a statement about what MyLo is unable
            to determine from the corpus at all.
          */}
          {answer.limitations.includes("unresolved_repeals") && (
            <p className="limitation">{copy.unresolvedRepeals}</p>
          )}

          {answer.kind === "none" && (
            <RecordUnanswered
              question={answer.question}
              language={answer.language}
              copy={copy}
            />
          )}
        </section>
      )}

      <footer className="disclaimer">{copy.disclaimer}</footer>
    </div>
  );
}
