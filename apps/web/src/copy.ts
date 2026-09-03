/**
 * Every word the interface says, in all three languages.
 *
 * Kinyarwanda is not a translation target here — it is the first language the
 * copy is written for, because it is the one most people who need MyLo actually
 * read. The English and French are the translations.
 *
 * Nothing in this file makes a claim about the law. Statements about what the
 * law says arrive from the API attached to a citation, and the strings here only
 * frame them.
 *
 * The tagline and disclaimer used to name the Constitution, which was accurate
 * while it was the only law loaded and became a false description of the corpus
 * the moment it was not — the same wording bug the API's notices had.
 */
import type { Language } from "@mylo/domain";

export interface Copy {
  readonly tagline: string;
  readonly placeholder: string;
  readonly submit: string;
  readonly asking: string;
  readonly official: string;
  readonly translation: string;
  readonly explanation: string;
  readonly noExplanation: string;
  /** The action offered when MyLo cannot answer, and what happens after. */
  readonly recordAsk: string;
  readonly recordAction: string;
  readonly recordSaving: string;
  readonly recordDone: string;
  readonly recordKeep: string;
  readonly recordWithdraw: string;
  readonly recordWithdrawn: string;
  readonly recordFailed: string;
  readonly source: string;
  readonly partialLaw: string;
  /**
   * The limit no per-citation field can express.
   *
   * An ordinary law's closing article repeals "all previous legal provisions
   * contrary to this law" without naming one, so MyLo can say a law has not
   * itself been repealed and cannot say nothing later has partly undone it.
   * Shown once per answer rather than per citation: it is a property of the
   * corpus, and repeating it under every article would train readers past it.
   */
  readonly unresolvedRepeals: string;
  /** Prefixes the date a law started binding people, not the date it was signed. */
  readonly inForceSince: string;
  readonly article: string;
  readonly failed: string;
  readonly disclaimer: string;
}

export const COPY: Record<Language, Copy> = {
  rw: {
    tagline: "Baza ikibazo ku mategeko ya Repubulika y’u Rwanda.",
    placeholder: "Urugero: Ese mfite uburenganzira ku mutungo bwite?",
    submit: "Baza",
    asking: "Turashakisha…",
    official: "Umwimerere",
    translation: "Ubusobanuro bw’indimi",
    explanation: "Mu magambo yoroshye",
    noExplanation:
      "Nta busobanuro bwemejwe kuri iyi ngingo. Hano hari umwimerere w’itegeko gusa.",
    source: "Inkomoko",
    partialLaw:
      "Iri tegeko ntiryinjijwe ryose muri MyLo. Hashobora kubaho izindi ngingo zihindura iyi.",
    // NEEDS REVIEW — Kinyarwanda wording written without a Kinyarwanda-speaking
    // reviewer, like the rest of this file. This string in particular states a
    // limit of the corpus, so getting it wrong misleads about what MyLo knows.
    unresolvedRepeals:
      "Andi mategeko yaje nyuma ashobora kuba yarakuyeho bimwe muri iri tegeko atabivuze mu buryo bweruye. MyLo ntishobora kubimenya.",
    inForceSince: "Ritangira gukurikizwa",
    // NEEDS REVIEW, like every Kinyarwanda string in this file.
    recordAsk:
      "Ushaka ko MyLo yandika iki kibazo kugira ngo kizasubizwe? Nta kintu kikuranga kibikwa.",
    recordAction: "Andika ikibazo cyanjye",
    recordSaving: "Birandikwa...",
    recordDone: "Cyanditswe. Iyi ni imfunguzo yawe:",
    recordKeep:
      "Yibike. Ni yo nzira yonyine yo gusiba iki kibazo, kandi ntituzongera kukwereka.",
    recordWithdraw: "Gisibe",
    recordWithdrawn: "Cyasibwe.",
    recordFailed: "Ntibyakunze kwandikwa. Ongera ugerageze.",
    article: "Ingingo ya",
    failed: "Ntibyakunze kubona igisubizo. Ongera ugerageze.",
    disclaimer:
      "MyLo yerekana amagambo y’amategeko uko yanditswe. Ntabwo ari inama y’umunyamategeko.",
  },
  en: {
    tagline: "Ask a question about the laws of the Republic of Rwanda.",
    placeholder: "For example: Do I have a right to private property?",
    submit: "Ask",
    asking: "Searching…",
    official: "Official text",
    translation: "Official translation",
    explanation: "In plain language",
    noExplanation:
      "No approved explanation exists for this article yet. Only the official text is shown.",
    source: "Source",
    partialLaw:
      "This law is not fully loaded in MyLo. Other articles may qualify this one.",
    unresolvedRepeals:
      "A later law may have repealed part of this one without naming it. MyLo cannot tell you whether that has happened.",
    inForceSince: "In force since",
    recordAsk:
      "Would you like MyLo to record this question so it can be answered later? Nothing identifying you is stored.",
    recordAction: "Record my question",
    recordSaving: "Recording...",
    recordDone: "Recorded. This is your key:",
    recordKeep:
      "Keep it. It is the only way to remove this question, and you will not be shown it again.",
    recordWithdraw: "Remove it",
    recordWithdrawn: "Removed.",
    recordFailed: "That could not be recorded. Please try again.",
    article: "Article",
    failed: "The question could not be answered. Please try again.",
    disclaimer:
      "MyLo shows the words of the law as they were published. It is not legal advice.",
  },
  fr: {
    tagline: "Posez une question sur les lois de la République du Rwanda.",
    placeholder: "Par exemple : Ai-je droit à la propriété privée ?",
    submit: "Demander",
    asking: "Recherche…",
    official: "Texte officiel",
    translation: "Traduction officielle",
    explanation: "En langage simple",
    noExplanation:
      "Aucune explication approuvée n'existe encore pour cet article. Seul le texte officiel est affiché.",
    source: "Source",
    unresolvedRepeals:
      "Une loi postérieure peut avoir abrogé une partie de celle-ci sans la nommer. MyLo ne peut pas vous dire si cela s'est produit.",
    inForceSince: "En vigueur depuis",
    recordAsk:
      "Voulez-vous que MyLo enregistre cette question afin qu'elle soit traitée plus tard ? Rien ne vous identifie.",
    recordAction: "Enregistrer ma question",
    recordSaving: "Enregistrement...",
    recordDone: "Enregistrée. Voici votre clé :",
    recordKeep:
      "Conservez-la. C'est le seul moyen de supprimer cette question, et elle ne sera plus affichée.",
    recordWithdraw: "La supprimer",
    recordWithdrawn: "Supprimée.",
    recordFailed: "L'enregistrement a échoué. Veuillez réessayer.",
    partialLaw:
      "Cette loi n'est pas entièrement chargée dans MyLo. D'autres articles peuvent la nuancer.",
    article: "Article",
    failed: "La question n'a pas pu être traitée. Veuillez réessayer.",
    disclaimer:
      "MyLo affiche les mots de la loi tels qu'ils ont été publiés. Ceci n'est pas un conseil juridique.",
  },
};
