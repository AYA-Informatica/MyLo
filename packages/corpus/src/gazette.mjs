#!/usr/bin/env node
/**
 * Parses any Gazette instrument — ordinary law, organic law, order, decree —
 * into the same article-aligned corpus shape `constitution.mjs` produces.
 *
 *   npm run ingest:gazette -- <file.pdf | directory> [--out <dir>]
 *
 * This is the step docs/ARCHITECTURE.md names as "the single largest unsolved
 * problem, and it is upstream of everything": until now the only law MyLo could
 * read was the Constitution, because the only parser was written for it.
 *
 * Structurally the Constitution is not special. Ordinary laws are set in the
 * same three parallel columns, with the same heading grammar ("Ingingo ya 5:" /
 * "Article 5:"), and they were checked against real Gazette PDFs before this was
 * written. What ordinary laws add is metadata the Constitution does not have:
 * a law number, an instrument type, and a promulgation date, all of which are
 * printed in the title block and have to be read out of the document rather
 * than supplied by hand — because supplying 1,400 of them by hand is how the
 * first build ended up with an empty corpus.
 *
 * Every text produced here is `isOfficial: true`. This is the state's own
 * wording in the state's own languages, never a translation MyLo produced.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  statSync,
  readdirSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractAuto } from "./layout.mjs";
import { classifyStream, parseStream, clean } from "./articles.mjs";
import { extractProvisions } from "./amendments.mjs";
import { normaliseLawNumber } from "@mylo/domain/law-number";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Instrument types, and the `law_origin` each maps to.
 *
 * The Kinyarwanda and French forms are matched as well as the English because
 * the title block prints all three, and the English column is not guaranteed to
 * be the one that parses cleanly.
 *
 * Order matters: "ITEGEKO NGENGA" must be tested before "ITEGEKO", and
 * "AMABWIRIZA" before the shorter forms, or the general pattern wins and every
 * organic law is filed as ordinary.
 */
const INSTRUMENTS = [
  {
    kind: "organic_law",
    origin: "parliamentary",
    pattern: /\b(ITEGEKO\s+NGENGA|ORGANIC\s+LAW|LOI\s+ORGANIQUE)\b/i,
  },
  {
    kind: "constitution",
    origin: "parliamentary",
    pattern: /\b(ITEGEKO\s+NSHINGA|CONSTITUTION)\b/i,
  },
  {
    kind: "presidential_order",
    origin: "presidential",
    pattern:
      /\b(ITEKA\s+RYA\s+PEREZIDA|PRESIDENTIAL\s+ORDER|ARR[ÊE]T[ÉE]\s+PR[ÉE]SIDENTIEL)\b/i,
  },
  {
    kind: "prime_ministerial_order",
    origin: "administrative",
    pattern:
      /\b(ITEKA\s+RYA\s+MINISITIRI\s+W[’']INTEBE|PRIME\s+MINISTER[’']?S?\s+ORDER|ARR[ÊE]T[ÉE]\s+DU\s+PREMIER\s+MINISTRE)\b/i,
  },
  {
    kind: "ministerial_order",
    origin: "ministerial",
    pattern:
      /\b(ITEKA\s+RYA\s+MINISITIRI|MINISTERIAL\s+ORDER|ARR[ÊE]T[ÉE]\s+MINIST[ÉE]RIEL)\b/i,
  },
  {
    kind: "decree_law",
    origin: "presidential",
    pattern: /\b(ITEGEKO[- ]TEKA|DECREE[- ]LAW|D[ÉE]CRET[- ]LOI)\b/i,
  },
  {
    kind: "law",
    origin: "parliamentary",
    pattern: /\b(ITEGEKO|LAW|LOI)\b/i,
  },
];

