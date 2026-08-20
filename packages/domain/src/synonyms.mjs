/**
 * Legal terms of art, and the words people use for them instead.
 *
 * The gap this closes is named in `docs/ARCHITECTURE.md` as the one failure
 * character n-grams cannot reach: a reader asks about a "fair trial" and the
 * Constitution says "due process of law". The two phrases share no substring
 * worth indexing. This is not a spelling problem that a better tokeniser fixes —
 * a right has a common name and a legal name, and only one of them is printed
 * in the Gazette.
 *
 * ## Why a hand-written list rather than embeddings
 *
 * Dense retrieval would also close it, and measured better in English than
 * character BM25 (87.6 against 72.1 at rank 1). It was rejected for a reason
 * that has not changed: an embedding model has to be resident when the question
 * is asked, which means a GPU on the server or the reader's question travelling
 * to someone else's. A question about your own rights is not a neutral thing to
 * send away. Reaching for embeddings here would quietly reverse a privacy
 * decision this project already made, in order to fix a problem that a few dozen
 * curated lines also fix.
 *
 * The list is also auditable in a way a vector space is not. Every entry is a
 * claim that two phrases name the same legal concept — a claim a Rwandan lawyer
 * can read, disagree with, and correct. When MyLo retrieves the wrong article,
 * someone can look here and see why.
 *
 * ## What belongs here, and what does not
 *
 * Only pairs where the everyday phrasing and the legal phrasing name the *same*
 * concept. Not related concepts, not broader ones. "Arrest" and "detention" are
 * different legal states with different consequences, and folding them together
 * would retrieve confidently wrong articles — which is worse than retrieving
 * nothing, because the reader has no way to tell.
 *
 * Kinyarwanda entries are marked as needing review by a Kinyarwanda-speaking
 * lawyer and should be treated as provisional. Getting a synonym wrong here has
 * the same shape as a mistranslation: it is not a typo, it is MyLo asserting
 * that two legal ideas are one.
 */

/**
 * `concept: { lang: [phrasings] }`.
 *
 * Every phrasing in a group expands to every other phrasing in that group, so
 * order within a group carries no meaning. Groups are per-language: expanding an
 * English question with French terms would add noise, and the Gazette publishes
 * each language separately anyway.
 */
export const SYNONYMS = {
  due_process: {
    en: [
      "fair trial",
      "fair hearing",
      "due process of law",
      "due process",
      "judicial guarantees",
    ],
    fr: [
      "procès équitable",
      // The Constitution's own French heading is "garantie de justice", not the
      // "garanties judiciaires" a first draft guessed at. A synonym list whose
      // entries do not appear in the corpus adds noise and nothing else — it
      // made this query worse, not better.
      "garantie de justice",
      "droit à la garantie de justice",
      "droit à un procès",
    ],
    rw: [
      // Verified against the corpus: the Constitution's own heading for
      // Article 29 is "Uburenganzira ku butabera buboneye".
      "ubutabera buboneye",
      "uburenganzira ku butabera buboneye",
      // NEEDS REVIEW — how a person would actually *ask*. Guessed, and the
      // first guess ("kuburanishwa neza") appears nowhere in the corpus. The
      // two halves of a synonym group are not equally verifiable: the legal
      // name can be checked against the Gazette, the everyday name cannot be
      // checked against anything except a Kinyarwanda speaker.
      "kuburanishwa neza",
      "uburenganzira bwo kuburana",
    ],
  },

  presumption_of_innocence: {
    en: [
      "innocent until proven guilty",
      "presumed innocent",
      "presumption of innocence",
    ],
    fr: [
      "présumé innocent",
      "présomption d'innocence",
      "innocent jusqu'à preuve",
    ],
    rw: ["afatwa nk’umwere", "umwere kugeza igihe"], // NEEDS REVIEW
  },

  liberty_of_person: {
    en: [
      "locked up without a reason",
      "arbitrary detention",
      "unlawful detention",
      "liberty and security of person",
      "held without charge",
    ],
    fr: [
      "détention arbitraire",
      "liberté et sécurité de la personne",
      "détenu sans motif",
    ],
    rw: ["gufungwa nta mpamvu", "umudendezo w’umuntu"], // NEEDS REVIEW
  },

  privacy_of_home: {
    en: [
      "search my house",
      "search my home",
      "enter my home without permission",
      "privacy of a person and of family",
      "privacy of his or her home",
      "inviolability of the home",
    ],
    fr: [
      "perquisition de mon domicile",
      "inviolabilité du domicile",
      "entrer chez moi sans autorisation",
    ],
    rw: ["gusaka inzu", "ubudahangarwa bw’urugo"], // NEEDS REVIEW
  },

  freedom_of_expression: {
    en: [
      "say what I want",
      "freedom of speech",
      "freedom of expression",
      "freedom of opinion",
    ],
    fr: ["liberté d'expression", "liberté d'opinion", "dire ce que je veux"],
    rw: ["kuvuga icyo ntekereza", "ubwisanzure bwo kuvuga"], // NEEDS REVIEW
  },

  equality_before_law: {
    en: [
      "treated the same",
      "equality before the law",
      "equal protection",
      "discrimination",
    ],
    fr: ["égalité devant la loi", "traité de la même façon", "discrimination"],
    rw: ["kunganya imbere y’amategeko", "ivangura"], // NEEDS REVIEW
  },

  right_to_property: {
    en: [
      "take my land",
      "expropriation",
      "right to property",
      "private property",
    ],
    fr: ["exproprier ma terre", "droit de propriété", "propriété privée"],
    rw: ["kwambura ubutaka", "uburenganzira ku mutungo"], // NEEDS REVIEW
  },
};

/**
 * Appends the other phrasings of any concept the query mentions.
 *
 * Appends rather than replaces, deliberately. The reader's own words are usually
 * the strongest signal — if the Constitution happens to use them, substituting
 * them away would break a query that already worked.
 *
 * Appending is not free, though, and an earlier version of this comment claimed
 * it was: "expansion is only ever additive, so it can help and cannot subtract."
 * That is false and the measurement disproved it. A French query for "procès
 * équitable" ranked the right article at #19 before expansion and missed
 * entirely after, because the group contained "garanties judiciaires" — a
 * plausible phrase that appears nowhere in the corpus, whose n-grams diluted the
 * ones that were matching. Under BM25 every added term competes for weight.
 *
 * So a phrasing that does not occur in the corpus is not neutral, it is noise.
 * Entries naming the legal side of a concept should be checked against the
 * Gazette before being added.
 *
 * Matching is on the query as written, lowercased. No stemming: these are fixed
 * multi-word phrases and partial matches are how "arrest" starts retrieving
 * articles about detention.
 */
export function expandQuery(query, language) {
  const haystack = query.toLowerCase();
  const additions = [];

  for (const concept of Object.values(SYNONYMS)) {
    const phrasings = concept[language];
    if (!phrasings) continue;

    const matched = phrasings.filter((p) => haystack.includes(p.toLowerCase()));
    if (matched.length === 0) continue;

    for (const phrasing of phrasings) {
      if (!matched.includes(phrasing)) additions.push(phrasing);
    }
  }

  return additions.length ? `${query} ${additions.join(" ")}` : query;
}
