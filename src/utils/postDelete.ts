import { Bindings, EmbedData } from '../types.d';

export const deleteFromR2 = async (env: Bindings, embeds: EmbedData[]|undefined) => {
  if (embeds !== undefined) {
    embeds.forEach(async (data) => {
      console.log(`Deleting ${data.content}...`);
      await env.R2.delete(data.content);
    });
  }
};