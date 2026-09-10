import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit reads this for `push` / `generate` / `migrate` / `studio`.
 * The runtime app never imports it — src/db/index.ts builds its own client
 * from process.env.DATABASE_URL.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
