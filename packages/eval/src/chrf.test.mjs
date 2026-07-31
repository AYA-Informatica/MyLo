/** Sanity checks for the scorer, so a broken metric can't silently rank models. */
import { chrf } from "./chrf.mjs";
import assert from "node:assert";

const rw = "Ntawe ushobora gushyingirwa atarageza ku myaka 18.";

const identical = chrf(rw, rw);
const paraphrase = chrf("Ntawe ushobora gushyingirwa atageze ku myaka 18.", rw);
const english = chrf(
  "No person may contract marriage before eighteen years.",
  rw,
);
const empty = chrf("", rw);

console.log("identical        ", identical.toFixed(1));
console.log("near-miss (RW)   ", paraphrase.toFixed(1));
console.log("wrong language   ", english.toFixed(1));
console.log("empty            ", empty.toFixed(1));

assert(identical > 99, "identical text must score ~100");
assert(paraphrase > 70, "a one-morpheme difference must retain most credit");
assert(paraphrase < identical, "a near miss must score below an exact match");
assert(english < 25, "wrong language must score low");
assert(empty === 0, "empty output must score 0");
console.log("\nAll assertions passed.");
