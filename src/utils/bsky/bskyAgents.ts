// this file is used to handle atpagents and their reuse during cron/queues
// this is done because logging into PDSes across tasks can be extremely
// expensive time wise.
import AtpAgent from "@atproto/api";
import { Post } from "../../classes/post";
import { Repost } from "../../classes/repost";
import {
  AccountStatus, AgentConfigSettings,
  AllContext, TaskType
} from "../../types";
import { getBskyUserPassForId } from "../db/userinfo";
import { createViolationForUser, shouldIgnoreViolation } from "../db/violations";
import { resetAppPasswordMessage } from "../messages/resetAppPassword";
import { loginToBsky } from "./bskyLogin";
import { createDMWithUsername } from "./bskyMessage";

type AgentLoginResponse = {
  agent: AtpAgent|null;
  violation: boolean;
  violationType?: AccountStatus;
}

export class AgentMap {
  #forPosts: boolean;
  #forReposts: boolean;
  #map: Map<string, AtpAgent|null>;
  constructor(config: AgentConfigSettings) {
    this.#forPosts = config.use_posts;
    this.#forReposts = config.use_reposts;
    this.#map = new Map();
  }
  async getOrAddAgent(c: AllContext, userId: string, type: TaskType): Promise<AtpAgent|null> {
    const usesAgent: boolean = this.usesAgentForType(type);
    let mappedAgent = (usesAgent) ? this.#map.get(userId) : null;
    if (mappedAgent === undefined) {
      const {agent, violation, violationType} = await AgentMap.getAgentDirect(c, userId, true);
      mappedAgent = agent;
      if (usesAgent) {
        // only add this agent if it's not null
        // but if we have a violation, we should absolutely add it in.
        if (agent !== null || (violation && !shouldIgnoreViolation(violationType!))) {
          this.#map.set(userId, agent);
        }
      }
    }
    return mappedAgent;
  };
  async getOrAddAgentFromObj(c: AllContext, data: Post|Repost, type: TaskType): Promise<AtpAgent|null> {
    const userId: string = (type === TaskType.Post) ? (data as Post).user : (data as Repost).userId;
    return await this.getOrAddAgent(c, userId, type);
  };
  static async getAgentDirect(c: AllContext, userId: string, messageOnViolation: boolean): Promise<AgentLoginResponse> {
    const loginCreds = await getBskyUserPassForId(c, userId);
    if (loginCreds.valid === false) {
      console.error(`credentials for user ${userId} were invalid`);
      return {agent: null, violation: false};
    }
    const {username, password, pds} = loginCreds;
    // Login to bsky
    const agent = new AtpAgent({ service: new URL(pds) });

    const loginResponse: AccountStatus = await loginToBsky(agent, username, password);
    if (loginResponse != AccountStatus.Ok) {
      // check to see if we should add a violation (will return false if no new violation needed)
      if (await createViolationForUser(c, userId, loginResponse)) {
        console.error(`Unable to login for ${userId} with violation ${loginResponse}`);
        if (messageOnViolation && loginResponse === AccountStatus.InvalidAccount) {
          await createDMWithUsername(c.env, username, resetAppPasswordMessage());
        }
      } else {
        console.error(`Unable to login ${userId}, no new violation made, got ${loginResponse}`);
      }
      return {agent: null, violation: true, violationType: loginResponse};
    }
    return {agent: agent, violation: false};
  };
  usesAgentForType(type: TaskType) {
    switch(type) {
      case TaskType.Post:
        return this.#forPosts;
      case TaskType.Repost:
        return this.#forReposts;
    }
    return false;
  }
};