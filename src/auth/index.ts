import { betterAuth, Session } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import type { SecureHeadersVariables } from "hono/secure-headers";
import { schema } from "../db";
import { BSKY_MAX_USERNAME_LENGTH, BSKY_MIN_USERNAME_LENGTH, DEFAULT_PDS } from "../limits";
import { APP_NAME } from "../siteinfo";
import type { Bindings } from "../types";
import { createDMWithUsername } from "../utils/bsky/bskyMessage";
import { createPasswordResetMessage } from "../utils/messages/accountReset";

// Single auth configuration that handles both CLI and runtime scenarios
function createAuth(env?: Bindings, cf?: IncomingRequestCfProperties) {
  // Use actual DB for runtime, empty object for CLI
  const db = env ? drizzle(env.DB, { schema, logger: false }) : ({} as any);
  return betterAuth({
    disabledPaths: [
      "/sign-in/email",
      "/sign-in/social",
      "/change-email",
      "/set-password",
      "/link-social-account",
      "/unlink-account",
      "/account-info",
      "/refresh-token",
      "/get-access-token",
      "/verify-email",
      "/send-verification-email",
      "/revoke-session",
      "/link-social",
      "/list-accounts",
      "/list-sessions",
      "/cloudflare/geolocation",
      "/is-username-available",
      "/delete-user/callback",
      "/change-password",
      "/is-username-available"
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
      }
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
}

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
export { type ContextVariables, createAuth };

