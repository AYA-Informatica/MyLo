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
import rateLimit from "@fastify/rate-limit";
import pg from "pg";
import {
  askRequestSchema,
  type AskResponse,
  type Citation,
  type Language,
  type Limitation,
} from "@mylo/domain";
import { Bm25Index, NGRAM, type Indexed } from "./retrieval.ts";
import {
  SERVED_STATUSES,
  CORPUS_SHAPE_SQL,
  fingerprintCorpusShape,
  fingerprintRetrievalConfig,
} from "@mylo/domain/corpus-fingerprint";
import { SYNONYMS, expandQuery } from "@mylo/domain/synonyms";
import { readFileSync } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
  effective_from: string | null;
  explanation: string | null;
}

/**
 * Below this BM25 score, MyLo says it does not know.
 *
 * Read from `packages/pipeline/out/score-floors.json`, which
 * `eval:threshold-live` writes, rather than typed in here. They used to be a
 * constant that a person was told to paste in after re-running the evaluation,
 * alongside a second constant recording which corpus they described. Two hand-
 * maintained numbers in a different package from the script that derives them is
 * a sync that stops happening, and this one fails silently: a drifted floor does
 * not error, it answers questions it should decline.
 *
 * Derived, not chosen. Character n-gram BM25 always ranks something — ask the
 * Constitution about banana bread and the top hit still scores about 6 — so
 * without a floor the "the corpus does not answer this" branch is unreachable
 * and the honesty promise is decorative.
 *
 * The floors sit just above measured noise rather than slightly below the
 * separator. An earlier version shrank the cut by 5% to avoid overfitting a
 * small noise sample, which put the Kinyarwanda floor at 33 against noise
 * reaching 34.2, and a question about cooking bananas came back citing the state
 * budget article. The cautious-looking margin had guaranteed a known-bad query
 * would pass.
 *
 * Missing file is fatal rather than defaulted. Serving with an uncalibrated
 * floor is the one failure mode that looks exactly like working correctly.
 */
const FLOORS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "packages",
  "pipeline",
  "out",
  "score-floors.json",
);

interface FloorArtifact {
  floors: Record<Language, number>;
  derivedAgainst: {
    fingerprint: string;
    laws: number;
    texts: number;
    servedStatuses: string[];
    bankRows: number;
    /** Absent in floors derived before query expansion existed. */
    retrievalConfig?: string;
  };
  derivedAt: string;
  queryModel: string;
}

let floorArtifact: FloorArtifact;
try {
  floorArtifact = JSON.parse(
    readFileSync(FLOORS_PATH, "utf8"),
  ) as FloorArtifact;
} catch {
  console.error(
    `No score floors at ${FLOORS_PATH}.\n\n` +
      `MyLo will not serve without them. Character BM25 always ranks something,\n` +
      `so with no floor every off-topic question gets a confident citation and\n` +
      `the "I don't know" branch is unreachable.\n\n` +
      `Derive them:  npm run eval:threshold-live -w @mylo/pipeline`,
  );
  process.exit(1);
}

const SCORE_FLOOR: Record<Language, number> = floorArtifact.floors;

/**
 * What the reader is told, in their own language.
 *
 * The "none" notice offers something rather than ending the conversation. It
 * used to say only that the reader might wish to find a verified law firm, with
 * no way to reach one — the least useful thing to say to someone facing a court
 * process precisely because they cannot afford a lawyer.
 *
 * These name the corpus rather than the Constitution. While one law was loaded
 * the two were the same thing; now a reader asking about employment can be told
 * "the Constitution does not answer this" about a labour law MyLo is holding,
 * which is both wrong and the kind of wrong that reads as authoritative.
 *
 * These are part of the product, not client-side decoration. At current
 * retrieval accuracy the honest thing is to offer candidates rather than assert
 * one answer, and to say plainly when the corpus has nothing.
 */
