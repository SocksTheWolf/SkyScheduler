import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import isEmpty from "just-is-empty";
import { SERVICE_ACCOUNT } from "../appInfo";
import { ScheduledContext } from "../classes/context";
import { DEFAULT_PDS } from "../config";
import { AccountStatus } from "../enums";
import PDSInputField from "../layout/fields/pdsInputField";
import { ViolationNoticeBar } from "../layout/violationsBar";
import { authMiddlewareHTML, pullAuthData } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { verifyTurnstile } from "../middleware/turnstile";
import type { AccountUpdatePayload, BaseContext, HonoBase, LooseObj } from "../types";
import { checkIfCanDMUser } from "../utils/bsky/bskyMessage";
import { followBotAccount, getUserDID, getUserPDS } from "../utils/bsky/bskyUser";
import { getAllMediaOfUser } from "../utils/db/file";
import { doesUserExist, getBskyUserDataForHandle, getUsernameForUser } from "../utils/db/userinfo";
import { removeViolations, userHasBan, userHasViolations } from "../utils/db/violations";
import { updateUserData } from "../utils/dbQuery";
import { isInDev, logoutAccount } from "../utils/helpers";
import { consumeInviteKey, doesInviteKeyHaveValues } from "../utils/inviteKeys";
import { deleteFromR2 } from "../utils/r2Query";
import { AccountDeleteSchema, AccountForgotSchema } from "../validation/accountForgotDeleteSchema";
import { AccountResetSchema } from "../validation/accountResetSchema";
import { AccountUpdateSchema } from "../validation/accountUpdateSchema";
import { LoginSchema } from "../validation/loginSchema";
import { SignupSchema } from "../validation/signupSchema";

export const account = new Hono<HonoBase>();
interface ServerValidationError {
  message: string;
}
const serverParseValidationErr = (c: Context, errorJson: string, errCode: ContentfulStatusCode=200) => {
  try {
    const errorMsgs: ServerValidationError[] = JSON.parse(errorJson);
    return c.html(<div class="validation-error btn-error">
      <b>Failed Validation</b>:
        <ul>
          {errorMsgs.map((el: { message: string; }) => {
            return <li>{el.message}</li>;
          })}
        </ul>
      </div>, errCode);
  } catch {
    return c.html(<div class="validation-error btn-error"><b>Internal Error</b>: Please try again</div>, errCode);
  }
}

// wrapper to login
account.post("/login", rateLimit({limiter: "ACCOUNT_LIMITER"}), async (c) => {
  const body = await c.req.json();
  const auth = c.get("auth");
  const validation = LoginSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ ok: false, msg: validation.error.toString() }, 400);
  }
  const { username, password } = validation.data;
  try {
    // @ts-ignore: Property does not exist (the username field, which does via an extension)
    const { headers } = await auth.api.signInUsername({
      body: {
        username: username,
        password: password,
      },
      returnHeaders: true
    });
    c.res.headers.set("set-cookie", headers.get("set-cookie")!);
    return c.json({ok: true, msg: "logged in!"});
  } catch (err: unknown) {
    // @ts-ignore
    return c.json({ok: false, msg: (err.message ?? err.msg ?? "Unknown Error")}, 403);
  }
});

account.post("/update", authMiddlewareHTML, rateLimit({limiter: "ACCOUNT_UPDATE_LIMITER", html: true}), async (c: BaseContext) => {
  const body = await c.req.parseBody();
  const validation = AccountUpdateSchema.safeParse(body);
  if (!validation.success) {
    return serverParseValidationErr(c, validation.error.message, 403);
  }

  const auth = c.get("auth");
  const { username, password, bskyAppPassword, bskyUserPDS } = validation.data;
  const newObject: AccountUpdatePayload = {};
  const hasNewName = !isEmpty(username);
  let usernameToUse: string|null;
  // validate and query username information
  if (hasNewName) {
    if ((username === SERVICE_ACCOUNT || username === c.env.DEFAULT_ADMIN_USER) &&
      !c.get("isAdmin")) {
        return c.html(<b class="btn-error">Invalid username provided</b>, 422);
    } else {
      // new username information is valid
      usernameToUse = newObject.username = username!;
    }
  } else {
    // pull up the existing username information
    usernameToUse = await getUsernameForUser(c);
  }

  // we have to write user data a little differently
  const hasNewPDS = !isEmpty(bskyUserPDS), newAppPass = !isEmpty(bskyAppPassword);
  if (hasNewPDS || newAppPass || hasNewName) {
    const updateUsrObj: LooseObj = {
      pds: (hasNewPDS) ? bskyUserPDS : undefined,
      bskyAppPass: (newAppPass) ? bskyAppPassword : undefined,
      did: (hasNewPDS || hasNewName) ? await getUserDID(usernameToUse) : undefined
    };

    // delete any undefined value fields here
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Object.keys(updateUsrObj).forEach((key) => updateUsrObj[key] === undefined && delete updateUsrObj[key]);

    try {
      const {status} = await auth.api.updateUser({
        body: updateUsrObj,
        headers: c.req.raw.headers
      });
      if (!status) {
        return await c.html(<b class="btn-error">Failed to update user data, try again</b>, 409);
      }
      newObject.updatedSession = true;
    } catch (err: unknown) {
      console.warn("failed to update session pds: " + String(err));
      // this is technically not true, but w/e
      return c.html(<b class="btn-error">Your session has expired, please relogin to try again</b>, 401);
    }
  }

  // check if we updated our password
  const updatedPassword = !isEmpty(password);
  if (updatedPassword) {
    // attempt to rehash the password (ugh slow.)
    const authCtx = await auth.$context;
    // this is a dumb workaround because all other password update methods
    // get really upset (bc of emails [we don't use]), which seems to be a bug in better auth
    newObject.password = await authCtx.password.hash(password!);
  }

  // Check to see if we made any changes at all
  if (isEmpty(newObject)) {
    return c.html(<b class="btn-error">No Changes Made</b>, 201);
  }

  // push changes to db
  const userUpdated = await updateUserData(c, newObject);
  if (userUpdated) {
    // revoke other sessions that may be active
    if (updatedPassword) {
      await auth.api.revokeOtherSessions({headers: c.req.raw.headers});
    }
    c.header("HX-Trigger", "accountUpdated");
    c.header("HX-Trigger-After-Swap", "accountViolations");
    return c.html(<></>, 200);
  }
  return c.html(<b class="btn-error">Unknown error occurred</b>, 409);
});

