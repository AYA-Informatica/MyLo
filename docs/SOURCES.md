# Sources

What the official deposits hold, what each one answers, and how they can be
read. Investigated 2026-08-20.

The short version: **the two hardest open problems in `docs/PLAN.md` have
authoritative sources, and both sit on sites that are far easier to read than
amategeko.gov.rw.**

## The sites

| Source                                                                           | Holds                                            | Technology                |
| -------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------- |
| [amategeko.gov.rw](https://amategeko.gov.rw)                                     | Laws and case law, split in force / not in force | React SPA over a REST API |
| [rlrc.gov.rw](https://www.rlrc.gov.rw)                                           | Laws in force, legal dictionary, taxonomy        | TYPO3, server-rendered    |
| [minijust.gov.rw/official-gazette](https://www.minijust.gov.rw/official-gazette) | The Gazette itself, by year                      | TYPO3, server-rendered    |

**The two government sites are plain HTML file listings.** Both run TYPO3 with
the `tx_filelist` extension: a folder per year, a table of files, ordinary links,
ordinary pagination. That matters because amategeko is a three-level React SPA
whose taxonomy defeated automated navigation entirely and had to be scraped by
recording live network traffic to discover its API. The same corpus is reachable
from a sibling site with a plain crawler.

### Reading them

- Listing URLs carry `tx_filelist_filelist[path]=/user_upload/.../` plus a
  `cHash`. **The `cHash` is TYPO3's anti-tampering hash and cannot be computed
  from the path** — links must be followed as found, not constructed.
- Pagination is `tx_filelist_filelist[currentPage]=N`. The Gazette listing runs
  to three pages; page one covers 2017–2026.
- Files download through `index.php?eID=dumpFile&f=<id>&t=f&token=<hex>`.
  **Those tokens expire.** A URL harvested from a search index redirected to the
  homepage rather than serving the file, so a crawler has to download within the
  session that discovered the link rather than collecting URLs for later.

## What each source answers

### Dictionary of Legal Terms — Phase 2.3

RLRC, launched 5 November 2021. **532 pages, 2,698 legal terms in English,
French and Kinyarwanda**, plus a glossary that maps English→Kinyarwanda and
French→Kinyarwanda separately. Built with MINIJUST, the University of Rwanda and
legal experts; the Commission maintains it as the working reference for its own
translators.

This is the authoritative version of what `@mylo/domain/synonyms` currently
guesses at. Every Kinyarwanda entry there carrying a `NEEDS REVIEW` comment is a
term this dictionary states — and the Phase 2.3 measurement showed exactly what
guessing costs: `kuburanishwa neza` appears nowhere in the Constitution, and
replacing it with the corpus's own `ubutabera buboneye` moved that query from
#10 to #1.

**It does not close the whole gap.** A synonym group has two halves: the legal
name and the words an ordinary person uses. The dictionary is authoritative for
the first and silent on the second — it will not say that someone means "fair
trial" when they type "will the judge listen to me". That half still needs a
Kinyarwanda speaker, and Phase 3.1 stands.

### Laws of Rwanda — Phase 0.3

RLRC has published the collection of laws **currently in force** since 2019,
"updated every day by inserting new legislation or removing the repealed one".

That is a better status source than the one Phase 0.3 was written around.
amategeko's split is a static in-force/not-in-force flag; this is a maintained
collection where presence _is_ the claim, refreshed daily by the body responsible
for codification. `status:build` already discovers field names by scoring rather
than hardcoding them, so it does not care which of the two it is pointed at.

### The Taxonomy — Phase 1.3

RLRC's 2020/21 annual report records a taxonomy of **1,002 legal instruments
categorised by area of application**, in all three languages, published on the
same site.

Phase 1.3 (domain classification) was blocked on not having a taxonomy and not
wanting to invent one. An official categorisation of the corpus, by the body that
codifies it, is better than anything this project would have devised — and it
comes with the Kinyarwanda and French names for each domain, which a
self-invented taxonomy would not.

### The Official Gazette — the primary source

MINIJUST publishes the Gazette itself, organised by year, 2017–2026 on the first
of three listing pages. Published **weekly, every Monday**, with special editions
mid-week for urgent legislation.

Two consequences. First, this is upstream of amategeko: the Gazette is where a
law is published, and publication is when most Rwandan laws commence — which
Phase 1.2 established is 54 days after the date printed in the law's own title.
Second, a weekly cadence with mid-week specials is what a corpus refresh has to
keep up with, and it is what makes `laws.status` go stale rather than wrong-once.

## One legal fact worth carrying

In 2019 Parliament repealed **every colonial-era instrument enacted between 1885
and 1962** — over 1,000 pieces, coordinated by RLRC, covering laws, decree-laws,
decrees, ordinances, royal orders and declarations.

That is directly load-bearing for this corpus. Pre-1962 documents are repealed as
a class, not case by case, and the 1962 presidential declaration in the sample
set is very likely among them. It also means `CENTURY_PIVOT` in
`@mylo/domain/law-number` is resolving real years for instruments that are, as a
body, no longer in force — the dates matter for historical accuracy and the
`status` must not read `active`.

## What this changes

Nothing already built is wrong. Three things get easier and one gets better:

- **Phase 0.3** gains a maintained daily source instead of a static flag.
- **Phase 1.3** gains an official taxonomy instead of an invented one.
- **Phase 2.3** gains 2,698 sourced terms instead of seven guessed groups — and
  the Kinyarwanda entries stop being provisional on the legal side.
- **Scraping** gains a plain-HTML path. The recorded-traffic approach that
  amategeko required is not needed for RLRC or MINIJUST.

What does not change: the everyday-phrasing half of the synonym layer, the
absence of a Kinyarwanda legal reviewer, and the fact that none of the parser
work has met more than three Gazette documents.
