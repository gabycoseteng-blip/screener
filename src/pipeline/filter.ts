import { PIPELINE_CONFIG } from "../../config/pipeline.js";
import { SUBREDDITS } from "../../config/sources.js";
import { engagementScore, type RawPost } from "../sources/types.js";
import { extractTickers, type TickerExtraction } from "./extractTickers.js";

export interface Candidate {
  post: RawPost;
  engagement: number;
  tickers: TickerExtraction;
  text: string; // combined title + body, used for keyword + length checks
}

const subFloor = (channel: string) =>
  SUBREDDITS.find((s) => `r/${s.name}` === channel);

/**
 * Deterministic, zero-cost gate run BEFORE any LLM call. Its job is to throw
 * out obvious non-theses cheaply so we only pay for tokens on real candidates.
 * Returns the survivors plus a per-post decision string for the seen-log.
 */
export function prefilter(posts: RawPost[]): {
  passed: Candidate[];
  rejected: { post: RawPost; reason: string }[];
} {
  const cfg = PIPELINE_CONFIG;
  const passed: Candidate[] = [];
  const rejected: { post: RawPost; reason: string }[] = [];

  for (const post of posts) {
    const text = `${post.title ?? ""}\n${post.body}`.trim();
    const eng = engagementScore(post);
    const floor = subFloor(post.channel);
    const minScore = floor?.minScore ?? cfg.minScore;
    const minComments = floor?.minComments ?? cfg.minComments;
    const viral = eng >= cfg.viralScoreOverride;

    if (!viral && (post.engagement.score ?? eng) < minScore) {
      rejected.push({ post, reason: "below_score" });
      continue;
    }
    if (!viral && (post.engagement.comments ?? 0) < minComments) {
      rejected.push({ post, reason: "below_comments" });
      continue;
    }
    if (!viral && text.length < cfg.minTextLength) {
      rejected.push({ post, reason: "too_short" });
      continue;
    }

    const tickers = extractTickers(text);
    const keywords = cfg.keywords as readonly string[];
    const hasKeyword =
      keywords.length === 0 ||
      keywords.some((k) => text.toLowerCase().includes(k.toLowerCase()));
    const tickerGate = cfg.tickerSatisfiesKeywordGate && tickers.candidates.length > 0;

    if (!hasKeyword && !tickerGate) {
      rejected.push({ post, reason: "no_keyword_or_ticker" });
      continue;
    }

    passed.push({ post, engagement: eng, tickers, text });
  }

  // Score-rank survivors so the per-run LLM cap spends on the strongest signals.
  passed.sort((a, b) => b.engagement - a.engagement);
  return { passed: passed.slice(0, cfg.maxScoredPerRun), rejected };
}
