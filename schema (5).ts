import { createHash } from "node:crypto";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { seenPosts } from "../db/schema.js";

/** Stable content fingerprint to catch the same idea reposted/cross-posted. */
export function contentHash(primaryTicker: string | null, author: string | null, text: string): string {
  const norm = text.toLowerCase().replace(/\s+/g, " ").slice(0, 240);
  return createHash("sha256")
    .update(`${primaryTicker ?? ""}|${author ?? ""}|${norm}`)
    .digest("hex")
    .slice(0, 32);
}

/** Source ids we've already evaluated (any decision) → skip re-pulling/re-scoring. */
export async function filterAlreadySeen(
  platform: string,
  sourceIds: string[],
): Promise<Set<string>> {
  if (sourceIds.length === 0) return new Set();
  const rows = await db
    .select({ sourceId: seenPosts.sourceId })
    .from(seenPosts)
    .where(and(eq(seenPosts.sourcePlatform, platform), inArray(seenPosts.sourceId, sourceIds)));
  return new Set(rows.map((r) => r.sourceId));
}

/**
 * Has an equivalent idea (same content hash) already been evaluated within the
 * window? seen_posts records the hash for every post we touched — including
 * cross-posts that were rejected — so this catches dupes regardless of outcome.
 */
export async function isDuplicateContent(hash: string, windowDays: number): Promise<boolean> {
  const since = new Date(Date.now() - windowDays * 86400 * 1000);
  const seen = await db
    .select({ sourceId: seenPosts.sourceId })
    .from(seenPosts)
    .where(and(eq(seenPosts.contentHash, hash), gte(seenPosts.firstSeenAt, since)))
    .limit(1);
  return seen.length > 0;
}
