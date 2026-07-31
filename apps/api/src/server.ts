/**
 * The MyLo API.
 *
 * One rule shapes every route: no legal claim without a citation to a specific
 * article, in a specific language, at a specific point in time. Article text is
 * read from the database exactly as the state published it and is never model
 * output, which is what makes it quotable. Nothing here generates law.
 *
 * When the corpus cannot answer, the API says so. It does not search the web and
 * present the result as legal information, which is what the previous build did.
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import pg from "pg";
import {
  askRequestSchema,
  type AskResponse,
  type Citation,
  type Language,
} from "@mylo/domain";
import { Bm25Index, type Indexed } from "./retrieval.ts";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";
const PORT = Number.parseInt(process.env.PORT ?? "5001", 10);

interface ArticleRow {
  article_id: string;
  article_number: string;
  ordinal: number;
  heading: string | null;
  body: string;
  language: Language;
  is_official: boolean;
  law_number: string;
  law_title: string;
  law_status: Citation["lawStatus"];
  law_coverage: Citation["lawCoverage"];
  gazette_ref: string | null;
  explanation: string | null;
}

/**
 * Below this BM25 score, MyLo says it does not know.
 *
 * Derived, not chosen. Character n-gram BM25 always ranks something — ask the
 * Constitution about banana bread and the top hit still scores about 6 — so
 * without a floor the "the corpus does not answer this" branch is unreachable
 * and the honesty promise is decorative. These reject every off-topic question
 * while keeping 89% / 95% / 99% of real ones.
 *
 * They come from `eval:threshold-live -w @mylo/pipeline`, which rebuilds the
 * documents this file builds — approved questions included — rather than from
 * `eval:threshold`, which reads the corpus file and knows nothing about the
 * bank. Once anything is approved the corpus-file version returns healthy
 * numbers describing an index that no longer exists.
 *
 * The signal set is citizen-style questions rather than article headings, which
 * is a truer proxy: headings are shorter and far more formal than what people
 * type.
 *
 * Kinyarwanda rose furthest after approval, 31 -> 36. Augmenting raised the
 * *noise* ceiling there from 32.6 to 34.2 — weak banked questions give an
 * off-topic query more to match against — while English and French questions
 * added signal without adding noise.
 *
 * These sit just above measured noise rather than slightly below the separator.
 * A previous version shrank the cut by 5% to avoid overfitting a small noise
 * sample, which put the Kinyarwanda floor at 33 against noise reaching 34.2, and
 * a question about cooking bananas came back citing the state budget article.
 * The cautious-looking margin had guaranteed a known-bad query would pass.
 *
 * Re-derive after any further review decision. A miscalibrated floor does not
 * fail loudly — it quietly answers questions it should decline.
 */
const SCORE_FLOOR: Record<Language, number> = { rw: 36, en: 32, fr: 23 };

/**
 * What the reader is told, in their own language.
 *
 * These are part of the product, not client-side decoration. At current
 * retrieval accuracy the honest thing is to offer candidates rather than assert
 * one answer, and to say plainly when the corpus has nothing.
 */
const NOTICES: Record<Language, { shortlist: string; none: string }> = {
  rw: {
    shortlist:
      "Dore ingingo z’Itegeko Nshinga zishobora kuba zisubiza ikibazo cyawe. Soma umwimerere w’ingingo.",
    none: "Itegeko Nshinga ntirisubiza iki kibazo. Ushobora kubaza umunyamategeko wemewe.",
  },
  en: {
    shortlist:
      "These articles of the Constitution may answer your question. Read the official text.",
    none: "The Constitution does not answer this question. You may wish to ask a verified law firm.",
  },
  fr: {
    shortlist:
      "Ces articles de la Constitution peuvent répondre à votre question. Lisez le texte officiel.",
    none: "La Constitution ne répond pas à cette question. Vous pouvez consulter un cabinet vérifié.",
  },
};

const db = new pg.Pool({ connectionString: DATABASE_URL });

