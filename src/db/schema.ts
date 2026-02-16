import * as authSchema from "./auth.schema";
import * as appSchema from "./app.schema";
import * as enforcementSchema from "./enforcement.schema";

// Combine all schemas here for migrations
export const schema = {
    ...authSchema,
    ...appSchema,
    ...enforcementSchema
} as const;