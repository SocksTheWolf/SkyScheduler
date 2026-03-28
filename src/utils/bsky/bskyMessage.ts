import { RichText } from '@atproto/api';
import { AtProtoAgent } from "../../classes/bskyAgents";
import { BSkyConvoInfo } from '../../classes/bskyConvoInfo';
import { AccountStatus, Bindings } from '../../types';
import { lookupBskyHandle } from './bskyApi';
import { loginToBsky } from './bskyLogin';

const chatHeaders = {headers: {
  "atproto-proxy": "did:web:api.bsky.chat#bsky_chat"
}};

async function getDMConvo(agent: AtProtoAgent, env: Bindings, user: string): Promise<BSkyConvoInfo|null> {
  const loginResponse = await loginToBsky(agent, env.RESET_BOT_USERNAME, env.RESET_BOT_APP_PASS);
  if (loginResponse !== AccountStatus.Ok) {
    console.error("Unable to login to the bot to send reset password messages");
    return null;
  }

  return await agent.chat.bsky.convo.getConvoForMembers({members: [user]}, chatHeaders).then((resp) => {
    if (resp.success)
      return new BSkyConvoInfo(resp.data.convo);
    return null;
   }).catch(() => null);
}

// This is very slow, but like probably good to check?
export const checkIfCanDMUser = async (env: Bindings, user: string): Promise<boolean> => {
  const agent = new AtProtoAgent('https://bsky.social');
  return await getDMConvo(agent, env, user) !== null;
};

export const createDMWithUsername = async (env: Bindings, username: string, msg: string): Promise<boolean> => {
  return await lookupBskyHandle(username).then(resp => createDMWithUser(env, resp, msg));
};

export const createDMWithUser = async (env: Bindings, user: string|null, msg: string): Promise<boolean> => {
  if (user === null)
    return false;

  const agent = new AtProtoAgent('https://bsky.social');
  const convoData: BSkyConvoInfo|null = await getDMConvo(agent, env, user);
  if (convoData !== null) {
    // Generate facets so we get things like links.
    const rt = new RichText({text: msg});

    // The most beautiful redirected promise ever.
    const messageChain = rt.detectFacets(agent)
      // Accept any conversations we may have with the user already
      .then(() => agent.chat.bsky.convo.acceptConvo({convoId: convoData.id}, chatHeaders))
      // send a message to this user
      .then(() => agent.chat.bsky.convo.sendMessage({convoId: convoData.id, message: {text: msg, facets: rt.facets}}, chatHeaders))
      .then((result) => {
        if (result.success) {
          // delete whatever the message was that we sent
          return agent.chat.bsky.convo.deleteMessageForSelf({convoId: convoData.id, messageId: result.data.id}, chatHeaders)
            // redirect any response to be a simple boolean value
            .then((res) => res.success)
            .catch((err) => {
              console.error(`failed to delete own message, got error ${err} for ${user}`);
              // Eat the error, and attempt to just leave the convo instead
              return false;
            });
        }
        // Failed to send message
        throw new Error("could not send message");
      }).then((delResult) => {
        // This will leave the convo if:
        // * We failed to delete the message OR
        // * We do not have a last message with the user OR
        // * Our message triggered an request query
        // * AND AND we have no unreads with the user.
        if ((!delResult || !convoData.hasLastMessage || convoData.isRequest) && convoData.unreadCount == 0) {
          return agent.chat.bsky.convo.leaveConvo({convoId: convoData.id}, chatHeaders).then((res) => res.success).catch((err) => {
            console.warn(`failed to leave convo, got error ${err} for ${user}`);
            // Any errors on leave convo should not fail the entire chain
            return true;
          });
        }
        // Otherwise redirect the last result value
        return delResult;
      }).catch((err) => {
        console.error(`failed to execute message send, got error ${err} for ${user}`);
        return false;
    });
    return await messageChain;
  }
  console.warn(`could not get the dm convo with ${user}`);
  return false;
};