/**
 * Banked questions, per article and language, for search only.
 *
 * Indexing an article's official text together with the questions a citizen
 * would ask about it is the largest single improvement available to retrieval —
 * in two languages out of three. Measured on the bank that actually exists
 * (`npm run eval:bank-lift -w @mylo/pipeline`), recall@1 / recall@5:
 *
 *          prose only     + bank        lift
 *   rw    58.1 / 79.8   58.1 / 78.3   +0.0 / -1.6
 *   en    26.4 / 46.5   62.8 / 89.1   +36.4 / +42.6
 *   fr    43.4 / 67.4   49.6 / 82.2   +6.2 / +14.7
 *
 * Legal prose is written in the drafter's vocabulary and the reader arrives with
 * their own; in English those are furthest apart, which is why prose alone is
 * weakest there and the bank helps most.
 *
 * Kinyarwanda gains nothing and loses a little. Two reasons compound: character
 * n-grams already suit an agglutinative language, so prose-only retrieval is the
 * strongest of the three and there is less headroom; and the banked Kinyarwanda
 * phrasings are poor, because they are translated into Kinyarwanda by a small
 * model. A bad question is not a neutral row — it is noise in the index, which
 * is why the Kinyarwanda score floor had to rise after approval while the other
 * two did not move.
 *
 * All three languages are approved regardless, as a deliberate decision: the
 * Kinyarwanda cost is small and bounded, better source material is coming, and
 * rejecting is a per-language `review:import` away if it is not. Re-run
 * `eval:bank-lift` when those questions are replaced — this is the number that
 * should decide it.
 *
 * `approved` only, matching the rule explanations follow. But note that the
 * risk here is different in kind, which is why a generated question may be
 * banked at all: a question is an index key, never an assertion. A clumsy one
 * degrades matching. It cannot state the law incorrectly, because it states
 * nothing.
 *
 * Crucially these are never returned to the reader — they widen what a search
 * matches, and the answer stays the state's own words.
 */
async function loadBankedQuestions() {
  const { rows } = await db.query<{
    article_id: string;
    language: Language;
    body: string;
  }>(`
    SELECT qba.article_id, qbt.language, qbt.body
      FROM question_bank qb
      JOIN question_bank_articles qba ON qba.question_id = qb.id
      JOIN question_bank_texts qbt    ON qbt.question_id = qb.id
     WHERE qb.review_status = 'approved'
  `);

  const byArticleLanguage = new Map<string, string[]>();
  for (const r of rows) {
    const key = `${r.article_id}:${r.language}`;
    const list = byArticleLanguage.get(key) ?? [];
    list.push(r.body);
    byArticleLanguage.set(key, list);
  }
  return byArticleLanguage;
}

/**
 * Loads every article text and builds one index per language.
 *
 * Only `approved` explanations are joined in. A generated explanation that no
 * one has checked is withheld entirely rather than shown with a disclaimer —
 * the review state is the difference between a plain-language aid and an
 * unreviewed claim about the law.
 */
async function buildIndexes() {
  const { rows } = await db.query<ArticleRow>(`
    SELECT a.id            AS article_id,
           a.article_number,
           a.ordinal,
           at.heading,
           at.body,
           at.language,
           at.is_official,
           l.law_number,
           lt.title        AS law_title,
           l.status        AS law_status,
           l.coverage      AS law_coverage,
           l.gazette_ref,
           ex.body         AS explanation
      FROM article_texts at
      JOIN articles a  ON a.id = at.article_id
      JOIN laws l      ON l.id = a.law_id
      LEFT JOIN law_texts lt
             ON lt.law_id = l.id AND lt.language = at.language
      LEFT JOIN explanations ex
             ON ex.article_id = a.id
            AND ex.language = at.language
            AND ex.review_status = 'approved'
     ORDER BY a.ordinal
  `);

  const banked = await loadBankedQuestions();
  let augmented = 0;

  const byLanguage = new Map<Language, Indexed<ArticleRow>[]>();
  for (const row of rows) {
    const list = byLanguage.get(row.language) ?? [];
    const questions = banked.get(`${row.article_id}:${row.language}`) ?? [];
    if (questions.length > 0) augmented += 1;

    // Heading, body and banked questions are indexed as one document. A heading
    // is short but highly discriminative; the questions carry the reader's
    // vocabulary. Only `body` is ever shown — this string exists to be matched
    // against, not to be read.
    list.push({
      item: row,
      text: `${row.heading ?? ""} ${row.body} ${questions.join(" ")}`,
    });
    byLanguage.set(row.language, list);
  }

  const indexes = new Map<Language, Bm25Index<ArticleRow>>();
  for (const [lang, list] of byLanguage) indexes.set(lang, new Bm25Index(list));
  return { indexes, count: rows.length, augmented };
}