const NOTICES: Record<Language, { shortlist: string; none: string }> = {
  rw: {
    shortlist:
      "Dore ingingo z’amategeko zishobora kuba zisubiza ikibazo cyawe. Soma umwimerere w’ingingo.",
    none: "Amategeko MyLo afite ntasubiza iki kibazo. MyLo ishobora kwandika ikibazo cyawe kugira ngo kizasubizwe, cyangwa ushobora kubaza umunyamategeko wemewe.",
  },
  en: {
    shortlist:
      "These articles may answer your question. Read the official text.",
    none: "The laws MyLo holds do not answer this question. MyLo can record what you needed so it can be answered later, or you may wish to ask a verified law firm.",
  },
  fr: {
    shortlist:
      "Ces articles peuvent répondre à votre question. Lisez le texte officiel.",
    none: "Les lois que MyLo détient ne répondent pas à cette question. MyLo peut enregistrer votre demande pour qu'elle soit traitée plus tard, ou vous pouvez consulter un cabinet vérifié.",
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
  const { rows } = await db.query<ArticleRow>(
    `
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
           l.effective_from,
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
     WHERE l.status = ANY($1)
     ORDER BY l.law_number, a.ordinal
  `,
    [SERVED_STATUSES],
  );

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

const toCitation = (
  row: ArticleRow,
  score: number,
  language: Language,
): Citation => ({
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
  effectiveFrom: row.effective_from
    ? new Date(row.effective_from).toISOString().slice(0, 10)
    : null,
  score: Number(score.toFixed(3)),
  // Shipped with the score because the score alone has no scale.
  scoreFloor: SCORE_FLOOR[language],
});

/**
 * What MyLo cannot tell the reader about these citations.
 *
 * Derived from the citations themselves rather than configured, so it cannot
 * drift from what was actually served.
 *
 * `unresolved_repeals` applies to ordinary laws and not to the Constitution.
 * The Gazette's standard closing formula repeals "all previous legal provisions
 * contrary to this law" without naming one, so for any ordinary law "in force"
 * means "not itself repealed" and cannot mean "nothing later has partly undone
 * it". The Constitution is not amended that way — it is revised by a procedure
 * it sets out itself — so claiming the caveat there would be false caution, and
 * a caveat that appears everywhere is one readers stop seeing.
 */
function limitationsFor(citations: Citation[]): Limitation[] {
  const limits = new Set<Limitation>();
  for (const c of citations) {
    if (c.lawCoverage === "partial") limits.add("partial_law");
    if (!c.isOfficial) limits.add("unofficial_translation");
    // Only approved explanations are joined, so a null one means either that
    // none was written or that none passed review. Both are the same fact to a
    // reader: there is no plain-language help for this article, and saying so is
    // better than letting its absence read as "this needs none".
    if (!c.explanation) limits.add("no_explanation");
    if (c.lawNumber !== "CONSTITUTION-2023") limits.add("unresolved_repeals");
  }
  return [...limits];
}

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });
await app.register(cors, { origin: true });

/**
 * Rate limiting, because two of these routes write and none of them authenticate.
 *
 * `POST /api/v1/unanswered` inserts a row on an unauthenticated request. Without
 * a limit one client can fill the table, and the table holds what readers could
 * not get answered — so flooding it does not merely waste disk, it buries the
 * only signal MyLo has about which law to ingest next.
 *
 * Deliberately generous for reading and tight for writing. A person working
 * through a legal problem asks a lot of questions in a short time and must not
 * be throttled for it; nobody legitimately records fifty unanswerable questions
 * an hour.
 *
 * Keyed on IP, which is the weakest possible key and the only one available:
 * there are no accounts, and requiring one to ask a legal question would exclude
 * exactly the people this exists for. It stops accidents and casual abuse and
 * would not stop anyone determined. That is the right trade here and it is worth
 * being clear about rather than implying more protection than there is.
 */
await app.register(rateLimit, {
  global: false,
  // In-process only. A second instance doubles the effective limit, which is
  // acceptable for a limit this coarse and would not be for a stricter one.
  max: 120,
  timeWindow: "1 minute",
});

const READ_LIMIT = { max: 120, timeWindow: "1 minute" };
const WRITE_LIMIT = { max: 10, timeWindow: "1 hour" };

const { indexes, count, augmented } = await buildIndexes();

const { rows: shapeRows } = await db.query(CORPUS_SHAPE_SQL, [SERVED_STATUSES]);
const corpusShape = fingerprintCorpusShape(shapeRows);
// Retrieval configuration counts as much as the corpus. Query expansion changes
// every score a query produces without changing a single article, so a check
// that watched only the corpus would have gone on reporting the floors fresh.
const retrievalConfig = fingerprintRetrievalConfig({
  ngram: NGRAM,
  synonyms: SYNONYMS,
});
const floorsStale =
  corpusShape.fingerprint !== floorArtifact.derivedAgainst.fingerprint ||
  retrievalConfig !== floorArtifact.derivedAgainst.retrievalConfig;

