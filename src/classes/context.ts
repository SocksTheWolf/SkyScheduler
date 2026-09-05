/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExecutionContext } from "hono";
import { getDrizzle } from "../utils/db/get";

export class ScheduledContext {
  executionCtx: ExecutionContext;
  env: Env;
  // used for parameters wrappings such as "isAdmin" or "session"
  // as a proxy for Context
  #map: Map<string, any>;
  constructor(env: Env, executionCtx: ExecutionContext) {
    this.#map = new Map<string, any>();
    this.env = env;
    this.executionCtx = executionCtx;
    this.set("db", getDrizzle(env.DB));
    this.set("ssg", false);
  }
  get(name: string): any {
    if (this.#map.has(name))
      return this.#map.get(name);
    return null;
  }
  set(name: string, value: any): void {
    this.#map.set(name, value);
  }
}
