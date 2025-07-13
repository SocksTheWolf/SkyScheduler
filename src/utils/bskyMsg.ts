import { AtpAgent } from '@atproto/api';
import { loginToBsky } from './bskyApi';
import { Bindings } from '../types';
import isEmpty from 'just-is-empty';

export const sendResetLink = async (env: Bindings, passwordResetURL: string) => {
  const agent = new AtpAgent({
    service: new URL('https://api.bsky.chat'),
  });

  const botUsername = env.RESET_BOT_USERNAME;
  const botPassword = env.RESET_BOT_APP_PASS;
  if (isEmpty(botUsername) || isEmpty(botPassword)) {
    return;
  }

  const loginResponse = await loginToBsky(agent, botUsername, botPassword);
  if (!loginResponse) {
    console.error("Unable to login to reset bot");
    return false;
  }

};
