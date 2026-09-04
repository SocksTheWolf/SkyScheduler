import isEmpty from "just-is-empty";
import { ATPROTO_DID } from "../../appInfo";
import { AtProtoAgent } from "../../classes/bskyAgents";
import { DEFAULT_PDS } from "../../config";
import { AccountStatus } from "../../enums";
import type { ResolveHandleResponse } from "../../types";
import { has } from "../helpers";
import { loginToBsky } from "./bskyLogin";

export const doesHandleExist = async (user: string) => {
  try {
    const checkHandle = await lookupBskyHandle(user);
    return checkHandle !== null;
  } catch {
    return false;
  }
};

export const lookupBskyHandle = async (user: string): Promise<string | null> => {
  return await fetch(`https://public.bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${user}`, {
    cf: { cacheTtlByStatus: { "200-299": 600, 404: 1, "500-599": 0 }, cacheEverything: true },
  }).then((resp) => {
    if (resp.ok) {
      return resp.json<ResolveHandleResponse>().then((jsonData) => {
        return jsonData.did;
      });
    }
    return null;
  });
};

export const lookupBskyPDS = async (userDID: string): Promise<string> => {
  return await fetch(`https://plc.directory/${userDID}`).then((resp) => {
    return (resp.json<PLCDirectoryResponse>()).then((data) => {
      if (has(data, "service")) {
        for (const service of data.service!) {
          if (service.type === "AtprotoPersonalDataServer") {
            return service.serviceEndpoint;
          }
        }
      }
      // Fallback is to always return the bsky pds
      return DEFAULT_PDS;
    });
  });
};

export const followBotAccount = async (pds: string, username: string, password: string) => {
  if (isEmpty(ATPROTO_DID))
    return;

  try {
    const agent = new AtProtoAgent(pds);
    const loginResult: AccountStatus = await loginToBsky(agent, username, password);
    if (loginResult === AccountStatus.Ok) {
      await agent.follow(ATPROTO_DID);
    }
  } catch(ex: unknown) {
    console.warn(`failed to follow bot account, got err ${String(ex)}`);
  }
};
