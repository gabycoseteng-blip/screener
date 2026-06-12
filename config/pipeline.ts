/**
 * Pipeline configuration — edit this file to change HOW candidates are
 * filtered, scored, and persisted. Pure tunables; no logic.
 */

export const PIPELINE_CONFIG = {
  /** Only consider posts created within this many hours of the run. */
  lookbackHours: 24,

  /** Global engagement floor (subs can override in config/sources.ts). */
  minScore: 30,
  minComments: 5,

  /** Combined title+body must be at least this many chars... */
  minTextLength: 350,
  /** ...UNLESS engagement is at/above this "viral" bar, which waives length. */
  viralScoreOverride: 500,

  /**
   * Cheap keyword pre-filter. A post must contain at least one of these
   * (case-insensitive) OR carry a detected ticker to survive to LLM triage.
   * Set to [] to disable keyword gating.
   */
  keywords: [
    "thesis", "valuation", "dcf", "intrinsic value", "mispriced", "moat",
    "catalyst", "spin-off", "spinoff", "write-up", "writeup", "deep dive",
    "free cash flow", "fcf", "ebitda", "balance sheet", "10-k", "10-q",
    "earnings", "guidance", "margin", "rate base", "midstream", "ldc",
    "undervalued", "short", "long thesis",
  ],
  /** If true, a detected ticker alone satisfies the keyword gate. */
  tickerSatisfiesKeywordGate: true,

  /** Models. Triage is cheap/fast; deep scoring is the more capable model. */
  triageModel: process.env.TRIAGE_MODEL ?? "claude-haiku-4-5-20251001",
  scoringModel: process.env.SCORING_MODEL ?? "claude-sonnet-4-6",

  /** Only persist ideas scoring at or above this (0–10). Calibrate after a week. */
  minQualityScore: 6,

  /** Skip content-level duplicates seen within this many days. */
  dedupWindowDays: 14,

  /** Hard ceiling on LLM-scored posts per run (cost guardrail). */
  maxScoredPerRun: 60,

  /** Forward-return horizons (trading days) captured by the outcomes backfill. */
  outcomeHorizonsDays: [5, 20],
} as const;

export type PipelineConfig = typeof PIPELINE_CONFIG;
