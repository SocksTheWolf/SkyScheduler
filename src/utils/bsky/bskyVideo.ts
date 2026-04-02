import { AppBskyVideoDefs, BlobRef } from "@atproto/api";
import { WorkflowStep } from "cloudflare:workers";
import { AtProtoAgent } from "../../classes/bskyAgents";
import { AllContext } from "../../types";

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

  while (!blob) {
    const { data: status } = await videoAgent.app.bsky.video.getJobStatus({ jobId: jobId });
    if (status.jobStatus.blob) {
      blob = status.jobStatus.blob;
    }
    // wait a second
    if (step !== null) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      await step!.sleep("wait for upload", "2 seconds");
    }
  };
  return blob;
};


