// Mediocre file to help with automatically generating endpoint bindings so that we can dump them to the
// Cloudflare WAF to protect/log against abuse
import { Context, Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { ContextVariables } from "../auth";
import { Bindings } from "../types";
import { AccountDeleteSchema, AccountForgotSchema } from "../validation/accountForgotDeleteSchema";
import {
  AccountResetSchema, PasswordResetCheckCallbackParam,
  PasswordResetTokenParam
} from "../validation/accountResetSchema";
import { AccountUpdateSchema } from "../validation/accountUpdateSchema";
import { LoginSchema } from "../validation/loginSchema";
import { FileDeleteSchema } from "../validation/mediaSchema";
import { EditSchema, PostSchema } from "../validation/postSchema";
import { RepostSchema } from "../validation/repostSchema";
import {
  CheckFileSchema, CheckGUIDSchema, CreateResponseSchema,
  FileOperationResponseSchema, GenericResponseSchema
} from "../validation/responseSchema";
import { SignupSchema } from "../validation/signupSchema";

export const openapiRoutes = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

openapiRoutes.post("/post/create", describeRoute({
  description: 'Makes a post',
  responses: {
    200: {
      description: 'Successful post',
      content: {
        'application/json': { schema: resolver(CreateResponseSchema) },
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
validator('json', PostSchema), async (c: Context) => {});

openapiRoutes.post("/post/create/repost", describeRoute({
  description: 'Makes a repost post',
  responses: {
    200: {
      description: 'Successful post',
      content: {
        'application/json': { schema: resolver(CreateResponseSchema) },
      },
    },
    400: {
      description: "Repost failed to be created",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    401: {
      description: "not logged in"
    }
  },
}),
validator('json', RepostSchema), async (c: Context) => {});

// Get all posts
openapiRoutes.all("/post/all", describeRoute({
  description: 'Gets all posts for the current account',
  responses: {
    200: {
      description: 'post list',
      content: {
        'text/html': { schema: resolver(CreateResponseSchema) },
      }
    },
    401: {
      description: "not logged in"
    }
  }
}), async (c: Context) => { });

// Edit posts
openapiRoutes.get("/post/edit/:id", describeRoute({
  description: 'Gets all posts for the current account',
  responses: {
    200: {
      description: 'post list',
    },
    400: {
      description: "empty body"
    },
    401: {
      description: "not logged in"
    }
  }
}), validator('param', CheckGUIDSchema), async (c: Context) => {});

openapiRoutes.post("/post/edit/:id", describeRoute({
  description: "Edits the given post",
  responses: {
    200: {
      description: "Edit successfully made",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    },
    400: {
      description: "Invalid data passed"
    },
    401: {
      description: "not logged in"
    }
  }
}), validator("param", CheckGUIDSchema), validator("json", EditSchema), async (c: Context) => {
});

openapiRoutes.get("/post/edit/:id/cancel", describeRoute({
  description: "Cancel editing a post",
  responses: {
    200: {
      description: "Cancelation processed successfully"
    },
    400: {
      description: "Invalid data passed"
    },
    401: {
      description: "not logged in"
    }
  }
}), validator("param", CheckGUIDSchema), async (c: Context) => {
});

// delete a post
openapiRoutes.delete("/post/delete/:id", describeRoute({
  description: "Delete the given post",
  responses: {
    200: {
      description: "command processed"
    },
    400: {
      description: "an error occurred"
    },
    401: {
      description: "not logged in"
    }
  }
}), validator("param", CheckGUIDSchema), async (c: Context) => {
});

// Create media upload
openapiRoutes.post("/post/upload", describeRoute({
  description: "Uploads a file to the service",
  responses: {
    200: {
      description: "Successfully uploaded",
      content: {
        'application/json': { schema: resolver(FileOperationResponseSchema) },
      },
    },
    400: {
      description: "Failed to upload",
      content: {
        "application/json": { schema: resolver(FileOperationResponseSchema)}
      }
    },
    401: {
      description: "not logged in"
    }
  }
}), async (c: Context) => {

});

// Delete an upload
openapiRoutes.delete("/post/upload", describeRoute({
  description: "Deletes a file to the service",
  responses: {
    200: {
      description: "File deleted successfully",
      content: {
        "application/json": { schema: resolver(FileOperationResponseSchema)}
      }
    },
    401: {
      description: "not logged in"
    },
    402: {
      description: "Invalid operation performed",
      content: {
        "application/json": { schema: resolver(FileOperationResponseSchema)}
      }
    }
  }
}), validator("json", FileDeleteSchema), async (c: Context) => {
});

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
    401: {
      description: "Failed to login",
      content: {
        "application/json": { schema: resolver(GenericResponseSchema)}
      }
    },
    404: {
      description: "Unknown error",
      content: {
        "application/json": { schema: resolver(GenericResponseSchema)}
      }
    },
  }
}), validator("json", LoginSchema), async (c) => {
});

openapiRoutes.post("/account/update", describeRoute({
  description: "Updates account settings",
  responses: {
    200: {
      description: "Success"
    },
    201: {
      description: "no changes"
    },
    400: {
      description: "failed"
    },
    401: {
      description: "not logged in"
    }
  }
}), validator("form", AccountUpdateSchema, undefined, { media: "application/x-www-form-urlencoded" }), async (c) => {
});

// endpoint that just returns current username
openapiRoutes.get("/account/username", describeRoute({
  description: "Gets the current username for the user",
  responses: {
    200: {
      description: "success"
    },
    401: {
      description: "not logged in"
    }
  }
}), async (c) => {
});

// endpoint that returns any violations
openapiRoutes.get("/account/violations", describeRoute({
  description: "Gets the current violations for the user",
  responses: {
    200: {
      description: "success"
    },
    401: {
      description: "not logged in"
    }
  }
}), async (c) => {
})

// proxy the logout call because of course this wouldn't work properly anyways
openapiRoutes.post("/account/logout", describeRoute({
  description: "Logs out the user",
  responses: {
    200: {
      description: "logged out"
    },
    401: {
      description: "not logged in"
    }
  }
}), async (c) => {
});

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
}), validator("json", SignupSchema), async (c: Context) => {
});

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
}), validator("json", AccountForgotSchema), async (c: Context) => {
});

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
    500: {
      description: "internal error",
      content: {
        'application/json': { schema: resolver(GenericResponseSchema) },
      }
    }
  }
}), validator("json", AccountResetSchema), async (c: Context) => {

});

openapiRoutes.post("/account/delete", describeRoute({
  description: "attempt to delete the current account",
  responses: {
    200: {
      description: "account deleted",
    },
    400: {
      description: "invalid data",
    },
    401: {
      description: "incorrect user/pw",
    },
    501: {
      description: "internal error",
    }
  }
}), validator("form", AccountDeleteSchema, undefined, { media: "application/x-www-form-urlencoded" }), async (c) => {
});

openapiRoutes.get("/preview/file/:id", describeRoute({
  description: "preview a file",
  responses: {
    200: {
      description: "displays file"
    },
    401: {
      description: "not logged in"
    }
  }
}), validator("param", CheckFileSchema));

openapiRoutes.get("/api/auth/reset-password/:id", describeRoute({
  description: "resets a password",
  responses: {
    200: {
      description: "valid token, redirect to reset"
    },
    404: {
      description: "reset token is invalid"
    }
  }
}), validator("param", PasswordResetTokenParam), validator("query", PasswordResetCheckCallbackParam));