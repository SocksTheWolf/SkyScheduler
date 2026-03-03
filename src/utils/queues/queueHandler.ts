import unique from "just-unique";
import { ScheduledContext } from "../../classes/context";
import { Post } from "../../classes/post";
import { Repost } from "../../classes/repost";
import { Bindings, QueueTaskData, TaskType } from "../../types";
import { AgentMap } from "../bsky/bskyAgents";
import { userHasViolations } from "../db/violations";
import { isPost } from "../helpers";
import { handlePostTask, handleRepostTask } from "../scheduler";
import { enqueueEmptyWork } from "./queuePublisher";

type BufferBlast = {
  type: TaskType,
  time: number
};

export async function processQueue(batch: MessageBatch<QueueTaskData>, env: Bindings, ctx: ExecutionContext) {
  // runtime overhead
  const runtimeWrapper = new ScheduledContext(env, ctx);
  const agency = new AgentMap(env.TASK_SETTINGS);

  // Retry settings
  const delay: number = env.QUEUE_SETTINGS.delay_val;
  const maxRetries: number = env.QUEUE_SETTINGS.max_retries;
  const bufferRetries: boolean = env.QUEUE_SETTINGS.pressure_retries || false;
  let bufferBlasts: BufferBlast[] = [];

  for (const message of batch.messages) {
    let wasSuccess: boolean = false;
    const taskType: TaskType = message.body.type;
    if (taskType == TaskType.Post || taskType == TaskType.Repost) {
      if (message.body.data == null) {
        console.error(`got a task type of ${taskType} but the message body has no data. cannot be processed!`);
        // maybe this was a bad send, so try it again later. Do not backblast as it was not an upstream failure.
        message.retry();
        continue;
      }

      // This probably doesn't need to be recreated anymore because we send the literal JS object now
      // TODO: Check if we're already a class before new constructing
      const postDataObj: Post|Repost = (isPost(message.body.data)) ? new Post(message.body.data) : new Repost(message.body.data);
      const agent = await agency.getOrAddAgentFromObj(runtimeWrapper, postDataObj, taskType);
      if (agent == null) {
        const userId = postDataObj.getUser();
        // if we could not get an agent for you, we should check to see if you have violations
        // if you do, we stop processing you.
        if (await userHasViolations(runtimeWrapper, userId)) {
          console.log(`User ${userId} has violations, dropping them from the queue`);
          message.ack();
          continue;
        } else {
          console.warn(`Could not make an agent for ${userId}, got null.`);
        }

      } else {
        if (taskType == TaskType.Post)
          wasSuccess = await handlePostTask(runtimeWrapper, postDataObj as Post, agent);
        else
          wasSuccess = await handleRepostTask(runtimeWrapper, postDataObj as Repost, agent);
      }
    } else if (taskType == TaskType.Blast) {
      console.log(`Got a blast message with ${batch.messages.length} messages in batch`);
      wasSuccess = true;
    } else {
      console.error("Got a message queue task type that was invalid");
      message.ack();
      return;
    }
    // Handle queue acknowledgement on success/failure
    if (!wasSuccess) {
      const currentAttempts: number = message.attempts;
      const delaySeconds = delay*(currentAttempts+1);
      console.log(`attempting to retry message ${taskType} in ${delaySeconds}`);
      message.retry({delaySeconds: delaySeconds});

      // if the attempts are over the maximum amount of retries then do not backblast
      if (currentAttempts > maxRetries)
        continue;

      // push a backblast so that this item will retry in the future.
      // it basically just writes null in the buffer, which is silly but w/e
      bufferBlasts.push({type: taskType, time: delaySeconds});
    } else {
      message.ack();
    }
  }
  // If we have any retries, they'll only get delivered on next batch
  // so we're going to back blast the buffer queue so that we can make sure the retries go.
  if (bufferRetries && bufferBlasts.length > 0) {
    bufferBlasts = unique(bufferBlasts);
    console.log(`Attempting to backblast ${bufferBlasts.length} items`);
    for (const blast of bufferBlasts) {
      await enqueueEmptyWork(runtimeWrapper, blast.type, blast.time);
    }
  }
};