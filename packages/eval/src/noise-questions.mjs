/**
 * Fluent questions the Constitution cannot answer, in all three languages.
 *
 * Used to place the score floor below which MyLo says it does not know. Shared
 * rather than duplicated because two scripts derive that floor — one against the
 * corpus file, one against the live index — and a floor is only comparable
 * between them if the noise is identical.
 *
 * Deliberately not adversarial gibberish, which is easy to reject. These are
 * well-formed sentences a real person might type, several brushing against
 * legal-sounding vocabulary ("amafaranga", "permis"), because the floor has to
 * survive the near-misses rather than the obvious ones.
 */
export const NOISE = {
  rw: [
    "Nshaka kumenya uko batetse umutsima w'ibitoke",
    "Ni ryari umukino w'Amavubi utangira?",
    "Ikirere kizaba kimeze gute ejo i Kigali?",
    "Amafaranga y'ikawa angahe ku isoko?",
    "Mbwira inkuru nziza y'urwenya",
    "Nshaka kugura telefone nshya, iyihe nziza?",
  ],
  en: [
    "How do I make banana bread?",
    "What time does the football match start?",
    "What is the weather in Kigali tomorrow?",
    "Recommend me a good restaurant downtown",
    "How do I fix a flat bicycle tyre?",
    "Tell me a joke about programmers",
  ],
  fr: [
    "Comment faire du pain aux bananes ?",
    "À quelle heure commence le match de football ?",
    "Quel temps fera-t-il demain à Kigali ?",
    "Recommande-moi un bon restaurant",
    "Comment réparer un pneu de vélo ?",
    "Raconte-moi une blague",
  ],
};
