CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."answer_kind" AS ENUM('assistant', 'practitioner', 'moderator');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('rw', 'en', 'fr');--> statement-breakpoint
CREATE TYPE "public"."law_origin" AS ENUM('presidential', 'parliamentary', 'ministerial', 'judicial', 'administrative');--> statement-breakpoint
CREATE TYPE "public"."law_status" AS ENUM('draft', 'active', 'amended', 'repealed');--> statement-breakpoint
CREATE TYPE "public"."org_kind" AS ENUM('law_firm', 'ngo', 'school', 'company', 'public_body');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('open', 'answered', 'referred', 'resolved', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('legal_inaccuracy', 'outdated_law', 'unqualified_advice', 'impersonation', 'spam', 'harassment', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'triaged', 'upheld', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('draft', 'in_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'under_review', 'verified', 'rejected', 'suspended', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "answer_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"answer_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"chunk_id" uuid,
	"quote" text,
	"ordinal" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "answer_citations_answer_article_key" UNIQUE("answer_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"kind" "answer_kind" NOT NULL,
	"author_id" uuid,
	"organization_id" uuid,
	"language" "language" NOT NULL,
	"body" text NOT NULL,
	"model" text,
	"confidence" integer,
	"is_accepted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "article_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"article_text_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"ordinal" smallint NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"embedding_model" text,
	"token_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_chunks_text_ordinal_key" UNIQUE("article_text_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE "article_texts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"heading" text,
	"body" text NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"translation_of_id" uuid,
	"translated_by" text,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_texts_article_language_key" UNIQUE("article_id","language")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"law_id" uuid NOT NULL,
	"article_number" text NOT NULL,
	"ordinal" integer NOT NULL,
	"parent_article_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_law_number_key" UNIQUE("law_id","article_number")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_texts" (
	"domain_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "domain_texts_domain_id_language_pk" PRIMARY KEY("domain_id","language")
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domains_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "explanations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"law_id" uuid,
	"article_id" uuid,
	"language" "language" NOT NULL,
	"body" text NOT NULL,
	"reading_level" text DEFAULT 'general' NOT NULL,
	"generated_by_model" text,
	"generated_at" timestamp with time zone,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "law_texts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"law_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"title" text NOT NULL,
	"preamble" text,
	"is_official" boolean DEFAULT false NOT NULL,
	"translation_of_id" uuid,
	"translated_by" text,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "law_texts_law_language_key" UNIQUE("law_id","language")
);
--> statement-breakpoint
CREATE TABLE "laws" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"law_number" text NOT NULL,
	"origin" "law_origin" NOT NULL,
	"domain_id" uuid,
	"status" "law_status" DEFAULT 'active' NOT NULL,
	"gazette_ref" text,
	"gazette_url" text,
	"published_at" timestamp with time zone,
	"effective_from" timestamp with time zone,
	"repealed_at" timestamp with time zone,
	"superseded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "laws_law_number_key" UNIQUE("law_number")
);
--> statement-breakpoint
CREATE TABLE "org_domains" (
	"organization_id" uuid NOT NULL,
	"domain_id" uuid NOT NULL,
	CONSTRAINT "org_domains_organization_id_domain_id_pk" PRIMARY KEY("organization_id","domain_id")
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "org_kind" NOT NULL,
	"name" text NOT NULL,
	"registration_number" text,
	"bio" text,
	"website_url" text,
	"contact_email" text,
	"phone" text,
	"district" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asker_id" uuid,
	"language" "language" DEFAULT 'rw' NOT NULL,
	"body" text NOT NULL,
	"domain_id" uuid,
	"status" "question_status" DEFAULT 'open' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"reason" text,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_question_org_key" UNIQUE("question_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"reporter_id" uuid,
	"reason" "report_reason" NOT NULL,
	"detail" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_domains" (
	"user_id" uuid NOT NULL,
	"domain_id" uuid NOT NULL,
	CONSTRAINT "user_domains_user_id_domain_id_pk" PRIMARY KEY("user_id","domain_id")
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"subject" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_identities_provider_subject_key" UNIQUE("provider","subject")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"display_name" text NOT NULL,
	"locale" "language" DEFAULT 'rw' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"register" text,
	"evidence_ref" text,
	"note" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answer_citations" ADD CONSTRAINT "answer_citations_answer_id_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_citations" ADD CONSTRAINT "answer_citations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_citations" ADD CONSTRAINT "answer_citations_chunk_id_article_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."article_chunks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_chunks" ADD CONSTRAINT "article_chunks_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_chunks" ADD CONSTRAINT "article_chunks_article_text_id_article_texts_id_fk" FOREIGN KEY ("article_text_id") REFERENCES "public"."article_texts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_texts" ADD CONSTRAINT "article_texts_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_texts" ADD CONSTRAINT "article_texts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_law_id_laws_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."laws"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_texts" ADD CONSTRAINT "domain_texts_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_law_id_laws_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."laws"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "law_texts" ADD CONSTRAINT "law_texts_law_id_laws_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."laws"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "law_texts" ADD CONSTRAINT "law_texts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laws" ADD CONSTRAINT "laws_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_domains" ADD CONSTRAINT "org_domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_domains" ADD CONSTRAINT "org_domains_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_asker_id_users_id_fk" FOREIGN KEY ("asker_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_domains" ADD CONSTRAINT "user_domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_domains" ADD CONSTRAINT "user_domains_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answer_citations_article_idx" ON "answer_citations" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "answers_question_idx" ON "answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "article_chunks_article_idx" ON "article_chunks" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_chunks_embedding_idx" ON "article_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "articles_law_ordinal_idx" ON "articles" USING btree ("law_id","ordinal");--> statement-breakpoint
CREATE INDEX "audit_log_subject_idx" ON "audit_log" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "explanations_article_lang_idx" ON "explanations" USING btree ("article_id","language");--> statement-breakpoint
CREATE INDEX "explanations_law_lang_idx" ON "explanations" USING btree ("law_id","language");--> statement-breakpoint
CREATE INDEX "laws_status_idx" ON "laws" USING btree ("status");--> statement-breakpoint
CREATE INDEX "laws_domain_idx" ON "laws" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "questions_status_idx" ON "questions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "questions_domain_idx" ON "questions" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "referrals_org_idx" ON "referrals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "reports_subject_idx" ON "reports" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "reports_status_reason_idx" ON "reports" USING btree ("status","reason");--> statement-breakpoint
CREATE INDEX "verifications_org_status_idx" ON "verifications" USING btree ("organization_id","status");