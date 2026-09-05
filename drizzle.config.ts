import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./src/db/index.ts",
  dialect: "sqlite",
  driver: "d1-http"
});
