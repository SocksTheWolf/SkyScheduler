import type { AtProtoAgent } from "../../classes/bskyAgents";

export const getAgentListRecord = async (agent: AtProtoAgent, listURI: string) => {
  try {
    const response = await agent.app.bsky.graph.getList({ list: listURI, limit: 1 });
    if (response.success) {
      return response.data.list;
    }
  } catch (err: unknown) {
    console.error(`Unable to resolve list record for ${listURI} had error ` + String(err));
  }
  return null;
};

export const getAgentFeedRecord = async (agent: AtProtoAgent, feedURI: string) => {
  try {
    const response = await agent.app.bsky.feed.getFeedGenerator({ feed: feedURI });
    if (response.success && response.data.isValid) {
      return response.data.view;
    }
  } catch (err) {
    console.error(`Unable to get feed record for ${feedURI} had error ` + String(err));
  }
  return null;
};

export const getAgentPostRecords = async (agent: AtProtoAgent, records: string[]) => {
  try {
    const response = await agent.app.bsky.feed.getPosts({ uris: records });
    if (response.success)
      return response.data.posts;
  } catch (err) {
    console.error(`Unable to get post records for ${records.toString()} had error ` + String(err));
  }
  return null;
};