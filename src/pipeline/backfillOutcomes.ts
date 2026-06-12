import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { PIPELINE_CONFIG } from "../../config/pipeline.js";
import { db } from "../db/client.js";
import { ideas } from "../db/schema.js";
import { getCloseOnOrBefore } from "../fmp/client.js";
import { log } from "../util/log.js";

/** Add `horizon` trading days to a date (approx: skips weekends, not holidays). */
function addTradingDays(d: Date, n: number): Date {
  const out = new Date(d);
  let added = 0;
  while (added < n) {
    out.setDate(out.getDate() + 1);
    const day = out.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return out;
}

/**
 * Feedback loop: for ideas old enough that a horizon has elapsed, compute the
 * forward return from price-at-found. Lets you later ask "do high-scored ideas
 * actually work?" and recalibrate the rubric/threshold against real outcomes.
 */
export async function backfillOutcomes(): Promise<{ updated: number }> {
  const horizons = PIPELINE_CONFIG.outcomeHorizonsDays;
  const maxHorizon = Math.max(...horizons);
  const cutoff = addTradingDays(new Date(), -maxHorizon - 2);

  const rows = await db
    .select()
    .from(ideas)
    .where(
      and(
        isNotNull(ideas.primaryTicker),
        isNotNull(ideas.priceAtFound),
        isNull(ideas.fwdReturns),
        lte(ideas.dateFound, cutoff),
      ),
    )
    .limit(100);

  let updated = 0;
  for (const idea of rows) {
    if (!idea.primaryTicker || !idea.priceAtFound) continue;
    const fwd: Record<string, number> = {};
    for (const h of horizons) {
      const target = addTradingDays(idea.dateFound, h);
      const close = await getCloseOnOrBefore(
        idea.primaryTicker,
        target.toISOString().slice(0, 10),
      );
      if (close != null && idea.priceAtFound) {
        fwd[`${h}d`] = Number(((close - idea.priceAtFound) / idea.priceAtFound).toFixed(4));
      }
    }
    if (Object.keys(fwd).length > 0) {
      await db.update(ideas).set({ fwdReturns: fwd }).where(eq(ideas.id, idea.id));
      updated++;
    }
  }
  log.info("outcomes backfilled", { updated, scanned: rows.length });
  return { updated };
}
