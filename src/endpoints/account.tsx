import { Context, Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import isEmpty from "just-is-empty";
import { ContextVariables } from "../auth";
import { ViolationNoticeBar } from "../layout/violationsBar";
import { authMiddleware } from "../middleware/auth";
import { corsHelperMiddleware } from "../middleware/corsHelper";
import { verifyTurnstile } from "../middleware/turnstile";
import { Bindings, LooseObj } from "../types";
import { lookupBskyHandle, lookupBskyPDS } from "../utils/bskyApi";
import { checkIfCanDMUser } from "../utils/bskyMsg";
import { getAllMediaOfUser } from "../utils/db/file";
import { doesUserExist, getUserEmailForHandle, getUsernameForUser } from "../utils/db/userinfo";
import { userHasBan } from "../utils/db/violations";
import { updateUserData } from "../utils/dbQuery";
import { consumeInviteKey, doesInviteKeyHaveValues } from "../utils/inviteKeys";
import { deleteFromR2 } from "../utils/r2Query";
import { AccountDeleteSchema, AccountForgotSchema } from "../validation/accountForgotDeleteSchema";
import { AccountResetSchema } from "../validation/accountResetSchema";
import { AccountUpdateSchema } from "../validation/accountUpdateSchema";
import { LoginSchema } from "../validation/loginSchema";
import { SignupSchema } from "../validation/signupSchema";

export const account = new Hono<{ Bindings: Bindings, Variables: ContextVariables }>();

account.use(secureHeaders());
account.use(corsHelperMiddleware);

const serverParseValidationErr = (c: Context, errorJson: string) => {
  try {
    const errorMsgs = JSON.parse(errorJson);
    return c.html(<div class="validation-error btn-error">
      <b>Failed Validation</b>:
        <ul>
          {errorMsgs.map((el: { message: string; }) => {
            return <li>{el.message}</li>;
          })}
        </ul>
      </div>, 400);
  } catch {
    return c.html(<div class="validation-error btn-error"><b>Internal Error</b>: Please try again</div>, 400);
  }
}

// wrapper to login
account.post("/login", async (c) => {
  const body = await c.req.json();
  const auth = c.get("auth");
  const validation = LoginSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ ok: false, msg: validation.error.toString() }, 400);
  }
  const { username, password } = validation.data;
  try {
    // @ts-ignore: Property does not exist (the username field, which does via an extension)
    const { headers, response } = await auth.api.signInUsername({
      body: {
        username: username,
        password: password,
      },
      returnHeaders: true
    });
    if (response) {
      c.res.headers.set("set-cookie", headers.get("set-cookie")!);
      return c.json({ok: true, msg: "logged in!"});
    }
    return c.json({ok: false, msg: "could not login user"}, 401);
  } catch (err: any) {
    return c.json({ok: false, msg: err.message || err.msg || "Unknown Error"}, 404);
  }
});

account.post("/update", authMiddleware, async (c) => {
  const body = await c.req.parseBody();
  const validation = AccountUpdateSchema.safeParse(body);
  if (!validation.success) {
    return serverParseValidationErr(c, validation.error.message);
  }

  const auth = c.get("auth");
  const { username, password, bskyAppPassword, bskyUserPDS } = validation.data;
  let newObject: LooseObj = {};
  if (!isEmpty(username) && username !== c.env.RESET_BOT_USERNAME)
    newObject.username = username!;

  if (!isEmpty(bskyAppPassword))
    newObject.bskyAppPass = bskyAppPassword;

  if (!isEmpty(bskyUserPDS))
    newObject.pds = bskyUserPDS;

  if (!isEmpty(password)) {
    // attempt to rehash the password (ugh slow.)
    const authCtx = await auth.$context;
    newObject.password = await authCtx.password.hash(password!);
  }

  // Check to see if we made any changes at all
  if (isEmpty(newObject)) {
    return c.html(<b class="btn-error">No Changes Made</b>, 201);
  }

  const userUpdated = await updateUserData(c, newObject);
  if (userUpdated) {
    c.header("HX-Trigger", "accountUpdated");
    c.header("HX-Trigger-After-Swap", "accountViolations");
    return c.html(<></>, 200);
  }
  return c.html(<b class="btn-error">Unknown error occurred</b>, 400);
});

// endpoint that just returns current username
account.get("/username", authMiddleware, async (c) => {
  const username = await getUsernameForUser(c);
  return c.text(username || "", 200, {
    "Cache-Control": "max-age=600, must-revalidate, private"
  });
});

// endpoint that returns any violations
account.get("/violations", authMiddleware, async (c) => {
  return c.html(<ViolationNoticeBar ctx={c} />);
})

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