if (floorsStale) {
  app.log.warn(
    {
      corpus: corpusShape,
      retrievalConfig,
      floorsDerivedAgainst: floorArtifact.derivedAgainst,
      derivedAt: floorArtifact.derivedAt,
      floors: SCORE_FLOOR,
    },
    "score floors are stale: the served index is not the one they were derived " +
      "against. Re-run `npm run eval:threshold-live -w @mylo/pipeline`. Until " +
      "then MyLo may answer questions it should decline, and decline ones it " +
      "should answer.",
  );
}
app.log.info(
  { texts: count, augmented, languages: [...indexes.keys()] },
  "corpus indexed",
);

app.get("/health", { config: { rateLimit: READ_LIMIT } }, async () => {
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
      // What is held and what a reader can reach are no longer the same number.
      // Repealed and draft laws are stored but never served, so a health check
      // reporting only the table counts would tell an operator the corpus is
      // fine while every question about those laws correctly returns nothing.
      // `served` is the number the score floors are a property of. `floorsStale`
      // compares the whole shape of the index, not just its size: swapping one
      // law for another the same size leaves the count identical and the index
      // completely different.
      served: count,
      floorsDerivedAgainst: floorArtifact.derivedAgainst.texts,
      floorsStale,
    },
  };
});

/**
 * Operational view over the audit trail.
 *
 * This exists so MyLo does not need a second telemetry system. A privacy-first
 * analytics package — self-hosted, cookieless — would be the right choice for a
 * marketing page, and is the wrong thing to put on this path: it would run in
 * the reader's browser while they are looking at an answer about their own
 * legal problem, and the referrer, the timing and the page sequence would say
 * more about them than the audit row does.
 *
 * Every number below is derived from records that never contained a question.
 * The product questions worth asking — is the corpus reaching people, is the
 * floor rejecting too much, are we citing repealed law — are all answerable
 * from what was already recorded for audit.
 */
/**
 * Records a question MyLo could not answer, because the reader asked it to.
 *
 * Declining is correct and it must not be the end of the conversation. The
 * notice tells a reader to find a verified law firm and, until firms exist,
 * offers no way to reach one — which is the least useful thing to say to someone
 * facing a court process precisely because they cannot afford a lawyer.
 *
 * This is deliberately not the audit trail. The audit records every answer
 * without asking, as a property of the system; this records one question because
 * the reader asked MyLo to carry it forward. Same data, different act — and the
 * rules follow the act: nothing is written unless it is requested, it is private
 * by default, it expires, and the reader is handed the only key to delete it.
 */
app.post<{
  Body: { question?: string; language?: Language; retainDays?: number };
}>(
  "/api/v1/unanswered",
  { config: { rateLimit: WRITE_LIMIT } },
  async (request, reply) => {
    const question = (request.body?.question ?? "").trim();
    const language = request.body?.language ?? "rw";

    if (question.length < 3 || question.length > 2000) {
      return reply.status(400).send({ error: "invalid_question" });
    }
    if (!["rw", "en", "fr"].includes(language)) {
      return reply.status(400).send({ error: "invalid_language" });
    }

    // Capped rather than open-ended. A gap in the corpus stops being useful long
    // before a record of someone's legal trouble stops being sensitive.
    const retainDays = Math.min(
      Math.max(Number(request.body?.retainDays ?? 90), 1),
      365,
    );

    // Only recorded when MyLo genuinely could not answer. Otherwise this becomes
    // a general question log, which is the thing the audit design refused to be.
    const index = indexes.get(language);
    const hits = (
      index?.search(expandQuery(question, language), 1) ?? []
    ).filter((h) => h.score >= SCORE_FLOOR[language]);
    if (hits.length > 0) {
      return reply.status(409).send({ error: "answerable", kind: "shortlist" });
    }

    const handle = randomBytes(18).toString("base64url");
    await db.query(
      `INSERT INTO unanswered
       (body, language, corpus_fingerprint, served_texts, score_floor,
        floors_stale, top_score, handle, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now() + ($9 || ' days')::interval)`,
      [
        question,
        language,
        corpusShape.fingerprint,
        count,
        SCORE_FLOOR[language],
        floorsStale,
        index?.search(expandQuery(question, language), 1)[0]?.score ?? null,
        handle,
        String(retainDays),
      ],
    );

    // The handle is returned once and never again. It is the reader's only way to
    // delete what they just disclosed, so it is theirs rather than something the
    // server can look up on their behalf.
    return { recorded: true, handle, expiresInDays: retainDays };
  },
);

