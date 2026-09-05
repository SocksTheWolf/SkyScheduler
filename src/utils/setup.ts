import type { BaseContext } from "../types";
import { getUserDID, getUserPDS } from "./bsky/bskyUser";
import { doesAdminExist } from "./db/userinfo";
import { has } from "./helpers";

export const setupAccounts = async (c: BaseContext) => {
  if (await doesAdminExist(c))
    return c.html("already created", 500);

  const settingsToCheck: string[] = ["DEFAULT_ADMIN_USER", "DEFAULT_ADMIN_PASS"];

  // Loop through and check all of the settings that are easy to miss
  for (const setting of settingsToCheck) {
    if (!has(c.env, setting)) {
      return c.text(`missing ${setting} setting!`);
    }
  }
  const adminName = c.env.DEFAULT_ADMIN_USER;

  const profileDID: string|null = await getUserDID(adminName);
  if (profileDID === null) {
    return c.text(`admin user ${adminName} has an invalid DID`)
  }
  const userPDS: string = await getUserPDS(profileDID);

  const data = await c.get("auth").api.signUpEmail({
    body: {
      name: "admin",
      email: `${adminName}@skyscheduler.tld`,
      // @ts-ignore: Property does not exist (it does via an extension)
      username: adminName,
      password: c.env.DEFAULT_ADMIN_PASS,
      bskyAppPass: c.env.DEFAULT_ADMIN_BSKY_PASS,
      did: profileDID,
      pds: userPDS
    },
  });
  if (data.token !== null)
    return c.redirect("/");
  else
    return c.html("failure", 403);
}
