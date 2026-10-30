import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

type Db = PostgresJsDatabase;
const globalForDb = globalThis as unknown as { __shelfwalkDb?: Db };

/**
 * Lazily creates one Drizzle instance per serverless instance.
 * DATABASE_URL must be the Supabase *pooler* connection string (Transaction mode, port 6543).
 * `prepare: false` is required because the transaction pooler does not support prepared statements.
 */
export function getDb(): Db | null {
  if (globalForDb.__shelfwalkDb) return globalForDb.__shelfwalkDb;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const client = postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10, ssl: isLocal ? false : "require" });
  globalForDb.__shelfwalkDb = drizzle(client);
  return globalForDb.__shelfwalkDb;
}
