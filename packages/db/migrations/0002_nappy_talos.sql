CREATE TABLE "question_bank" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"unanswerable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_bank_articles" (
	"question_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"ordinal" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "question_bank_articles_question_id_article_id_pk" PRIMARY KEY("question_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "question_bank_texts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"body" text NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb,
	"embedding" vector(1536),
	"embedding_model" text,
	"generated_by_model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_bank_texts_question_language_key" UNIQUE("question_id","language")
);
--> statement-breakpoint
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_articles" ADD CONSTRAINT "question_bank_articles_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_articles" ADD CONSTRAINT "question_bank_articles_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_texts" ADD CONSTRAINT "question_bank_texts_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_bank_status_idx" ON "question_bank" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "question_bank_articles_article_idx" ON "question_bank_articles" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "question_bank_texts_embedding_idx" ON "question_bank_texts" USING hnsw ("embedding" vector_cosine_ops);