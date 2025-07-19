import { AtpAgent, RichText } from '@atproto/api';
import { loginToBsky } from './bskyApi';
import { Bindings } from '../types';

export const createDMWithUser = async (env: Bindings, user: string, msg: string) => {
  const agent = new AtpAgent({
    service: new URL('https://bsky.social')
  });

  const loginResponse = await loginToBsky(agent, env.RESET_BOT_USERNAME, env.RESET_BOT_APP_PASS);
  if (!loginResponse) {
    console.error("Unable to login to the bot to send reset password messages");
    return false;
  }

  const chatHeaders = {headers: {
    "atproto-proxy": "did:web:api.bsky.chat#bsky_chat"
  }};

  const getConvo = await agent.chat.bsky.convo.getConvoForMembers({members: [user]}, chatHeaders);

  if (getConvo.success) {
    const convoId = getConvo.data.convo.id;

    // Generate facets so we get things like links.
    const rt = new RichText({text: msg});
    await rt.detectFacets(agent);

    const sendMessage = await agent.chat.bsky.convo.sendMessage({convoId: convoId, message: {text: msg, facets: rt.facets}}, chatHeaders);
    if (sendMessage.success) {
      // delete the message for me
      const messageId = sendMessage.data.id;
      try {
        await agent.chat.bsky.convo.deleteMessageForSelf({convoId: convoId, messageId: messageId}, chatHeaders);
      } catch(err) {
        console.error(err);
      }
      // Message has been sent.      
      return true;
    } else {
      console.error(`Unable to send the message to ${user}, could not sendMessage call`);
    }
  } else {
    console.error(`Unable to send message to user ${user}, could not get convo.`);
  }
  return false;
};