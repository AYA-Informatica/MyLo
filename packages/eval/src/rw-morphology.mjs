/**
 * Kinyarwanda stemming, from the documented noun-class system.
 *
 * Character n-grams already retrieve Kinyarwanda better than anything else
 * measured, because an agglutinative language hides one idea behind many
 * prefixes and overlapping character runs recover the shared stem by accident.
 * This asks whether doing it on purpose is better.
 *
 * The prefix inventory is not guessed. It is the sixteen noun classes as set out
 * in the Peace Corps trainee grammar, which gives the structure as
 *
 *     augment + nominal prefix + root        u-mu-ganga, a-ba-ntu, a-ga-kapu
 *
 * and verbs as
 *
 *     verbal prefix + root + final vowel     ba-vur-a, du-sukur-a, a-kor-a
 *
 * Classes 1–15 are nominal, 16 and the rest locative; they work in singular /
 * plural pairs, so "umuntu" and "abantu" differ only in the prefix carrying the
 * same root -ntu. A word index files those as unrelated terms, which is exactly
 * the failure this removes.
 *
 * Deliberately conservative. Kinyarwanda prefixes are also legitimate word
 * beginnings — stripping "ka" from a root that simply starts with it destroys
 * the term — so a prefix is only removed when what remains is still a plausible
 * root, and a word is always indexed under its full form as well. Over-stemming
 * loses recall silently; under-stemming just leaves the n-grams to do their job.
 */

/**
 * Augment vowels, which open most nouns: u-mu-ntu, a-ba-ntu, i-ki-bindi.
 * Removed only together with a following class prefix, never alone.
 */
const AUGMENTS = ["u", "a", "i", "o"];

/**
 * The sixteen classes, with the spelling alternations the language actually
 * shows: ki/gi and ka/ga soften, tu appears as du, and prefixes before a vowel
 * glide to mw/bw/rw/kw/gw/my/by.
 */
const CLASS_PREFIXES = [
  "mu",
  "mw",
  "ba",
  "b",
  "mi",
  "my",
  "ri",
  "ry",
  "ma",
  "m",
  "ki",
  "gi",
  "ky",
  "bi",
  "by",
  "n",
  "ru",
  "rw",
  "ka",
  "ga",
  "tu",
  "du",
  "bu",
  "bw",
  "ku",
  "gu",
  "kw",
  "gw",
  "ha",
  "h",
];

/** Subject and object markers that open a conjugated verb. */
const VERB_PREFIXES = [
  "nd",
  "n",
  "u",
  "a",
  "tu",
  "du",
  "mu",
  "ba",
  "ki",
  "bi",
  "zi",
  "ru",
  "ka",
  "ha",
  "ya",
  "ra",
  "ku",
  "gu",
];

/** Tense and aspect markers that sit between prefix and root. */
const TENSE_MARKERS = ["ra", "ri", "za", "a", "aa"];

/** Verb endings: -a for most tenses, -ye for the perfect. */
const FINALS = ["ye", "a", "e"];

const MIN_ROOT = 3;

/**
 * Reduces one word to its probable root.
 *
 * Strips at most one augment+class prefix and one final vowel, because
 * Kinyarwanda stacks prefixes but stripping more than one without a full
 * morphological parser removes real material more often than it helps.
 */
export function stemWord(word) {
  let w = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (w.length < MIN_ROOT + 1) return w;

  // augment + class prefix, longest prefix first so "mw" wins over "m"
  for (const aug of AUGMENTS) {
    if (!w.startsWith(aug)) continue;
    const rest = w.slice(aug.length);
    const prefix = CLASS_PREFIXES.filter((p) => rest.startsWith(p)).sort(
      (a, b) => b.length - a.length,
    )[0];
    if (prefix && rest.length - prefix.length >= MIN_ROOT) {
      w = rest.slice(prefix.length);
      break;
    }
    // Some classes show no consonantal prefix once the augment is present —
    // class 5 gives "i-tegeko" against class 6 "a-ma-tegeko". Without stripping
    // the bare augment those two never meet, and "itegeko" / "amategeko" is
    // precisely the singular/plural pair a reader asking about the law will use.
    if (rest.length >= MIN_ROOT + 1) {
      w = rest;
      break;
    }
  }

  // a bare class prefix, for words written without their augment
  if (w === word.toLowerCase()) {
    const prefix = CLASS_PREFIXES.filter((p) => w.startsWith(p)).sort(
      (a, b) => b.length - a.length,
    )[0];
    if (prefix && w.length - prefix.length >= MIN_ROOT)
      w = w.slice(prefix.length);
  }

  // verbal prefix, then tense marker
  const vp = VERB_PREFIXES.filter((p) => w.startsWith(p)).sort(
    (a, b) => b.length - a.length,
  )[0];
  if (vp && w.length - vp.length >= MIN_ROOT) {
    const afterPrefix = w.slice(vp.length);
    const tm = TENSE_MARKERS.filter((t) => afterPrefix.startsWith(t)).sort(
      (a, b) => b.length - a.length,
    )[0];
    if (tm && afterPrefix.length - tm.length >= MIN_ROOT) {
      w = afterPrefix.slice(tm.length);
    }
  }

  // final vowel or perfect ending
  const fin = FINALS.filter((f) => w.endsWith(f)).sort(
    (a, b) => b.length - a.length,
  )[0];
  if (fin && w.length - fin.length >= MIN_ROOT) w = w.slice(0, -fin.length);

  return w;
}

/**
 * Tokenises Kinyarwanda text as roots plus the full words they came from.
 *
 * Both are emitted because stemming is lossy and this language's prefixes carry
 * real meaning: keeping the surface form means a query that matches exactly
 * still scores, while the root lets "ubutegetsi" and "bw'ubutegetsi" meet.
 */
export function stemTokens(text) {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((w) => w.length > 2);

  const out = [];
  for (const w of words) {
    out.push(w);
    const stem = stemWord(w);
    if (stem && stem !== w) out.push(stem);
  }
  return out;
}
