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
  gazette_ref: string | null;
  explanation: string | null;
}

/**
 * Below this BM25 score, MyLo says it does not know.
 *
 * Derived by `npm run eval:threshold`, not chosen. Character n-gram BM25 always
 * ranks something — ask the Constitution about banana bread and the top hit
 * still scores about 6 — so without a floor the "the corpus does not answer
 * this" branch is unreachable and the honesty promise is decorative.
 *
 * The values differ per language because the score scales genuinely differ:
 * Kinyarwanda's agglutination produces longer shared character runs. Measured
 * against fluent off-topic questions in each language, these reject all of the
 * noise while keeping 97% / 97% / 99% of the hardest real queries — and that
 * retention is a pessimistic bound, measured on article headings, which are far
 * shorter than anything a person actually types.
 *
 * Re-derive after any change to the corpus, the tokeniser, or k1/b. The corpus
 * is not a fixed input: repairing headings that wrapped across a column moved
 * the Kinyarwanda figure from 71% to 97% without touching a line of this file.
 */
const SCORE_FLOOR: Record<Language, number> = { rw: 31, en: 30, fr: 22 };

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

  const byLanguage = new Map<Language, Indexed<ArticleRow>[]>();
  for (const row of rows) {
    const list = byLanguage.get(row.language) ?? [];
    // Heading and body are indexed together: a heading is short but highly
    // discriminative, and many questions echo its wording.
    list.push({ item: row, text: `${row.heading ?? ""} ${row.body}` });
    byLanguage.set(row.language, list);
  }

  const indexes = new Map<Language, Bm25Index<ArticleRow>>();
  for (const [lang, list] of byLanguage) indexes.set(lang, new Bm25Index(list));
  return { indexes, count: rows.length };
}

const toCitation = (row: ArticleRow, score: number): Citation => ({
  lawNumber: row.law_number,
  lawTitle: row.law_title ?? row.law_number,
  gazetteRef: row.gazette_ref,
  lawStatus: row.law_status,
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

const { indexes, count } = await buildIndexes();
app.log.info(
  { texts: count, languages: [...indexes.keys()] },
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
              l.status AS law_status, l.gazette_ref, ex.body AS explanation
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
