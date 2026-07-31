#!/usr/bin/env node
/**
 * Human review of everything a model wrote.
 *
 *   npm run review:export -w @mylo/pipeline -- [--kind questions|explanations]
 *   # edit the file it writes
 *   npm run review:import -w @mylo/pipeline -- [--file review-questions.md]
 *
 * Nothing generated is served until a person approves it. That rule is the
 * difference between a plain-language aid and an unreviewed claim about the law,
 * and until now it had no way to be satisfied: the review state existed in the
 * schema with nothing that could change it.
 *
 * Why a file rather than a prompt-by-prompt terminal review. There are several
 * hundred items, they are best judged in batches against the article they came
 * from, and a reviewer who has to answer one prompt at a time will start
 * pressing approve. A file opens in any editor, can be searched, corrected,
 * diffed, put in front of a lawyer who does not use a terminal, and reviewed on
 * a plane. It also leaves an artefact of what was decided, which a keystroke
 * does not.
 *
 * Nothing is applied on export. The file is inert until `review:import` reads it
 * back, so an interrupted or abandoned review changes nothing.
 *
 * Decisions:
 *
 *   approve       serve it
 *   reject        do not serve it; keep it, so the same text is not regenerated
 *   unanswerable  questions only — the Constitution does not answer this. These
 *                 are the most valuable rows in the table: they map what people
 *                 need to know that the corpus does not cover, which is the
 *                 referral case and the argument for the next law to ingest.
 *   skip          undecided; the default, and what an unedited file means
 */
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/mylo";

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const MODE = args.includes("--import") ? "import" : "export";
const KIND = flag("kind", "questions");
const FILE = flag("file", `review-${KIND}.md`);
const LIMIT = Number.parseInt(flag("limit", "0"), 10);
const REVIEWER = flag("reviewer", "");

if (!["questions", "explanations"].includes(KIND)) {
  console.error(`--kind must be "questions" or "explanations"`);
  process.exit(1);
}

const db = new pg.Pool({ connectionString: DATABASE_URL });

/** Keeps an article's official text readable in the file without losing sense. */
const excerpt = (text, max = 320) =>
  text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;

/* ── export ───────────────────────────────────────────────────────────────── */

async function loadQuestions() {
  const { rows } = await db.query(
    `SELECT qb.id,
            a.article_number,
            a.ordinal,
            max(at.heading) FILTER (WHERE at.language = 'en') AS heading,
            max(at.body)    FILTER (WHERE at.language = 'en') AS official,
            jsonb_object_agg(qbt.language, qbt.body)          AS phrasings
       FROM question_bank qb
       JOIN question_bank_articles qba ON qba.question_id = qb.id
       JOIN question_bank_texts qbt    ON qbt.question_id = qb.id
       JOIN articles a                 ON a.id = qba.article_id
       LEFT JOIN article_texts at      ON at.article_id = a.id
      WHERE qb.review_status = 'draft'
      GROUP BY qb.id, a.article_number, a.ordinal
      ORDER BY a.ordinal, qb.id
      ${LIMIT > 0 ? `LIMIT ${LIMIT}` : ""}`,
  );
  return rows;
}

async function loadExplanations() {
  const { rows } = await db.query(
    `SELECT ex.id,
            a.article_number,
            a.ordinal,
            ex.language,
            ex.body,
            ex.generated_by_model,
            at.heading,
            at.body AS official
       FROM explanations ex
       JOIN articles a       ON a.id = ex.article_id
       LEFT JOIN article_texts at
              ON at.article_id = a.id AND at.language = ex.language
      WHERE ex.review_status = 'draft'
      ORDER BY a.ordinal, ex.language
      ${LIMIT > 0 ? `LIMIT ${LIMIT}` : ""}`,
  );
  return rows;
}

function renderQuestions(rows) {
  const out = [
    `# MyLo review — question bank`,
    ``,
    `${rows.length} draft question(s). Mark each \`decision:\` line with one of:`,
    ``,
    `    approve | reject | unanswerable | skip`,
    ``,
    `A banked question is an index key, never an assertion — it is used to help a`,
    `reader's wording find the right article, and is never shown to them. So judge`,
    `it on one thing: **does this article actually answer this question?**`,
    ``,
    `Nothing here is applied until you run \`review:import\`.`,
    ``,
    `---`,
    ``,
  ];

  rows.forEach((r, i) => {
    out.push(`## [${i + 1}] id ${r.id}`);
    out.push(``);
    out.push(`Article ${r.article_number} — ${r.heading ?? "(no heading)"}`);
    out.push(``);
    out.push(`> ${excerpt(r.official ?? "")}`);
    out.push(``);
    for (const lang of ["rw", "en", "fr"]) {
      if (r.phrasings?.[lang]) out.push(`    ${lang}  ${r.phrasings[lang]}`);
    }
    out.push(``);
    out.push(`decision: skip`);
    out.push(``);
  });

  return out.join("\n");
}

function renderExplanations(rows) {
  const out = [
    `# MyLo review — explanations`,
    ``,
    `${rows.length} draft explanation(s). Mark each \`decision:\` line with one of:`,
    ``,
    `    approve | reject | skip`,
    ``,
    `An explanation IS shown to the reader, beside the article it explains. It`,
    `must not add, remove or soften any obligation the official text creates.`,
    `If it is merely clumsy, reject it — a missing explanation costs a reader`,
    `nothing, and a wrong one costs them their case.`,
    ``,
    `Nothing here is applied until you run \`review:import\`.`,
    ``,
    `---`,
    ``,
  ];

  rows.forEach((r, i) => {
    out.push(`## [${i + 1}] id ${r.id}`);
    out.push(``);
    out.push(
      `Article ${r.article_number} (${r.language}) — ${r.heading ?? "(no heading)"}` +
        (r.generated_by_model ? `   · written by ${r.generated_by_model}` : ""),
    );
    out.push(``);
    out.push(`Official text:`);
    out.push(`> ${excerpt(r.official ?? "", 600)}`);
    out.push(``);
    out.push(`Proposed explanation:`);
    out.push(`> ${r.body}`);
    out.push(``);
    out.push(`decision: skip`);
    out.push(``);
  });

  return out.join("\n");
}

