import { USE_CAPTCHA } from "../config";
import { EmbedDataType } from "../enums";
import type { AllContext, BaseContext } from "../types";

export function isInDev(env?: Env) {
  if (env === undefined)
    return false;

  // @ts-expect-error: overlap bs because of wrangler typegen
  // eslint-disable-next-line @typescript-eslint/dot-notation, @typescript-eslint/no-unnecessary-condition
  return env["IN_DEV"] === "true";
}

export function useCFTurnstile(ctx: AllContext|undefined): boolean {
  if (isInDev(ctx?.env))
    return false;

  return USE_CAPTCHA;
}

export function isAltEditableType(type: EmbedDataType) {
  return type === EmbedDataType.Image || type === EmbedDataType.Video;
}

export function has(obj: unknown, property: string): boolean {
  if (!obj)
    return false;

  // eslint-disable-next-line n/no-unsupported-features/es-builtins
  if (Object.hasOwn(obj, property)) {
    // @ts-ignore
    return obj[property] !== undefined && obj[property] !== null;
  }
  return false;
}

export const logoutAccount = async (c: BaseContext): Promise<boolean> => {
  try {
    const auth = c.get("auth");
    await auth.api.signOut({ headers: c.req.raw.headers });
    return true;
  } catch (err: unknown) {
    console.error("Unable to handle logout properly, redirecting anyways. " + String(err));
  }
  return false;
}

export const clearWorkersCache = async (ctx: ExecutionContext, options: CachePurgeOptions): Promise<boolean> => {
  if (!ctx.cache)
    return false;

  const clearRequest = await ctx.cache.purge(options);
  if (!clearRequest.success) {
    if (clearRequest.errors.length > 0) {
      const clearErrors: string[] = clearRequest.errors.map((err) => err.message);
      console.error(`Unable to clear workers cache, got ${clearErrors.join(",")}`);
    }
    return false;
  }
  return true;
}

export function getEnumKeyByValue<T extends Record<string, unknown>>(inEnum: T, value: unknown): keyof T|null {
  return Object.keys(inEnum).find((x) => inEnum[x] == value) ?? null;
}