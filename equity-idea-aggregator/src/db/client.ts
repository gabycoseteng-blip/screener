import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

/**
 * postgres.js with a small pool. `prepare: false` keeps us compatible with
 * transaction-mode poolers (e.g. Neon/Supabase pgBouncer) used on serverless.
 */
const client = postgres(connectionString, { max: 3, prepare: false });

export const db = drizzle(client, { schema });
export { schema };
