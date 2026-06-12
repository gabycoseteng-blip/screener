/**
 * Common shape every source (Reddit now, X later) normalizes into. Keeping
 * this interface tight is what makes X a drop-in addition rather than a rewrite.
 */
export interface RawPost {
  sourcePlatform: "Reddit" | "X";
  /** Platform-native unique id (e.g. Reddit fullname "t3_abc123"). */
  sourceId: string;
  /** "r/ValueInvesting" or an X List label. */
  channel: string;
  authorHandle: string | null;
  title: string | null;
  body: string;
  permalink: string;
  createdAt: Date;
  /** Raw engagement signals; normalized into a single score downstream. */
  engagement: {
    score?: number; // reddit upvotes / net score
    comments?: number;
    upvoteRatio?: number;
    likes?: number; // X
    retweets?: number; // X
    replies?: number; // X
  };
}

export interface Source {
  platform: "Reddit" | "X";
  /** Pull recent posts created within `lookbackHours`. */
  fetchRecent(lookbackHours: number): Promise<RawPost[]>;
}

/** Collapse heterogeneous engagement signals into one comparable integer. */
export function engagementScore(p: RawPost): number {
  const e = p.engagement;
  if (p.sourcePlatform === "Reddit") {
    return (e.score ?? 0) + 2 * (e.comments ?? 0);
  }
  // X: likes + 2*RT + replies tends to track substantive reach
  return (e.likes ?? 0) + 2 * (e.retweets ?? 0) + (e.replies ?? 0);
}
