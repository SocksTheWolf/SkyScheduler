import type { AppBskyVideoDefs, BlobRef } from "@atproto/api";
import type { WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { AtProtoAgent } from "../../classes/bskyAgents";
import type { AllContext } from "../../types";

export const uploadVideoToBlob = async (ctx: AllContext, agent: AtProtoAgent, fileName: string) => {
  const fileData = await ctx.env.R2.get(fileName);
  if (fileData === null) {
    console.warn(`Could not get the video ${fileName} from R2 for post!`);
    return null;
  }

  const fileType = fileData.httpMetadata?.contentType || fileData.customMetadata!["type"];
  const uploadUrl = new URL("https://video.bsky.app/xrpc/app.bsky.video.uploadVideo");
  uploadUrl.searchParams.append("did", agent.did!);
  uploadUrl.searchParams.append("name", fileName);
  const userToken = await agent.getServiceToken();
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": fileType,
      "Content-Length": fileData.size.toString()
    },
    body: await fileData.blob(),
  });
  if (uploadResponse.ok)
    return ((await uploadResponse.json()) as AppBskyVideoDefs.JobStatus);

  throw new Error("Failed to upload!");
};

export const waitOnVideoStatus = async (jobStatus: AppBskyVideoDefs.JobStatus, step: WorkflowStep|null = null) => {
  let blob: BlobRef | undefined = jobStatus.blob;
  const jobId = jobStatus.jobId;
  const videoAgent = new AtProtoAgent("https://video.bsky.app");
  const isStepped = (step !== null);

  while (!blob) {
    const { data: status } = await videoAgent.app.bsky.video.getJobStatus({ jobId: jobId });
    // Check to see if we have job output
    if (status.jobStatus.blob) {
      blob = status.jobStatus.blob;
    }
    // if we have failed, exit this upload entirely.
    if (status.jobStatus.state == "JOB_STATE_FAILED") {
      console.error(`job for did ${status.jobStatus.did} failed with error ${status.jobStatus.error!}. had message ${status.jobStatus.message}`);
      if (isStepped)
        throw new NonRetryableError("video pipeline returned that job has failed");
      return null;
    }
    // wait a second
    if (isStepped) {
      await step.sleep("wait for upload", "2 seconds");
    } else {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  };
  return blob;
};


