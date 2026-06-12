import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

/**
 * `ideas` — the central, documented schema. One row per qualifying thesis.
 * This is the system of record; Notion (if enabled) is only a review mirror.
 */
export const ideas = pgTable(
  "ideas",
  {
    id: serial("id").primaryKey(),
    dateFound: timestamp("date_found", { withTimezone: true }).notNull().defaultNow(),

    sourcePlatform: text("source_platform").notNull(), // "Reddit" | "X"
    sourceId: text("source_id").notNull(), // platform-native post/tweet id
    subredditOrList: text("subreddit_or_list").notNull(),
    authorHandle: text("author_handle"),

    postTitle: text("post_title"),
    postBodyExcerpt: text("post_body_excerpt"), // first ~1000 chars
    permalink: text("permalink").notNull(),

    primaryTicker: text("primary_ticker"),
    allTickers: jsonb("all_tickers").$type<string[]>().notNull().default([]),
    sector: text("sector"),
    industry: text("industry"),

    engagementScore: integer("engagement_score").notNull().default(0),

    aiQualityScore: real("ai_quality_score"),
    aiScoreBreakdown: text("ai_score_breakdown"),
    aiThesisSummary: text("ai_thesis_summary"),
    aiDirection: text("ai_direction"), // "long" | "short" | "unclear"

    status: text("status").notNull().default("New"), // New | Reviewed | Rejected | In Diligence

    // --- outcome tracking (filled later by the outcomes backfill job) ---
    priceAtFound: real("price_at_found"),
    fwdReturns: jsonb("fwd_returns").$type<Record<string, number>>(), // { "5d": 0.03, "20d": -0.01 }
  },
  (t) => ({
    sourceUnique: uniqueIndex("ideas_source_unique").on(t.sourcePlatform, t.sourceId),
    tickerIdx: index("ideas_primary_ticker_idx").on(t.primaryTicker),
    dateIdx: index("ideas_date_found_idx").on(t.dateFound),
  }),
);

/**
 * `seen_posts` — every post we have *evaluated*, regardless of outcome.
 * This is the dedup/state store that keeps daily runs from re-pulling and
 * (expensively) re-scoring the same content. `decision` records where in the
 * funnel it fell so we can reason about the pipeline later.
 */
export const seenPosts = pgTable(
  "seen_posts",
  {
    sourcePlatform: text("source_platform").notNull(),
    sourceId: text("source_id").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    decision: text("decision").notNull(), // prefiltered | not_thesis | low_score | duplicate | written | error
    contentHash: text("content_hash"),
    ideaId: integer("idea_id"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.sourcePlatform, t.sourceId] }),
    hashIdx: index("seen_posts_content_hash_idx").on(t.contentHash),
  }),
);

/**
 * `runs` — one row per pipeline execution for observability. Lets a
 * non-engineer see "200 pulled → 40 passed filter → 6 written" and cost.
 */
export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull().default("running"), // running | ok | error
  trigger: text("trigger").notNull().default("cron"), // cron | manual

  pulled: integer("pulled").notNull().default(0),
  prefiltered: integer("prefiltered").notNull().default(0), // survived cheap filters
  triaged: integer("triaged").notNull().default(0), // judged a thesis
  scored: integer("scored").notNull().default(0), // got a deep score
  written: integer("written").notNull().default(0), // persisted as ideas

  llmCostUsd: real("llm_cost_usd").notNull().default(0),
  error: text("error"),
  stats: jsonb("stats").$type<Record<string, unknown>>(),
});

export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
export type SeenPost = typeof seenPosts.$inferSelect;
export type Run = typeof runs.$inferSelect;