/** Withdraws a recorded question. The handle is the only way in. */
app.delete<{ Params: { handle: string } }>(
  "/api/v1/unanswered/:handle",
  { config: { rateLimit: WRITE_LIMIT } },
  async (request, reply) => {
    const { rowCount } = await db.query(
      `DELETE FROM unanswered WHERE handle = $1`,
      [request.params.handle],
    );
    if (!rowCount) return reply.status(404).send({ error: "not_found" });
    return { deleted: true };
  },
);

/**
 * Requires a token, and refuses to serve at all without one configured.
 *
 * `/api/v1/stats` is not sensitive the way a question is — it holds no question
 * text and never has. But answer volumes, decline rates and whether the floors
 * are stale describe the operational state of a legal service, and "not as
 * sensitive as the worst thing here" is not an argument for public.
 *
 * Unset means closed, not open. That is the same choice the API makes about
 * score floors: a missing configuration should fail toward silence, because a
 * deployment where someone forgot to set a variable is exactly the deployment
 * that should not be publishing its internals.
 */
const STATS_TOKEN = process.env.STATS_TOKEN ?? null;

app.get(
  "/api/v1/stats",
  { config: { rateLimit: READ_LIMIT } },
  async (request, reply) => {
    if (!STATS_TOKEN) {
      return reply.status(404).send({ error: "not_found" });
    }
    // Compared at full length rather than with an early-exit equality, so the
    // time taken does not narrow the token for whoever is guessing.
    const offered = (request.headers.authorization ?? "").replace(
      /^Bearer\s+/i,
      "",
    );
    const ok =
      offered.length === STATS_TOKEN.length &&
      timingSafeEqual(Buffer.from(offered), Buffer.from(STATS_TOKEN));
    if (!ok) return reply.status(401).send({ error: "unauthorized" });

    return statsPayload();
  },
);

async function statsPayload() {
  const { rows } = await db.query<{
    language: Language;
    kind: string;
    answers: string;
    stale: string;
    avg_top: string | null;
  }>(`
    SELECT language, kind,
           count(*)::text                                  AS answers,
           count(*) FILTER (WHERE floors_stale)::text       AS stale,
           round(avg(top_score)::numeric, 1)::text          AS avg_top
      FROM answer_audit
     WHERE created_at > now() - interval '30 days'
     GROUP BY language, kind
     ORDER BY language, kind
  `);

  // Citing a repealed article would be a serious failure, so it is asked
  // directly rather than left to be noticed.
  const { rows: repealed } = await db.query<{ n: string }>(`
    SELECT count(*)::text AS n
      FROM answer_audit, jsonb_array_elements(citations) c
     WHERE c->>'status' NOT IN ('active','amended')
  `);

  return {
    window: "30d",
    byLanguage: rows.map((r) => ({
      language: r.language,
      kind: r.kind,
      answers: Number(r.answers),
      servedWithStaleFloors: Number(r.stale),
      averageTopScore: r.avg_top ? Number(r.avg_top) : null,
    })),
    citationsToNonServableLaw: Number(repealed[0]?.n ?? 0),
  };
}

