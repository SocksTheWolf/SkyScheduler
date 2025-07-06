import * as authSchema from "./auth.schema";
import * as appSchema from "./app.schema";

// Combine all schemas here for migrations
export const schema = {
    ...authSchema,
    ...appSchema,
} as const;