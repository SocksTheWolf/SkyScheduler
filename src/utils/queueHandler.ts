import unique from "just-unique";
import { ScheduledContext } from "../classes/context";
import { Post } from "../classes/post";
import { Repost } from "../classes/repost";
import { Bindings, QueueTaskData, TaskType } from "../types";
import { AgentMap } from "./bskyAgents";
import { enqueueEmptyWork } from "./queuePublisher";
import { handlePostTask, handleRepostTask } from "./scheduler";

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
  const bufferRetries: boolean = env.QUEUE_SETTINGS.pressure_retries || false;
  let bufferBlasts: BufferBlast[] = [];

  for (const message of batch.messages) {
    let wasSuccess: boolean = false;
    const taskType: TaskType = message.body.type;
    const agent = await agency.getOrAddAgentFromObj(runtimeWrapper, message.body.data, taskType);
    switch (taskType) {
      case TaskType.Post:
        wasSuccess = await handlePostTask(runtimeWrapper, message.body.data as Post, agent);
      break;
      case TaskType.Repost:
        wasSuccess = await handleRepostTask(runtimeWrapper, message.body.data as Repost, agent);
      break;
      case TaskType.Blast:
        console.log(`Got a blast message with ${batch.messages.length} messages in batch`);
        wasSuccess = true;
      break;
      default:
      case TaskType.None:
        console.error("Got a message queue task type that was invalid");
        message.ack();
        return;
    }
    // Handle queue acknowledgement on success/failure
    if (!wasSuccess) {
      const delaySeconds = delay*(message.attempts+1);
      console.log(`attempting to retry message ${taskType} in ${delaySeconds}`);
      message.retry({delaySeconds: delaySeconds});
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