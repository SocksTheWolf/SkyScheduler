import isEmpty from 'just-is-empty';
import random from 'just-random';
import get from 'just-safe-get';
import { Post } from "../classes/post";
import { Repost } from "../classes/repost";
import { AllContext, Bindings, QueueTaskData, TaskType } from "../types";

// picks a random queue to publish data to
const getRandomQueue = (env: Bindings, listName: string): Queue|null => {
  const queueListNames: string[] = get(env.QUEUE_SETTINGS, listName, []);
  if (isEmpty(queueListNames))
    return null;

  const queueName: string = random(queueListNames) || "";
  if (queueListNames.length > 1)
    console.log(`Picked ${queueName} from ${listName}`);
  return get(env, queueName, null);
};

async function pushToQueue(queueConsumer: Queue|null, data: Post|Repost|null, taskType: TaskType, delay: number = -1) {
  if (queueConsumer !== null) {
    const options: QueueSendOptions = {
      contentType: 'v8'
    };
    if (delay > -1)
      options.delaySeconds = delay;

    await queueConsumer.send({type: taskType, data: data} as QueueTaskData, options);
  } else {
    console.warn(`could not push data to empty queue, was type ${taskType}`);
  }
};

const hasPostQueue = (env: Bindings) => !isEmpty(env.QUEUE_SETTINGS.post_queues) && env.IN_DEV == false;
const hasRepostQueue = (env: Bindings) => !isEmpty(env.QUEUE_SETTINGS.repost_queues) && env.IN_DEV == false;
export const isQueueEnabled = (env: Bindings) => env.QUEUE_SETTINGS.enabled && hasPostQueue(env);
export const isRepostQueueEnabled = (env: Bindings) => env.QUEUE_SETTINGS.repostsEnabled && hasRepostQueue(env);
export const shouldPostNowQueue = (env: Bindings) => env.QUEUE_SETTINGS.postNowEnabled && isQueueEnabled(env);
export const shouldPostThreadQueue = (env: Bindings) => env.QUEUE_SETTINGS.threadEnabled && (hasPostQueue(env) || isQueueEnabled(env));

export async function enqueuePost(c: AllContext, data: Post, delay: number = -1) {
  if (data.isThreadRoot) {
    if (!shouldPostThreadQueue(c.env))
      return;
  } else if (!isQueueEnabled(c.env))
    return;

  // Pick a random consumer to handle this post
  const queueConsumer: Queue|null = getRandomQueue(c.env, "post_queues");
  await pushToQueue(queueConsumer, data, TaskType.Post, delay);
};

export async function enqueueRepost(c: AllContext, data: Repost, delay: number = -1) {
  if (!isRepostQueueEnabled(c.env))
    return;

  // Pick a random consumer to handle this repost
  const queueConsumer: Queue|null = getRandomQueue(c.env, "repost_queues");
  await pushToQueue(queueConsumer, data, TaskType.Repost, delay);
};

export async function enqueueEmptyWork(c: AllContext, queueType: TaskType, delay: number = -1) {
  const queueConsumer: Queue|null = getRandomQueue(c.env, (queueType === TaskType.Post) ? "post_queues" : "repost_queues");
  await pushToQueue(queueConsumer, null, TaskType.Blast, delay);
};