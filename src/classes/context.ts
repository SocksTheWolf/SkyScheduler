/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExecutionContext } from "hono";
import type { Bindings } from "../types";
import { getDrizzle } from "../utils/helpers";

export class ScheduledContext {
  executionCtx: ExecutionContext;
  env: Bindings;
  // used for parameters wrappings such as "isAdmin" or "session"
  // as a proxy for Context
  #map: Map<string, any>;
  constructor(env: Bindings, executionCtx: ExecutionContext) {
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
