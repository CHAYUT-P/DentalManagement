import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * The one Postgres client for the whole app.
 *
 * · No `server-only` import here on purpose: the seed and verification scripts
 *   reuse this client outside Next.js. The server/client boundary is enforced
 *   one level up — src/server/actions.ts carries `server-only`, and only
 *   server components/actions import the query layer, so a client component
 *   that tried to reach the database would fail the build.
 * · `postgres` (postgres.js) is used in its lazy, pooled mode; the pool opens
 *   on the first query and the driver reuses it for the life of the process.
 * · `prepare: false` — Drizzle's recommendation for serverless-style
 *   environments (Vercel) where prepared statements can outlive their
 *   connection. Harmless on a long-lived local server.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env (see docker-compose.yml) or point it at your cloud Postgres.",
  );
}

// dev reloads this module on every edit — reuse one pool instead of leaking
// a new one each time until Postgres runs out of connections
const cache = globalThis as unknown as { __dkPostgres?: ReturnType<typeof postgres> };
const client = cache.__dkPostgres ?? postgres(connectionString, { prepare: false });
if (process.env.NODE_ENV !== "production") cache.__dkPostgres = client;

export const db = drizzle(client, { schema });

export { schema };
