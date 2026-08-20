#!/usr/bin/env node
/**
 * Parses a Rwandan court judgment in law-report format.
 *
 *   npm run ingest:judgments -w @mylo/corpus -- <file.pdf | directory>
 *
 * Phase 5. Judgments are not laws and the differences run deeper than the
 * schema. A statute says what the law is; a judgment says what a court held, on
 * particular facts, at a particular level of a hierarchy — and a High Court
 * decision later overturned is exactly the kind of thing that must never be
 * served as settled law.
 *
 * Structurally they are also the opposite of the Gazette. Laws are set in three
 * parallel columns and every law carries all three languages. Judgments are
 * single-column, **one language per document**, and the same judgment appears as
 * separate files per language — measured on this corpus, one case number had a
 * Kinyarwanda version and two English ones.
 *
 * What they add, and laws did not, is a **structured citation list**. Every
 * judgment ends its headnote with the statutes and the prior cases it relied on,
 * by number:
 *
 *     Statutes and statutory instruments referred to:
 *       Law n0 22/2018 of 29/04/2018 ..., article 158 and 260.
 *     Case laws referred to:
 *       RS/INJUST/RC 00024/2018/CS decided on 21/02/2020, involving ...
 *
 * That is a real citation graph, stated rather than implied — unlike the blanket
 * repeals in Phase 1.1, which named nothing and could not be resolved at all.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { normaliseLawNumber } from "@mylo/domain/law-number";

/**
 * The court header, always in square brackets on the first page.
 *
 *     [Rwanda SUPREME COURT– RS/INJUST/RCOM 00006/2023/SC]
 *     [Rwanda URUKIKO RW’UBUJURIRE – RCOMAA 00064/2022/CA, (Ngagi, P.J.,) 21 Ukwakira 2022]
 *
 * The closing bracket is not reliable: some judgments close it after the case
 * number and then continue with judges and date outside it, some close after the
 * date, and at least one never closes it at all. So the header is taken as a
 * span from the opening bracket rather than as a bracketed group, and each field
 * is found within that span independently.
 */
