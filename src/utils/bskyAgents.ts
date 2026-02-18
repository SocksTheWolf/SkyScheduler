// this file is used to handle atpagents and their reuse during cron/queues
// this is done because logging into PDSes across tasks can be extremely
// expensive time wise.
//
// Also just handles general login.
import AtpAgent from "@atproto/api";
import { AccountStatus, AllContext, LooseObj, Post, Repost, AgentConfigSettings, TaskType } from "../types.d";
import { getBskyUserPassForId } from "./db/userinfo";
import { createViolationForUser } from "./db/violations";

export const makeAgentForUser = async (c: AllContext, userId: string) => {
  const loginCreds = await getBskyUserPassForId(c, userId);
  if (loginCreds.valid === false) {
    console.error(`credentials for user ${userId} were invalid`);
    return null;
  }
  const {username, password, pds} = loginCreds;
  // Login to bsky
  const agent = new AtpAgent({ service: new URL(pds) });

  const loginResponse: AccountStatus = await loginToBsky(agent, username, password);
  if (loginResponse != AccountStatus.Ok) {
    const addViolation: boolean = await createViolationForUser(c, userId, loginResponse);
    if (addViolation)
      console.error(`Unable to login to ${userId} with violation ${loginResponse}`);
    return null;
  }
  return agent;
};

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

export class AgentMap {
  #forPosts: boolean;
  #forReposts: boolean;
  #map: Map<string, AtpAgent>;
  constructor(config: AgentConfigSettings) {
    this.#forPosts = config.use_posts;
    this.#forReposts = config.use_reposts;
    this.#map = new Map();
  }
  async getOrAddAgent(c: AllContext, userId: string, type: TaskType): Promise<AtpAgent|null> {
    const usesAgent: boolean = this.usesAgentForType(type);
    let agent = (usesAgent) ? this.#map.get(userId) || null : null;
    if (agent === null) {
      agent = await AgentMap.getAgentDirect(c, userId);
      if (usesAgent && agent !== null)
        this.#map.set(userId, agent);
    }
    return agent;
  };
  async getOrAddAgentFromObj(c: AllContext, data: Post|Repost|undefined|null, type: TaskType): Promise<AtpAgent|null> {
    if (data === undefined || data === null) {
      return null;
    }
    const userId: string = (type === TaskType.Post) ? (data as Post).user : (data as Repost).userId;
    return await this.getOrAddAgent(c, userId, type);
  };
  static async getAgentDirect(c: AllContext, userId: string) {
    return await makeAgentForUser(c, userId);
  };
  usesAgentForType(type: TaskType) {
    switch(type)
    {
      case TaskType.Post:
        return this.#forPosts;
      case TaskType.Repost:
        return this.#forReposts;
    }
    return false;
  }
};