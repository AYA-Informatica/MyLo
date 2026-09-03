#!/usr/bin/env node
/**
 * Applies migrations, in order, once each.
 *
 *   npm run db:migrate
 *
 * Until now the only way to create the schema was to run every `.sql` file by
 * hand in the right order and remember which had already been applied. That
 * works exactly once, on the machine that did it, and is the reason nothing had
 * ever been deployed: there was no step that could be run twice safely.
 *
 * Deliberately small. Drizzle Kit can do this and would add a build step and a
 * config to a container whose only job at that moment is to run some SQL. What
 * this needs is a ledger and a transaction, and those are twenty lines.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const migrations = join(here, "migrations");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();

// pgvector before anything that declares a vector column. The extension is a
// prerequisite of the schema rather than part of it, so it is not a migration.
await db.query("CREATE EXTENSION IF NOT EXISTS vector");

await db.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    text PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now()
  )
`);

const { rows: done } = await db.query("SELECT filename FROM schema_migrations");
const applied = new Set(done.map((r) => r.filename));

const pending = readdirSync(migrations)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .filter((f) => !applied.has(f));

if (pending.length === 0) {
  console.log(`Up to date — ${applied.size} migration(s) already applied.`);
  await db.end();
  process.exit(0);
}

for (const filename of pending) {
  const sql = readFileSync(join(migrations, filename), "utf8");

  // Each migration and its ledger entry commit together. A migration that
  // half-applied and was recorded as done is worse than one that failed
  // outright: the next run would skip it and the schema would be silently wrong.
  await db.query("BEGIN");
  try {
    // Drizzle writes statement-breakpoint markers; Postgres does not need them.
    await db.query(sql.split("--> statement-breakpoint").join("\n"));
    await db.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
      filename,
    ]);
    await db.query("COMMIT");
    console.log(`applied  ${filename}`);
  } catch (err) {
    await db.query("ROLLBACK");
    console.error(`FAILED   ${filename}\n  ${err.message}`);
    await db.end();
    process.exit(1);
  }
}

await db.end();
console.log(`\n${pending.length} migration(s) applied.`);
