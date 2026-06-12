import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runPipeline } from "../src/pipeline/run.js";

/** Verify the request actually came from Vercel Cron (or an authorized caller). */
function authorized(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.authorization;
  return header === `Bearer ${secret}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorized(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const summary = await runPipeline("cron");
    return res.status(200).json({ ok: true, summary });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