account.get("/data", authMiddlewareHTML, async (c) => {
  const username: string|null = await getUsernameForUser(c);
  const pds = c.get("pds") || DEFAULT_PDS;
  if (username === null) {
    return c.text("", 403);
  }
  return c.html(<>{username || ""}
    <PDSInputField swap={true} pds={pds} />
    <code id="settingsPDS" hx-swap-oob="outerHTML">{pds}</code>
  </>, 200);
});

// endpoint that returns any violations
account.get("/violations", authMiddlewareHTML, async (c) => {
  c.header("HX-Trigger-After-Swap", "violationOpenSettings");
  return c.html(<ViolationNoticeBar ctx={c} />);
});

// endpoint that allows the user to resolve conflicts.
// We'll validate they are actually fixed bsky action is performed
account.post("/violations/resolve", authMiddlewareHTML, async (c: BaseContext) => {
  const userId = c.get("userId");
  if (userId !== null) {
    const context = new ScheduledContext(c.env, c.executionCtx);
    if (await userHasViolations(context, userId)) {
      // they do, so clear them out
      await removeViolations(context, userId, [AccountStatus.TakenDown,
        AccountStatus.Suspended, AccountStatus.Deactivated]);
    }
  }
  c.header("HX-Trigger-After-Swap", "accountViolations");
  return c.html(<></>);
});

// HTMX version
// proxy the logout call because of course this wouldn't work properly anyways
account.post("/logout", authMiddlewareHTML, async (c) => {
  // force logout account
  await logoutAccount(c);
  c.header("Clear-Site-Data", "cookies");
  // uses htmx to redirect
  c.header("HX-Redirect", "/?logout");
  return c.text("");
});

// direct path version
account.get("/logout", pullAuthData, async (c) => {
  // force logout account
  await logoutAccount(c);
  c.header("Clear-Site-Data", "cookies");
  return c.redirect("/?logout");
});

account.post("/signup", verifyTurnstile, rateLimit({limiter: "ACCOUNT_LIMITER"}), async (c) => {
  const body = await c.req.json();
  const validation = SignupSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ ok: false, msg: validation.error.toString() }, 400);
  }

  const { signupToken, username, password, bskyAppPassword, autoFollow } = validation.data;
  if (await doesUserExist(c, username)) {
    return c.json({ok: false, msg: "user already exists"}, 401);
  }

  // Prevent sign ups with these accounts, they are setup using a different method.
  if (username === SERVICE_ACCOUNT || username === c.env.DEFAULT_ADMIN_USER) {
    if (!isInDev(c.env))
      return c.json({ok: false, msg: "forbidden account"}, 401);
    else
      console.error("ERROR: An admin account should not be set up this way, please use the /setup route");
  }

  // Check to see if we're using invite keys, and if so, check em.
  if (!(await doesInviteKeyHaveValues(c, signupToken))) {
    return c.json({ok: false, msg: "invalid signup token value"}, 400);
  }

  // Check bsky handle existing
  const profileDID: string|null = await getUserDID(username);
  if (profileDID === null) {
    return c.json({ok: false, msg: "bsky handle could not be resolved, please check input"}, 400);
  }

  // Check if the user has violated TOS.
  if (await userHasBan(c, profileDID)) {
    return c.json({ok: false, msg: "your account has been forbidden from using this service"}, 400);
  }

  // Grab the user's pds as well
  const userPDS: string = await getUserPDS(profileDID);

  // grab our auth object
  const auth = c.get("auth");
  console.log(`attempting to create an account for ${username}(${profileDID}) with pds ${userPDS}`);
  // create the user
  try {
    const createUser = await auth.api.signUpEmail({
      body: {
        name: username,
        email: `${username}@skyscheduler.tld`,
        // @ts-ignore: username lookup
        username: username,
        password: password,
        bskyAppPass: bskyAppPassword,
        pds: userPDS,
        did: profileDID
      }
    });

    // check success of user creation
    if (createUser.token !== null) {
      // Burn the invite key
      c.executionCtx.waitUntil(consumeInviteKey(c, signupToken));
      // If the user asked to auto follow the bot account, then do so.
      if (autoFollow)
        c.executionCtx.waitUntil(followBotAccount(userPDS, profileDID, bskyAppPassword));

      console.log(`user ${username} created! with code ${signupToken ?? 'none'}`);
      return c.json({ok: true, msg: "signup success"});
    }
    // in case we actually made it to here, without getting an exception thrown, we should make note
    // of this case
    console.error(`could not sign up user ${username}, no token was returned`);
  } catch(err: unknown) {
    console.error("unable to create user, got error " + String(err));
  }

  return c.json({ok: false, msg: "unknown error occurred, please try again"}, 500);
});

