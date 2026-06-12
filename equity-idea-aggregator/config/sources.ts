/**
 * Source configuration — edit this file to change WHAT gets polled.
 * No core logic lives here; it is pure data an analyst can safely tweak.
 */

export interface SubredditConfig {
  /** Subreddit name without the "r/" prefix. */
  name: string;
  /** "top" pulls top posts in the window; "new" pulls the newest. */
  listing: "top" | "new";
  /** Max posts to pull per run for this sub. */
  limit: number;
  /** Optional per-sub engagement floor overrides (else global defaults apply). */
  minScore?: number;
  minComments?: number;
}

export const SUBREDDITS: SubredditConfig[] = [
  { name: "SecurityAnalysis", listing: "top", limit: 25 },
  { name: "ValueInvesting", listing: "top", limit: 25 },
  { name: "stocks", listing: "top", limit: 25, minScore: 100 }, // noisier → higher floor
  // Sector-specific examples — uncomment / add your own:
  // { name: "energy", listing: "top", limit: 15 },
  // { name: "dividends", listing: "top", limit: 15 },
];

/**
 * X / Twitter is intentionally stubbed for v1. The pipeline already treats
 * sources behind a common interface (src/sources/types.ts), so enabling X is
 * a matter of implementing src/sources/x.ts and listing the curated Lists here.
 */
export const X_LISTS: { id: string; label: string }[] = [
  // { id: "1234567890", label: "FinTwit-Value" },
];

export const X_ENABLED = false;
