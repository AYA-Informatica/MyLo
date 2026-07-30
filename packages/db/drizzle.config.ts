import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5432/mylo",
  },
  // The corpus is edited by people; a destructive migration should be deliberate.
  strict: true,
  verbose: true,
});
