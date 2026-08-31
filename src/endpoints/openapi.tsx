// Mediocre file to help with automatically generating endpoint bindings so that we can dump them to the
// Cloudflare WAF to protect/log against abuse
import { Hono } from "hono";
import { describeRoute, generateSpecs, resolver, validator } from "hono-openapi";
import { APP_NAME, SITE_URL } from "../appInfo";
import type { HonoBase } from "../types";
import { AccountDeleteSchema, AccountForgotSchema } from "../validation/accountForgotDeleteSchema";
import { AccountResetSchema } from "../validation/accountResetSchema";
import { AccountUpdateSchema } from "../validation/accountUpdateSchema";
import { ResetCallbackQuery, ResetTokenValid } from "../validation/authResetSchema";
import { FileUploadSchema } from "../validation/fileUploadSchema";
import { LoginSchema } from "../validation/loginSchema";
import { FileDeleteSchema } from "../validation/mediaSchema";
import { EditSchema, PostSchema } from "../validation/postSchema";
import { RepostSchema } from "../validation/repostSchema";
import {
  CheckFileSchema, CheckGUIDSchema, CreatePostResponseSchema,
  FileUploadFailSchema,
  FileUploadSuccessSchema, GenericResponseSchema
} from "../validation/responseSchema";
import { SignupSchema } from "../validation/signupSchema";

// Easy access change for the openapi string version
const CURRENT_OPENAPI_VERSION: string = '1.2.8';

const openapiRoutes = new Hono<HonoBase>();

