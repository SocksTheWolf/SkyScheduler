import type { D1Database, IncomingRequestCfProperties } from "@cloudflare/workers-types";
import { betterAuth, Session, User } from "better-auth";
import { username } from "better-auth/plugins";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { Bindings } from "../types";
import { BSKY_MIN_USERNAME_LENGTH } from "../limits.d";

// Single auth configuration that handles both CLI and runtime scenarios
function createAuth(env?: Bindings, cf?: IncomingRequestCfProperties) {
    // Use actual DB for runtime, empty object for CLI
    const db = env ? drizzle(env.DB, { schema, logger: false }) : ({} as any);

    return betterAuth({
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
              kv: env?.KV,
            },
            {
              emailAndPassword: {
                enabled: true,
                requireEmailVerification: false,
              },
              plugins: [username({
                minUsernameLength: BSKY_MIN_USERNAME_LENGTH
              })],
              rateLimit: {
                enabled: true,
              },
            }
        ),
        secret: env?.BETTER_AUTH_SECRET,
        baseURL: (env?.BETTER_AUTH_URL === "*") ? undefined : env?.BETTER_AUTH_URL,
        user: {
          additionalFields: {
            bskyAppPass: {
              type: "string",
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
        // Only add database adapter for CLI schema generation
        ...(env
            ? {}
            : {
              database: drizzleAdapter({} as D1Database, {
                provider: "sqlite",
                usePlural: true,
                debugLogs: false,
              }),
            }),
    });
}

// Export for CLI schema generation
export const auth = createAuth();

// Export for variable types
type ContextVariables = {
  auth: ReturnType<typeof createAuth>;
  user: User;
  session: Session;
};

// Export for runtime usage
export { createAuth, ContextVariables };
