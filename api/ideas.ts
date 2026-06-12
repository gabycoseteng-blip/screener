import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { ideas } from "../src/db/schema.js";
import { isAuthorized } from "../src/util/auth.js";

/** Valid review states, mirrored in the dashboard status dropdown. */
const STATUSES = ["New", "Reviewed", "Rejected", "In Diligence"];

/**
 * `/api/ideas`
 *   GET   — list ideas with optional ?status, ?minScore, ?q, ?sort, ?limit
 *   PATCH — { id, status } update a single idea's review status
 *
 * Read-only data for the human-review dashboard. Gated by the dashboard secret.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: "unauthorized" });

  try {
    if (req.method === "GET") {
      const { status, minScore, q, sort, limit } = req.query;

      const conds = [];
      if (typeof status === "string" && STATUSES.includes(status)) {
        conds.push(eq(ideas.status, status));
      }
      if (typeof minScore === "string" && minScore !== "" && !Number.isNaN(Number(minScore))) {
        conds.push(gte(ideas.aiQualityScore, Number(minScore)));
      }
      if (typeof q === "string" && q.trim()) {
        const term = `%${q.trim()}%`;
        conds.push(
          or(
            ilike(ideas.primaryTicker, term),
            ilike(ideas.postTitle, term),
            ilike(ideas.aiThesisSummary, term),
          ),
        );
      }

      // Default: best ideas first (score desc, newest as tiebreak); nulls last
      // so unscored rows don't dominate the top.
      const order =
        sort === "date"
          ? sql`${ideas.dateFound} desc`
          : sort === "score_asc"
            ? sql`${ideas.aiQualityScore} asc nulls last`
            : sql`${ideas.aiQualityScore} desc nulls last, ${ideas.dateFound} desc`;

      const take = Math.min(Math.max(Number(limit) || 200, 1), 500);

      const rows = await db
        .select()
        .from(ideas)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(order)
        .limit(take);

      return res.status(200).json({ ideas: rows });
    }

    if (req.method === "PATCH" || req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const id = Number(body.id);
      const status = body.status;
      if (!id || !STATUSES.includes(status)) {
        return res.status(400).json({ error: "valid `id` and `status` are required" });
      }
      const [updated] = await db
        .update(ideas)
        .set({ status })
        .where(eq(ideas.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: "idea not found" });
      return res.status(200).json({ idea: updated });
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