account.post("/signup", verifyTurnstile, async (c: Context) => {
  const body = await c.req.json();
  const validation = SignupSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ ok: false, msg: validation.error.toString() }, 400);
  }

  const { signupToken, username, password, bskyAppPassword } = validation.data;
  if (await doesUserExist(c, username)) {
    return c.json({ok: false, msg: "user already exists"}, 401);
  }

  // Prevent sign ups with these accounts, they are setup using a different method.
  if (username === c.env.RESET_BOT_USERNAME || username === c.env.DEFAULT_ADMIN_USER) {
    return c.json({ok: false, msg: "forbidden account"});
  }

  // Check to see if we're using invite keys, and if so, check em.
  if (await doesInviteKeyHaveValues(c, signupToken) === false) {
    return c.json({ok: false, msg: "invalid signup token value"}, 400);
  }

  // Check bsky handle existing
  const profileDID: string|null = await lookupBskyHandle(username);
  if (profileDID === null) {
    return c.json({ok: false, msg: "bsky handle returned invalid, please check input"}, 400);
  }

  // Check if the user has violated TOS.
  if (await userHasBan(c, profileDID)) {
    return c.json({ok: false, msg: "your account has been forbidden from using this service"}, 400);
  }

  // Grab the user's pds as well
  const userPDS: string = await lookupBskyPDS(profileDID);

  // grab our auth object
  const auth = c.get("auth");
  if (!auth) {
    return c.json({ok: false, msg: "invalid operation occurred, please retry again"}, 501);
  }

  console.log(`attempting to create an account for ${username} with pds ${userPDS}`);
  // create the user
  const createUser = await auth.api.signUpEmail({
    body: {
      name: username,
      email: `${username}@skyscheduler.tld`,
      username: username,
      password: password,
      bskyAppPass: bskyAppPassword,
      pds: userPDS
    }
  });

  // check success of user creation
  if (createUser.token !== null) {
    // Burn the invite key
    c.executionCtx.waitUntil(consumeInviteKey(c, signupToken));

    console.log(`user ${username} created! with code ${signupToken||'none'}`);
    return c.json({ok: true, msg: "signup success"});
  }
  console.error(`could not sign up user ${username}, no token was returned`);
  return c.json({ok: false, msg: "unknown error occurred"}, 501);
});

account.post("/forgot", verifyTurnstile, async (c: Context) => {
  const body = await c.req.json();

  const validation = AccountForgotSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ ok: false, msg: validation.error.toString() }, 400);
  }

  const { username } = validation.data;
  if (await doesUserExist(c, username) === false) {
    return c.json({ok: false, msg: "user doesn't exist"}, 401);
  }

  const userEmail = await getUserEmailForHandle(c, username);
  if (isEmpty(userEmail)) {
    return c.json({ok: false, msg: "user data is missing"}, 401);
  }

  const auth = c.get("auth");
  if (!auth) {
    return c.json({ok: false, msg: "invalid operation occurred, please retry again"}, 501);
  }

  // Look up handle
  const bskyUserId = await lookupBskyHandle(username);
  if (bskyUserId === null) {
    return c.json({ok: false, msg: "invalid user id"}, 401);
  }

  // There has to be a better method for this tbh.
  const canMessageUser = await checkIfCanDMUser(c.env, bskyUserId);
  if (canMessageUser === false) {
    return c.json({ok: false, msg:
      `Could not send a direct message to your bsky account.\nPlease check to see if you are following @${c.env.RESET_BOT_USERNAME} and your DM permissions`}, 401);
  }

  const { data, error } = await auth.api.requestPasswordReset({
    body: {
      email: userEmail,
      redirectTo: "/reset",
    }
  });
  if (error) {
    console.error(`Password reset encountered an error: ${error}`);
    return c.json({ok: false, msg: "encountered reset error, try again later"}, 401);
  }
  return c.json({ok: true, msg: "request processed"});
});

account.post("/reset", async (c: Context) => {
  const body = await c.req.json();

  const validation = AccountResetSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ ok: false, msg: validation.error.toString() }, 400);
  }
  const { resetToken, password } = validation.data;
  const auth = c.get("auth");
  if (!auth) {
    return c.json({ok: false, msg: "invalid operation occurred, please retry again"}, 501);
  }

  const { data, error } = await auth.api.resetPassword({body: {
    newPassword: password,
    token: resetToken,
  }});
  if (error) {
    return c.json({ok: false, msg: "invalid token/password"}, 401);
  }
  return c.json({ ok: true, msg: "successfully updated password" });
});

account.post("/delete", authMiddleware, async (c) => {
  const body = await c.req.parseBody();
  const validation = AccountDeleteSchema.safeParse(body);

  if (!validation.success) {
    return serverParseValidationErr(c, validation.error.message);
  }

  const { password } = validation.data;
  const auth = c.get("auth");
  const userId = c.get("userId");
  const authCtx = await auth.$context;
  try {
    // I don't know why this is so broken in better auth, but
    // something is wrong with their session middleware for the deleteUser
    // that it only throws exceptions with just a password.
    const accountHandler = await authCtx.internalAdapter.findAccounts(userId);
    const usrAccount = accountHandler.find(
      (account) => account.providerId === "credential" && account.password,
    );

    // Make sure we still have data
    if (!usrAccount || !usrAccount.password) {
      return c.html(<b class="btn-error">Failed: User Data Missing...</b>, 400);
    }

    // Do a hash verification on the user's input to see if the passwords match
    const verify = await authCtx.password.verify({
      hash: usrAccount.password,
      password: password
    });
    if (verify) {
      c.executionCtx.waitUntil(getAllMediaOfUser(c, userId)
        .then((media) => deleteFromR2(c, media))
        .then(() => authCtx.internalAdapter.deleteSessions(userId))
        .then(() => authCtx.internalAdapter.deleteUser(userId)));

      c.header("HX-Redirect", "/?deleted");
      return c.html(<></>);
    } else {
      return c.html(<b class="btn-error">Failed: Invalid Password</b>, 400);
    }
  } catch (err: any) {
    console.error(`failed to delete user ${userId} had error ${err.message || err.msg || 'no code'}`);
    return c.html(<b class="btn-error">Failed: Server Error</b>, 501);
  }
});