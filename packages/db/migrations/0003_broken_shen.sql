CREATE TYPE "public"."law_coverage" AS ENUM('partial', 'complete');--> statement-breakpoint
ALTER TABLE "laws" ADD COLUMN "coverage" "law_coverage" DEFAULT 'partial' NOT NULL;