import { drizzle } from "drizzle-orm/d1";
import { ExecutionContext } from "hono";
import { Bindings } from "../types";


export class ScheduledContext {
  executionCtx: ExecutionContext;
  env: Bindings;
  #map: Map<string, any>;
  constructor(env: Bindings, executionCtx: ExecutionContext) {
    this.#map = new Map<string, any>();
    this.env = env;
    this.executionCtx = executionCtx;
    this.set("db", drizzle(env.DB));
  }
  get(name: string) {
    if (this.#map.has(name))
      return this.#map.get(name);
    return null;
  }
  set(name: string, value: any) {
    this.#map.set(name, value);
  }
};