openapiRoutes.post("/post/create", describeRoute({
  description: 'Makes a post',
  responses: {
    200: {
      description: 'Successful post',
      content: {
        'application/json': { schema: resolver(CreatePostResponseSchema) },
      },
    },
    400: {
      description: "Post failed to be created",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    401: {
      description: "Post unable to be created now, will try again soon",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    406: {
      description: 'Resource busy',
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    }
  },
}),
validator('json', PostSchema));

openapiRoutes.post("/post/create/repost", describeRoute({
  description: 'Makes a repost post',
  responses: {
    200: {
      description: 'Successful post',
      content: {
        'application/json': { schema: resolver(CreatePostResponseSchema) },
      },
    },
    400: {
      description: "Repost failed to be created",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    401: {
      description: "not logged in",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    }
  },
}),
validator('json', RepostSchema));

// Get all posts
openapiRoutes.get("/post/all", describeRoute({
  description: 'Gets all posts for the current account',
  responses: {
    200: {
      description: 'post list',
      content: {
        'text/html': { schema: resolver(CreatePostResponseSchema) },
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': {}
      }
    }
  }
}));

openapiRoutes.post("/post/all", describeRoute({
  description: 'Gets all posts for the current account',
  responses: {
    200: {
      description: 'post list',
      content: {
        'text/html': { schema: resolver(CreatePostResponseSchema) },
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': {}
      }
    }
  }
}));

openapiRoutes.delete("/post/all", describeRoute({
  description: 'Gets all posts for the current account',
  responses: {
    200: {
      description: 'post list',
      content: {
        'text/html': { schema: resolver(CreatePostResponseSchema) },
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': {}
      }
    }
  }
}));

// Edit posts
openapiRoutes.get("/post/edit/:id", describeRoute({
  description: 'Get the post editor for the given post',
  responses: {
    200: {
      description: 'the post editor component',
      content: {
        'text/html': {}
      }
    },
    203: {
      description: "post invalid or missing",
      content: {
        'text/html': {}
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': {}
      }
    },
    404: {
      description: "post doesn't exist for your account",
      content: {
        'text/html': {}
      }
    }
  }
}), validator('param', CheckGUIDSchema));

openapiRoutes.post("/post/edit/:id", describeRoute({
  description: "Pushes edits to the given post",
  responses: {
    200: {
      description: "Edit gotten, check return for valid response",
      content: {
        'text/html': {}
      }
    },
    403: {
      description: "Invalid data provided, or already posted",
      content: {
        'text/html': {}
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': {}
      }
    },
    404: {
      description: "post does not exist on your account",
      content: {
        'text/html': {}
      }
    },
    500: {
      description: "internal error occurred",
      content: {
        'text/html': {}
      }
    }
  }
}), validator("param", CheckGUIDSchema), validator("json", EditSchema));

openapiRoutes.get("/post/edit/:id/cancel", describeRoute({
  description: "Cancel editing a post",
  responses: {
    200: {
      description: "Cancelation processed",
      content: {
        'text/html': {}
      }
    },
    403: {
      description: "Invalid data passed",
      content: {
        'text/html': {}
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': {}
      }
    },
    500: {
      description: "internal error",
      content: {
        'text/html': {}
      }
    }
  }
}), validator("param", CheckGUIDSchema));

// delete a post
openapiRoutes.delete("/post/delete/:id", describeRoute({
  description: "Delete the given post",
  responses: {
    200: {
      description: "command processed",
      content: {
        'text/html': {}
      }
    },
    403: {
      description: "an error occurred or the post doesn't exist",
      content: {
        'text/html': {}
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': {}
      }
    }
  }
}), validator("param", CheckGUIDSchema));

openapiRoutes.get("/post/:id/repost", describeRoute({
  description: "Get the repost editor for the given post",
  responses: {
    200: {
      description: "request accepted",
      content: {
        'text/html': {}
      }
    },
    404: {
      description: "an error occurred",
      content: {
        'text/html': {}
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': {}
      }
    },
    429: {
      description: "rate limited",
      content: {
        'text/html': {}
      }
    }
  }
}), validator("param", CheckGUIDSchema));

openapiRoutes.delete("/post/:id/repost/:scheduleid", describeRoute({
  description: "Delete the given schedule for the given post",
  responses: {
    200: {
      description: "request processed",
      content: {
        'text/html': {}
      }
    },
    403: {
      description: "an error occurred",
      content: {
        'text/html': {}
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': {}
      }
    },
    429: {
      description: "rate limited",
      content: {
        'text/html': {}
      }
    }
  }
}), validator("param", CheckGUIDSchema));

// Create media upload
openapiRoutes.post("/post/upload", describeRoute({
  description: "Uploads a file to the service",
  responses: {
    200: {
      description: "Successfully uploaded",
      content: {
        'application/json': { schema: resolver(FileUploadSuccessSchema)}
      },
    },
    400: {
      description: "Failed to upload",
      content: {
        "application/json": { schema: resolver(FileUploadFailSchema)}
      }
    },
    401: {
      description: "not logged in",
      content: {
        "application/json": { schema: resolver(GenericResponseSchema)}
      }
    }
  }
}), validator("form", FileUploadSchema));

// Delete an upload
openapiRoutes.delete("/post/upload", describeRoute({
  description: "Deletes a file to the service",
  responses: {
    200: {
      description: "File deleted successfully",
      content: {
        "application/json": { schema: resolver(GenericResponseSchema)}
      }
    },
    400: {
      description: "File unable to be deleted",
      content: {
        "application/json": { schema: resolver(GenericResponseSchema)}
      }
    },
    401: {
      description: "not logged in",
      content: {
        "application/json": { schema: resolver(GenericResponseSchema)}
      }
    },
    402: {
      description: "Invalid operation performed",
      content: {
        "application/json": { schema: resolver(GenericResponseSchema)}
      }
    }
  }
}), validator("json", FileDeleteSchema));

// wrapper to login
openapiRoutes.post("/account/login", describeRoute({
  description: "Logs in the user",
  responses: {
    200: {
      description: "Login Success",
      content: {
        "application/json": { schema: resolver(GenericResponseSchema)}
      }
    },
    400: {
      description: "Invalid data",
      content: {
        "application/json": { schema: resolver(GenericResponseSchema)}
      }
    },
    403: {
      description: "Failed to login",
      content: {
        "application/json": { schema: resolver(GenericResponseSchema)}
      }
    },
    429: {
      description: "rate limited",
      content: {
        "application/json": { schema: resolver(GenericResponseSchema)}
      }
    }
  }
}), validator("json", LoginSchema));

openapiRoutes.post("/account/update", describeRoute({
  description: "Updates account settings",
  responses: {
    200: {
      description: "operation return",
      content: {
        'text/html': { },
      }
    },
    201: {
      description: "no changes made",
      content: {
        'text/html': { },
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': { },
      }
    },
    403: {
      description: "invalid data",
      content: {
        'text/html': { },
      }
    },
    409: {
      description: "failed to update, try again",
      content: {
        'text/html': { },
      }
    },
    422: {
      description: "invalid username",
      content: {
        'text/html': { },
      }
    },
    429: {
      description: "rate limited",
      content: {
        'text/html': { },
      }
    }
  }
}), validator("form", AccountUpdateSchema, undefined,
  { media: "application/x-www-form-urlencoded" }));

openapiRoutes.get("/account/data", describeRoute({
  description: "Returns the user's current dashboard data with HTMX swap bands",
  responses: {
    200: {
      description: "success",
      content: {
        'text/html': { },
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': { },
      }
    },
    403: {
      description: "invalid user data",
      content: {
        'text/plain': { },
      }
    }
  }
}));

// endpoint that returns any violations
openapiRoutes.get("/account/violations", describeRoute({
  description: "Gets the current violations for the user",
  responses: {
    200: {
      description: "success",
      content: {
        'text/html': { },
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': { },
      }
    }
  }
}));

// endpoint that returns any violations
openapiRoutes.post("/account/violations/resolve", describeRoute({
  description: "Clears any BSky account violations that the user might have",
  responses: {
    200: {
      description: "success",
      content: {
        'text/html': { },
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': { },
      }
    }
  }
}));

// proxy the logout call because of course this wouldn't work properly anyways
openapiRoutes.post("/account/logout", describeRoute({
  description: "Logs out the user via HTMX",
  responses: {
    200: {
      description: "logged out",
      content: {
        'text/plain': {}
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': { },
      }
    }
  }
}));

openapiRoutes.get("/account/logout", describeRoute({
  description: "Logs out the user (redirects)",
  responses: {
    200: {
      description: "log out",
      content: {
        'text/html': { },
      }
    },
    401: {
      description: "not logged in",
      content: {
        'text/html': { },
      }
    }
  }
}));

openapiRoutes.post("/account/signup", describeRoute({
  description: "sign up for an account",
  responses: {
    200: {
      description: "successfully signed up",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    400: {
      description: "invalid data",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    401: {
      description: "failed turnstile",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    500: {
      description: "internal error",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    }
  }
}), validator("json", SignupSchema));

openapiRoutes.post("/account/forgot", describeRoute({
  description: "attempt to get a password reset message",
  responses: {
    200: {
      description: "successfully sent message",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    400: {
      description: "invalid data",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    401: {
      description: "failed turnstile",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    500: {
      description: "internal error",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    }
  }
}), validator("json", AccountForgotSchema));

openapiRoutes.post("/account/reset", describeRoute({
  description: "attempt to reset password",
  responses: {
    200: {
      description: "successfully reset password",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    400: {
      description: "invalid data",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    401: {
      description: "incorrect user/pw",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    429: {
      description: "rate limited",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    500: {
      description: "internal error",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    }
  }
}), validator("json", AccountResetSchema));

openapiRoutes.post("/account/delete", describeRoute({
  description: "attempt to delete the current account",
  responses: {
    200: {
      description: "account deleted",
      content: {
        'text/html': { },
      }
    },
    401: {
      description: "incorrect user/pw",
      content: {
        'text/html': { },
      }
    },
    403: {
      description: "invalid data",
      content: {
        'text/html': { },
      }
    },
    500: {
      description: "internal error",
      content: {
        'text/html': { },
      }
    }
  }
}), validator("form", AccountDeleteSchema, undefined, { media: "application/x-www-form-urlencoded" }));

openapiRoutes.get("/preview/file/:id", describeRoute({
  description: "preview a file",
  responses: {
    200: {
      description: "displays file"
    },
    301: {
      description: "file not found"
    },
    303: {
      description: "auth cannot be verified"
    },
    307: {
      description: "preview cannot be displayed due to site settings"
    },
    401: {
      description: "not logged in"
    }
  }
}), validator("param", CheckFileSchema));

openapiRoutes.get("/reset-password/:id", describeRoute({
  description: "Hands off reset token validation, cannot fail directly",
  responses: {
    302: {
      description: "handed off"
    }
  }
}), validator("param", ResetTokenValid));

openapiRoutes.get("/api/auth/reset-password/:id", describeRoute({
  description: "Validates password reset tokens"
}), validator("param", ResetTokenValid), validator("query", ResetCallbackQuery));

export async function generateOpenAPI() {
  return await generateSpecs(openapiRoutes, {
    documentation: {
      info: {
        title: `${APP_NAME} API Routes`,
        version: CURRENT_OPENAPI_VERSION,
        description: `The API Routes for ${APP_NAME} that can be used for providing API access
          or for the API Shield feature of Cloudflare`,
        termsOfService: `${SITE_URL}/tos`,
        license: {
          name: "MIT",
        }
      },
      openapi: "3.0",
      servers: [
        { url: SITE_URL, description: 'Production Server'}
      ],
    },
  });
};