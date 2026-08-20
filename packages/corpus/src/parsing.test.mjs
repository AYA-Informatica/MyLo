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
import { normaliseLawNumber } from "../../pipeline/src/build-status-map.mjs";

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