const HEADER_START = /\[\s*Rwanda\b/i;

/** A gap of about a character is a real space; smaller is one word split in two. */
const GAP_IS_SPACE = 1;
const HEADER_SPAN = 320;

/**
 * Case numbers, as the registry assigns them: `PREFIX NNNNN/YYYY/COURT`.
 *
 * The prefix encodes the case type (RCOMAA commercial appeal, RPAA criminal
 * appeal, RS/INJUST review for injustice) and the suffix the court. Spacing
 * between prefix and serial is not consistent — "RCAA00026/2018/CA" and
 * "RS/INJUST/RCOM 00006/2023/SC" are both normal — so it is optional here and
 * normalised away.
 */
const CASE_NUMBER =
  /\b((?:[A-Z]+\s*\/\s*)*[A-Z]{2,8})\s*(\d{4,6})\s*\/\s*(\d{4})\s*\/\s*([A-Z]{2,3}(?:\/[A-Z]{2,4})?)\b/;

/**
 * Spacing inside a case number carries no meaning and must not survive.
 *
 * The corpus contains "RS/ INJUST/RC 00004/2019/SC" with a space after the
 * first slash. Left in, it becomes a different string from "RS/INJUST/RC
 * 00004/2019/SC" — which is the same judgment — and the precedent graph gains a
 * phantom case that nothing links to.
 */
export const canonicalCaseNumber = (prefix, serial, year, court) =>
  `${prefix.replace(/\s+/g, "")} ${serial}/${year}/${court}`;

/**
 * Court codes as they appear in the case-number suffix.
 *
 * `CS` is the French abbreviation for the Supreme Court and appears in older
 * citations alongside `SC`; both are the same court and must normalise together
 * or a precedent graph will treat them as two.
 */
const COURT_BY_CODE = {
  SC: "supreme_court",
  CS: "supreme_court",
  CA: "court_of_appeal",
  HC: "high_court",
  TC: "commercial_court",
  TGI: "intermediate_court",
};

/**
 * Court names as printed, in both languages.
 *
 * Kept separately from the code above because the two disagree in this corpus —
 * at least one judgment is headed URUKIKO RUKURU (High Court) while its case
 * number ends /CA (Court of Appeal). Neither is silently preferred; the conflict
 * is recorded, because a judgment filed at the wrong level of the hierarchy is
 * a fact about the document that a person should look at.
 *
 * Spelling is not stable either: RW’UBUJURIRE, R’UBUJURIRE (missing W), and
 * "Rw ubujurire" all occur. Matching is therefore loose on the apostrophe and
 * the connecting letters.
 */
const COURT_BY_NAME = [
  [/URUKIKO\s+RW?\s*[’'‚]?\s*IKIRENGA/i, "supreme_court"],
  [/SUPREME\s+COURT/i, "supreme_court"],
  [/COUR\s+SUPR[ÊE]ME/i, "supreme_court"],
  [/URUKIKO\s+RW?\s*[’'‚]?\s*UBUJURIRE/i, "court_of_appeal"],
  [/COURT\s+OF\s+APPEAL/i, "court_of_appeal"],
  [/COUR\s+D[’']APPEL/i, "court_of_appeal"],
  [/URUKIKO\s+RUKURU/i, "high_court"],
  [/HIGH\s+COURT/i, "high_court"],
  [/URUKIKO\s+RW?\s*[’'‚]?\s*UBUCURUZI/i, "commercial_court"],
  [/COMMERCIAL\s+COURT/i, "commercial_court"],
];

/**
 * Kinyarwanda month names, with the misspellings this corpus actually contains.
 *
 * `Ugushyungo` and `Uguhyingo` are November mis-set and `Nzeri` is September
 * mis-set. All three appear. They
 * are listed rather than corrected by fuzzy matching, because a fuzzy month
 * matcher that is wrong assigns a judgment to the wrong month silently, and a
 * missing month is visible.
 */
const RW_MONTHS = {
  mutarama: 1,
  gashyantare: 2,
  werurwe: 3,
  mata: 4,
  gicurasi: 5,
  kamena: 6,
  nyakanga: 7,
  kanama: 8,
  nzeli: 9,
  nzeri: 9,
  ukwakira: 10,
  ugushyingo: 11,
  ugushyungo: 11,
  uguhyingo: 11,
  ukuboza: 12,
};

const EN_MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const FR_MONTHS = {
  janvier: 1,
  février: 2,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
  decembre: 12,
};

const MONTHS = { ...RW_MONTHS, ...EN_MONTHS, ...FR_MONTHS };
const MONTH_NAMES = Object.keys(MONTHS).join("|");

/** "21 Ukwakira 2022", "November 15, 2024", "14 October 2024". */
const DATE_PATTERNS = [
  new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_NAMES})\\s+(\\d{4})\\b`, "i"),
  new RegExp(`\\b(${MONTH_NAMES})\\s+(\\d{1,2})\\s*,?\\s*(\\d{4})\\b`, "i"),
];

/**
 * Section markers, and every spelling of them this corpus uses.
 *
 * The variance is not incidental — it is 84 documents typed by different
 * registries over several years. `Incamake y'ikibazo` also appears as
 * `Incamake y'icyibazo` (a typo, four times) and with a stray space after the
 * apostrophe. Matching is on a normalised form with apostrophes and spacing
 * collapsed, so each of these needs listing only once.
 *
 * Order matters: `Incamake y'icyemezo` (the holding) and `Incamake y'ikibazo`
 * (the facts) differ by three letters in the middle of a long phrase, so both
 * are matched explicitly rather than by prefix.
 */
const SECTIONS = [
  {
    key: "facts",
    patterns: [
      /^facts$/i,
      // y'kibazo drops the i; y'icyibazo adds a cy. Both are typos, both occur.
      /^incamake y ?(ikibazo|icyibazo|kibazo)$/i,
      /^les faits$/i,
    ],
  },
  {
    key: "held",
    patterns: [/^held$/i, /^incamake y ?icyemezo$/i, /^decision$/i],
  },
  {
    key: "statutesCited",
    patterns: [
      // "instruments" is misspelled "nstruments" in at least one judgment, and
      // the missing section silently produced an empty statute list rather than
      // an error. Matched loosely on the words that carry the meaning.
      /^statutes?( and statutory[a-z ]*)? referred to$/i,
      /^statutory and statutes referred to$/i,
      /^amategeko (yashingiweho|yakoreshejwe|yifashishijwe)$/i,
    ],
    list: true,
  },
  {
    key: "casesCited",
    patterns: [
      /^cases? (laws? )?referred to$/i,
      /^reference cases$/i,
      /^imanza (zifashishijwe|zakoreshejwe)$/i,
    ],
    list: true,
  },
  {
    key: "writingsCited",
    patterns: [
      /^legal writings referred to$/i,
      /^inyandiko z abahanga( zifashishijwe)?$/i,
    ],
    list: true,
  },
];

/** Collapses apostrophe variants and spacing so one pattern covers many spellings. */
const normaliseMarker = (s) =>
  s
    .replace(/[’'‘`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Language of the whole document.
 *
 * Judgments are monolingual, so this is a document-level decision rather than
 * the per-stream one the Gazette needed. Scored on function words for the same
 * reason: the header is bilingual boilerplate ("Rwanda SUPREME COURT") and would
 * mislead a keyword rule.
 */
const MARKERS = {
  rw: /\b(mu|ku|cyangwa|urukiko|urubanza|itegeko|ingingo|ko|kandi|ariko|iyi|uru|ubwo|yavuze)\b/gi,
  en: /\b(the|of|and|that|court|law|appeal|judgment|which|shall|was|were)\b/gi,
  fr: /\b(le|la|les|des|du|de|que|qui|cour|arrêt|loi|est|sont|dans)\b/gi,
};

function detectLanguage(text) {
  const sample = text.slice(0, 6000);
  const scores = Object.fromEntries(
    Object.entries(MARKERS).map(([lang, re]) => [
      lang,
      (sample.match(re) ?? []).length,
    ]),
  );
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === 0) return { language: null, scores };
  return { language: ranked[0][0], scores };
}

async function pdfToText(pdfPath) {
  const doc = await getDocument({
    data: new Uint8Array(readFileSync(pdfPath)),
    useSystemFonts: true,
  }).promise;

  const pages = [];
  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    // Judgments are single-column, so lines only need grouping by y. The
    // Gazette's column detection would be actively wrong here: splitting a
    // single column into thirds is precisely the failure that made a
    // French-only declaration parse as trilingual nonsense.
    const items = content.items
      .filter((i) => i.str.trim())
      .map((i) => {
        const [x, y] = viewport.convertToViewportPoint(
          i.transform[4],
          i.transform[5],
        );
        return { text: i.str, x, y, width: i.width ?? 0 };
      })
      .sort((a, b) => a.y - b.y || a.x - b.x);

    const lines = [];
    let current = null;
    for (const item of items) {
      if (current && Math.abs(current.y - item.y) <= 3) {
        current.parts.push(item);
      } else {
        if (current) lines.push(current);
        current = { y: item.y, parts: [item] };
      }
    }
    if (current) lines.push(current);

    for (const line of lines) {
      // Spaces come from the x-gaps between items, not from the items
      // themselves. pdfjs emits judgments at word level — "Incamake",
      // "y’ikibazo:", "Uru" as three items with no spaces of their own — so
      // joining them directly yields "Incamakey’ikibazo:" and every section
      // marker stops matching. The Gazette parser has always done this; writing
      // a second reader without it reproduced the bug in a new file.
      const parts = [...line.parts].sort((a, b) => a.x - b.x);
      let text = "";
      let cursor = null;
      for (const part of parts) {
        if (cursor !== null && part.x - cursor > GAP_IS_SPACE) text += " ";
        text += part.text;
        cursor = part.x + part.width;
      }
      text = text.replace(/\s+/g, " ").trim();
      if (text) pages.push(text);
    }
  }

  return { lines: pages, pageCount: doc.numPages };
}

function parseHeader(text) {
  const start = text.search(HEADER_START);
  if (start === -1) return {};
  const span = text.slice(start, start + HEADER_SPAN);

  const number = span.match(CASE_NUMBER);
  const caseNumber = number
    ? canonicalCaseNumber(number[1], number[2], number[3], number[4])
    : null;
  const courtFromCode = number
    ? (COURT_BY_CODE[number[4].split("/")[0]] ?? null)
    : null;

  const courtFromName =
    COURT_BY_NAME.find(([pattern]) => pattern.test(span))?.[1] ?? null;

  let decidedAt = null;
  let dateIncomplete = false;
  for (const pattern of DATE_PATTERNS) {
    const m = span.match(pattern);
    if (!m) continue;
    const [day, month, year] = /^\d/.test(m[1])
      ? [m[1], m[2], m[3]]
      : [m[2], m[1], m[3]];
    const monthNumber = MONTHS[month.toLowerCase()];
    if (!monthNumber) continue;
    decidedAt = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    break;
  }

  // A judgment reading "22 Ugushyingo]" states a day and a month and no year.
  // That is a gap in the source, not a parser failure, and the two need
  // different responses: one is fixed by reading the document, the other by
  // fixing code. The year is deliberately not inferred from the case number —
  // a case filed in 2022 is routinely decided in 2023, so inferring would put a
  // confident wrong date on a judgment.
  if (!decidedAt) {
    const partial = span.match(
      new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_NAMES})\\b`, "i"),
    );
    if (partial && MONTHS[partial[2].toLowerCase()]) dateIncomplete = true;
  }

  // "(Mukamulisa, P.J., Kalihangabo and Hitiyaremye J.)" — the bench. P.J. is
  // the presiding judge. Kept as printed rather than split into people: names
  // recur across judgments with inconsistent spelling, and a wrong split invents
  // a judge who does not exist.
  const bench = span.match(/\(([^)]{4,140})\)/)?.[1]?.trim() ?? null;

  return {
    caseNumber,
    courtFromCode,
    courtFromName,
    decidedAt,
    dateIncomplete,
    bench,
    span,
  };
}

/**
 * Splits the document at its section markers.
 *
 * A marker is recognised only when it *opens* a line, because these phrases also
 * occur mid-sentence in the body of a judgment — a court discussing what it held
 * writes "held" constantly — and a marker matched mid-paragraph would truncate
 * the section above it.
 */
function splitSections(lines) {
  const found = [];
  lines.forEach((line, index) => {
    // Matched as a leading phrase rather than as "everything before the colon",
    // because the colon is not reliable. At least one judgment writes "Held 1.
    // The prescription of..." with the marker running straight into a numbered
    // holding, and requiring a colon dropped its holding entirely.
    const normalised = normaliseMarker(line);
    for (const section of SECTIONS) {
      const match = section.patterns
        .map((p) =>
          normalised.match(new RegExp(p.source.replace(/\$$/, ""), "i")),
        )
        .find((m) => m && m.index === 0);
      if (!match) continue;

      // The phrase has to end at a boundary, or "Facts" would match inside a
      // word and "Held" inside "Helder".
      const after = normalised.slice(match[0].length);
      if (after && !/^[\s:.,\d]/.test(after)) continue;

      found.push({
        key: section.key,
        index,
        list: section.list ?? false,
        offset: match[0].length,
      });
      break;
    }
  });

  const sections = {};
  found.forEach((marker, i) => {
    const nextMarker = found[i + 1]?.index ?? lines.length;
    // A citation list ends where the citations stop, not where the document
    // does. These lists sit at the end of the headnote and are followed
    // immediately by the full judgment — which discusses many case numbers that
    // were never cited as authority. Running to the next marker swept all of
    // them in: one judgment reported ten cited precedents where it had listed
    // four, and the six extras were procedural references from its own history.
    //
    // A wrong edge in a precedent graph is worse than a missing one. It asserts
    // that a court relied on a decision it merely mentioned.
    const end = marker.list
      ? endOfCitationList(lines, marker.index, nextMarker)
      : nextMarker;
    const line = lines[marker.index];
    const colon = line.indexOf(":");
    // Past the colon when there is one, past the marker phrase when there is
    // not. Using the marker length in both cases would clip text off a line
    // whose apostrophes normalisation collapsed.
    const first =
      colon !== -1 && colon < marker.offset + 4
        ? line.slice(colon + 1)
        : line.slice(marker.offset);
    const body = [first, ...lines.slice(marker.index + 1, end)]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    // Later occurrences win: the headnote's summary of the holding is repeated
    // in full further down, and the fuller one is the useful text.
    if (body) sections[marker.key] = { text: body, list: marker.list };
  });

  return { sections, markers: found.map((f) => f.key) };
}

/**
 * Where a citation list stops.
 *
 * Entries wrap across lines, so a line without a citation is not by itself the
 * end — a law title alone can run three lines before its article numbers. The
 * list ends after two consecutive lines that carry no citation and no sign of
 * continuing one.
 */
const LOOKS_LIKE_CITATION =
  /(\b[A-Z]{2,8}(?:\s*\/\s*[A-Z]+)*\s*\d{4,6}\s*\/\s*\d{4}\b)|(\b(?:law|itegeko|loi)\b[^.]{0,40}\bn\s*[°ºo0]?\s*\d)|(\b(?:article|articles|ingingo)\b)|(\bdecided on\b|\binvolving\b|\brwaciwe\b|\bhagati ya\b)/i;

function endOfCitationList(lines, start, limit) {
  let dry = 0;
  for (let i = start + 1; i < limit; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (LOOKS_LIKE_CITATION.test(line)) {
      dry = 0;
      continue;
    }
    dry += 1;
    if (dry >= 2) return i - 1;
  }
  return limit;
}

/**
 * The statutes a judgment relied on.
 *
 * "Law n0 22/2018 of 29/04/2018 ..., article 158 and 260."
 *
 * Note `n0` — a zero, not the letter o. The Gazette's own citation marker is
 * "N°", and the shared `CITED_LAW_PATTERN` requires it, so it would miss this
 * entirely. Judgments are typed by court registries rather than typeset by the
 * Gazette, and the degree sign is routinely rendered as a zero, an "o", or
 * dropped. So the marker is optional here and the surrounding context ("Law",
 * "Itegeko", "Loi") does the disambiguating instead.
 */
const STATUTE_CITATION =
  /\b(?:law|itegeko|loi)\b[^.;\n]{0,40}?\bn\s*[°ºo0]?\s*(\d{1,4})\s*\/\s*(\d{2,4})/gi;
const ARTICLE_NUMBERS =
  /\b(?:articles?|ingingo(?: ya| za)?)\s+([\d\s,and&na]+)/gi;

export function parseStatuteCitations(text) {
  const out = new Map();
  if (!text) return [];

  // Split on the line breaks the registry uses between entries, so articles
  // belong to the law they were listed under rather than to whichever law was
  // mentioned most recently in the whole section.
  for (const entry of text.split(/(?=\b(?:Law|Itegeko|Loi)\b)/i)) {
    const laws = [...entry.matchAll(STATUTE_CITATION)];
    if (laws.length === 0) continue;
    const lawNumber = normaliseLawNumber(`${laws[0][1]}/${laws[0][2]}`);
    if (!lawNumber) continue;

    const articles = new Set(out.get(lawNumber) ?? []);
    for (const match of entry.matchAll(ARTICLE_NUMBERS)) {
      for (const n of match[1].split(/[^\d]+/)) {
        if (n) articles.add(n);
      }
    }
    out.set(lawNumber, [...articles]);
  }

  return [...out].map(([lawNumber, articles]) => ({
    lawNumber,
    articles: articles.sort((a, b) => Number(a) - Number(b)),
  }));
}

export function parseCaseCitations(text, self) {
  if (!text) return [];
  const found = new Set();
  const pattern = new RegExp(CASE_NUMBER.source, "g");
  for (const match of text.matchAll(pattern)) {
    const number = canonicalCaseNumber(match[1], match[2], match[3], match[4]);
    if (number !== self) found.add(number);
  }
  return [...found];
}

export async function parseJudgment(pdfPath) {
  const { lines, pageCount } = await pdfToText(pdfPath);
  const full = lines.join("\n");

  const header = parseHeader(full);
  const { language, scores } = detectLanguage(full);
  const { sections, markers } = splitSections(lines);

  const court = header.courtFromCode ?? header.courtFromName ?? null;
  const courtsDisagree =
    header.courtFromCode &&
    header.courtFromName &&
    header.courtFromCode !== header.courtFromName;

  // The title is the party line above the header — everything before the
  // opening bracket, which is where the law report prints "X v. Y".
  const beforeHeader = full.slice(0, Math.max(0, full.search(HEADER_START)));
  const title = beforeHeader.replace(/\s+/g, " ").trim() || null;

  const statutesCited = parseStatuteCitations(sections.statutesCited?.text);
  const casesCited = parseCaseCitations(
    sections.casesCited?.text,
    header.caseNumber,
  );

  return {
    kind: "judgment-parse",
    source: {
      file: basename(pdfPath),
      title,
      caseNumber: header.caseNumber,
      court,
      courtFromCode: header.courtFromCode ?? null,
      courtFromName: header.courtFromName ?? null,
      bench: header.bench ?? null,
      decidedAt: header.decidedAt ?? null,
      language,
      isOfficial: true,
    },
    stats: {
      pages: pageCount,
      lines: lines.length,
      characters: full.length,
      sectionsFound: markers,
      languageScores: scores,
    },
    sections: {
      facts: sections.facts?.text ?? null,
      held: sections.held?.text ?? null,
    },
    citations: { statutes: statutesCited, cases: casesCited },
    warnings: [
      ...(header.caseNumber ? [] : ["no case number found"]),
      ...(court ? [] : ["court not identified"]),
      ...(courtsDisagree
        ? [
            `court name (${header.courtFromName}) disagrees with case number (${header.courtFromCode})`,
          ]
        : []),
      ...(header.decidedAt
        ? []
        : header.dateIncomplete
          ? ["decision date incomplete — source states no year"]
          : ["no decision date found"]),
      ...(language ? [] : ["language not identified"]),
      ...(sections.held ? [] : ["no holding found"]),
      ...(sections.facts ? [] : ["no facts found"]),
      ...(full.trim().length === 0
        ? ["no text layer — scanned, needs OCR"]
        : []),
    ],
  };
}

function pdfsUnder(target) {
  if (statSync(target).isFile()) return [target];
  return readdirSync(target, { recursive: true })
    .map((f) => join(target, f))
    .filter((f) => extname(f).toLowerCase() === ".pdf" && statSync(f).isFile());
}

export { pdfsUnder };