const toCitation = (row: ArticleRow, score: number): Citation => ({
  lawNumber: row.law_number,
  lawTitle: row.law_title ?? row.law_number,
  gazetteRef: row.gazette_ref,
  lawStatus: row.law_status,
  lawCoverage: row.law_coverage,
  articleNumber: row.article_number,
  heading: row.heading,
  officialText: row.body,
  language: row.language,
  isOfficial: row.is_official,
  explanation: row.explanation,
  score: Number(score.toFixed(3)),
});

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });
await app.register(cors, { origin: true });

const { indexes, count, augmented } = await buildIndexes();
app.log.info(
  { texts: count, augmented, languages: [...indexes.keys()] },
  "corpus indexed",
);

app.get("/health", async () => {
  const { rows } = await db.query<{
    laws: string;
    articles: string;
    texts: string;
  }>(`
    SELECT (SELECT count(*) FROM laws)          AS laws,
           (SELECT count(*) FROM articles)      AS articles,
           (SELECT count(*) FROM article_texts) AS texts
  `);
  const r = rows[0]!;
  return {
    status: "ok" as const,
    corpus: {
      laws: Number(r.laws),
      articles: Number(r.articles),
      texts: Number(r.texts),
    },
  };
});

app.post("/api/v1/ask", async (request, reply) => {
  const parsed = askRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply
      .status(400)
      .send({ error: "invalid_request", detail: parsed.error.issues });
  }
  const { question, language, limit } = parsed.data;

  const index = indexes.get(language);
  const hits = (index?.search(question, limit) ?? []).filter(
    (h) => h.score >= SCORE_FLOOR[language],
  );

  const response: AskResponse = {
    kind: hits.length > 0 ? "shortlist" : "none",
    question,
    language,
    citations: hits.map((h) => toCitation(h.item, h.score)),
    notice:
      hits.length > 0 ? NOTICES[language].shortlist : NOTICES[language].none,
  };
  return response;
});

app.get<{
  Params: { articleNumber: string };
  Querystring: { language?: Language };
}>("/api/v1/articles/:articleNumber", async (request, reply) => {
  const language = request.query.language ?? "rw";
  const { rows } = await db.query<ArticleRow>(
    `SELECT a.id AS article_id, a.article_number, a.ordinal, at.heading, at.body,
              at.language, at.is_official, l.law_number, lt.title AS law_title,
              l.status AS law_status, l.coverage AS law_coverage,
              l.gazette_ref, ex.body AS explanation
         FROM article_texts at
         JOIN articles a ON a.id = at.article_id
         JOIN laws l ON l.id = a.law_id
         LEFT JOIN law_texts lt ON lt.law_id = l.id AND lt.language = at.language
         LEFT JOIN explanations ex ON ex.article_id = a.id AND ex.language = at.language
                                  AND ex.review_status = 'approved'
        WHERE a.article_number = $1 AND at.language = $2
        LIMIT 1`,
    [request.params.articleNumber, language],
  );
  const row = rows[0];
  if (!row) return reply.status(404).send({ error: "not_found" });
  return toCitation(row, 1);
});

await app.listen({ port: PORT, host: "0.0.0.0" });
