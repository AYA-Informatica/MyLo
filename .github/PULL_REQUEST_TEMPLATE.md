## What does this change?

<!-- A sentence or two. Link the issue it closes, e.g. "Closes #12". -->

## Why?

<!-- The reasoning a reviewer cannot get from the diff. What was wrong before? -->

## How was it verified?

<!-- What you actually ran or clicked, not what you believe should work. -->

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Checked in a browser / against a running API

## Anything reviewers should watch for?

<!-- Risky areas, follow-up work you deliberately left out, or decisions you are unsure about. -->

---

- [ ] No `.env` file or real credential is included in this diff
- [ ] Any new environment variable is documented in the matching `.env.example`
- [ ] If this touches legal content or the AI assistant, the output was checked against the Gazette
