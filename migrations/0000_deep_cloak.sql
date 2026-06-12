CREATE TABLE "ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"date_found" timestamp with time zone DEFAULT now() NOT NULL,
	"source_platform" text NOT NULL,
	"source_id" text NOT NULL,
	"subreddit_or_list" text NOT NULL,
	"author_handle" text,
	"post_title" text,
	"post_body_excerpt" text,
	"permalink" text NOT NULL,
	"primary_ticker" text,
	"all_tickers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sector" text,
	"industry" text,
	"engagement_score" integer DEFAULT 0 NOT NULL,
	"ai_quality_score" real,
	"ai_score_breakdown" text,
	"ai_thesis_summary" text,
	"ai_direction" text,
	"status" text DEFAULT 'New' NOT NULL,
	"price_at_found" real,
	"fwd_returns" jsonb
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"trigger" text DEFAULT 'cron' NOT NULL,
	"pulled" integer DEFAULT 0 NOT NULL,
	"prefiltered" integer DEFAULT 0 NOT NULL,
	"triaged" integer DEFAULT 0 NOT NULL,
	"scored" integer DEFAULT 0 NOT NULL,
	"written" integer DEFAULT 0 NOT NULL,
	"llm_cost_usd" real DEFAULT 0 NOT NULL,
	"error" text,
	"stats" jsonb
);
--> statement-breakpoint
CREATE TABLE "seen_posts" (
	"source_platform" text NOT NULL,
	"source_id" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decision" text NOT NULL,
	"content_hash" text,
	"idea_id" integer,
	CONSTRAINT "seen_posts_source_platform_source_id_pk" PRIMARY KEY("source_platform","source_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ideas_source_unique" ON "ideas" USING btree ("source_platform","source_id");--> statement-breakpoint
CREATE INDEX "ideas_primary_ticker_idx" ON "ideas" USING btree ("primary_ticker");--> statement-breakpoint
CREATE INDEX "ideas_date_found_idx" ON "ideas" USING btree ("date_found");--> statement-breakpoint
CREATE INDEX "seen_posts_content_hash_idx" ON "seen_posts" USING btree ("content_hash");