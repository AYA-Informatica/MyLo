#!/usr/bin/env node
/**
 * Finds the provisions by which one law changes another, or itself commences.
 *
 *   npm run amendments -w @mylo/corpus -- [out/gazette]
 *
 * Phase 1.1 of docs/PLAN.md, and it was written expecting to solve a different
 * problem than the one the documents actually pose.
 *
 * The plan assumed amendments read "Article 12 of Law N° 66/2018 is amended as
 * follows" — prose, but prose naming a target, so extractable with effort. Some
 * do. The two sampled laws do not. Both close the same way, and it appears to be
 * the Gazette's standard form:
 *
 *   Art 22  All previous legal provisions contrary to this law are hereby
 *           abrogated.
 *   Art 23  This law comes into force on the day of publication in the
 *           Official Gazette.
 *
 * **A blanket repeal names no target.** "All provisions contrary to this law"
 * is not a reference that can be resolved into an edge in a graph; resolving it
 * would mean deciding which provisions of 1,400 other laws contradict this one,
 * which is legal interpretation and not something this repository should be
 * doing. Organic Law 31/2007 goes further still — Article 3 substitutes a
 * penalty "in all the legislative texts in force", a corpus-wide edit with an
 * unknown extent.
 *
 * So this extracts what is there and classifies it by whether it is resolvable,
 * rather than reporting a coverage number that quietly counts blanket clauses as
 * successes. The unresolvable fraction is the finding, not the failure.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { CITED_LAW_PATTERN, normaliseLawNumber } from "@mylo/domain/law-number";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Provision kinds, in the order they are tested.
 *
 * Targeted forms are tested before blanket ones: a law that both names a target
 * and adds a sweep clause should be recorded as targeted, because that is the
 * part that can be acted on.
 */
const KINDS = [
  {
    kind: "targeted_amendment",
    patterns: [
      /\b(is|are)\s+(hereby\s+)?(amended|modified|complemented)\b/i,
      /\bmodifying\s+and\s+complementing\b/i,
      /\b(est|sont)\s+modifiée?s?\b/i,
      /\bportant\s+modification\b/i,
      /\brivugururwa\b/i,
      /\brihindura\b/i,
    ],
  },
  {
    kind: "substitution",
    patterns: [
      /\bis\s+substituted\s+by\b/i,
      /\best\s+remplacée?\s+par\b/i,
      /\bgisimbujwe\b/i,
      /\bisimbuzwa\b/i,
    ],
  },
  {
    kind: "repeal",
    patterns: [
      /\b(is|are)\s+(hereby\s+)?(repealed|abrogated)\b/i,
      /\b(est|sont)\s+abrogée?s?\b/i,
      /\bzivanyweho\b/i,
      /\bivanyweho\b/i,
    ],
  },
  {
    // Tested last, and required to be self-referential.
    //
    // Laws mention their own commencement constantly — "before the commencement
    // of this Organic Law" appears in transitional provisions, substitutions and
    // savings clauses — and in Kinyarwanda that reads "mbere y'uko iri tegeko
    // ngenga ritangira gukurikizwa", which contains the commencement formula
    // verbatim. Only the preceding "mbere y'uko" distinguishes a reference from
    // the provision itself.
    //
    // This is the same shape of bug as "not in force" containing "in force":
    // the phrase that names a thing also appears inside the phrase that negates
    // or defers it, and matching on presence alone gets it backwards.
    kind: "commencement",
    patterns: [
      /\bthis\s+(organic\s+)?law\s+(shall\s+)?comes?\s+into\s+force\b/i,
      /\bla\s+présente\s+loi\s+(organique\s+)?entre\s+en\s+vigueur\b/i,
      /\biri\s+tegeko\s+(ngenga\s+)?ritangira\s+gukurikizwa\b/i,
    ],
    // Within this many characters before the match, these words make it a
    // reference to commencement rather than an enactment of it.
    notPrecededBy: /\b(before|prior\s+to|avant|mbere)\b[^.]{0,40}$/i,
  },
];

/**
 * Marks a repeal or amendment that names no target.
 *
 * "All provisions contrary to this law" is the Gazette's standard closing
 * formula and is the single most common form in the sample. It is recognised so
 * it can be counted, not so it can be resolved.
 */
const BLANKET = [
  /\ball\s+(previous\s+)?(legal\s+)?provisions\s+contrary\b/i,
  /\ball\s+prior\s+(legal\s+)?provisions\b/i,
  /\btoutes\s+les\s+dispositions\s+(légales\s+)?(antérieures\s+)?(et\s+)?contraires\b/i,
  /\bingingo\s+zose\s+z[’']amategeko\b/i,
  /\bin\s+all\s+the\s+legislative\s+texts\b/i,
];

/** Commencement on publication, versus on a stated date. */
const ON_PUBLICATION = [
  /\bday\s+of\s+(its\s+)?publication\b/i,
  /\bdate\s+of\s+its\s+publication\b/i,
  /\bjour\s+de\s+sa\s+publication\b/i,
  /\bku\s+munsi\s+ritangarijweho\b/i,
];

export function classify(body) {
  for (const { kind, patterns, notPrecededBy } of KINDS) {
    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (!match) continue;
      if (notPrecededBy && notPrecededBy.test(body.slice(0, match.index))) {
        continue;
      }
      return { kind };
    }
  }
  return null;
}

