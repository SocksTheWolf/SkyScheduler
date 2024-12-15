import { AtpAgent, RichText } from '@atproto/api';
import { Bindings } from '../types';

const MAX_LENGTH = 300;

export const schedulePost = async (env: Bindings, content: string) => {
  // Post to Bluesky
  const agent = new AtpAgent({
    service: new URL('https://bsky.social'),
  });

  await agent.login({
    identifier: env.BLUESKY_USERNAME,
    password: env.BLUESKY_PASSWORD,
  });

  const rt = new RichText({
    text: content,
  });

  await rt.detectFacets(agent);

  // Segment the text into manageable parts
  const segments = rt.segments();

  let currentPost = '';
  let currentPostLength = 0;
  const posts = [];

  for (const segment of segments) {
    const segmentText = segment.text;
    if (currentPostLength + segmentText.length > MAX_LENGTH) {
      // Post the current segment and reset
      if (currentPost) {
        const postRecord = {
          $type: 'app.bsky.feed.post',
          text: currentPost,
          facets: rt.facets,
          createdAt: new Date().toISOString(),
        };
        const response = await agent.post(postRecord);
        posts.push(response);
        currentPost = '';
        currentPostLength = 0;
      }
      // Handle the new segment
      currentPost = segmentText;
      currentPostLength = segmentText.length;
    } else {
      currentPost += segmentText;
      currentPostLength += segmentText.length;
    }
  }

  // Post the last segment if any
  if (currentPost) {
    const postRecord = {
      $type: 'app.bsky.feed.post',
      text: currentPost,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };
    const response = await agent.post(postRecord);
    posts.push(response);
  }



  console.log(`Posted to Bluesky: ${posts.map(p => p.uri)}`);
  return null;
}