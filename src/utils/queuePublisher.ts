import isEmpty from 'just-is-empty';
import random from 'just-random';
import get from 'just-safe-get';
import { AllContext, Bindings, Post, QueueTaskData, QueueTaskType, Repost } from "../types.d";

const queueContentType = 'v8';

// picks a random queue to publish data to
const getRandomQueue = (env: Bindings, listName: string): Queue|null => {
  const queueListNames: string[] = get(env.QUEUE_SETTINGS, listName, []);
  if (isEmpty(queueListNames))
    return null;

  const queueName: string = random(queueListNames) || "";
  console.log(`Picked ${queueName} from ${listName}`);
  return get(env, queueName, null);
};

const hasPostQueue = (env: Bindings) => !isEmpty(env.QUEUE_SETTINGS.post_queues) && env.IN_DEV == false;
const hasRepostQueue = (env: Bindings) => !isEmpty(env.QUEUE_SETTINGS.repost_queues) && env.IN_DEV == false;
export const isQueueEnabled = (env: Bindings) => env.QUEUE_SETTINGS.enabled && hasPostQueue(env);
export const isRepostQueueEnabled = (env: Bindings) => env.QUEUE_SETTINGS.repostsEnabled && hasRepostQueue(env);
export const shouldPostNowQueue = (env: Bindings) => env.QUEUE_SETTINGS.postNowEnabled && isQueueEnabled(env);
export const shouldPostThreadQueue = (env: Bindings) => env.QUEUE_SETTINGS.threadEnabled && (hasPostQueue(env) || isQueueEnabled(env));

export async function enqueuePost(c: AllContext, post: Post) {
  if (post.isThreadRoot) {
    if (!shouldPostThreadQueue(c.env))
      return;
  } else if (!isQueueEnabled(c.env))
    return;

  // Pick a random consumer to handle this post
  const queueConsumer: Queue|null = getRandomQueue(c.env, "post_queues");

  if (queueConsumer !== null) {
    await queueConsumer.send({type: QueueTaskType.Post, post: post} as QueueTaskData, { contentType: queueContentType });
  }
}

export async function enqueueRepost(c: AllContext, post: Repost) {
  if (!isRepostQueueEnabled(c.env))
    return;

  // Pick a random consumer to handle this repost
  const queueConsumer: Queue|null = getRandomQueue(c.env, "repost_queues");
  if (queueConsumer !== null)
    await queueConsumer.send({type: QueueTaskType.Repost, repost: post} as QueueTaskData, { contentType: queueContentType });
}