# Equity Idea Aggregator

A daily pipeline that pulls candidate **equity investment theses** from Reddit
(X/Twitter is pluggable), scores them with an LLM using an anchored rubric, and
persists only the qualifying ideas to Postgres for human review.

> **v1 scope:** Reddit-only ingestion. X is stubbed behind a common `Source`
> interface so it can be added without touching the rest of the pipeline.

---

## Architecture

```
Vercel Cron (daily)                       Vercel Cron (weekdays)
      │                                          │
      ▼                                          ▼
  /api/cron ──► runPipeline()             /api/backfill-outcomes
      │                                          │
      ▼                                          ▼
  ┌─────────────────────────────────────┐   forward returns via FMP
  │ 1. Pull        RedditSource (OAuth)  │   written back to `ideas`
  │ 2. Dedup state filter via seen_posts │
  │ 3. Prefilter   engagement/length/kw  │  ← cheap, deterministic, $0
  │ 4. Triage      Haiku: thesis? y/n    │  ← cheap LLM
  │ 5. Deep score  Sonnet: 0–10 rubric   │  ← capable LLM, survivors only
  │ 6. Enrich      FMP: validate + sector│
  │ 7. Dedup       content hash window   │
  │ 8. Persist     ideas (>= threshold)  │
  └─────────────────────────────────────┘
      │
      ▼
  Postgres  ◄── system of record (Notion optional mirror)
  Slack     ◄── optional daily top-ideas summary
```

**Why this shape**

- **Two-stage LLM funnel** (cheap triage → capable scoring) keeps cost low: most
  posts die at the free deterministic prefilter or the cheap triage call, so the
  expensive model only ever sees real candidates.
- **`seen_posts` is the state store.** Every evaluated post is recorded with the
  funnel stage it died at, so daily runs never re-pull or (expensively) re-score
  the same content, and cross-posted duplicates are caught.
- **FMP, not the LLM, owns ticker validation and sector** — deterministic and
  correct, and it doubles as the price source for the outcome feedback loop.
- **Engagement is a weak prefilter only.** The AI score drives ranking, because
  upvotes reward memes and consensus — the opposite of what's useful.
- **Outcome backfill** records +5d/+20d forward returns so you can later test
  whether high-scored ideas actually perform and recalibrate the threshold.

---

## Data model (`src/db/schema.ts`)

`ideas` — one row per qualifying thesis (system of record):

| column | meaning |
|---|---|
| `date_found` | ISO timestamp the idea was captured |
| `source_platform` | `Reddit` / `X` |
| `source_id` | platform-native id (unique with platform) |
| `subreddit_or_list` | `r/ValueInvesting`, or an X List label |
| `author_handle` | poster |
| `post_title` / `post_body_excerpt` | first ~1000 chars |
| `permalink` | link back to the source |
| `primary_ticker` / `all_tickers` | FMP-validated best guess + candidates |
| `sector` / `industry` | from FMP company profile |
| `engagement_score` | normalized upvotes+comments (or likes+RTs+replies) |
| `ai_quality_score` | 0–10 from the rubric |
| `ai_score_breakdown` | 1–3 sentence rationale |
| `ai_thesis_summary` | neutral 1–2 sentence summary |
| `ai_direction` | long / short / unclear |
| `status` | `New` → `Reviewed` / `Rejected` / `In Diligence` (manual) |
| `price_at_found` / `fwd_returns` | outcome tracking |

Plus `seen_posts` (dedup/state) and `runs` (per-run observability).

---

## Environment variables

See `.env.example`. Required: `DATABASE_URL`, `ANTHROPIC_API_KEY`,
`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`, `FMP_API_KEY`,
`CRON_SECRET`. Optional: `SLACK_WEBHOOK_URL`, `TRIAGE_MODEL`, `SCORING_MODEL`,
`NOTION_*`.

- **Reddit** keys: create a *script* app at <https://www.reddit.com/prefs/apps>.
  The pipeline uses read-only application-only OAuth (no user login). Set a
  descriptive, unique `REDDIT_USER_AGENT` or Reddit will 429/403 you.
- **FMP** key: <https://site.financialmodelingprep.com/> (free tier validates
  tickers and sectors; EOD prices may need a paid tier).

---

## Setup & run

```bash
npm install
cp .env.example .env          # fill in secrets
npm run db:push               # create tables (or apply ./migrations)
npm run run:once              # one full run from your machine
npm run check                 # typecheck
```

Deploy on Vercel: import this directory as a project, set the env vars, and the
crons in `vercel.json` fire automatically (`/api/cron` daily 11:00 UTC,
`/api/backfill-outcomes` weekdays 22:30 UTC). Trigger manually with:

```bash
curl -X POST https://<deployment>/api/run -H "Authorization: Bearer $CRON_SECRET"
```

---

## Tuning (no code changes)

| Knob | File | Default |
|---|---|---|
| Subreddits / listings / per-sub floors | `config/sources.ts` | SecurityAnalysis, ValueInvesting, stocks |
| Lookback window | `config/pipeline.ts` `lookbackHours` | 24h |
| Engagement floors | `config/pipeline.ts` `minScore` / `minComments` | 30 / 5 |
| Min text length (waived if viral) | `minTextLength` / `viralScoreOverride` | 350 / 500 |
| Keyword prefilter | `keywords` | thesis, valuation, DCF, … |
| Triage / scoring models | `triageModel` / `scoringModel` | Haiku / Sonnet |
| **Quality threshold to persist** | `minQualityScore` | **6** |
| Dedup window | `dedupWindowDays` | 14 |
| Per-run LLM cap (cost guard) | `maxScoredPerRun` | 60 |
| Outcome horizons | `outcomeHorizonsDays` | [5, 20] |

> **Calibrate `minQualityScore` after a week of real output** — scores tend to
> cluster; pick the threshold from the distribution you actually observe.

---

## Adding X/Twitter later

1. Implement `src/sources/x.ts` exporting an `XSource` that satisfies `Source`
   and normalizes tweets into `RawPost`.
2. List your curated Lists in `config/sources.ts` and set `X_ENABLED = true`.
3. Register `new XSource()` in `src/pipeline/run.ts`.

**Reality check:** the X API has no free timeline reads and the paid tiers are
rate-limited; Nitter/RSS bridges are unreliable and against ToS. Budget for the
paid API or an upstream aggregator, and poll Lists (not the firehose).

---

## Extracting into its own repo

This lives in a subdirectory only because of how it was scaffolded. To split it
out cleanly with history:

```bash
git subtree split --prefix=equity-idea-aggregator -b equity-aggregator-only
# then in a fresh empty repo:
git pull <this-repo> equity-aggregator-only
```

Or simply copy the `equity-idea-aggregator/` directory into a new repo and
`git init` — it has zero dependency on the surrounding project.