account.post("/forgot", verifyTurnstile, async (c) => {
  const body = await c.req.json();

  const validation = AccountForgotSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ ok: false, msg: validation.error.toString() }, 400);
  }

  const { username } = validation.data;
  if (!(await doesUserExist(c, username))) {
    return c.json({ok: false, msg: "user doesn't exist"}, 401);
  }

  const userData = await getBskyUserDataForHandle(c, username);
  if (userData === null) {
    return c.json({ok: false, msg: "user data is missing"}, 401);
  }

  if (userData.did === null) {
    return c.json({ok: false, msg: "user did is missing"}, 401);
  }

  // There has to be a better method for this tbh.
  const canMessageUser = await checkIfCanDMUser(c.env, userData.did);
  if (!canMessageUser) {
    return c.json({ok: false, msg:
      `Could not send a direct message to your bsky account.\nPlease check to see if you are following @${SERVICE_ACCOUNT} and your DM permissions`}, 401);
  }

  const auth = c.get("auth");
  const { status, message } = await auth.api.requestPasswordReset({
    body: {
      email: userData.email!,
      redirectTo: "/reset",
    }
  });
  if (!status) {
    console.error(`Password reset encountered an error: ${message}`);
    return c.json({ok: false, msg: "encountered reset error, try again later"}, 401);
  }
  return c.json({ok: true, msg: "request processed"});
});

account.post("/reset", rateLimit({limiter: "ACCOUNT_LIMITER"}), async (c: BaseContext) => {
  const body = await c.req.json();

  const validation = AccountResetSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ ok: false, msg: validation.error.toString() }, 400);
  }
  const { resetToken, password } = validation.data;
  const auth = c.get("auth");
  try {
    const { status } = await auth.api.resetPassword({body: {
      newPassword: password,
      token: resetToken,
    }});
    if (status) {
      return c.json({ ok: true, msg: "successfully reset password" });
    }
  } catch (err: unknown) {
    // we know this failed.
    console.warn("failed to reset password with error: " + String(err));
  }

  return c.json({ok: false, msg: "invalid token/password"}, 401);
});

account.post("/delete", authMiddlewareHTML, async (c) => {
  const body = await c.req.parseBody();
  const validation = AccountDeleteSchema.safeParse(body);

  if (!validation.success) {
    return serverParseValidationErr(c, validation.error.message, 403);
  }

  const userId = c.get("userId");
  if (userId === null) {
    return c.html(<b class="btn-error">Failed: User Data Missing...</b>, 403);
  }

  const { password } = validation.data;
  const auth = c.get("auth");
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
    if (!usrAccount?.password) {
      return await c.html(<b class="btn-error">Failed: User Data Missing...</b>, 403);
    }

    // Do a hash verification on the user's input to see if the passwords match
    const verify = await authCtx.password.verify({
      hash: usrAccount.password,
      password: password
    });
    if (verify) {
      const context = new ScheduledContext(c.env, c.executionCtx);
      c.executionCtx.waitUntil(getAllMediaOfUser(context, userId)
        .then((media) => deleteFromR2(context, media))
        .then(() => auth.api.revokeSessions({headers: c.req.raw.headers}))
        .then(() => authCtx.internalAdapter.deleteUser(userId)));

      c.header("Clear-Site-Data", "cookies");
      c.header("HX-Redirect", "/?deleted");
      return await c.html(<></>);
    } else {
      return await c.html(<b class="btn-error">Failed: Invalid Password</b>, 401);
    }
  } catch (err: unknown) {
    // @ts-ignore
    console.error(`failed to delete user ${userId} had error ` + String((err.message ?? err.msg) ?? 'no code'));
    return c.html(<b class="btn-error">Failed: Server Error</b>, 500);
  }
});