app.post(
  "/api/v1/ask",
  { config: { rateLimit: READ_LIMIT } },
  async (request, reply) => {
    const parsed = askRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "invalid_request", detail: parsed.error.issues });
    }
    const { question, language, limit, asOf } = parsed.data;

    const index = indexes.get(language);
    // Expanded before searching, because a right has a common name and a legal
    // name and only the legal one is printed in the Gazette. Someone asking about
    // a "fair trial" is asking about Article 29, which says "due process of law" —
    // the two share no substring a character n-gram can find. Measured on eight
    // term-of-art questions: recall@1 25% -> 100% (`eval:vocabulary`).
    //
    // The reader's own words are kept; expansion only appends. But appending is
    // not free — a phrasing that appears nowhere in the corpus dilutes the ones
    // that match, which is why entries are checked against the Gazette.
    const hits = (
      index?.search(expandQuery(question, language), limit) ?? []
    ).filter((h) => h.score >= SCORE_FLOOR[language]);

    // Point-in-time. Retrieval is unchanged and the filter is applied to what it
    // found, because the index is built once at boot and a date is a property of
    // the reader's question rather than of the corpus.
    //
    // A law with no known commencement is *withheld* from a dated question rather
    // than shown. It cannot be said to have been in force on any particular day,
    // so including it would answer a date question with a law that might not have
    // existed yet. Dropping it silently would hide law instead, which is why the
    // reader is told with `effective_date_unknown`.
    let withheldForUnknownDate = false;
    const inForce = asOf
      ? hits.filter((h) => {
          const from = h.item.effective_from;
          if (!from) {
            withheldForUnknownDate = true;
            return false;
          }
          return new Date(from) <= new Date(asOf);
        })
      : hits;

    const citations = inForce.map((h) => toCitation(h.item, h.score, language));

    const response: AskResponse = {
      // Counted after the date filter, not before. A dated question that
      // removes every hit is a "none" answer — MyLo held nothing that was in
      // force then — and labelling it a shortlist would print "here are the
      // articles" above an empty list.
      kind: citations.length > 0 ? "shortlist" : "none",
      question,
      language,
      limitations: [
        ...limitationsFor(citations),
        ...(withheldForUnknownDate
          ? (["effective_date_unknown"] as const)
          : []),
      ],
      citations,
      notice:
        citations.length > 0
          ? NOTICES[language].shortlist
          : NOTICES[language].none,
    };

    // Recorded after the response is built and awaited before returning, so an
    // audit failure surfaces rather than being swallowed — a trail with silent
    // gaps is worse than none, because the gaps look like periods of no activity.
    //
    // The question itself is deliberately absent. See the migration for why, and
    // in particular why a salted hash of it was rejected rather than adopted.
    await recordAnswer(
      response,
      corpusShape,
      retrievalConfig,
      floorsStale,
      count,
    );

    return response;
  },
);

/**
 * Writes what MyLo answered and on what basis.
 *
 * Everything here describes the system, not the person: which corpus, which
 * floors, what was cited and at what score. Enough to establish later whether an
 * answer was correct given what MyLo held that day; not enough to reconstruct
 * who asked.
 */
async function recordAnswer(
  response: AskResponse,
  corpus: { fingerprint: string },
  retrieval: string,
  stale: boolean,
  served: number,
) {
  await db.query(
    `INSERT INTO answer_audit
       (language, kind, corpus_fingerprint, retrieval_config, served_texts,
        score_floor, floors_stale, citations, top_score, limitations)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      response.language,
      response.kind,
      corpus.fingerprint,
      retrieval,
      served,
      SCORE_FLOOR[response.language],
      stale,
      JSON.stringify(
        response.citations.map((c) => ({
          law: c.lawNumber,
          article: c.articleNumber,
          score: c.score,
          status: c.lawStatus,
          coverage: c.lawCoverage,
        })),
      ),
      response.citations[0]?.score ?? null,
      JSON.stringify(response.limitations),
    ],
  );
}

/**
 * One article of one law.
 *
 * The law number is part of the path because an article number does not
 * identify anything on its own. The previous route matched on the article
 * number alone with `LIMIT 1`, which was correct while the Constitution was the
 * whole corpus and silently wrong the moment it was not: "article 3" exists in
 * every law, and the reader would have been shown whichever row came back first,
 * cited confidently under the wrong instrument.
 */
app.get<{
  Params: { lawNumber: string; articleNumber: string };
  Querystring: { language?: Language };
}>(
  "/api/v1/laws/:lawNumber/articles/:articleNumber",
  async (request, reply) => {
    const language = request.query.language ?? "rw";
    const { rows } = await db.query<ArticleRow>(
      `SELECT a.id AS article_id, a.article_number, a.ordinal, at.heading, at.body,
              at.language, at.is_official, l.law_number, lt.title AS law_title,
              l.status AS law_status, l.coverage AS law_coverage,
              l.effective_from,
              l.gazette_ref, ex.body AS explanation
         FROM article_texts at
         JOIN articles a ON a.id = at.article_id
         JOIN laws l ON l.id = a.law_id
         LEFT JOIN law_texts lt ON lt.law_id = l.id AND lt.language = at.language
         LEFT JOIN explanations ex ON ex.article_id = a.id AND ex.language = at.language
                                  AND ex.review_status = 'approved'
        WHERE l.law_number = $1 AND a.article_number = $2 AND at.language = $3
        LIMIT 1`,
      [
        decodeURIComponent(request.params.lawNumber),
        request.params.articleNumber,
        language,
      ],
    );
    const row = rows[0];
    if (!row) return reply.status(404).send({ error: "not_found" });
    return toCitation(row, 1, language);
  },
);

await app.listen({ port: PORT, host: "0.0.0.0" });
