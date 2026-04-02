import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { uploadVideoToBlob, waitOnVideoStatus } from "../bsky/bskyVideo";
import { Post } from "../../classes/post";
import { ScheduledContext } from "../../classes/context";
import type { AllContext, Bindings, VideoWorkflowPayload } from "../../types";
import { handlePostTask } from "../scheduler";
import type { AtProtoAgent } from "../../classes/bskyAgents";

// After setting up queues and everything, I might have just wanted workflows.
export class UploadVideoAndPublishWorkflow extends WorkflowEntrypoint<Bindings, VideoWorkflowPayload> {
  async run(event: WorkflowEvent<VideoWorkflowPayload>, step: WorkflowStep) {

    // Upload the video to our bsky pds tunnel
    const uploadJob = await step.do("upload video and get job", {
      retries: {
        limit: 5,
        delay: 1000 * 60,
        backoff: "exponential"
      },
      timeout: "15 minutes"
    }, async () => {
      const runtimeWrapper = new ScheduledContext(this.env, this.ctx);
      return await uploadVideoToBlob(runtimeWrapper,
        event.payload.agent, event.payload.post.getVideoEmbed()!?.content);
    });

    // get the video job
    const getUploadBlob = await step.do("wait for the upload blob", {
      retries: {
        limit: 3,
        delay: 500 * 60,
        backoff: "constant"
      },
      timeout: "5 minutes"
    }, async () => {
      return await waitOnVideoStatus(uploadJob!, step);
    });

    // make the post
    await step.do("make the bluesky post", {
      retries: {
        limit: 3,
        delay: this.env.QUEUE_SETTINGS.delay_val,
        backoff: "exponential"
      }
    }, async () => {
      const postObj: Post = event.payload.post;
      postObj.blobOverride = getUploadBlob;
      const runtimeWrapper = new ScheduledContext(this.env, this.ctx);
      if (await handlePostTask(runtimeWrapper, postObj, event.payload.agent) == false) {
        throw new Error("failed to make post");
      }
    });
  }
};

export async function pushVideoPostWorkflow(ctx: AllContext, post: Post, agent: AtProtoAgent) {
  const job = await ctx.env.VIDEO_WORKFLOW.create({
    params: {
      agent: agent,
      post: post
    }
  });
  const status = await job.status();
  if (status.status !== "errored" && status.error === undefined) {
    return true;
  }
  return false;
}