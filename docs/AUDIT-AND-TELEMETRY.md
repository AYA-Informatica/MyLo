# Telemetry, audit, and voice

Three capabilities were considered together because they share one constraint:
each of them, done the ordinary way, would undo the decision that shapes
everything else in MyLo — that a question about your own rights is not a neutral
thing to send away.

Two were built. One was not, and the reason is worth more than the feature.

## Audit — built

`answer_audit` records what MyLo answered and on what basis: the corpus
fingerprint, the retrieval configuration, the number of texts served, the floor
in force and whether it was stale, what was cited and at what score, and which
limitations the reader was shown.

It records **nothing about the person**. No question text, no identifier, no
address.

**Why not the question.** A question put to MyLo is someone's legal problem —
being prosecuted, losing land, an employer withholding pay. The retrieval design
already refuses to send such a question off the machine. Writing it to a table
that outlives the session, and that an administrator can read, is the same
disclosure with a slower fuse.

**Why not even a hash of it.** The obvious compromise is a salted digest, so
identical questions group without the text being stored. That does not survive
contact with the input space: legal questions are short, drawn from a small
vocabulary, and anyone with the salt can enumerate candidates and match them. A
hash of a low-entropy input is not an anonymisation. It is a lookup key waiting
for a dictionary.

**What is still auditable.** If a reader reports that MyLo answered wrongly, the
record establishes whether the answer was correct _given what MyLo held that
day_: which articles were reachable, what the threshold was, what scored above
it. The vision document asks an audit trail what the system saw, what it
concluded, and why. All three are answered. Who asked is not, deliberately.

Verified end to end — a real answer produced this row:

```
kind          shortlist        served_texts  69
score_floor   12               floors_stale  t
citations     [{"law":"02/2007","article":"5","score":13.9,"status":"active"}]
limitations   ["unresolved_repeals"]
```

The write is awaited rather than fired and forgotten. An audit trail with silent
gaps is worse than none, because the gaps look like quiet periods.

## Telemetry — built, but not as a second system

`GET /api/v1/stats` derives operational numbers from the audit trail: answers by
language, how many were declined, how many were served while the floors were
stale, and — asked directly rather than left to be noticed — how many citations
ever pointed at law that is not servable.

**A tracking script was declined for this path.** A privacy-first, cookieless,
self-hosted analytics package is genuinely the right choice for a marketing page,
and is the wrong thing to run inside an answer view. It executes in the reader's
browser while they are looking at an answer about their own legal problem, and
the referrer, the dwell time and the page sequence would say more about that
person than the audit row does. The audit table already answers the questions
worth asking, and it answers them from records that never contained a question.

If page-level analytics are wanted for a landing surface, self-hosted and
cookieless is the right shape — kept off `/ask` and off any view that renders a
citation.

## Voice — not built, and here is what would be needed

Speech input is a real fit for this audience. Someone facing court without money
for a lawyer may find speaking far easier than typing Kinyarwanda on a phone, and
the tokeniser already accepts what a transcript looks like: lowercased,
unpunctuated, apostrophes normalised. That is tested.

It is not built because it cannot be built honestly here, and one option that
looks obvious has to be ruled out explicitly.

**The browser's Web Speech API is disqualified.** It is the path of least
resistance — a few lines, no infrastructure — and in Chrome it streams the audio
to Google for recognition. That would take the one thing MyLo has been most
careful never to transmit and transmit it, in a richer form than text: an
identifiable voice describing a legal problem. Every argument that ruled out
dense embeddings rules this out more strongly, and it would be an easy thing to
add without noticing what it costs.

**What is required instead** is recognition on a machine the reader or the
operator controls. Two viable shapes, neither runnable in this sandbox:

- A local ASR service the operator runs, with the browser posting audio to it and
  the transcript entering the existing query path.
- On-device recognition in the browser via a WASM model, which keeps audio on the
  reader's machine but costs a large download.

**Model choice is not obvious either.** Kinyarwanda is not in Whisper's
supported language set, so the obvious model is the wrong one. Purpose-built
Kinyarwanda ASR exists — a Conformer-Transducer trained on ~2,000 hours reported
16.19% WER — and is the better starting point.

The honest position is that voice needs a model, a machine to run it on, and a
measurement of how it does on Kinyarwanda legal vocabulary. None of those are
code, and shipping a microphone button wired to a cloud API would be a
regression disguised as a feature.
