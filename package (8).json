import { eq } from "drizzle-orm";
import { PIPELINE_CONFIG } from "../../config/pipeline.js";
import { X_ENABLED } from "../../config/sources.js";
import { db } from "../db/client.js";
import { ideas, runs, seenPosts, type NewIdea } from "../db/schema.js";
import { RedditSource } from "../sources/reddit.js";
import type { RawPost, Source } from "../sources/types.js";
import { getProfile } from "../fmp/client.js";
import { log } from "../util/log.js";
import { prefilter, type Candidate } from "./filter.js";
import { triage, deepScore } from "./score.js";
import { contentHash, filterAlreadySeen, isDuplicateContent } from "./dedup.js";
import { notifySlack } from "./notify.js";

export interface RunSummary {
  runId: number;
  pulled: number;
  prefiltered: number;
  triaged: number;
  scored: number;
  written: number;
  llmCostUsd: number;
}

function sources(): Source[] {
  const list: Source[] = [new RedditSource()];
  if (X_ENABLED) {
    // v1: X not implemented. Add `new XSource()` once src/sources/x.ts exists.
    log.warn("X_ENABLED is true but XSource is not implemented in v1; skipping.");
  }
  return list;
}

async function recordSeen(
  post: RawPost,
  decision: string,
  hash: string | null,
  ideaId: number | null,
) {
  await db
    .insert(seenPosts)
    .values({
      sourcePlatform: post.sourcePlatform,
      sourceId: post.sourceId,
      decision,
      contentHash: hash,
      ideaId: ideaId ?? undefined,
    })
    .onConflictDoNothing();
}

export async function runPipeline(trigger: "cron" | "manual" = "cron"): Promise<RunSummary> {
  const cfg = PIPELINE_CONFIG;
  const [run] = await db.insert(runs).values({ trigger }).returning({ id: runs.id });
  const runId = run.id;

  let pulled = 0,
    prefilteredCount = 0,
    triagedCount = 0,
    scoredCount = 0,
    cost = 0;
  const writtenIdeas: NewIdea[] = [];

  try {
    // 1. Pull from every source.
    const raw: RawPost[] = [];
    for (const src of sources()) {
      const posts = await src.fetchRecent(cfg.lookbackHours);
      raw.push(...posts);
    }
    pulled = raw.length;

    // 2. Drop anything we've already evaluated in a prior run (state/dedup).
    const seen = await filterAlreadySeen("Reddit", raw.map((p) => p.sourceId));
    const fresh = raw.filter((p) => !seen.has(p.sourceId));

    // 3. Cheap deterministic gate.
    const { passed, rejected } = prefilter(fresh);
    prefilteredCount = passed.length;
    for (const r of rejected) await recordSeen(r.post, `prefiltered:${r.reason}`, null, null);

    // 4. LLM funnel: triage → deep score → enrich → dedup → persist.
    for (const cand of passed) {
      try {
        const t = await triage(cand);
        cost += t.costUsd;
        if (!t.data.is_thesis) {
          await recordSeen(cand.post, "not_thesis", null, null);
          continue;
        }
        triagedCount++;

        const s = await deepScore(cand);
        cost += s.costUsd;
        scoredCount++;

        const hash = contentHash(s.data.primary_ticker, cand.post.authorHandle, cand.text);

        if (s.data.quality_score < cfg.minQualityScore) {
          await recordSeen(cand.post, "low_score", hash, null);
          continue;
        }
        if (await isDuplicateContent(hash, cfg.dedupWindowDays)) {
          await recordSeen(cand.post, "duplicate", hash, null);
          continue;
        }

        // Enrich: validate primary ticker + attach sector/industry/price.
        const primary = s.data.primary_ticker ?? cand.tickers.primary;
        const profile = primary ? await getProfile(primary) : null;

        const idea: NewIdea = {
          sourcePlatform: cand.post.sourcePlatform,
          sourceId: cand.post.sourceId,
          subredditOrList: cand.post.channel,
          authorHandle: cand.post.authorHandle,
          postTitle: cand.post.title,
          postBodyExcerpt: cand.post.body.slice(0, 1000),
          permalink: cand.post.permalink,
          primaryTicker: profile?.symbol ?? primary ?? null,
          allTickers: cand.tickers.candidates.slice(0, 10),
          sector: profile?.sector ?? null,
          industry: profile?.industry ?? null,
          engagementScore: cand.engagement,
          aiQualityScore: s.data.quality_score,
          aiScoreBreakdown: s.data.breakdown,
          aiThesisSummary: s.data.summary,
          aiDirection: s.data.direction,
          priceAtFound: profile?.price ?? null,
          status: "New",
        };

        const [inserted] = await db
          .insert(ideas)
          .values(idea)
          .onConflictDoNothing()
          .returning({ id: ideas.id });

        await recordSeen(cand.post, "written", hash, inserted?.id ?? null);
        if (inserted) writtenIdeas.push(idea);
      } catch (err) {
        log.error("candidate processing failed", {
          sourceId: cand.post.sourceId,
          error: String(err),
        });
        await recordSeen(cand.post, "error", null, null);
      }
    }

    const summary: RunSummary = {
      runId,
      pulled,
      prefiltered: prefilteredCount,
      triaged: triagedCount,
      scored: scoredCount,
      written: writtenIdeas.length,
      llmCostUsd: Number(cost.toFixed(4)),
    };

    await db
      .update(runs)
      .set({
        finishedAt: new Date(),
        status: "ok",
        pulled,
        prefiltered: prefilteredCount,
        triaged: triagedCount,
        scored: scoredCount,
        written: writtenIdeas.length,
        llmCostUsd: summary.llmCostUsd,
        stats: { freshAfterDedup: fresh.length },
      })
      .where(eq(runs.id, runId));

    await notifySlack(writtenIdeas, summary as unknown as Record<string, unknown>);
    log.info("run complete", summary as unknown as Record<string, unknown>);
    return summary;
  } catch (err) {
    log.error("run failed", { runId, error: String(err) });
    await db
      .update(runs)
      .set({ finishedAt: new Date(), status: "error", error: String(err) })
      .where(eq(runs.id, runId));
    throw err;
  }
}
