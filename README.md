# MyLo

> Making the Rwanda Law Gazette readable, searchable and interactive.

MyLo is a civic-technology platform that turns the Rwanda Law Gazette from a dense
legal archive into something an ordinary person can actually use. It answers three
questions most people cannot answer about their own legal system:

- **What law just changed, and does it affect me?**
- **Which law protects me?**
- **Which law penalises me if I get this wrong?**

It does that with AI-generated plain-language summaries, a directory of verified law
firms, and a community hub where citizens, organisations and legal professionals can
ask and answer questions in public.

---

## Repository layout

This is a monorepo containing the two halves of the product.

| Path                               | What it is                              | Stack                                                           |
| ---------------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| [`MyLo-Backend/`](MyLo-Backend/)   | REST API, auth, AI assistant, jobs      | Node · Express 5 · TypeScript · Sequelize · PostgreSQL · Redis  |
| [`MyLo-frontend/`](MyLo-frontend/) | Web client                              | React 19 · Vite · TypeScript · Redux Toolkit Query · Tailwind 4 |
| [`.trunk/`](.trunk/)               | Repo-wide linting and security scanning | Trunk                                                           |
| [`scripts/`](scripts/)             | Repo maintenance scripts                | Node                                                            |

The two projects keep their own `package.json` and lockfile. The root
`package.json` is a thin task runner over both — it does not hoist dependencies,
so native modules (`bcrypt`, `pm2`) resolve exactly as they do standalone.

---

## Quick start

**Prerequisites:** Node 22+, Docker Desktop (for PostgreSQL and Redis).

```bash
# 1. Install both projects and create local .env files from the templates
npm run setup

# 2. Start PostgreSQL (pgvector) and Redis
npm run stack:up

# 3. Fill in the blanks in MyLo-Backend/.env — at minimum:
#      DEV_USERNAME / DEV_PASSWORD / DEV_DATABASE, JWT_SECRET, SESSION_SECRET

# 4. Create the schema and seed reference data
npm run db:migrate
npm run db:seed

# 5. Run the API and the web client together
npm run dev
```

| Service            | URL                          |
| ------------------ | ---------------------------- |
| Web client         | http://localhost:5173        |
| API                | http://localhost:5001/api/v1 |
| API docs (Swagger) | http://localhost:5001/docs   |
| Health check       | http://localhost:5001/health |

> The API will not begin listening until PostgreSQL accepts a connection — it
> authenticates first and logs a `Database Connection` error if that fails. If the
> server appears to start and then go quiet, check the database before anything else.

---

## Scripts

Run these from the repository root; each delegates into one or both projects.

| Script                            | What it does                                                 |
| --------------------------------- | ------------------------------------------------------------ |
| `npm run setup`                   | Install both projects, then create any missing `.env` files  |
| `npm run dev`                     | Run API and web client together, colour-tagged `api` / `web` |
| `npm run build`                   | Type-check and build both projects                           |
| `npm run typecheck`               | Type-check both without emitting                             |
| `npm test`                        | Backend Jest suite                                           |
| `npm run lint`                    | ESLint across both projects                                  |
| `npm run format`                  | Prettier across both projects                                |
| `npm run stack:up` / `stack:down` | Start / stop PostgreSQL + Redis                              |
| `npm run db:migrate` / `db:seed`  | Sequelize migrations and seeders                             |

Need a database browser? `docker compose -f MyLo-Backend/docker-compose.yml --profile tools up -d`
starts pgAdmin on http://localhost:8080.

---

## Architecture

```
                    ┌────────────────────┐
   browser ────────▶│  MyLo-frontend     │  React 19 + RTK Query
                    │  Vite dev :5173    │
                    └─────────┬──────────┘
                              │  VITE_API_BASE_URL
                              ▼
                    ┌────────────────────┐
                    │  MyLo-Backend      │  Express 5 :5001
                    │  /api/v1  · /docs  │  helmet · rate limit · JWT + OAuth
                    └─────┬────────┬─────┘
                          │        │
              ┌───────────┘        └────────────┐
              ▼                                 ▼
    ┌──────────────────┐              ┌──────────────────┐
    │ PostgreSQL       │              │ Redis            │
    │ (pgvector)       │              │ sessions · queue │
    │ laws · users     │              └──────────────────┘
    │ posts · embeddings│
    └──────────────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ OpenAI           │  law summarisation + RAG chat
                 └──────────────────┘
```

### API surface

All routes are mounted under `/api/v1` and rate-limited to 100 requests per 15
minutes per client.

| Group           | Routes                                                                      | Purpose                                               |
| --------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| Identity        | `/auth`, `/users`, `/profiles`, `/roles`                                    | Registration, JWT + Google OAuth, role-based access   |
| Legislation     | `/laws`, `/laws/:id/articles`, `/origins`, `/domains`                       | The Gazette: laws, their articles, and classification |
| Community       | `/posts`, `/posts/:id/comments`, `/posts/:id/replies`, `/posts/:id/upvotes` | Public Q&A and discussion                             |
| Firms           | `/specialties`, `/ratings`                                                  | Verified law-firm directory and reviews               |
| Personalisation | `/preferences`, `/subscribers`                                              | Domain preferences and the mailing list               |
| AI              | `/documents`                                                                | Document ingestion and the RAG chat assistant         |

### Roles

The platform models four kinds of participant, each with a different surface:
**citizens** (read, ask, discuss), **organisations** (startups, schools, NGOs —
sector-tuned feeds), **law firms** (verified, may answer authoritatively and
annotate laws), and **admins** (verification, moderation, law ingestion).

---

## Environment

Copy the templates and fill them in — `npm run setup` does the copying for you.

| File                       | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `MyLo-Backend/.env`        | API running on the host                              |
| `MyLo-Backend/.env.docker` | API running inside Compose (hosts are service names) |
| `MyLo-frontend/.env`       | `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`         |

None of these are committed. Only the `.example` templates are.

Two things to watch when editing them:

- **Declare each key exactly once.** `dotenv` is last-wins, so a second block
  redeclaring `REDIS_HOST` silently blanks the value set above it.
- **`NODE_ENV` selects the database credentials.** `development` reads `DEV_*`,
  `test` reads `TEST_*`, and anything else falls through to `PROD_*`.

---

## Testing

```bash
npm test
```

Jest with `ts-jest`, collecting coverage from `MyLo-Backend/src`. Build output under
`dist/` is excluded from test discovery, so `npm run build` before `npm test` will
not cause every suite to run twice.

Coverage is currently thin — the suite is close to a blank slate, and growing it is
the most valuable contribution available in this repository right now.

---

## Contributing

1. Branch off `main`.
2. `npm run typecheck && npm run lint && npm test` before opening a PR.
3. CI runs the same three commands, plus a production build of both projects.

Code style is enforced by Prettier and ESLint per project; `.trunk/` adds
repo-wide checks including secret scanning (`trufflehog`) and dependency
vulnerability scanning (`osv-scanner`, `grype`).

---

## Licence

ISC. See [LICENSE](LICENSE).

MyLo began life as **MenyaLo**, built by Group 12 at the
[Solvit Africa Training Center](https://github.com/Solvit-Africa-Training-Center).
