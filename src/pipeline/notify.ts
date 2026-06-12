import { log } from "../util/log.js";
import type { NewIdea } from "../db/schema.js";

/** Optional Slack summary of the top ideas from a run. No-op if unconfigured. */
export async function notifySlack(written: NewIdea[], runStats: Record<string, unknown>): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url || written.length === 0) return;

  const top = [...written]
    .sort((a, b) => (b.aiQualityScore ?? 0) - (a.aiQualityScore ?? 0))
    .slice(0, 10);

  const lines = top.map(
    (i) =>
      `• *${i.primaryTicker ?? "?"}* (${i.aiQualityScore}/10) — ${i.aiThesisSummary}\n  <${i.permalink}|${i.subredditOrList} · ${i.authorHandle ?? "?"}>`,
  );

  const text = `*Equity Idea Aggregator* — ${written.length} new idea(s)\n${lines.join("\n")}\n_${JSON.stringify(runStats)}_`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    log.warn("slack notify failed", { error: String(err) });
  }
}
