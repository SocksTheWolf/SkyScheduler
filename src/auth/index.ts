import { AsyncLocalStorage } from "async_hooks";
import { betterAuth, Session } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { type DrizzleD1Database } from "drizzle-orm/d1";
import type { SecureHeadersVariables } from "hono/secure-headers";
import {
  BSKY_MAX_USERNAME_LENGTH, BSKY_MIN_USERNAME_LENGTH,
  DEFAULT_PDS, USE_ASYNC_AUTH_TASK
} from "../limits";
import { APP_NAME } from "../siteinfo";
import type { AllContext, BaseContext, Bindings } from "../types";
import { createDMWithUsername } from "../utils/bsky/bskyMessage";
import { createPasswordResetMessage } from "../utils/messages/accountReset";

// try to optimize performance on CF Workers
const execCtxStorage = USE_ASYNC_AUTH_TASK ? new AsyncLocalStorage<ExecutionContext>() : null;

// Single auth configuration that handles both CLI and runtime scenarios
function createAuth(c?: AllContext, cf?: IncomingRequestCfProperties) {
  const env: Bindings|undefined = c?.env;
  // Use actual DB for runtime, empty object for CLI
  const db = c ? c.get("db") : ({} as any);
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
      "/cloudflare/geolocation",
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
    ...withCloudflare(
      {
        autoDetectIpAddress: false,
        geolocationTracking: false,
        cf: cf || {},
        d1: env
          ? {
              db,
              options: {
                usePlural: true,
                debugLogs: false,
              },
            }
          : undefined,
        // @ts-ignore
        kv: env?.KV,
      },
      {
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        sendResetPassword: async ({user, url, token}, request) => {
          const userName = (user as any).username;
          await createDMWithUsername(env!, userName, createPasswordResetMessage(url, token))
            .then((resp) => {
              if (resp === false)
                throw new Error("FAILED_MESSAGE");
            });
          },
        },
        plugins: [
          username({
            // We validate all of our usernames ahead of time
            // do not use the validator in betterauth but instead our own ZOD system
            usernameValidator: (username) => {
              return true;
            },
            displayUsernameValidator: (displayUsername) => {
              return true;
            },
            /* we do our own normalization in the zod schemas */
            usernameNormalization: false,
            displayUsernameNormalization: false,
            minUsernameLength: BSKY_MIN_USERNAME_LENGTH,
            maxUsernameLength: BSKY_MAX_USERNAME_LENGTH
          })
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
      }
    ),
    appName: APP_NAME,
    secret: env?.BETTER_AUTH_SECRET,
    baseURL: (env?.IN_DEV === true) ? undefined : env?.BETTER_AUTH_URL,
    user: {
      additionalFields: {
        bskyAppPass: {
          type: "string",
          required: true
        },
        pds: {
          type: "string",
          defaultValue: DEFAULT_PDS,
          required: true
        }
      },
      changeEmail: {
        enabled: false
      },
      deleteUser: {
        enabled: false,
      }
    },
    account: {
      accountLinking: {
        enabled: false
      },
    },
    telemetry: {
      enabled: false
    },
    logger: {
      disabled: true
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip']
      },
      backgroundTasks: USE_ASYNC_AUTH_TASK ? {
        handler: (p) => execCtxStorage!.getStore()?.waitUntil(p),
      } : undefined
    },
    // Only add database adapter for CLI schema generation
    ...(env ? {} : {
      database: drizzleAdapter({} as D1Database, {
        provider: "sqlite",
        usePlural: true,
        debugLogs: false,
      }),
    }),
  });
};

function processAuthRoute(c: BaseContext) {
  const authHandle = (ctx: BaseContext) => ctx.get("auth").handler(ctx.req.raw);
  if (USE_ASYNC_AUTH_TASK)
    return execCtxStorage!.run(c.executionCtx as ExecutionContext, () => authHandle(c))
  else
    return authHandle(c);
};

// Export for variable types
type ContextVariables = SecureHeadersVariables & {
  auth: ReturnType<typeof createAuth>;
  userId: string;
  isAdmin: boolean;
  session: Session;
  db: DrizzleD1Database;
  pds: string;
};

// Export for runtime usage
export { createAuth, processAuthRoute, type ContextVariables };
