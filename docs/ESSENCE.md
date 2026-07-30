# MyLo — the essence

Written 2026-07-31, from a full read of the codebase as it stood before the
rewrite. The code is being replaced. This document exists so the thinking that
went into it is not.

It separates three things that are easy to confuse: what MyLo was **for**, what
was actually **built**, and what was only ever **claimed**. The first is worth
keeping. The second is mostly worth deleting. The third is where the real work
still is.

---

## 1. The one-sentence version

**Rwanda's laws are public but not accessible, and MyLo was the layer between the
Gazette and the person it governs.**

Publication is not access. The Gazette is complete, official, and free — and
almost entirely unusable by the people bound by it. It is written in legal
register, largely in a language many citizens do not read comfortably, organised
for lawyers, and searchable only if you already know what you are looking for.

MyLo was an attempt at translation in three simultaneous senses:

| Sense        | From             | To                       |
| ------------ | ---------------- | ------------------------ |
| **Language** | French / English | Kinyarwanda              |
| **Register** | Legal drafting   | Plain speech             |
| **Access**   | "Ask a lawyer"   | "Ask, and get an answer" |

Everything else in the product is downstream of those three.

## 2. The three questions

The product's soul is three questions an ordinary person cannot currently answer
about their own legal system:

1. **What law just changed, and does it affect me?**
2. **Which law protects me?**
3. **Which law punishes me if I get this wrong?**

These are worth keeping as the acceptance test for the rewrite. Any feature that
does not eventually serve one of them is decoration. If the new system can answer
all three, with citations, in Kinyarwanda, it has succeeded regardless of what it
is built from.

## 3. The participants, and why there are four

This is the most valuable idea in the project, and the one least visible in the
code.

| Role                                    | Needs                               | Gives                                         |
| --------------------------------------- | ----------------------------------- | --------------------------------------------- |
| **Citizen**                             | To know where they stand, free, now | Questions, and the demand signal              |
| **Organization** (startup, school, NGO) | Sector-specific compliance          | Higher-value recurring need                   |
| **Law firm**                            | Clients, and visible credibility    | Authoritative answers, professional judgement |
| **Admin**                               | A trustworthy corpus                | Curation, verification, moderation            |

The structure implies a genuine model, not just a set of permissions:

> **The AI absorbs the volume. The firms take the depth. The community is where
> they meet.**

Most legal questions people have are common, answerable, and not worth a lawyer's
hour — those are the AI's. A minority are genuinely hard, specific, or
consequential — those are a firm's, and a firm that answered well in public has
just advertised itself better than any directory listing could.

That is a real two-sided design: citizens get free answers, firms get qualified
leads, and the public archive of answered questions compounds in value. It is
also why the directory, the ratings, and the community are not three unrelated
features — they are one mechanism.

**Keep this.** It survives any technology choice.

## 4. What was modelled well

The domain vocabulary is the strongest part of the codebase and should be carried
forward largely intact.

### The legal taxonomy

**Origin** — where a law comes from, which in Rwanda is a real distinction with
real consequences for authority and amendability:

`Presidential` · `Parliamentary` · `Ministerial` · `Judicial` · `Administrative`

**Domain** — subject area, used both to classify laws and to route people to firms
that practise in them:

`Criminal` · `Civil` · `Corporate` · `Family` · `Intellectual Property`

Domain does double duty: it classifies a `Law`, it types a firm's `Specialty`, and
it is what a user expresses a `DomainPreference` over. One vocabulary, three jobs.
That is good design and it is worth preserving.

### Law → Article

Laws decompose into numbered articles (`lawNumber` → `articleNumber`, each with
its own title and content).

**This is the single most important structural decision in the project.** Legal
answers are only trustworthy at article granularity. "The labour law covers this"
is useless; "Article 12 of Law N° 66/2018 says this" is an answer. Any rewrite
that flattens laws into documents throws away the only thing that makes citation
possible.

### Law lifecycle

`status: Active | Amended | Repealed` — correctly recognising that a legal corpus
is temporal, and that telling someone about a repealed law is worse than telling
them nothing.

### The response envelope

Every endpoint answers `{ data, message, success }`. Dull, consistent, and worth
keeping purely because it is uniform.

---

## 5. What was actually built

Honest inventory. "Works" means it functions end to end.

| Area                                            | State                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Registration, login, JWT, roles                 | **Works**                                                                                                                      |
| Google OAuth                                    | Works, optional, degrades cleanly                                                                                              |
| Law / Article / Domain / Origin CRUD            | **Works** — admin data entry only                                                                                              |
| Community posts, comments, replies, upvotes     | **Works**                                                                                                                      |
| Firm profiles, specialties, ratings             | Works                                                                                                                          |
| Subscribers + transactional email               | Works                                                                                                                          |
| Document upload → chunk → embed → vector search | **Works**, but see §6                                                                                                          |
| Personalised feed                               | **Not built.** `DomainPreference` is stored and never read                                                                     |
| Firm-prioritised ranking                        | **Not built.** `Post.findAll()`, no ordering at all                                                                            |
| Firm/organization verification                  | **Not built.** No `isVerified`, no approval workflow, no state machine. The UI renders a verified badge that can never be true |
| Report / moderate abuse                         | **Not built.** No model, no table, no endpoint                                                                                 |
| AI-generated law summaries                      | **Not built.** No column anywhere stores a summary                                                                             |
| Multilingual                                    | **Not built.** `language` is a per-row enum, so a law in EN and RW is two unrelated rows with nothing linking them             |
| Scheduled jobs                                  | Stub. Logs `[Cron] Executing scheduler` and returns                                                                            |
| Tests                                           | Were a 0-byte file. Now 21 real tests, but coverage is near zero                                                               |

