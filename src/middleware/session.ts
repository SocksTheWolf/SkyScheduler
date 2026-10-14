import type { BaseContext, NextMiddleware } from "../types";
import { createAuth } from "./../auth";
import { getDrizzle } from "./../utils/db/get";

export async function sessionMiddleware(c: BaseContext, next: NextMiddleware) {
  if (c.get("db") === undefined || c.get("db") === null) {
    // technically this type won't match because we fully define the schema here
    // but I don't care, it should be fine anyways.

    // @ts-expect-error: schema whining
    c.set("db", getDrizzle(c.env.DB));
  }
  c.set("auth", createAuth(c));
  await next();
};