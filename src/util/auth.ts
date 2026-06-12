import type { VercelRequest } from "@vercel/node";

/**
 * The dashboard and its read APIs expose private, scored ideas, so they are
 * gated by a shared secret. Defaults to CRON_SECRET so no extra configuration
 * is required; set DASHBOARD_PASSWORD to use a value distinct from the cron
 * secret (e.g. so a reviewer can browse without being able to trigger runs).
 */
export function dashboardSecret(): string | undefined {
  return process.env.DASHBOARD_PASSWORD || process.env.CRON_SECRET;
}

/**
 * Accept the secret three ways so the dashboard (fetch) and a human poking at
 * the URL both work: `Authorization: Bearer <s>`, `x-dashboard-key: <s>`, or
 * `?key=<s>`.
 */
export function isAuthorized(req: VercelRequest): boolean {
  const secret = dashboardSecret();
  if (!secret) return false;
  const header = req.headers["x-dashboard-key"];
  const queryKey = req.query?.key;
  return (
    req.headers.authorization === `Bearer ${secret}` ||
    header === secret ||
    queryKey === secret
  );
}