/** Promulgation dates: "OF 20/01/2007", "RYO KUWA 20/01/2007", "DU 20/01/2007". */
const DATE_DMY = /\b(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\b/;

/**
 * The gazette reference, printed as a running header on every page.
 *
 * Dropped from the body streams as furniture, so it is recovered from the raw
 * first page separately rather than from the parsed streams.
 */
const GAZETTE_REF =
  /\b(?:J\.?\s*O\.?|Official\s+Gazette|Igazeti\s+ya\s+Leta|Journal\s+Officiel)[^\n]{0,80}/i;

/**
 * When the law was published, as opposed to when it was signed.
 *
 * These are not the same date and the gap is not small: Law N°02/2007 is "of
 * 20/01/2007" in its own title and appears in "J.O. n° 6 du 15/03/2007" — 54
 * days later. Most laws commence on publication, so the signing date is the
 * wrong answer to "was this in force on 1 February 2007?" and it is wrong in the
 * direction that matters, claiming a law bound people before it did.
 *
 * Read from the running header, which is why `extractAuto` keeps furniture.
 */
const GAZETTE_DATE =
  /\b(?:du|of|ryo\s+kuwa|kuwa)\s+(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\b/i;

/**
 * How much of a stream counts as its title block.
 *
 * The instrument type and number are printed at the head of the document. Read
 * too far and a law that *cites* the Constitution in its preamble — which
 * almost all of them do, in the "Ishingiye ku Itegeko Nshinga" recital — is
 * classified as a constitution.
 */
const TITLE_BLOCK_LINES = 12;

/**
 * Where the title stops and the promulgation clause begins.
 *
 * The Gazette runs the two together — "...HANDICAPES DE GUERRE Nous, KAGAME
 * Paul, Président de la République" — and a fixed line count cannot separate
 * them because titles vary in length. The head of state's own formula is the
 * reliable boundary, and it is printed in all three languages.
 */
const TITLE_ENDS =
  /\s*(\b(?:Twebwe|We|Nous)\s*,|\b(?:ISHAKIRO|TABLE OF CONTENTS|TABLE DES MATIERES)\b).*$/i;

function detectInstrument(titleBlock) {
  for (const instrument of INSTRUMENTS) {
    if (instrument.pattern.test(titleBlock)) return instrument;
  }
  return null;
}

/**
 * Reads law metadata from whichever stream states it most completely.
 *
 * Each language prints the same number and date, so agreement across columns is
 * a free consistency check; disagreement is recorded rather than resolved,
 * because a document whose columns disagree about its own number is exactly the
 * kind of thing a person should look at.
 */
function readMetadata(labelled, rawFirstPage) {
  const readings = labelled.map(({ language, lines }) => {
    const block = lines
      .slice(0, TITLE_BLOCK_LINES)
      .map((l) => l.text)
      .join(" ");
    // The date is read first so it can resolve the century of a two-digit year.
    // "N° 5/62" in a law dated 10/03/1962 is 1962; without the date it would
    // fall back to a pivot, and before this existed it became 2062 on one side
    // of the pipeline and 62 on the other.
    const date = block.match(DATE_DMY);
    const number = normaliseLawNumber(block, { year: date?.[3] });
    return {
      language,
      instrument: detectInstrument(block),
      number: number ?? null,
      promulgatedAt: date ? `${date[3]}-${pad(date[2])}-${pad(date[1])}` : null,
      title:
        clean(
          lines
            .slice(0, 4)
            .map((l) => l.text)
            .join(" ")
            .replace(TITLE_ENDS, ""),
        ) || null,
    };
  });

  const agreed = (field) => {
    const values = readings.map((r) => r[field]).filter(Boolean);
    if (values.length === 0) return { value: null, agreed: true };
    const unique = [...new Set(values)];
    return { value: unique[0], agreed: unique.length === 1 };
  };

  const number = agreed("number");
  const promulgatedAt = agreed("promulgatedAt");
  const instrument = readings.map((r) => r.instrument).find(Boolean) ?? null;

  return {
    // One title per *language*, not per column. The Gazette prints the law's
    // name in each official language and `law_texts` stores one row per
    // language, so collapsing to a single "the" title would discard two of
    // them — and keying by column position would file each under whichever
    // language happened to be printed there, which is the same mistake the
    // stream classifier exists to avoid.
    titles: Object.fromEntries(
      readings.filter((r) => r.title).map((r) => [r.language, r.title]),
    ),
    instrument: instrument?.kind ?? null,
    origin: instrument?.origin ?? null,
    lawNumber: number.value,
    promulgatedAt: promulgatedAt.value,
    gazetteRef: clean(rawFirstPage.match(GAZETTE_REF)?.[0] ?? "") || null,
    disagreements: [
      ...(number.agreed ? [] : ["lawNumber"]),
      ...(promulgatedAt.agreed ? [] : ["promulgatedAt"]),
    ],
  };
}

const pad = (n) => String(n).padStart(2, "0");

/**
 * Whether the parsed articles are the whole instrument.
 *
 * Asserted only when the numbers run 1..N without a hole. A gap means an
 * article failed to parse, and `laws.coverage` exists precisely so a fragment is
 * never served as if it were the complete law — a correct quotation of an
 * incomplete law is still a misleading answer.
 */
function assessCoverage(numbers) {
  if (numbers.length === 0) return { coverage: "partial", missing: [] };
  const max = Math.max(...numbers);
  const present = new Set(numbers);
  const missing = [];
  for (let n = 1; n <= max; n += 1) if (!present.has(n)) missing.push(n);
  return { coverage: missing.length === 0 ? "complete" : "partial", missing };
}

export async function parseInstrument(pdfPath) {
  const bytes = new Uint8Array(readFileSync(pdfPath));
  const { streams, columns, pages, furniture, textItems } =
    await extractAuto(bytes);

  // Language is assigned by content, never by column position. The Gazette does
  // not keep English and French in a fixed order across the whole corpus, and a
  // swap means an article is served labelled as a language it is not.
  const labelled = [];
  const unclassified = [];
  for (const lines of streams) {
    const verdict = classifyStream(lines);
    if (!verdict) {
      unclassified.push(lines.length);
      continue;
    }
    labelled.push({
      language: verdict.language,
      lines,
      scores: verdict.scores,
    });
  }

  // Two columns classified as the same language means the split is wrong, or
  // the document is bilingual in a way this parser does not model. Either way
  // the honest move is to record it, not to overwrite one with the other.
  const seen = new Map();
  const conflicts = [];
  for (const stream of labelled) {
    if (seen.has(stream.language)) conflicts.push(stream.language);
    else seen.set(stream.language, stream);
  }

  const header = furniture.join("\n");
  const gazetteDate = header.match(GAZETTE_DATE);

  const rawFirstPage = streams
    .flat()
    .slice(0, 60)
    .map((l) => l.text)
    .join("\n");
  const metadata = readMetadata(
    [...seen.values()],
    // The running header first: it is where the gazette reference actually is.
    // Falling back to the body text finds a fragment of the title instead, which
    // is what the first version recorded as a gazette reference.
    header || rawFirstPage,
  );

  const byLang = {};
  const headingsUnresolved = [];
  for (const [language, stream] of seen) {
    const parsed = parseStream(stream.lines);
    if (!parsed.headingsResolved) headingsUnresolved.push(language);
    byLang[language] = parsed;
  }

  const numbers = new Set();
  for (const map of Object.values(byLang)) {
    for (const n of map.keys()) numbers.add(n);
  }

  const articles = [...numbers]
    .sort((a, b) => a - b)
    .map((number) => {
      const texts = {};
      for (const [language, map] of Object.entries(byLang)) {
        const text = map.get(number);
        if (text) texts[language] = text;
      }
      return { number, texts };
    });

  const languages = [...seen.keys()].sort();
  const { coverage, missing } = assessCoverage([...numbers]);

  // When the law actually starts binding people, which is a different question
  // from when it was signed. Most Rwandan laws commence on publication, and the
  // gap between signing and publication runs to months — so `effectiveFrom` is
  // derived from the law's own commencement article rather than assumed to be
  // the date in its title.
  const provisions = extractProvisions({
    source: { lawNumber: metadata.lawNumber },
    articles,
  });
  const commencement = provisions.find((p) => p.kind === "commencement");
  const publishedAt = gazetteDate
    ? `${gazetteDate[3]}-${pad(gazetteDate[2])}-${pad(gazetteDate[1])}`
    : null;

  const effectiveFrom = commencement?.commencesOnPublication
    ? publishedAt
    : (publishedAt ?? metadata.promulgatedAt);

  return {
    /**
     * Marks this file as a parse, not a sidecar.
     *
     * Several tools write JSON into the same output directory — a manifest, a
     * provisions report — and consumers glob that directory. Twice now a
     * consumer has read a sidecar as if it were a law: once crashing
     * `amendments.mjs` on its own previous output, once crashing the loader on
     * `provisions.json`. Both were fixed by adding a filename to an ignore list
     * in one place, which is the same fix that failed to generalise the first
     * time.
     *
     * A discriminator on the parse itself cannot be forgotten by the next tool
     * that writes a sidecar, because it is the parses that opt in rather than
     * the sidecars that opt out.
     */
    kind: "gazette-parse",
    source: {
      file: basename(pdfPath),
      titles: metadata.titles,
      instrument: metadata.instrument,
      origin: metadata.origin,
      lawNumber: metadata.lawNumber,
      promulgatedAt: metadata.promulgatedAt,
      gazetteRef: metadata.gazetteRef,
      publishedAt,
      effectiveFrom,
      commencement: commencement
        ? {
            article: commencement.article,
            onPublication: commencement.commencesOnPublication,
          }
        : null,
      languages,
      isOfficial: true,
    },
    stats: {
      pages,
      columns,
      articlesFound: articles.length,
      articlesAllLanguages: articles.filter(
        (a) => Object.keys(a.texts).length === languages.length,
      ).length,
      coverage,
    },
    // Everything a person needs to decide whether this parse can be trusted,
    // kept with the parse rather than printed and lost.
    // A document with no text layer produces every downstream warning at once —
    // no articles, no number, no instrument, no dates, unclassified columns —
    // and none of them names the actual problem. Reported as one warning
    // instead, because the response is OCR rather than eight parser fixes, and
    // because eight lines per scanned document would bury the real failures in
    // a bulk run.
    warnings:
      textItems === 0
        ? ["no text layer — scanned, needs OCR"]
        : [
            ...(articles.length === 0 ? ["no articles parsed"] : []),
            ...(metadata.lawNumber ? [] : ["no law number found"]),
            ...(metadata.instrument ? [] : ["instrument type not recognised"]),
            ...(metadata.promulgatedAt ? [] : ["no promulgation date found"]),
            ...(gazetteDate ? [] : ["no publication date found"]),
            ...(commencement ? [] : ["no commencement provision found"]),
            ...(effectiveFrom ? [] : ["effective date unknown"]),
            ...metadata.disagreements.map((f) => `columns disagree on ${f}`),
            ...conflicts.map((l) => `two columns classified as ${l}`),
            ...(unclassified.length
              ? [`${unclassified.length} column(s) unclassified`]
              : []),
            ...(missing.length
              ? [`missing articles: ${summarise(missing)}`]
              : []),
            ...(headingsUnresolved.length
              ? [`headings not separable in ${headingsUnresolved.join("/")}`]
              : []),
          ],
    articles,
  };
}

/** "1, 2, 3, 7" -> "1-3, 7", so a long gap list stays readable. */
function summarise(numbers) {
  const runs = [];
  let start = numbers[0];
  let prev = numbers[0];
  for (const n of numbers.slice(1)) {
    if (n === prev + 1) prev = n;
    else {
      runs.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = prev = n;
    }
  }
  runs.push(start === prev ? `${start}` : `${start}-${prev}`);
  return runs.join(", ");
}

function pdfsUnder(target) {
  if (statSync(target).isFile()) return [target];
  return readdirSync(target, { recursive: true })
    .map((f) => join(target, f))
    .filter((f) => extname(f).toLowerCase() === ".pdf" && statSync(f).isFile());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outDir = resolve(
    outIndex === -1 ? join(here, "..", "out", "gazette") : args[outIndex + 1],
  );
  const positional = args.filter(
    (a, i) => !a.startsWith("--") && !(outIndex !== -1 && i === outIndex + 1),
  );
  const target = resolve(positional[0] ?? ".");

  const files = pdfsUnder(target);

  // Cleared rather than merged into. Output is named after the law number the
  // parse found, so a parser fix that changes what it finds leaves the old file
  // behind under the old name — and the loader, reading the directory, would
  // write that stale parse into the corpus as a real law. Found exactly that
  // way: an earlier run that failed to read a law number left its output under
  // a filename-derived slug, and the next load offered it up alongside the
  // corrected one.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  console.log(`Parsing ${files.length} document(s)\n`);

  const manifest = [];
  let clean_ = 0;
  for (const file of files) {
    try {
      const parsed = await parseInstrument(file);
      const slug =
        (parsed.source.lawNumber ?? basename(file, ".pdf"))
          .replace(/[^\w-]+/g, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase() || "unnamed";
      writeFileSync(
        join(outDir, `${slug}.json`),
        JSON.stringify(parsed, null, 2),
      );
      manifest.push({
        file: parsed.source.file,
        lawNumber: parsed.source.lawNumber,
        instrument: parsed.source.instrument,
        languages: parsed.source.languages,
        articles: parsed.stats.articlesFound,
        coverage: parsed.stats.coverage,
        warnings: parsed.warnings,
      });
      if (parsed.warnings.length === 0) clean_ += 1;
      const flag = parsed.warnings.length ? "!" : " ";
      console.log(
        `${flag} ${(parsed.source.lawNumber ?? "—").padEnd(14)} ` +
          `${String(parsed.stats.articlesFound).padStart(4)} articles  ` +
          `${parsed.source.languages.join("/") || "none"}  ` +
          `${parsed.warnings.join("; ")}`,
      );
    } catch (err) {
      manifest.push({ file: basename(file), error: err.message });
      console.log(`! ${basename(file)}: ${err.message}`);
    }
  }

  writeFileSync(
    join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(
    `\n${clean_}/${files.length} parsed without warnings. ` +
      `Manifest: ${join(outDir, "manifest.json")}`,
  );
}
