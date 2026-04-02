// this file is used to handle atpagents and their reuse during cron/queues
// this is done because logging into PDSes across tasks can be extremely
// expensive time wise.
import { Agent, ComAtprotoServerCreateSession, CredentialSession } from "@atproto/api";
import {
  AgentConfigSettings,
  AllContext} from "../types";
import { AccountStatus } from "../enums";
import { TaskType } from "../enums";
import { loginToBsky } from "../utils/bsky/bskyLogin";
import { createDMWithUsername } from "../utils/bsky/bskyMessage";
import { getBskyUserPassForId } from "../utils/db/userinfo";
import { createViolationForUser, shouldIgnoreViolation } from "../utils/db/violations";
import { resetAppPasswordMessage } from "../utils/messages/resetAppPassword";
import { Post } from "./post";
import { Repost } from "./repost";

///////////////////////////////////////////////////////////////////////////////////////////////////////
export class AgentMap {
  #forPosts: boolean;
  #forReposts: boolean;
  #map: Map<string, AtProtoAgent|null>;
  constructor(config: AgentConfigSettings) {
    this.#forPosts = config.use_posts;
    this.#forReposts = config.use_reposts;
    this.#map = new Map();
  }
  async getOrAddAgent(c: AllContext, userId: string, type: TaskType): Promise<AtProtoAgent|null> {
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
  async getOrAddAgentFromObj(c: AllContext, data: Post|Repost, type: TaskType): Promise<AtProtoAgent|null> {
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
    const agent = new AtProtoAgent(pds);

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

///////////////////////////////////////////////////////////////////////////////////////////////////////
export class AtProtoAgent extends Agent {
  serviceToken: string|null;
  servTokenExpire: number|null;
  constructor(serviceURL: string) {
    super(new CredentialSession(new URL(serviceURL)));
    this.serviceToken = null;
    this.servTokenExpire = null;
  }
  // We basically do the same thing as AtpAgent originally here, by not sharing sessionManagers
  // and wrapping them entirely in agents. We cache the agents instead to keep them isolated.
  async login(options: AtProtoAgentLoginOptions): Promise<ComAtprotoServerCreateSession.Response> {
    return (this.sessionManager as CredentialSession).login(options);
  }
  async getServiceToken() {
    if (this.serviceToken !== null && this.servTokenExpire !== null) {
      if (this.servTokenExpire > Date.now()) {
        return this.serviceToken;
      }
    }
    this.servTokenExpire = Date.now() / 1000 + 60 * 30;
    const { data: serviceAuth } = await this.com.atproto.server.getServiceAuth({
      aud: `did:web:${(this.sessionManager as CredentialSession).dispatchUrl.host}`,
      lxm: "com.atproto.repo.uploadBlob",
      exp: this.servTokenExpire
    });
    this.serviceToken = serviceAuth.token;
    return this.serviceToken;
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////
export type AgentLoginResponse = {
  agent: AtProtoAgent | null;
  violation: boolean;
  violationType?: AccountStatus;
};

// login options, mostly the same as the credential store
export interface AtProtoAgentLoginOptions {
  identifier: string;
  password: string;
  allowTakendown?: boolean;
};