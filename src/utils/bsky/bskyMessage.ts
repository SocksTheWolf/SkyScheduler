import { RichText } from '@atproto/api';
import { AccountStatus, Bindings } from '../../types';
import { AtProtoAgent } from "./bskyAgents";
import { lookupBskyHandle } from './bskyApi';
import { loginToBsky } from './bskyLogin';

const chatHeaders = {headers: {
  "atproto-proxy": "did:web:api.bsky.chat#bsky_chat"
}};

async function getDMConvo(agent: AtProtoAgent, env: Bindings, user: string): Promise<string|null> {
  const loginResponse = await loginToBsky(agent, env.RESET_BOT_USERNAME, env.RESET_BOT_APP_PASS);
  if (loginResponse !== AccountStatus.Ok) {
    console.error("Unable to login to the bot to send reset password messages");
    return null;
  }

  try {
    const getConvo = await agent.chat.bsky.convo.getConvoForMembers({members: [user]}, chatHeaders);
    if (getConvo.success)
      return getConvo.data.convo.id;
  } catch {
    // nothing ...
  }
  return null;
}

// This is very slow, but like probably good to check?
export const checkIfCanDMUser = async (env: Bindings, user: string): Promise<boolean> => {
  const agent = new AtProtoAgent('https://bsky.social');
  return await getDMConvo(agent, env, user) !== null;
};

export const createDMWithUsername = async (env: Bindings, username: string, msg: string): Promise<boolean> => {
  const bskyUserId = await lookupBskyHandle(username);
  if (bskyUserId !== null) {
    return await createDMWithUser(env, bskyUserId, msg);
  }
  return false;
};

export const createDMWithUser = async (env: Bindings, user: string, msg: string): Promise<boolean> => {
  const agent = new AtProtoAgent('https://bsky.social');
  const convoId = await getDMConvo(agent, env, user);
  if (convoId !== null) {
    // Generate facets so we get things like links.
    const rt = new RichText({text: msg});
    await rt.detectFacets(agent);
    try {
      const sendMessage = await agent.chat.bsky.convo.sendMessage(
        {convoId: convoId, message: {text: msg, facets: rt.facets}}, chatHeaders);
      if (sendMessage.success) {
        // delete the message for me
        try {
          await agent.chat.bsky.convo.deleteMessageForSelf({convoId: convoId, messageId: sendMessage.data.id}, chatHeaders);
        } catch (delerr) {
          console.error(`failed to delete reset message for self, got error ${delerr}`);
        }
        // Message has been sent.
        return true;
      } else {
        console.error(`Unable to send the message to ${user}, could not sendMessage call`);
        return false;
      }
    } catch(err) {
      console.error(`had error trying to message user ${user} ${err}`);
      return false;
    }
  }
  console.warn(`could not get the dm convo with ${user}`);
  return false;
};