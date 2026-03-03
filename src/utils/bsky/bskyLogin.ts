// handles general login for agents.
// most cases should not be interfacing directly with this function, but instead
// use bskyAgents or bskyMsg to talk to the network
import AtpAgent from "@atproto/api";
import { AccountStatus, LooseObj } from "../../types";

export const loginToBsky = async (agent: AtpAgent, user: string, pass: string) => {
  try {
    const loginResponse = await agent.login({
      identifier: user,
      password: pass,
      allowTakendown: true
    });
    if (!loginResponse.success) {
      if (loginResponse.data.active == false) {
        switch (loginResponse.data.status) {
          case "deactivated":
            return AccountStatus.Deactivated;
          case "suspended":
            return AccountStatus.Suspended;
          case "takendown":
            return AccountStatus.TakenDown;
        }
        return AccountStatus.InvalidAccount;
      }
      return AccountStatus.PlatformOutage;
    }
    return AccountStatus.Ok;
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