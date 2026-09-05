# Moving this branch out of the sandbox

Historical record, 2026-09-05. The `corpus/gazette-ingestion` work — 28 commits
from `e38cd74` to `293450a` — was written in a Linux sandbox with no access to
this repository, and handed over as three exported files rather than a push. The
export is gone; this is what it said, and what it turned out to have missed.

Kept because the correction at the bottom is a standing hazard for anyone
repeating the exercise, not because the transfer itself matters any more.

## What was handed over

Three formats of the same 28 commits, verified by the author against a fresh
clone of `AYA-Informatica/MyLo`:

| File                             | Use when                                                            |
| -------------------------------- | ------------------------------------------------------------------- |
| `mylo-branch.bundle` (268 KB)    | **Recommended.** Real git objects, with authors, dates and messages |
| `mylo-28-commits.patch` (784 KB) | You want to read the diffs first, or send them by mail              |
| `mylo-full-tree.tar.gz` (17 MB)  | You want the finished files and do not care about history           |

The bundle is a git repository in one file:

    git fetch /path/to/mylo-branch.bundle HEAD:corpus/gazette-ingestion
    git checkout corpus/gazette-ingestion

On arrival the three were checked against each other: the patch and the bundle
carry byte-identical commit SHAs in the same order, and the tarball matches the
branch tree exactly — 457 of 464 files identical, five differing only in line
endings, and no file present in the tarball that the bundle did not carry.

## Two things the handover note got right

`packages/pipeline/out/score-floors.json` is a **committed** file rather than
generated output, unlike the rest of `out/`. The API refuses to start without it
and that refusal has to survive a fresh clone. The note warned this would collide
with locally re-derived floors; in the event there were none to collide with.

The sandbox database, the parsed corpus and the OCR output were all scratch and
were not carried across. Nothing has been missed by discarding them.

## What it got wrong, and why it could not have known

The note said `npm ci --ignore-scripts && npm test` gives 34 passing tests, and
that a clean checkout can therefore prove itself before anyone has a Gazette
document. On Linux that is true. On Windows, where this repository is actually
edited, it was 33 of 34 — and the failure was the least interesting half of the
problem.

Git was configured `core.autocrlf=true` and the repository carried no
`.gitattributes`, so checkouts arrived CRLF. That broke two things:

- **Loudly**, the audit-trail test in `packages/corpus/src/parsing.test.mjs`,
  which slices `apps/api/src/server.ts` on a bare LF. The separator never
  matched, the slice came back empty, and only an `assert.ok(insert.length > 0)`
  guard stopped five containment checks from passing vacuously against an empty
  string.
- **Silently**, `packages/corpus/fixtures/gazette-issue-2099.pdf`. It holds no
  NUL bytes, so git's auto-detection classified it as text and rewrote its line
  endings: 4711 bytes on disk against 4631 in the blob, eighty LF sequences
  turned into CRLF. A fixture committed correct and delivered corrupt — and the
  parser was lenient enough that all 34 tests passed against the mangled copy
  once the first problem was fixed.

Both are closed by the root `.gitattributes` added alongside this document.

**The lesson worth keeping:** verifying an export against a fresh clone proves
the export. It does not prove the checkout, and it cannot see a platform the
verification never ran on. Any new binary fixture whose bytes could pass for
text needs an explicit `binary` rule, or it will cross platforms broken and
quiet about it.
