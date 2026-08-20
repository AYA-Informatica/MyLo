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
