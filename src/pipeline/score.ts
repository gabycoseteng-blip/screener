import { PIPELINE_CONFIG } from "../../config/pipeline.js";
import { callStructured } from "../llm/anthropic.js";
import type { Candidate } from "./filter.js";

/** Stage 1: cheap yes/no triage. Cuts non-theses before paying for deep scoring. */
export interface TriageResult {
  is_thesis: boolean;
  reason: string;
  tickers: string[];
}

/** Stage 2: anchored, rubric-based deep score. */
export interface DeepScore {
  quality_score: number; // 0–10
  breakdown: string;
  summary: string;
  primary_ticker: string | null;
  direction: "long" | "short" | "unclear";
}

const TRUNCATE = 6000; // chars of context handed to the model

function clip(c: Candidate): string {
  const body = c.text.slice(0, TRUNCATE);
  const hint = c.tickers.candidates.slice(0, 8).join(", ") || "none detected";
  return `SOURCE: ${c.post.sourcePlatform} ${c.post.channel}\nAUTHOR: ${
    c.post.authorHandle ?? "unknown"
  }\nENGAGEMENT: ${c.engagement}\nCANDIDATE_TICKERS: ${hint}\n\n${body}`;
}

export async function triage(c: Candidate): Promise<{ data: TriageResult; costUsd: number }> {
  return callStructured<TriageResult>({
    model: PIPELINE_CONFIG.triageModel,
    system:
      "You are a buy-side screening analyst. Decide if a social post is a genuine " +
      "single-name EQUITY INVESTMENT THESIS (a reasoned long/short argument about a " +
      "specific public company), as opposed to a macro take, news link, meme, " +
      "one-line opinion, options-gambling post, or general discussion. Be strict.",
    user: clip(c),
    toolName: "record_triage",
    toolDescription: "Record whether this post is an equity investment thesis.",
    schema: {
      type: "object",
      properties: {
        is_thesis: { type: "boolean" },
        reason: { type: "string", description: "<=1 sentence justification" },
        tickers: { type: "array", items: { type: "string" } },
      },
      required: ["is_thesis", "reason", "tickers"],
    },
    maxTokens: 300,
  });
}

const RUBRIC = `Score 0–10 using FOUR equally weighted dimensions (~2.5 pts each):
1. THESIS CLARITY — is the mispricing/variant view stated explicitly and falsifiably?
2. DATA SPECIFICITY — concrete numbers, filings, comps, unit economics (not vibes)?
3. RISK AWARENESS — does it name real risks / what would break the thesis?
4. ORIGINALITY — non-consensus angle vs. a widely-known/crowded view?

Anchors:
- 0–2: not a real thesis, or pure hype/ramp with no substance.
- 3–5: a recognizable thesis but thin — little data, no risks, consensus view.
- 6–7: solid: clear claim + some real data + acknowledges at least one risk.
- 8–10: rigorous: quantified thesis, multiple data points, genuine risk treatment,
        and a differentiated insight. Reserve 9–10 for the rare standout.
Do not inflate. Most real posts land 3–6. No hype in the summary.`;

export async function deepScore(c: Candidate): Promise<{ data: DeepScore; costUsd: number }> {
  return callStructured<DeepScore>({
    model: PIPELINE_CONFIG.scoringModel,
    system: `You are a disciplined buy-side analyst scoring investment theses.\n${RUBRIC}`,
    user: clip(c),
    toolName: "record_score",
    toolDescription: "Record the rubric-based quality assessment of this thesis.",
    schema: {
      type: "object",
      properties: {
        quality_score: { type: "number", minimum: 0, maximum: 10 },
        breakdown: { type: "string", description: "1–3 sentences citing the rubric dimensions" },
        summary: { type: "string", description: "1–2 sentence neutral thesis summary, no hype" },
        primary_ticker: { type: ["string", "null"], description: "best single ticker or null" },
        direction: { type: "string", enum: ["long", "short", "unclear"] },
      },
      required: ["quality_score", "breakdown", "summary", "primary_ticker", "direction"],
    },
    maxTokens: 600,
  });
}
