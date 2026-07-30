# Contributing to MyLo

MyLo exists to make Rwandan law legible to the people it governs. That goal shapes
what a good contribution looks like: clarity for a non-lawyer reading on a phone
matters more than cleverness in the codebase.

Everyone is welcome here — citizens, students, lawyers, designers, and engineers.
You do not need to be a legal expert to help, and you do not need to be a
programmer either. Reporting a confusing summary is a real contribution.

---

## Getting set up

```bash
git clone https://github.com/AYA-Informatica/MyLo.git
cd MyLo
npm run setup      # installs both projects, creates .env files from templates
npm run stack:up   # PostgreSQL + Redis via Docker
npm run db:migrate && npm run db:seed
npm run dev        # API on :5001, web on :5173
```

Fill in `MyLo-Backend/.env` before starting — at minimum `DEV_USERNAME`,
`DEV_PASSWORD`, `DEV_DATABASE`, `JWT_SECRET` and `SESSION_SECRET`.

You do **not** need Google OAuth or OpenAI keys to run MyLo. Both features detect
their absence and switch themselves off; everything else works.

---

## Before you open a pull request

```bash
npm run typecheck
npm run lint
npm test
```

CI runs the same three, plus a production build of both projects. All of them
currently pass on `main` — please keep it that way rather than adding to a backlog.

---

## House rules

**Never break the boot.** A missing third-party key must disable one feature, not
the whole server. Read optional credentials lazily and degrade gracefully; do not
validate them at module load. This rule exists because violating it twice made
MyLo unstartable for anyone without Google and OpenAI accounts.

**Declare each environment key exactly once.** `dotenv` is last-wins, so a second
block redeclaring a key silently blanks the value above it.

**Do not commit `.env` files.** Only the `.example` templates belong in git. If you
add a setting, add it to the template with a comment explaining what it does.

**Keep wire types and view types separate.** `src/types/entities.ts` describes what
the API returns; `communitytypes.ts` and friends describe what components render.
Map between them explicitly so a payload change fails at the mapping site.

**Prefer a real type over `any`.** The frontend is `any`-free and the lint rule
enforces it. If a shape is genuinely unknown, use `unknown` and narrow it.

---

## Commit messages

Write them in the imperative mood, and say _why_ when the change is not obvious:

```
Guard Google OAuth registration behind configured credentials

passport-google-oauth20 throws from its constructor on a missing clientID,
which took the whole API down for anyone without Google credentials.
```

---

## Reporting problems

Open an issue using one of the templates. For anything security-related, please
read [SECURITY.md](SECURITY.md) first and do **not** open a public issue.

If you are reporting a bad or misleading law summary, that is a **content** bug and
we treat it as high severity — include the law, what MyLo said, and what it should
have said. Wrong legal information is worse than no legal information.
