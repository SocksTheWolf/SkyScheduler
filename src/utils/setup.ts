import { Context } from "hono";
import { doesAdminExist } from "./db/userinfo";
import has from "just-has";

export const setupAccounts = async(c: Context) => {
  if (await doesAdminExist(c))
    return c.html("already created", 501);

  if (!has(c.env, "DEFAULT_ADMIN_USER") || !has(c.env, "DEFAULT_ADMIN_PASS") || !has(c.env, "DEFAULT_ADMIN_BSKY_PASS"))
    return c.html("invalid configuration, missing configs");

  const data = await c.get("auth").api.signUpEmail({
    body: {
      name: "admin",
      email: `${c.env.DEFAULT_ADMIN_USER}@skyscheduler.tld`,
      // @ts-ignore: Property does not exist (it does via an extension)
      username: c.env.DEFAULT_ADMIN_USER,
      password: c.env.DEFAULT_ADMIN_PASS,
      bskyAppPass: c.env.DEFAULT_ADMIN_BSKY_PASS
    }
  });
  if (data.token !== null)
    return c.redirect("/");
  else
    return c.html("failure", 401);
}
