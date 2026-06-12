{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 11 * * *"
    },
    {
      "path": "/api/backfill-outcomes",
      "schedule": "30 22 * * 1-5"
    }
  ],
  "functions": {
    "api/cron.ts": { "maxDuration": 300 },
    "api/run.ts": { "maxDuration": 300 },
    "api/backfill-outcomes.ts": { "maxDuration": 120 }
  }
}
