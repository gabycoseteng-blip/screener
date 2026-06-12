import Anthropic from "@anthropic-ai/sdk";
import { withRetry } from "../util/log.js";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");

export const anthropic = new Anthropic({ apiKey });

/**
 * Rough $/million-token rates for cost accounting only (NOT billing-accurate).
 * Update if pricing changes; unknown models fall back to the Sonnet estimate.
 */
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5-20251001": { in: 1, out: 5 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-opus-4-8": { in: 15, out: 75 },
};

function estimateCost(model: string, inTok: number, outTok: number): number {
  const p = PRICING[model] ?? PRICING["claude-sonnet-4-6"];
  return (inTok * p.in + outTok * p.out) / 1_000_000;
}

export interface ToolCallResult<T> {
  data: T;
  costUsd: number;
}

/**
 * Call the model and force it to return structured JSON via a single tool.
 * Using tool_choice guarantees we get parseable, schema-shaped output rather
 * than free text we'd have to scrape.
 */
export async function callStructured<T>(args: {
  model: string;
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>; // JSON Schema for the tool input
  maxTokens?: number;
}): Promise<ToolCallResult<T>> {
  const res = await withRetry(
    () =>
      anthropic.messages.create({
        model: args.model,
        max_tokens: args.maxTokens ?? 1024,
        temperature: 0, // deterministic scoring
        system: args.system,
        tools: [
          {
            name: args.toolName,
            description: args.toolDescription,
            input_schema: args.schema as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: args.toolName },
        messages: [{ role: "user", content: args.user }],
      }),
    { label: `anthropic-${args.model}` },
  );

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Model did not return a tool_use block");
  }
  const costUsd = estimateCost(args.model, res.usage.input_tokens, res.usage.output_tokens);
  return { data: block.input as T, costUsd };
}
