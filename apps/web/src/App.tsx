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
import { ask } from "./api.ts";

const LANGUAGES: Language[] = ["rw", "en", "fr"];

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

      <footer className="source">
        {copy.source}: {citation.lawTitle} ({citation.lawNumber})
        {citation.gazetteRef ? ` — ${citation.gazetteRef}` : ""}
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
              key={`${c.articleNumber}-${c.language}`}
              citation={c}
              copy={copy}
            />
          ))}
        </section>
      )}

      <footer className="disclaimer">{copy.disclaimer}</footer>
    </div>
  );
}
