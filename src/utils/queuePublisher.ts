import { Bindings, Post, QueueTaskData, QueueTaskType, Repost } from "../types.d";
import isEmpty from 'just-is-empty';
import random from 'just-random';
import get from 'just-safe-get';

const queueContentType = 'json';

// picks a random queue to publish data to
const getRandomQueue = (env: Bindings, listName: string): Queue|null => {
  const queueListNames: string[] = get(env.QUEUE_SETTINGS, listName, []);
  if (isEmpty(queueListNames))
    return null;

  const queueName: string = random(queueListNames) || "";
  console.log(`Picked ${queueName} from ${listName}`);
  return get(env, queueName, null);
};

export const isQueueEnabled = (env: Bindings) => env.QUEUE_SETTINGS.enabled;
export const shouldPostNowQueue = (env: Bindings) => env.QUEUE_SETTINGS.postNowEnabled || false;

export function enqueuePost(env: Bindings, post: Post) {
  if (!isQueueEnabled(env))
    return;

  // Pick a random consumer to handle this post
  const queueConsumer: Queue|null = getRandomQueue(env, "post_queues");
  if (queueConsumer !== null)
    queueConsumer.send({type: QueueTaskType.Post, post: post} as QueueTaskData, { contentType: queueContentType });
}

export function enqueueRepost(env: Bindings, post: Repost) {
  if (!isQueueEnabled(env))
    return;
  
  // Pick a random consumer to handle this repost
  const queueConsumer: Queue|null = getRandomQueue(env, "repost_queues");
  if (queueConsumer !== null)
    queueConsumer.send({type: QueueTaskType.Repost, repost: post} as QueueTaskData, { contentType: queueContentType });
}