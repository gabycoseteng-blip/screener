{
  "name": "equity-idea-aggregator",
  "version": "0.1.0",
  "private": true,
  "license": "MIT",
  "type": "module",
  "description": "Aggregates equity investment theses from Reddit (X pluggable), scores them with an LLM, and persists qualifying ideas to Postgres for human review.",
  "scripts": {
    "dev": "tsx scripts/run-local.ts",
    "run:once": "tsx scripts/run-local.ts",
    "backfill:outcomes": "tsx scripts/backfill-outcomes.ts",
    "check": "tsc --noEmit",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.91.1",
    "dotenv": "^17.4.2",
    "drizzle-orm": "^0.39.3",
    "drizzle-zod": "^0.7.0",
    "postgres": "^3.4.5",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "20.19.27",
    "@vercel/node": "^5.1.0",
    "drizzle-kit": "^0.31.8",
    "tsx": "^4.20.5",
    "typescript": "5.6.3"
  }
}
