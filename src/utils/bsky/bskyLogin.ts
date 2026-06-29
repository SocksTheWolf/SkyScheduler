// handles general login for agents.
// most cases should not be interfacing directly with this function, but instead
// use bskyAgents or bskyMsg to talk to the network
import type { ComAtprotoServerCreateSession } from "@atproto/api";
import type { AtProtoAgent } from "../../classes/bskyAgents";
import { AccountStatus } from "../../enums";
import type { LooseObj } from "../../types";

const checkAccountStatus = (data: ComAtprotoServerCreateSession.OutputSchema) => {
  if (data.active === false) {
    switch (data.status) {
      case "deactivated":
        return AccountStatus.Deactivated;
      case "suspended":
        return AccountStatus.Suspended;
      case "takendown":
        return AccountStatus.TakenDown;
    }
    return AccountStatus.InvalidAccount;
  }
  return AccountStatus.Ok;
}

export const loginToBsky = async (agent: AtProtoAgent, user: string, pass: string) => {
  try {
    const loginResponse = await agent.login({
      identifier: user,
      password: pass,
      allowTakendown: true
    });
    if (!loginResponse.success) {
      const failedCheck: AccountStatus = checkAccountStatus(loginResponse.data);
      // If the account was ok, that means we currently are having a platform outage
      if (failedCheck === AccountStatus.Ok)
        return AccountStatus.PlatformOutage;
      // otherwise there's something up with the account
      return failedCheck;
    }
    // check account status if we succeed, because we could get a valid return-code but account disabled
    return checkAccountStatus(loginResponse.data);
  } catch (err) {
    // Apparently login can rethrow as an XRPCError and completely eat the original throw.
    // so errors don't get handled gracefully.
    const errWrap: LooseObj = err as LooseObj;
    const errorName = errWrap.constructor.name;
    if (errorName === "XRPCError") {
      const errCode = errWrap.status;
      if (errCode == 401) {
        // app password is bad
        return AccountStatus.InvalidAccount;
      } else if (errCode >= 500) {
        return AccountStatus.PlatformOutage;
      }
    } else if (errorName === "XRPCNotSupported") {
      // handle is bad
      return AccountStatus.InvalidAccount;
    }
    console.error(`encountered exception on login for user ${user}, err ${err}`);
  }
  return AccountStatus.UnhandledError;
};