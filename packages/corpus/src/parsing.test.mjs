/**
 * Unit tests for the parsing logic that needs no PDF.
 *
 *   node --test packages/corpus/src
 *
 * The golden-file harness (`npm run golden`) is the stronger check, but it needs
 * the corpus, and the corpus is not committed — whether a parsed derivative of
 * the Gazette can even be redistributed is an open question for a lawyer. So
 * these cover the pure functions instead: heading grammar, stream
 * classification, and law-number normalisation. Every one of them is a guess
 * about typesetting, and every one is reachable without a document.
 *
 * Several of these are regression tests for bugs that were actually shipped and
 * found later. Those are marked, because a test that encodes a real mistake is
 * worth more than one that encodes an intention.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHeading, classifyStream, clean } from "./articles.mjs";
import { normaliseLawNumber } from "@mylo/domain/law-number";

test("article 1 is spelled out in every language", () => {
  // The one article number all three languages write as a word rather than a
  // digit, and the only one where the heading identifies its own language.
  assert.deepEqual(parseHeading("Ingingo ya mbere:"), {
    lang: "rw",
    number: 1,
    heading: "",
  });
  assert.equal(parseHeading("Article one:").number, 1);
  assert.equal(parseHeading("Article one:").lang, "en");
  assert.equal(parseHeading("Article premier :").lang, "fr");
});

test("numbered Latin headings do not claim a language", () => {
  // English and French both print "Article 10:" — identical strings. A parser
  // that guessed here would be right half the time and confident always, which
  // is why the language comes from content instead.
  const parsed = parseHeading("Article 10: Ibiciro");
  assert.equal(parsed.lang, "und");
  assert.equal(parsed.number, 10);
});

test("a space before the colon is still a heading", () => {
  // The Gazette sets "Article premier :" with a French space. Real, and it took
  // a live document to notice.
  assert.equal(parseHeading("Article premier :").number, 1);
  assert.equal(parseHeading("Ingingo ya 5 :")?.number, 5);
});

test("prose that merely mentions an article is not a heading", () => {
  assert.equal(parseHeading("as provided by Article 10 of this law"), null);
  assert.equal(parseHeading("Articles 4 and 5 are repealed"), null);
});

test("streams are classified by content, not by position", () => {
  const asStream = (text) =>
    text.split(". ").map((t) => ({ text: t, fonts: new Set() }));

  assert.equal(
    classifyStream(
      asStream(
        "The provisions of this law shall apply to any person who is protected. " +
          "This law has been adopted by the Parliament and is in force",
      ),
    ).language,
    "en",
  );
  assert.equal(
    classifyStream(
      asStream(
        "Les dispositions de la présente loi sont applicables aux personnes qui " +
          "sont protégées par les articles du présent texte",
      ),
    ).language,
    "fr",
  );
  assert.equal(
    classifyStream(
      asStream(
        "Iri tegeko rireba umuntu wese ufite ubumuga. Ingingo ya mbere yerekeye " +
          "abantu bose mu gihugu kandi ariko igihe",
      ),
    ).language,
    "rw",
  );
});

test("an empty stream is not a language", () => {
  // Regression. Kinyarwanda used to be recognised by eliminating English and
  // French, which meant a blank third column — what a two-column document
  // produces when split into thirds — classified confidently as Kinyarwanda.
  assert.equal(classifyStream([]), null);
  assert.equal(classifyStream([{ text: "   ", fonts: new Set() }]), null);
  assert.equal(classifyStream([{ text: "12 34 56", fonts: new Set() }]), null);
});

test("justified columns collapse to single spaces", () => {
  assert.equal(clean("Iri    tegeko\n  rireba "), "Iri tegeko rireba");
});

test("law numbers normalise across how the Gazette prints them", () => {
  for (const written of [
    "N° 31/2007",
    "Nº31/2007",
    "N 31 / 2007",
    "no 31/2007",
    "ORGANIC LAW N° 31/2007 OF 25/07/2007",
  ]) {
    assert.equal(normaliseLawNumber(written), "31/2007", written);
  }
  assert.equal(normaliseLawNumber("N° 02/2007 of 20/01/2007"), "02/2007");
  assert.equal(normaliseLawNumber("N° 12 bis/2011"), "12bis/2011");
  assert.equal(normaliseLawNumber("no number here"), null);
  assert.equal(normaliseLawNumber(null), null);
});

test('"not in force" is not "in force"', async () => {
  // Regression, and the sharpest one found so far. "Not in force" contains
  // "in force" as a substring, so matching the positive case first marked every
  // repealed law on the register as active — defeating the loader's refusal to
  // guess status from one layer above it. Found in a five-record fixture; it
  // would have been invisible across 1,400.
  const { readStatusForTest } =
    await import("../../pipeline/src/build-status-map.mjs");
  assert.equal(readStatusForTest("In force"), "active");
  assert.equal(readStatusForTest("Not in force"), "repealed");
  assert.equal(readStatusForTest("No longer in force"), "repealed");
  assert.equal(readStatusForTest("Non en vigueur"), "repealed");
  assert.equal(readStatusForTest("En vigueur"), "active");
  assert.equal(readStatusForTest("Abrogated"), "repealed");
  assert.equal(readStatusForTest("Amended"), "amended");
  // Unrecognised stays unrecognised rather than defaulting. A law that has not
  // commenced and a law that has been repealed are both "not in force" and mean
  // different things to a reader.
  assert.equal(readStatusForTest("Under discussion"), null);
  assert.equal(readStatusForTest(null), null);
});

test("a law mentioning its own commencement is not commencing", async () => {
  // Regression, and the same shape as the "not in force" bug: the phrase that
  // names a thing also appears inside the phrase that defers it.
  //
  // Kinyarwanda renders "before this Law comes into force" as "mbere y'uko iri
  // tegeko ngenga ritangira gukurikizwa" — the commencement formula verbatim,
  // distinguished only by what precedes it. Matching on presence alone
  // classified a penalty substitution and a transitional savings clause as
  // commencement provisions.
  const { classify } = await import("./amendments.mjs");

  assert.equal(
    classify(
      "This Organic Law shall come into force on the date of its publication",
    ).kind,
    "commencement",
  );
  assert.equal(
    classify("Iri tegeko ritangira gukurikizwa ku munsi ritangarijweho").kind,
    "commencement",
  );

  assert.equal(
    classify(
      "Mu mategeko yose yakurikizwaga mbere y’uko iri tegeko ngenga ritangira " +
        "gukurikizwa, igihano cyo kwicwa gisimbujwe igihano cy’igifungo",
    ).kind,
    "substitution",
  );
  assert.equal(
    classify(
      "all death sentences pronounced before the commencement of this Organic " +
        "Law are hereby converted into life imprisonment",
    ),
    null,
  );
});

test("blanket repeals are recognised as naming no target", async () => {
  const { classify } = await import("./amendments.mjs");
  // The Gazette's standard closing formula, in all three languages. Recognised
  // so it can be counted, not so it can be resolved: deciding which provisions
  // of which other laws are "contrary" is interpretation, not extraction.
  assert.equal(
    classify(
      "All previous legal provisions contrary to this law are hereby abrogated",
    ).kind,
    "repeal",
  );
  assert.equal(
    classify(
      "Toutes les dispositions légales antérieures et contraires à la présente loi sont abrogées",
    ).kind,
    "repeal",
  );
  assert.equal(
    classify(
      "Ingingo zose z’amategeko abanziriza iri kandi zinyuranye na ryo zivanyweho",
    ).kind,
    "repeal",
  );
});

test("commencement on publication is distinguished from a stated date", async () => {
  const { classify, extractProvisions } = await import("./amendments.mjs");
  assert.equal(
    classify(
      "This law comes into force on the day of publication in the Official Gazette",
    ).kind,
    "commencement",
  );

  // The distinction that sets effective_from. A law commencing on publication
  // takes its date from the Gazette header; one naming its own date does not.
  const onPublication = extractProvisions({
    source: { lawNumber: "02/2007" },
    articles: [
      {
        number: 23,
        texts: {
          en: {
            heading: "",
            body: "This law comes into force on the day of publication in the Official Gazette of the Republic of Rwanda.",
          },
        },
      },
    ],
  });
  assert.equal(onPublication[0].kind, "commencement");
  assert.equal(onPublication[0].commencesOnPublication, true);
});

test("query expansion appends without replacing", async () => {
  const { expandQuery } = await import("@mylo/domain/synonyms");

  // The reader's own words survive. If the corpus happens to use them, a query
  // that already worked must not be broken by expansion.
  const expanded = expandQuery("do I have the right to a fair trial", "en");
  assert.ok(expanded.includes("fair trial"));
  assert.ok(expanded.includes("due process of law"));

  // No match, no change. Every added term competes for BM25 weight, so
  // expanding a query that mentions no legal concept is pure noise.
  assert.equal(expandQuery("what is the weather", "en"), "what is the weather");

  // Groups are per-language: expanding an English query with French phrasings
  // would add terms that cannot appear in the English index.
  assert.ok(!expandQuery("fair trial", "en").includes("procès"));

  // A language with no entry for a concept is left alone rather than falling
  // back to another language's phrasings.
  assert.equal(expandQuery("fair trial", "rw"), "fair trial");
});

test("limitations are derived from what was actually served", async () => {
  const { limitationSchema } = await import("@mylo/domain");
  // The set is closed: a client renders these, so a new one appearing without a
  // rendering for it would be a caveat the reader never sees.
  assert.deepEqual(limitationSchema.options, [
    "unresolved_repeals",
    "partial_law",
    "unofficial_translation",
    "unreviewed_explanation",
  ]);
});

test("two-digit years resolve to the right century", async () => {
  const { normaliseLawNumber } = await import("@mylo/domain/law-number");

  // Regression. Rwanda's corpus starts at independence in 1962, and the Gazette
  // writes years both ways. Assuming every century was the twenty-first turned a
  // 1962 law into a 2062 one — on one side of the pipeline only, because the
  // parser left two-digit years alone and the status map did not. Two components
  // disagreeing about a key do not error; they never match.
  assert.equal(normaliseLawNumber("N° 5/62", { year: "1962" }), "05/1962");
  assert.equal(normaliseLawNumber("N° 5/62"), "05/1962");
  assert.equal(normaliseLawNumber("N° 12/98"), "12/1998");
  assert.equal(normaliseLawNumber("N° 4/05"), "04/2005");

  // The document's own four-digit date beats the pivot, so nothing is guessed
  // when the document says.
  assert.equal(
    normaliseLawNumber("ITEGEKO N° 5/62 RYO KUWA 10/03/1962", { year: "1962" }),
    "05/1962",
  );

  // Serials are zero-padded so "N° 1/1962" and "N° 01/1962" are one key, and
  // longer serials are left alone.
  assert.equal(normaliseLawNumber("N° 1/1962"), "01/1962");
  assert.equal(normaliseLawNumber("N° 100/2018"), "100/2018");

  // bis and ter are part of the serial: 12bis/2011 is a different law from
  // 12/2011, and folding them together would merge two laws into one row.
  assert.equal(normaliseLawNumber("N° 12 bis/2011"), "12bis/2011");
  assert.notEqual(
    normaliseLawNumber("N° 12 bis/2011"),
    normaliseLawNumber("N° 12/2011"),
  );
});

test("an already-canonical law number normalises to itself", async () => {
  const { normaliseLawNumber } = await import("@mylo/domain/law-number");
  // Regression. Consolidating on one pattern briefly required the "N°" marker
  // everywhere, which meant a number this pipeline had already canonicalised no
  // longer matched — and the status map's coverage check silently read 0/0 while
  // both sides held the same laws. Normalising must be idempotent.
  for (const canonical of ["02/2007", "31/2007", "12bis/2011", "100/2018"]) {
    assert.equal(normaliseLawNumber(canonical), canonical);
    assert.equal(normaliseLawNumber(normaliseLawNumber(canonical)), canonical);
  }
});

test("citations in prose require the N° marker", async () => {
  const { CITED_LAW_PATTERN } = await import("@mylo/domain/law-number");
  const cited = (text) => {
    const re = new RegExp(CITED_LAW_PATTERN.source, "gi");
    return [...text.matchAll(re)].map((m) => m[0]);
  };

  // Article bodies are dense with bare numerals. A date is not a citation, and
  // treating one as a citation would invent an amendment relationship.
  assert.deepEqual(cited("done on 20/01/2007 in Kigali"), []);
  assert.deepEqual(cited("paragraph 3/4 of the schedule"), []);
  assert.equal(cited("amending Law N° 66/2018 of 30/08/2018").length, 1);

  // Global regexes carry lastIndex. Reusing the exported one directly would
  // skip matches in every article after the first.
  const twice = "N° 66/2018 and N° 12/2011";
  assert.equal(cited(twice).length, 2);
  assert.equal(cited(twice).length, 2);
});

test("sidecar outputs are not mistaken for parses", async () => {
  // Regression, three times over. The parser's output directory also holds a
  // run manifest and a provisions report, and consumers glob it. Each time a
  // consumer crashed on a sidecar the fix was to add that filename to an ignore
  // list in one place — which did not generalise, because the next tool to write
  // a sidecar did not know to update every reader.
  //
  // Parses now carry a discriminator, so identification is opt-in by the thing
  // being identified rather than opt-out by everything else.
  const { parseInstrument } = await import("./gazette.mjs");
  const { existsSync } = await import("node:fs");
  const path = "/tmp/laws/law-02-2007.pdf";
  if (!existsSync(path)) return; // corpus not present in this environment

  const parsed = await parseInstrument(path);
  assert.equal(parsed.kind, "gazette-parse");
});

test("Kinyarwanda queries survive however they are typed or transcribed", async () => {
  const { charNgrams } = await import("../../../apps/api/src/retrieval.ts");
  const same = (a, b) =>
    assert.deepEqual(charNgrams(a), charNgrams(b), `${a} vs ${b}`);

  // Kinyarwanda is dense with apostrophes — n'iri, y'amategeko, by'umwihariko —
  // and the Gazette sets the typographic one (U+2019) while a phone keyboard
  // gives the straight one (U+0027). If those tokenised differently, every
  // Kinyarwanda query typed on a phone would miss the corpus it was searching.
  //
  // They do not, because the tokeniser strips everything that is not a letter or
  // a number. That is currently an accident of the implementation rather than a
  // property anyone asserted, and it is the kind of accident a later change
  // undoes for a good-sounding reason — Kinyarwanda apostrophes are meaningful,
  // so keeping them looks like an improvement right up until Kinyarwanda recall
  // silently halves.
  same("n\u2019iri tegeko", "n'iri tegeko");
  same("n\u2019iri tegeko", "n\u2018iri tegeko");
  same("n\u2019iri tegeko", "niri tegeko");
  same("y\u2019amategeko", "y'amategeko");

  // The same normalisation is what makes speech input viable. An ASR transcript
  // arrives lowercased and unpunctuated — NVIDIA's Kinyarwanda work describes
  // exactly that preprocessing — so a spoken query and a typed one must reach
  // the index as the same thing.
  same("N\u2019IRI TEGEKO", "n'iri tegeko");
  same("mfite uburenganzira?", "mfite uburenganzira");
  same("ubutabera, buboneye.", "ubutabera buboneye");
});

test("statute citations survive how registries type a degree sign", async () => {
  const { parseStatuteCitations } = await import("./judgment.mjs");

  // Judgments are typed by court registries, not typeset by the Gazette, and
  // "N°" comes out as a zero, an "o", or nothing. The shared CITED_LAW_PATTERN
  // requires a real degree sign and would miss all of these — which is why
  // judgments use their own pattern, anchored on the word "Law"/"Itegeko"/"Loi"
  // instead of on the marker.
  const forms = [
    "Law n0 22/2018 of 29/04/2018 relating to procedure, article 158 and 260.",
    "Law no 22/2018 of 29/04/2018, articles 158, 260",
    "Law n° 22/2018, article 158 and 260",
    "Itegeko n0 22/2018 ryo ku wa 29/04/2018, ingingo ya 158 na 260",
  ];
  for (const text of forms) {
    const cited = parseStatuteCitations(text);
    assert.equal(cited.length, 1, text);
    assert.equal(cited[0].lawNumber, "22/2018", text);
    assert.deepEqual(cited[0].articles, ["158", "260"], text);
  }

  assert.deepEqual(parseStatuteCitations(""), []);
  assert.deepEqual(parseStatuteCitations("no citation here"), []);
});

test("a case number is one string however it is spaced", async () => {
  const { parseCaseCitations } = await import("./judgment.mjs");

  // The corpus contains "RS/ INJUST/RC 00004/2019/SC" with a space after the
  // first slash. Left in, it is a different string from the same judgment cited
  // properly elsewhere, and the precedent graph gains a phantom node that
  // nothing links to.
  const cited = parseCaseCitations(
    "RS/ INJUST/RC 00004/2019/SC decided on 28/07/2020 and " +
      "RS/INJUST/RC 00004/2019/SC again",
  );
  assert.deepEqual(cited, ["RS/INJUST/RC 00004/2019/SC"]);

  // A judgment does not cite itself.
  assert.deepEqual(
    parseCaseCitations("RCOMAA 00064/2022/CA", "RCOMAA 00064/2022/CA"),
    [],
  );
});

test("the audit trail carries no question text", async () => {
  // The audit row is built from the response, and the response contains the
  // question — so it would be easy to include, and the test exists because it
  // would be easy to include. A legal question is the one thing this system is
  // most careful never to transmit; storing it in a table an administrator can
  // read is the same disclosure with a slower fuse.
  const { readFileSync } = await import("node:fs");
  const server = readFileSync(
    new URL("../../../apps/api/src/server.ts", import.meta.url),
    "utf8",
  );

  const insert = server.slice(
    server.indexOf("INSERT INTO answer_audit"),
    server.indexOf("async function recordAnswer") +
      server
        .slice(server.indexOf("async function recordAnswer"))
        .indexOf("\n}\n"),
  );

  assert.ok(insert.length > 0, "audit insert not found");
  for (const forbidden of [
    "response.question",
    "request.body",
    "question,",
    "createHash",
    "ip",
  ]) {
    assert.ok(
      !insert.includes(forbidden),
      `audit insert must not reference ${forbidden}`,
    );
  }

  // And the column does not exist, so it cannot be added by accident later.
  const migration = readFileSync(
    new URL("../../db/migrations/0005_answer_audit.sql", import.meta.url),
    "utf8",
  );
  assert.ok(!/^\s*"question"/m.test(migration));
  assert.ok(!/question_hash/.test(migration));
});

test("organic laws keep their own number series", async () => {
  const { normaliseLawNumber } = await import("@mylo/domain/law-number");

  // Found on a live 2026 Gazette issue. ".OL" marks an organic law and is part
  // of the number, not a label: organic laws are numbered in their own series,
  // so Organic Law N° 001/2026.OL and Law N° 001/2026 are two different
  // instruments that both start at 001 each year. Dropping the suffix collapsed
  // them onto one key — and law_number is the key everything hangs off, so that
  // is two laws loaded as one.
  assert.equal(
    normaliseLawNumber("ITEGEKO NGENGA N° 001/2026.OL"),
    "01/2026.OL",
  );
  assert.equal(
    normaliseLawNumber("Itegeko Ngenga n°007/2018.OL"),
    "07/2018.OL",
  );
  assert.equal(normaliseLawNumber("LAW N° 001/2026"), "01/2026");
  assert.notEqual(
    normaliseLawNumber("Organic Law N° 001/2026.OL"),
    normaliseLawNumber("Law N° 001/2026"),
  );

  // Still idempotent with the suffix present.
  assert.equal(normaliseLawNumber("01/2026.OL"), "01/2026.OL");
});

test("a Gazette issue is segmented into its instruments", async () => {
  const { segmentStream, indexedInstruments } = await import("./issue.mjs");

  // Modelled on the real structure of a MINIJUST issue: a trilingual index with
  // dot leaders and page numbers, then each instrument's title block, its own
  // table of contents, the title repeated above the body, recitals citing other
  // laws, and articles numbering from one again.
  const issue = [
    "Official Gazette n° 09 bis of 02/03/2026",
    "Ibirimo/ Summary/ Sommaire page/ urup",
    "A. Amategeko/ Laws/ Lois",
    "Itegeko n° 005/2026 ryo ku wa 27/01/2026 ryemera kwemeza burundu……………4",
    "Law n° 005/2026 of 27/01/2026 approving the ratification…………………………4",
    "B. Iteka rya Perezida/ Presidential Order/ Arrêté Présidentiel",
    "Iteka rya Perezida n° 010/01 ryo ku wa 05/06/2026 rikuraho inoti…………………12",
    "ITEGEKO N° 005/2026 RYO KU WA 27/01/2026 RYEMERA KWEMEZA BURUNDU",
    "ISHAKIRO",
    "Ingingo ya mbere: Icyo iri tegeko rigamije",
    "ITEGEKO N° 005/2026 RYO KU WA 27/01/2026 RYEMERA KWEMEZA BURUNDU",
    "Twebwe, KAGAME Paul, Perezida wa Repubulika;",
    // A recital citing another law. Carries an instrument keyword and a law
    // number, and must not be read as a boundary — segmenting here would cut an
    // instrument apart at its own preamble.
    "Isubiye ku Itegeko Ngenga n°007/2018.OL ryo ku wa 08/09/2018 rigenga imikorere ya Sena;",
    "Ishingiye ku Itegeko Nshinga rya Repubulika y’u Rwanda;",
    "Ingingo ya mbere: Icyo iri tegeko rigamije",
    "Iri tegeko ryemera kwemeza burundu amasezerano y’inguzanyo.",
    "ITEKA RYA PEREZIDA N° 010/01 RYO KU WA 05/06/2026 RIKURAHO INOTI",
    "Twebwe, KAGAME Paul, Perezida wa Repubulika;",
    "Ingingo ya mbere: Inoti zikurwaho",
    "Inoti z’amafaranga ibihumbi bitanu zikurwaho.",
  ];

  const spans = segmentStream(issue);
  assert.equal(spans.length, 2, "should find exactly two instruments");
  assert.deepEqual(
    spans.map((s) => s.lawNumber),
    ["05/2026", "10/01"],
  );

  // The first instrument's span must contain its recitals — including the
  // citation of 007/2018.OL — and must stop before the Presidential Order.
  const first = issue.slice(spans[0].from, spans[0].to);
  assert.ok(first.some((l) => l.includes("007/2018.OL")));
  assert.ok(!first.some((l) => l.includes("RIKURAHO INOTI")));

  // The index is authoritative about what the issue holds, and is used to check
  // that nothing was missed.
  assert.deepEqual(indexedInstruments(issue).sort(), ["05/2026", "10/01"]);
});

test("a repeated title is not a second instrument", async () => {
  const { segmentStream } = await import("./issue.mjs");
  // The Gazette prints each title twice: once above the instrument's own table
  // of contents, once above its body. Treating the repeat as a boundary would
  // split every instrument in two and give the first half no articles.
  const spans = segmentStream([
    "ITEGEKO NGENGA N° 001/2026.OL RYO KU WA 25/02/2026 RIGENA IMIKORERE YA SENA",
    "ISHAKIRO",
    "Ingingo ya mbere: Icyo iri Tegeko Ngenga rigamije",
    "ITEGEKO NGENGA N° 001/2026.OL RYO KU WA 25/02/2026 RIGENA IMIKORERE YA SENA",
    "Twebwe, KAGAME Paul,",
    "Ingingo ya mbere: Icyo iri Tegeko Ngenga rigamije",
    "Iri Tegeko Ngenga rigena imikorere ya Sena.",
  ]);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].lawNumber, "01/2026.OL");
});

test("order numbers are not read as years", async () => {
  const { normaliseLawNumber } = await import("@mylo/domain/law-number");

  // Laws are serial/year; orders are serial/category. Evidence from the corpus:
  // Presidential Order n° 472/06 is from 1979, n° 56/01 from 2010, n° 10/01
  // from 2004. Reading the second component as a year invents a date and merges
  // every order sharing a category code onto one key — and orders are the most
  // numerous instrument in the Gazette.
  for (const [raw, expected] of [
    ["N° 472/06", "472/06"],
    ["N° 56/01", "56/01"],
    ["N° 010/01", "10/01"],
    ["N° 49/01", "49/01"],
  ]) {
    assert.equal(
      normaliseLawNumber(raw, { kind: "presidential_order" }),
      expected,
      raw,
    );
    assert.equal(
      normaliseLawNumber(raw, { kind: "ministerial_order" }),
      expected,
      raw,
    );
  }

  // Laws are unaffected: a two-digit component there really is a year, and the
  // document's own date resolves its century.
  assert.equal(normaliseLawNumber("N° 5/62", { year: "1962" }), "05/1962");
  assert.equal(normaliseLawNumber("N° 001/2026.OL"), "01/2026.OL");
});

test("a real multi-instrument issue PDF segments correctly", async () => {
  // The committed fixture. Everything above tests segmentation against lists of
  // lines, which model a document rather than being one — they prove the
  // boundary rules and nothing about column splitting or line assembly from
  // word-level items. This runs the whole path against an actual PDF, and it is
  // what CI can run, since the fixture is authored here rather than taken from
  // the Gazette.
  const { parseIssue } = await import("./gazette.mjs");
  const { fileURLToPath } = await import("node:url");
  const path = fileURLToPath(
    new URL("../fixtures/gazette-issue-2099.pdf", import.meta.url),
  );

  const issue = await parseIssue(path);

  assert.equal(issue.instrumentCount, 2, "issue holds a law and an order");
  assert.deepEqual(issue.warnings, [], "no segmentation warnings");

  // The front-matter index is found despite entries wrapping across lines, and
  // agrees with what segmentation produced.
  assert.deepEqual(issue.indexed.sort(), ["99/01", "99/2099"]);

  const [law, order] = issue.instruments;

  // Type read from the title alone. The law recites an Organic Law; reading into
  // recitals classified it as one.
  assert.equal(law.source.lawNumber, "99/2099");
  assert.equal(law.source.instrument, "law");

  // Order numbers are serial/category. 99/01 must not become 99/2001.
  assert.equal(order.source.lawNumber, "99/01");
  assert.equal(order.source.instrument, "presidential_order");

  // Articles belong to their own instrument and restart at one, which is the
  // whole point: unsegmented, all five would have landed under the law.
  assert.equal(law.stats.articlesFound, 3);
  assert.equal(order.stats.articlesFound, 2);

  // All three languages segment. The French title block failed alone before,
  // because \b cannot close after the É in ARRÊTÉ.
  assert.deepEqual(law.source.languages.sort(), ["en", "fr", "rw"]);
  assert.deepEqual(order.source.languages.sort(), ["en", "fr", "rw"]);
});

test("BM25 scoring is unchanged by the inverted index", async () => {
  const { Bm25Index } = await import("../../../apps/api/src/retrieval.ts");

  // Exact expected scores, not just an ordering. The index was transposed from
  // one term-map per document to one term-to-documents map, for speed and
  // memory — 178ms to 31ms per query and 672MB to 340MB at 40,000 documents.
  // A change made for performance must not move a single score, because the
  // "I don't know" floor is compared against these numbers absolutely: shifting
  // them silently re-tunes the threshold that decides whether MyLo answers.
  const index = new Bm25Index([
    { item: "a", text: "the right to due process of law" },
    { item: "b", text: "the right to private property" },
    { item: "c", text: "banana bread and grilled fish" },
  ]);

  const hits = index.search("due process", 3);
  assert.equal(hits[0].item, "a");
  assert.equal(hits[0].score.toFixed(4), "6.3550");
  // A weaker but real match ranks below it rather than being discarded.
  assert.equal(hits[1].item, "b");

  // Documents sharing no n-gram with the query score zero and are dropped, not
  // returned with a score of zero — the floor would otherwise never be reached.
  assert.ok(!hits.some((h) => h.item === "c"));

  // A query term absent from the corpus contributes nothing rather than
  // throwing, which is what lets the index skip it instead of walking.
  assert.deepEqual(index.search("zzzzqqqq", 3), []);
  assert.deepEqual(index.search("", 3), []);
});
