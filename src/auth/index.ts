import { withCloudflare } from "better-auth-cloudflare";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { username } from "better-auth/plugins";
import type { Session } from "better-auth/types";
import type { SecureHeadersVariables } from "hono/secure-headers";
import { APP_NAME } from "../appInfo";
import {
  BSKY_MAX_USERNAME_LENGTH, BSKY_MIN_USERNAME_LENGTH,
  DEFAULT_PDS
} from "../limits";
import type { AllContext, BaseContext, Bindings, DBProcessor, UserIdType } from "../types";
import { createDMWithUsername } from "../utils/bsky/bskyMessage";
import { isInDev } from "../utils/helpers";
import { createPasswordResetMessage } from "../utils/messages/accountReset";

// Dynamic import to handle the SSG import on "cloudflare:workers"
// as node won't know how to import it outside of the cloudflare runtime
// as such, we dynamically import and then set the appropriate function signature from there
type waitUntilCallback = (_: Promise<unknown>) => void;
let waitUntil: waitUntilCallback;
if (process.env["IS_SSG"] == "true") {
  waitUntil = (await import("../workerShim")).waitUntilShim;
  console.log("SSG Shim Installed");
} else {
  waitUntil = (await import("cloudflare:workers")).waitUntil;
}

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
        cf: cf ?? {},
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
        sendResetPassword: async ({user, url, token}, _request) => {
          const userName: string = (user as any).username;
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
    baseURL: (isInDev(env)) ? undefined : env?.BETTER_AUTH_URL,
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
      backgroundTasks: {
        handler: waitUntil,
      },
    },
    // Only add database adapter for CLI schema generation
    // though better-auth-cloudflare just injects this anyways
    ...(env ? {} : {
      database: drizzleAdapter({}, {
        provider: "sqlite",
        usePlural: true,
        debugLogs: false,
      }),
    }),
  });
};

const processAuthRoute = (ctx: BaseContext) => ctx.get("auth").handler(ctx.req.raw);

// Export for variable types
type ContextVariables = SecureHeadersVariables & {
  auth: ReturnType<typeof createAuth>;
  userId: UserIdType;
  isAdmin: boolean;
  session: Session|null;
  db: DBProcessor;
  pds: string;
  ssg: boolean;
};

// Export for runtime usage
export { createAuth, processAuthRoute, type ContextVariables };

