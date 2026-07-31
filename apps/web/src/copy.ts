/**
 * Every word the interface says, in all three languages.
 *
 * Kinyarwanda is not a translation target here — it is the first language the
 * copy is written for, because it is the one most people who need MyLo actually
 * read. The English and French are the translations.
 *
 * Nothing in this file makes a claim about the law. Statements about what the
 * Constitution says arrive from the API attached to a citation, and the strings
 * here only frame them.
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
  readonly source: string;
  readonly partialLaw: string;
  readonly article: string;
  readonly failed: string;
  readonly disclaimer: string;
}

export const COPY: Record<Language, Copy> = {
  rw: {
    tagline: "Baza ikibazo ku Itegeko Nshinga rya Repubulika y’u Rwanda.",
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
    article: "Ingingo ya",
    failed: "Ntibyakunze kubona igisubizo. Ongera ugerageze.",
    disclaimer:
      "MyLo yerekana amagambo y’Itegeko Nshinga uko yanditswe. Ntabwo ari inama y’umunyamategeko.",
  },
  en: {
    tagline: "Ask a question about the Constitution of the Republic of Rwanda.",
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
    article: "Article",
    failed: "The question could not be answered. Please try again.",
    disclaimer:
      "MyLo shows the words of the Constitution as they were published. It is not legal advice.",
  },
  fr: {
    tagline:
      "Posez une question sur la Constitution de la République du Rwanda.",
    placeholder: "Par exemple : Ai-je droit à la propriété privée ?",
    submit: "Demander",
    asking: "Recherche…",
    official: "Texte officiel",
    translation: "Traduction officielle",
    explanation: "En langage simple",
    noExplanation:
      "Aucune explication approuvée n'existe encore pour cet article. Seul le texte officiel est affiché.",
    source: "Source",
    partialLaw:
      "Cette loi n'est pas entièrement chargée dans MyLo. D'autres articles peuvent la nuancer.",
    article: "Article",
    failed: "La question n'a pas pu être traitée. Veuillez réessayer.",
    disclaimer:
      "MyLo affiche les mots de la Constitution tels qu'ils ont été publiés. Ceci n'est pas un conseil juridique.",
  },
};
