import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runPipeline } from "../src/pipeline/run.js";

/** Manual trigger (same auth as cron) for ad-hoc runs from the CLI/dashboard. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const summary = await runPipeline("manual");
    return res.status(200).json({ ok: true, summary });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
