import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { username } from "better-auth/plugins";
import { APP_NAME } from "../appInfo";
import { DEFAULT_PDS } from "../config";
import {
  BSKY_MAX_USERNAME_LENGTH,
  BSKY_MIN_USERNAME_LENGTH,
  CF_KV_MIN_TTL,
} from "../limits";
import type { AllContext, BaseContext, Bindings, DBProcessor } from "../types";
import { createDMWithUsername } from "../utils/bsky/bskyMessage";
import { isInDev } from "../utils/helpers";
import { createPasswordResetMessage } from "../utils/messages/accountReset";

// Dynamic import to handle the SSG import on "cloudflare:workers"
// as node won't know how to import it outside of the cloudflare runtime
// as such, we dynamically import and then set the appropriate function signature from there
type waitUntilCallback = (_: Promise<unknown>) => void;
let waitUntil: waitUntilCallback;
// eslint-disable-next-line @typescript-eslint/dot-notation
if (process.env["IS_SSG"] === "true") {
  waitUntil = (await import("../workerShim")).waitUntilShim;
} else {
  waitUntil = (await import("cloudflare:workers")).waitUntil;
}

function adjustTTL(inTTL?: number) {
  let useTTL: number | undefined = undefined;
  if (inTTL !== undefined) {
    useTTL = (inTTL < CF_KV_MIN_TTL) ? CF_KV_MIN_TTL : inTTL;
  }
  return useTTL;
}

// Single auth configuration that handles both CLI and runtime scenarios
function createAuth(c?: AllContext) {
  const env: Bindings | undefined = c?.env;
  // Use actual DB for runtime, empty object for CLI
  const db: DBProcessor = c ? c.get("db") : ({} as DBProcessor);
  return betterAuth({
    // pretty much disable everything but the /reset-password
    // this is just overkill tbh, we hardcode the routes we support in index
    disabledPaths: [
      "/sign-in/email",
      "/sign-in/social",
      "/callback/",
      "/change-email",
      "/change-password",
      "/set-password",
      "/link-social-account",
      "/unlink-account",
      "/account-info",
      "/refresh-token",
      "/get-access-token",
      "/verify-email",
      "/verify-password",
      "/send-verification-email",
      "/revoke-session",
      "/link-social",
      "/list-accounts",
      "/list-sessions",
      "/is-username-available",
      "/delete-user",
      "/delete-user/callback",
      "/is-username-available",
      "/ok",
      "/sign-in/username",
      "/get-session",
      "/update-user",
      "/update-session",
      "/revoke-other-sessions",
      "/sign-out",
      "/sign-in",
      "/sign-up/email",
      "/request-password-reset",
      "/revoke-sessions",
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({user, url, token}, _request) => {
        // @ts-ignore
        const userName: string = user.username;
        await createDMWithUsername(env!, userName, createPasswordResetMessage(url, token))
          .then((resp) => {
            if (!resp)
              throw new Error("FAILED_MESSAGE");
        });
      },
    },
    plugins: [
      username({
        // We validate all of our usernames ahead of time
        // do not use the validator in betterauth but instead our own ZOD system
        usernameValidator: (_username) => {
          return true;
        },
        displayUsernameValidator: (_displayUsername) => {
          return true;
        },
        /* we do our own normalization in the zod schemas */
        usernameNormalization: false,
        displayUsernameNormalization: false,
        minUsernameLength: BSKY_MIN_USERNAME_LENGTH,
        maxUsernameLength: BSKY_MAX_USERNAME_LENGTH,
      }),
    ],
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      "*": {
        window: 60,
        max: 100,
      },
    },
    appName: APP_NAME,
    secret: env?.BETTER_AUTH_SECRET,
    baseURL: isInDev(env) ? undefined : env?.BETTER_AUTH_URL,
    user: {
      additionalFields: {
        bskyAppPass: {
          type: "string",
          required: true,
        },
        pds: {
          type: "string",
          defaultValue: DEFAULT_PDS,
          required: true,
        },
        did: {
          type: "string",
          defaultValue: null,
          required: true
        }
      },
      changeEmail: {
        enabled: false,
      },
      deleteUser: {
        enabled: false,
      },
    },
    secondaryStorage: {
      get: async (key: string) => {
        return await env!.KV.get(key);
      },
      getAndDelete: async (key: string) => {
        const origValue = await env?.KV.get(key);
        await env?.KV.delete(key);
        return origValue;
      },
      set: async (key: string, value: string, ttl?: number) => {
        await env!.KV.put(key, value, { expirationTtl: adjustTTL(ttl) });
      },
      increment: async (key: string, ttl?: number) => {
        const origValue: string|null = await env!.KV.get(key);
        if (origValue === null) {
          await env?.KV.put(key, "1", { expirationTtl: adjustTTL(ttl) });
          return 1;
        }
        // This should probably check NaN
        const newNumber = Number(origValue) + 1;
        await env?.KV.put(key, newNumber.toString());
        return newNumber;
      },
      delete: async (key: string) => {
        await env?.KV.delete(key);
      },
    },
    database: drizzleAdapter(db ?? {}, {
      provider: "sqlite",
      usePlural: true,
      debugLogs: false,
    }),
    account: {
      accountLinking: {
        enabled: false,
      },
    },
    telemetry: {
      enabled: false,
    },
    logger: {
      disabled: true,
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
      backgroundTasks: {
        handler: waitUntil,
      },
    },
  });
}

const processAuthRoute = (ctx: BaseContext) =>
  ctx.get("auth").handler(ctx.req.raw);

// Export for runtime usage
export { createAuth, processAuthRoute };
