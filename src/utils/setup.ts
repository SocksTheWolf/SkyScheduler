import { Context } from "hono";
import has from "just-has";
import { doesAdminExist } from "./db/userinfo";

export const setupAccounts = async(c: Context) => {
  if (await doesAdminExist(c))
    return c.html("already created", 501);

  const settingsToCheck: string[] =
    ["DEFAULT_ADMIN_USER", "DEFAULT_ADMIN_PASS", "DEFAULT_ADMIN_BSKY_PASS"];

  // Loop through and check all of the settings that are easy to miss
  for (const setting of settingsToCheck) {
    if (!has(c.env, setting)) {
      return c.text(`missing ${setting} setting!`);
    }
  }

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
