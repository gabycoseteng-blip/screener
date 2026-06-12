import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { runs } from "../src/db/schema.js";
import { isAuthorized } from "../src/util/auth.js";

/**
 * `/api/runs` — most recent pipeline executions for the dashboard health panel
 * (pulled → prefiltered → triaged → scored → written, plus LLM cost).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: "unauthorized" });
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method not allowed" });
  }
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const rows = await db.select().from(runs).orderBy(desc(runs.startedAt)).limit(limit);
    return res.status(200).json({ runs: rows });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