/* ── import ───────────────────────────────────────────────────────────────── */

const VALID = new Set(["approve", "reject", "unanswerable", "skip"]);

/**
 * Reads decisions back out of the edited file.
 *
 * Pairs each `## [n] id <uuid>` heading with the next `decision:` line. An
 * unrecognised decision is a hard error rather than a silent skip: a typo like
 * "aprove" must not read as "leave it unpublished", because the reviewer would
 * believe they had approved it.
 */
function parseDecisions(text) {
  const decisions = [];
  let current = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const head = line.match(/^##\s*\[\d+\]\s*id\s+([0-9a-f-]{36})\s*$/i);
    if (head) {
      current = head[1];
      continue;
    }
    const dec = line.match(/^decision:\s*(\S+)\s*$/i);
    if (dec && current) {
      const value = dec[1].toLowerCase();
      if (!VALID.has(value)) {
        throw new Error(
          `unrecognised decision "${dec[1]}" for id ${current}. ` +
            `Use one of: ${[...VALID].join(", ")}`,
        );
      }
      decisions.push({ id: current, decision: value });
      current = null;
    }
  }
  return decisions;
}

/** Resolves an optional reviewer email to a user id, so the record says who. */
async function resolveReviewer() {
  if (!REVIEWER) return null;
  const { rows } = await db.query(`SELECT id FROM users WHERE email = $1`, [
    REVIEWER,
  ]);
  if (rows.length === 0) {
    console.error(
      `No user with email ${REVIEWER}. Review is recorded without an owner —\n` +
        `re-run with a registered address if you need the record attributed.`,
    );
    return null;
  }
  return rows[0].id;
}

async function applyQuestions(decisions, reviewerId) {
  const counts = { approve: 0, reject: 0, unanswerable: 0, skip: 0 };
  await db.query("BEGIN");
  try {
    for (const { id, decision } of decisions) {
      counts[decision] += 1;
      if (decision === "skip") continue;
      await db.query(
        `UPDATE question_bank
            SET review_status = $2,
                unanswerable  = $3,
                reviewed_by   = $4,
                reviewed_at   = now(),
                updated_at    = now()
          WHERE id = $1`,
        [
          id,
          decision === "approve" ? "approved" : "rejected",
          decision === "unanswerable",
          reviewerId,
        ],
      );
    }
    await db.query("COMMIT");
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
  return counts;
}

async function applyExplanations(decisions, reviewerId) {
  const counts = { approve: 0, reject: 0, unanswerable: 0, skip: 0 };
  await db.query("BEGIN");
  try {
    for (const { id, decision } of decisions) {
      counts[decision] += 1;
      if (decision === "skip") continue;
      if (decision === "unanswerable") {
        throw new Error(
          `"unanswerable" applies to questions, not explanations (id ${id})`,
        );
      }
      await db.query(
        `UPDATE explanations
            SET review_status = $2,
                reviewed_by   = $3,
                reviewed_at   = now(),
                updated_at    = now()
          WHERE id = $1`,
        [id, decision === "approve" ? "approved" : "rejected", reviewerId],
      );
    }
    await db.query("COMMIT");
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
  return counts;
}

/* ── run ──────────────────────────────────────────────────────────────────── */

try {
  if (MODE === "export") {
    const rows =
      KIND === "questions" ? await loadQuestions() : await loadExplanations();

    if (rows.length === 0) {
      console.log(`No draft ${KIND} to review.`);
    } else {
      const body =
        KIND === "questions" ? renderQuestions(rows) : renderExplanations(rows);
      writeFileSync(FILE, body, "utf8");
      console.log(`Wrote ${rows.length} draft ${KIND} to ${FILE}`);
      console.log(
        `\nEdit the decision lines, then:\n` +
          `  npm run review:import -w @mylo/pipeline -- --kind ${KIND} --file ${FILE}`,
      );
    }
  } else {
    const decisions = parseDecisions(readFileSync(FILE, "utf8"));
    if (decisions.length === 0) {
      console.error(
        `No decisions found in ${FILE}. Expected "## [n] id <uuid>" blocks each\n` +
          `followed by a "decision:" line — the format review:export writes.`,
      );
      process.exitCode = 1;
    } else {
      const reviewerId = await resolveReviewer();
      const counts =
        KIND === "questions"
          ? await applyQuestions(decisions, reviewerId)
          : await applyExplanations(decisions, reviewerId);

      console.log(`Read ${decisions.length} decision(s) from ${FILE}\n`);
      console.log(`  approved      ${counts.approve}`);
      console.log(`  rejected      ${counts.reject}`);
      if (KIND === "questions")
        console.log(`  unanswerable  ${counts.unanswerable}`);
      console.log(`  left undecided ${counts.skip}`);

      if (KIND === "questions" && counts.approve > 0) {
        console.log(
          `\nApproved questions are appended to the search index, which lengthens\n` +
            `documents and shifts every IDF weight. Re-derive the score floor before\n` +
            `trusting the refusal behaviour:  npm run eval:threshold`,
        );
      }
    }
  }
} catch (err) {
  console.error(`Review failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await db.end();
}
