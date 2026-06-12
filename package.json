import type { VercelRequest, VercelResponse } from "@vercel/node";
import { backfillOutcomes } from "../src/pipeline/backfillOutcomes.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const result = await backfillOutcomes();
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
