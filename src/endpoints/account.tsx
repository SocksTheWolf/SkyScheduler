import { Context, Hono } from "hono";
import { Bindings, LooseObj } from "../types";
import { doesUserExist, updateUserData } from "../utils/dbQuery";
import { SignupSchema } from "../validation/signupSchema";
import { LoginSchema } from "../validation/loginSchema";
import { AccountUpdateSchema } from "../validation/accountUpdateSchema";
import { doesInviteKeyHaveValues, useInviteKey } from "../utils/inviteKeys";
import isEmpty from "just-is-empty";
import { authMiddleware } from "../middleware/auth";
import { ContextVariables } from "../auth";
import { secureHeaders } from "hono/secure-headers";
import { corsHelperMiddleware } from "../middleware/corsHelper";
import { AccountDeleteSchema } from "../validation/accountDeleteSchema";

export const account = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

account.use(secureHeaders());
account.use(corsHelperMiddleware);

// wrapper to login
account.post("/login", async (c) => {
  const body = await c.req.json();
  const auth = c.get("auth");
  const validation = LoginSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ ok: false, message: validation.error.toString() }, 400);
  }
  const { username, password } = validation.data;
  try {
    const { headers, response } = await auth.api.signInUsername({
      body: {
        username: username,
        password: password,
      },
      returnHeaders: true
    });
    if (response) {
      c.res.headers.set("set-cookie", headers.get("set-cookie")!);
      return c.json({ok: true, message:"logged in"});
    }
    return c.json({ok: false, message: "could not login user"}, 401);
  } catch (err) {
    return c.json({ok: false, message: err.message || err.msg || "Unknown Error"}, 404);
  }
});

account.post("/update", authMiddleware, async (c) => {
  const body = await c.req.parseBody();
  const auth = c.get("auth");
  const validation = AccountUpdateSchema.safeParse(body);
  if (!validation.success) {
    console.log(validation.error);
    return c.html(<b class="btn-error">Failed Validation</b>);
  }

  const { username, password, bskyAppPassword } = validation.data;
  let newObject:LooseObj = {};
  if (!isEmpty(username))
    newObject.username = username!;

  if (!isEmpty(bskyAppPassword))
    newObject.bskyAppPass = bskyAppPassword;

  if (!isEmpty(password)) {
    // attempt to rehash the password (ugh slow.)
    const authCtx = await auth.$context;
    newObject.password = await authCtx.password.hash(password!);
  }

  // Check to see if we made any changes at all
  if (isEmpty(newObject)) {
    return c.html(<b class="btn-error">No Changes Made</b>);
  }

  const userUpdated = await updateUserData(c, newObject);
  if (userUpdated) {
    c.header("HX-Trigger", "accountUpdated");
    return c.html(<></>);
  }
  return c.html(<b class="btn-error">Unknown error occurred</b>);
});

// endpoint that just returns current username
account.get("/username", authMiddleware, async (c) => {
  const userData:any = c.get("user" as any);
  if (userData !== null) {
    return c.text(userData.username);
  }
  return c.text("");
});

// proxy the logout call because of course this wouldn't work properly anyways
account.post("/logout", authMiddleware, async (c) => {
  try {
    const auth = c.get("auth");
    await auth.api.signOut(c.req.raw as any);
  } catch(err) {
    console.error(`Unable to handle logout properly, redirecting anyways. ${err}`);
  }

  // Redirect to home
  c.header("HX-Redirect", "/");
  return c.html("Success");
});

account.post("/signup", async (c: Context) => {
  const body = await c.req.json();

  // Turnstile handling.
  if (c.env.USE_TURNSTILE_CAPTCHA) {
    const userIP: string|undefined = c.req.header("CF-Connecting-IP");
    const token = body["cf-turnstile-response"];

    let formData = new FormData();
    formData.append("secret", c.env.TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    if (userIP)
      formData.append("remoteip", userIP);

    const turnstileFetch = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData
    });

    // Check if we could contact siteverify
    if (!turnstileFetch.ok) {
      return c.json({ok: false, message: "timed out verifying captcha"}, 400);
    }

    // Check if the output was okay
    const turnstileOutcome:any = await turnstileFetch.json();
    if (!turnstileOutcome.success) {
      return c.json({ok: false, message: "incorrect captcha solve"}, 401);
    }
  }
  
  const validation = SignupSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ ok: false, message: validation.error.toString() }, 400);
  }

  const { signupToken, username, password, bskyAppPassword } = validation.data;
  if (await doesUserExist(c, username)) {
    return c.json({ok: false, message: "user already exists"}, 401);
  }

  // Check to see if we're using invite keys, and if so, check em.
  if (await doesInviteKeyHaveValues(c, signupToken) === false) {
    return c.json({ok: false, message: "invalid signup token value"}, 400);
  }

  // create the user
  const createUser = await c.get("auth").api.signUpEmail({
    body: {
      name: username,
      email: `${username}@skyscheduler.tld`,
      username: username,
      password: password,
      bskyAppPass: bskyAppPassword
    }
  });

  if (createUser.token !== null) {
    // Burn the invite key
    await useInviteKey(c, signupToken);

    console.log(`user ${username} created!`);
    return c.json({ok: true, message: "signup success"});
  }
  return c.json({ok: false, message: "unknown error occurred"}, 501);
});

account.delete("/delete", authMiddleware, async (c) => {
  const body = await c.req.parseBody();
  const auth = c.get("auth");
  const validation = AccountDeleteSchema.safeParse(body);
  
  if (!validation.success) {
    return c.html(<b class="btn-error">Failed: <code>{validation.error.toString()}</code></b>);
  }

  const { password } = validation.data;
  // Media is deleted via better auth's "beforeDelete" callback
  const deleted = await auth.api.deleteUser({
    body: {
      password: password
    },
  });

  if (deleted.success) {
    c.header("HX-Trigger", "accountDeleted");
    return c.redirect("/");
  } else {
    return c.html(<b class="btn-error">Failed: <code>{deleted.message}</code></b>);
  }
});