import type { Config } from "drizzle-kit";
 
export default {
  schema: "./src/db/index.ts",
  out: "./migrations",
  driver: "d1-http",
  dialect: "sqlite"
} satisfies Config;
