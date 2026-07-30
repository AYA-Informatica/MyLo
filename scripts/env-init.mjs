#!/usr/bin/env node
/**
 * Seeds local .env files from their committed .example templates.
 *
 * Only ever creates files that are missing — an existing .env is left alone, so
 * this is safe to re-run and will never overwrite real credentials.
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  ["MyLo-Backend/.env.example", "MyLo-Backend/.env"],
  ["MyLo-Backend/.env.docker.example", "MyLo-Backend/.env.docker"],
  ["MyLo-frontend/.env.example", "MyLo-frontend/.env"],
];

let created = 0;
for (const [from, to] of targets) {
  const src = join(root, from);
  const dest = join(root, to);

  if (!existsSync(src)) {
    console.warn(`  skip  ${to}  (no ${from})`);
    continue;
  }
  if (existsSync(dest)) {
    console.log(`  keep  ${to}  (already exists)`);
    continue;
  }
  copyFileSync(src, dest);
  console.log(`  init  ${to}`);
  created += 1;
}

if (created > 0) {
  console.log(
    `\n${created} env file(s) created. Fill in the blanks before starting the API —\n` +
      "at minimum the DEV_* database values, JWT_SECRET and SESSION_SECRET.",
  );
} else {
  console.log("\nNothing to do — all env files already present.");
}