The pattern: **everything that is CRUD works, and everything that required a
judgement — ranking, trust, verification, moderation, summarisation — was left as
a schema stub or a README sentence.**

That is not laziness. Those are the hard parts, and they are hard because they are
product questions, not engineering ones.

---

## 6. The gap at the centre

MyLo's stated purpose is AI answers grounded in the Rwanda Law Gazette. **The
architecture cannot do this**, and this is the most important thing to understand
before rebuilding.

There are two islands, and no bridge:

```
   ISLAND A — the structured Gazette          ISLAND B — the RAG corpus
   ┌────────────────────────────┐             ┌────────────────────────────┐
   │ laws                       │             │ documents                  │
   │   lawNumber, title, status │             │   filename                 │
   │   language, tags           │             │   content                  │
   │   originId  → origins      │             │   embedding vector(1536)   │
   │   domainId  → domains      │             │                            │
   │ articles                   │             │  NO lawId                  │
   │   articleNumber, content   │             │  NO articleId              │
   │   lawId → laws             │             │  keyed only by filename    │
   └────────────────────────────┘             └────────────────────────────┘
        Admin CRUD. Never read                  What the AI actually reads.
        by the AI. Ever.                        Loose PDF chunks.
```

The `documents` table has no foreign key to `laws` or `articles`. The chatbot
embeds and retrieves flat PDF text keyed by filename. It therefore **cannot cite a
law**, because it does not know which law it is reading — or whether the text is a
law at all.

The word "Gazette" appears in the codebase exactly once: inside the AI's system
prompt, instructing it to answer "based on the provided context from the Rwanda
Law Gazette." The grounding is an assertion in a prompt, not a property of the
system.

### Two consequences worth stating plainly

**There is no ingestion.** Nothing fetches, parses, or syncs the Gazette. Laws
exist only if an admin types them in by hand. For a product whose entire premise
is a national legal corpus, acquiring that corpus was never solved. _This is the
actual unsolved problem, and it is upstream of everything else._

**The web fallback is a liability.** When vector search returns nothing, the
service queries the DuckDuckGo API and passes the resulting abstract to the model
as legal context:

```ts
if (!similarDocs.length || !context.trim()) {
  context = await searchWeb(question); // ← unattributed web text
  source = "web";
}
```

A user asking what the law says about their arrest can receive a paraphrased web
snippet, formatted identically to a grounded answer. It is labelled in the
response payload and prefixed in the text, but the failure mode is silent
degradation from _legal information_ to _something found on the internet_.

**Do not carry this forward.** The correct behaviour when the corpus cannot answer
is to say so, and to offer the question to a verified firm — which is exactly the
mechanism §3 already describes. The gap in the AI is the referral opportunity.

---

## 7. Carrying forward

### Keep

- The three questions (§2) as the product's acceptance test
- The four participants and the volume/depth split (§3)
- `Origin` and `Domain` taxonomies
- `Law → Article` decomposition, and article-level citation as non-negotiable
- `status: Active | Amended | Repealed`
- The consistent response envelope

### Discard

- The `documents` table as designed — flat, unattributed chunks
- The DuckDuckGo fallback, entirely
- `Post.findAll()` as a "feed"
- The verified badge, until verification actually exists
- The stub cron

### Build, having decided what it means

These are product decisions the old codebase avoided by leaving a stub. The
rewrite does not get to avoid them.

**Where does the corpus come from?** Scraped, licensed, partnered, or
hand-curated? Everything depends on this and nothing addressed it.

**How is an answer cited?** If a response cannot resolve to _law + article_, it
should not be shown. This one constraint disciplines the entire retrieval design:
chunks must carry `lawId` and `articleId`, and retrieval must return them.

**What happens when the corpus cannot answer?** Say so, and route to a firm. Never
substitute.

**What does "verified" mean?** Verified by whom, against which register — the
Rwanda Bar Association? Re-checked how often? A trust badge nobody audits is worse
than no badge, because people rely on it.

**Is Kinyarwanda a translation or a separate law?** Legally, the official text may
be one language while the one people need is another. A per-row `language` enum
cannot express "these three rows are the same law." This needs a real model:
a law, its official language, and its translations, with translation provenance —
because a mistranslated legal text is a harm, not a typo.

**Who moderates, and how fast?** The community is the part where legal
misinformation spreads with a plausible human face. There is currently no report
model at all.

---

## 8. The fair verdict

It is reasonable to look at this and see an MVP that did not get there. That is
accurate about the code.

It is less accurate about the thinking. The domain modelling is genuinely good:
the origin taxonomy reflects how Rwandan law is actually made, the law/article
split is the right granularity for citation, and the four-role structure encodes a
real economic model rather than just access control. Those took understanding, and
they are cheap to keep and expensive to rediscover.

What was missing was never the code. It was that the hard half of the product —
where the corpus comes from, what makes an answer trustworthy, what happens when
the machine does not know — was deferred at every point where it came up. The
build went as far as CRUD could carry it and stopped exactly where the judgement
began.

That is the boundary the rewrite starts from.