function citedLaws(body, self) {
  const found = new Set();
  // A fresh regex per call: CITED_LAW_PATTERN is global, and a shared global
  // regex carries `lastIndex` between calls, so reusing the exported one
  // directly would skip matches in every article after the first.
  const pattern = new RegExp(CITED_LAW_PATTERN.source, "gi");
  for (const match of body.matchAll(pattern)) {
    const number = normaliseLawNumber(match[0]);
    if (number && number !== self) found.add(number);
  }
  return [...found];
}

export function extractProvisions(parsed) {
  const self = normaliseLawNumber(parsed.source.lawNumber);
  const provisions = [];

  for (const article of parsed.articles) {
    // One provision per article, decided from whichever language states it most
    // clearly. Each language expresses the same rule, so agreement is a check
    // and disagreement is worth surfacing rather than averaging away.
    const verdicts = Object.entries(article.texts)
      .map(([language, text]) => ({
        language,
        body: text.body,
        ...(classify(text.body) ?? {}),
      }))
      .filter((v) => v.kind);

    if (verdicts.length === 0) continue;

    const kinds = [...new Set(verdicts.map((v) => v.kind))];
    const primary = verdicts[0];
    const body = primary.body;
    const targets = citedLaws(verdicts.map((v) => v.body).join(" "), self);
    const blanket = verdicts.some((v) => BLANKET.some((p) => p.test(v.body)));

    provisions.push({
      article: article.number,
      kind: primary.kind,
      languagesAgree: kinds.length === 1,
      kindsSeen: kinds,
      blanket,
      targets,
      // A repeal or amendment is only actionable if it says what it acts on.
      // Commencement is self-referential and needs no target.
      resolvable:
        primary.kind === "commencement" ? true : targets.length > 0 && !blanket,
      commencesOnPublication:
        primary.kind === "commencement" &&
        verdicts.some((v) => ON_PUBLICATION.some((p) => p.test(v.body))),
      excerpt: body.slice(0, 160),
    });
  }

  return provisions;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = resolve(process.argv[2] ?? join(here, "..", "out", "gazette"));
  // Parses identify themselves; sidecars — including the one this script writes
  // — do not need to be listed. An ignore list has to be updated by every tool
  // that adds an output, and was not.
  const files = readdirSync(target)
    .filter((f) => extname(f) === ".json")
    .map((f) => join(target, f))
    .filter((f) => {
      try {
        return JSON.parse(readFileSync(f, "utf8")).kind === "gazette-parse";
      } catch {
        return false;
      }
    });

  const report = [];
  const totals = {
    laws: 0,
    withRepeal: 0,
    withCommencement: 0,
    resolvable: 0,
    blanket: 0,
    substitution: 0,
    disagree: 0,
  };

  for (const file of files) {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (!parsed.source.lawNumber) continue;
    const provisions = extractProvisions(parsed);
    totals.laws += 1;

    for (const p of provisions) {
      if (p.kind === "repeal") totals.withRepeal += 1;
      if (p.kind === "commencement") totals.withCommencement += 1;
      if (p.kind === "substitution") totals.substitution += 1;
      if (p.blanket) totals.blanket += 1;
      if (p.resolvable) totals.resolvable += 1;
      if (!p.languagesAgree) totals.disagree += 1;
    }

    report.push({ lawNumber: parsed.source.lawNumber, provisions });

    console.log(`${parsed.source.lawNumber}`);
    for (const p of provisions) {
      const mark = p.resolvable ? " " : "!";
      console.log(
        `  ${mark} art ${String(p.article).padStart(3)}  ${p.kind.padEnd(19)}` +
          `${p.blanket ? "blanket " : ""}` +
          `${p.targets.length ? `-> ${p.targets.join(", ")} ` : ""}` +
          `${!p.languagesAgree ? `[${p.kindsSeen.join("/")}] ` : ""}`,
      );
    }
  }

  const outPath = join(target, "provisions.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

  const provisionCount = report.reduce((n, r) => n + r.provisions.length, 0);
  const unresolvable = provisionCount - totals.resolvable;

  console.log(`\n${totals.laws} laws, ${provisionCount} provisions found`);
  console.log(`  commencement   ${totals.withCommencement}`);
  console.log(`  repeal         ${totals.withRepeal}`);
  console.log(`  substitution   ${totals.substitution}`);
  console.log(`  blanket        ${totals.blanket}  (name no target)`);
  if (totals.disagree) {
    console.log(`  languages disagree on kind: ${totals.disagree}`);
  }
  console.log(
    `\n${totals.resolvable}/${provisionCount} resolvable to a specific law.`,
  );

  if (unresolvable) {
    console.log(
      `\n${unresolvable} provision(s) change the law without saying what they\n` +
        `change. Resolving those means deciding which provisions of which other\n` +
        `laws contradict this one, which is interpretation, not extraction.\n\n` +
        `The product consequence is the point: laws.supersededById will be sparse,\n` +
        `and "this law is in force" cannot by itself mean "nothing later has\n` +
        `partly undone it". A reader has to be told that.`,
    );
  }
  console.log(`\nWrote ${outPath}`);
}

/**
 * Which law an amending law amends, and which of its articles.
 *
 * Phase 1.1 concluded from a two-law sample that Rwandan practice favours
 * blanket repeals, and treated targeted amendment as a shape the extractor
 * supported in theory. A live 2026 issue disproved the "in theory". Both the
 * title and the recitals state the target, and the recitals state the articles:
 *
 *   LAW Nº 017/2026 OF 23/04/2026 AMENDING LAW N° 017/2020 OF 07/10/2020
 *   Isubiye ku Itegeko n° 017/2020 ryo ku wa 07/10/2020 ... mu ngingo zaryo,
 *   iya 3 n'iya 4
 *
 * Two sources, deliberately kept apart rather than merged. The title declares
 * what the law is *for* and is the stronger claim; a recital only says the
 * drafters looked at something. Almost every instrument recites the
 * Constitution, and reading a recital as an amendment would have every law in
 * the corpus amending it.
 */

/** The title's own statement of purpose: "AMENDING LAW N° X". */
const AMENDS_IN_TITLE =
  /(?:AMENDING|MODIFYING|COMPLEMENTING|RIHINDURA|RIVUGURURA|PORTANT\s+MODIFICATION\s+DE|MODIFIANT)\b/i;

/** "Having reviewed Law n° X", "Isubiye ku Itegeko n° X", "Revu la Loi n° X". */
const REVIEWED = /(?:Isubiye\s+ku|Having\s+reviewed|Revu\s+la|Revue\s+la)\b/i;

/**
 * The articles an amendment names, from the clause that names them.
 *
 * "in its articles 3 and 4" / "mu ngingo zaryo, iya 3 n'iya 4" / "en ses
 * articles 3 et 4". Bounded to the clause: article numbers appear all over a
 * law's text, and collecting them document-wide would claim an amendment
 * touches every article it happens to mention.
 */
const NAMED_ARTICLES =
  /(?:in\s+its\s+articles?|mu\s+ngingo\s+za?ryo|en\s+ses\s+articles?|ingingo\s+ya)\b([^.;]{0,80})/i;

function articleNumbersIn(clause) {
  return [...new Set((clause ?? "").match(/\d{1,4}/g) ?? [])];
}

/**
 * Returns `[{lawNumber, articles, source}]` for the laws this one amends.
 *
 * `source` is `title` or `recital`, kept so a consumer can weigh them. A title
 * amendment is the law's declared purpose; a recital is a reference the drafters
 * made, which is weaker evidence and much more common.
 */
export function extractAmendments(parsed) {
  const self = normaliseLawNumber(parsed.source?.lawNumber ?? null);
  const found = new Map();

  const record = (lawNumber, articles, source) => {
    if (!lawNumber || lawNumber === self) return;
    const existing = found.get(lawNumber);
    // A target named in both title and recital is a title amendment: the
    // stronger claim wins rather than the later one.
    if (existing && existing.source === "title" && source === "recital") {
      for (const a of articles) existing.articles.add(a);
      return;
    }
    if (existing) {
      for (const a of articles) existing.articles.add(a);
      existing.source = source === "title" ? "title" : existing.source;
      return;
    }
    found.set(lawNumber, { articles: new Set(articles), source });
  };

  for (const title of Object.values(parsed.source?.titles ?? {})) {
    if (!AMENDS_IN_TITLE.test(title)) continue;
    // Only what follows the amending verb: the title states the amending law's
    // own number first, and that is not the target.
    const after = title.split(AMENDS_IN_TITLE).slice(1).join(" ");
    const target = normaliseLawNumber(after);
    record(target, [], "title");
  }

  for (const article of parsed.articles ?? []) {
    for (const text of Object.values(article.texts ?? {})) {
      const body = `${text.heading ?? ""} ${text.body ?? ""}`;
      if (!REVIEWED.test(body)) continue;
      for (const clause of body.split(REVIEWED).slice(1)) {
        const target = normaliseLawNumber(clause);
        if (!target) continue;
        record(
          target,
          articleNumbersIn(clause.match(NAMED_ARTICLES)?.[1]),
          "recital",
        );
      }
    }
  }

  return [...found].map(([lawNumber, v]) => ({
    lawNumber,
    articles: [...v.articles].sort((a, b) => Number(a) - Number(b)),
    source: v.source,
  }));
}
