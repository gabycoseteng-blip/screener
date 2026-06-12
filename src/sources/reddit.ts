import { SUBREDDITS, type SubredditConfig } from "../../config/sources.js";
import { log, withRetry } from "../util/log.js";
import type { RawPost, Source } from "./types.js";

const OAUTH_BASE = "https://oauth.reddit.com";
const PUBLIC_BASE = "https://www.reddit.com";
const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const FALLBACK_UA = "equity-idea-aggregator/0.1 (public-json fallback)";

/**
 * Reddit ingestion using the official API with a "script" app and the
 * client-credentials (application-only) OAuth flow — no user login needed,
 * read-only. Rate limit: ~60 requests/min per OAuth client; we stay well under.
 *
 * Fallback: when REDDIT_CLIENT_ID/SECRET are absent (e.g. while a developer
 * application is pending under Reddit's Responsible Builder Policy), we read
 * the public listing endpoints (`/r/<sub>/top.json`) instead — same response
 * shape, no auth. Public access is more aggressively rate-limited and
 * datacenter IPs are sometimes blocked, so treat it as a stopgap and add real
 * credentials once approved.
 */
export class RedditSource implements Source {
  platform = "Reddit" as const;
  private token: string | null = null;
  private tokenExpiry = 0;

  constructor(
    private readonly clientId = process.env.REDDIT_CLIENT_ID,
    private readonly clientSecret = process.env.REDDIT_CLIENT_SECRET,
    private readonly userAgent = process.env.REDDIT_USER_AGENT ?? FALLBACK_UA,
  ) {}

  /** OAuth when credentials exist; public .json listings otherwise. */
  private get hasCredentials(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) return this.token;
    if (!this.hasCredentials) {
      throw new Error("Missing REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET.");
    }
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const res = await withRetry(
      () =>
        fetch(TOKEN_URL, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": this.userAgent!,
          },
          body: "grant_type=client_credentials",
        }),
      { label: "reddit-token" },
    );
    if (!res.ok) throw new Error(`Reddit token failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = json.access_token;
    this.tokenExpiry = Date.now() + (json.expires_in - 60) * 1000;
    return this.token;
  }

  private async fetchSub(sub: SubredditConfig, lookbackHours: number): Promise<RawPost[]> {
    const query = sub.listing === "top" ? `top?t=day&limit=${sub.limit}` : `new?limit=${sub.limit}`;
    let request: () => Promise<Response>;
    if (this.hasCredentials) {
      const token = await this.getToken();
      request = () =>
        fetch(`${OAUTH_BASE}/r/${sub.name}/${query}`, {
          headers: { Authorization: `Bearer ${token}`, "User-Agent": this.userAgent },
        });
    } else {
      // Public listing fallback — same JSON shape, no auth required.
      request = () =>
        fetch(`${PUBLIC_BASE}/r/${sub.name}/${query.replace(/^(top|new)/, "$1.json")}`, {
          headers: { "User-Agent": this.userAgent },
        });
    }
    const res = await withRetry(request, { label: `reddit-${sub.name}` });
    if (!res.ok) {
      log.warn("reddit sub fetch failed", { sub: sub.name, status: res.status });
      return [];
    }
    const json = (await res.json()) as { data: { children: { data: RedditPost }[] } };
    const cutoff = Date.now() - lookbackHours * 3600 * 1000;

    return json.data.children
      .map((c) => c.data)
      .filter((p) => p && !p.stickied && p.created_utc * 1000 >= cutoff)
      .map((p) => this.normalize(p, sub.name));
  }

  private normalize(p: RedditPost, sub: string): RawPost {
    return {
      sourcePlatform: "Reddit",
      sourceId: p.name, // fullname e.g. "t3_abc123"
      channel: `r/${sub}`,
      authorHandle: p.author ?? null,
      title: p.title ?? null,
      body: p.selftext ?? "",
      permalink: `https://www.reddit.com${p.permalink}`,
      createdAt: new Date(p.created_utc * 1000),
      engagement: {
        score: p.score,
        comments: p.num_comments,
        upvoteRatio: p.upvote_ratio,
      },
    };
  }

  async fetchRecent(lookbackHours: number): Promise<RawPost[]> {
    if (!this.hasCredentials) {
      log.warn("reddit credentials not set — using public .json fallback", {
        note: "add REDDIT_CLIENT_ID/SECRET once your developer application is approved",
      });
    }
    const all: RawPost[] = [];
    for (const sub of SUBREDDITS) {
      try {
        const posts = await this.fetchSub(sub, lookbackHours);
        log.info("pulled subreddit", { sub: sub.name, count: posts.length });
        all.push(...posts);
      } catch (err) {
        log.error("subreddit pull errored", { sub: sub.name, error: String(err) });
      }
    }
    return all;
  }
}

interface RedditPost {
  name: string;
  title?: string;
  selftext?: string;
  author?: string;
  permalink: string;
  created_utc: number;
  score: number;
  num_comments: number;
  upvote_ratio: number;
  stickied?: boolean;
}
