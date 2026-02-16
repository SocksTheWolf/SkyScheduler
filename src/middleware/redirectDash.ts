import { Context } from "hono";
import { every } from "hono/combine";
import { pullAuthData } from "./auth";

export async function goDashIfLogin(c: Context, next: any) {
  if (c.get("userId") !== null) {
    return c.redirect("/dashboard");
  }
  await next();
}

export const redirectToDashIfLogin = every(pullAuthData, goDashIfLogin);