import { AppBskyVideoDefs, BlobRef } from "@atproto/api";
import { AtProtoAgent } from "../../classes/bskyAgents";
import { AllContext } from "../../types";

export const uploadVideoToBlob = async (c: AllContext, agent: AtProtoAgent, file: string) => {
  const fileData = await c.env.R2.get(file);
  if (!fileData) {
    console.warn(`Could not get the video ${file} from R2 for post!`);
    return null;
  }
  const uploadUrl = new URL("https://video.bsky.app/xrpc/app.bsky.video.uploadVideo");
  uploadUrl.searchParams.append("did", agent.did!);
  uploadUrl.searchParams.append("name", file);
  const userToken = await agent.getServiceToken();

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "video/mp4",
      "Content-Length": fileData.size
    },
    body: await fileData.blob(),
  });

  return ((await uploadResponse.json()) as AppBskyVideoDefs.JobStatus);
};

export const waitOnVideoStatus = async (jobStatus: AppBskyVideoDefs.JobStatus) => {
  let blob: BlobRef | undefined = jobStatus.blob;
  const jobId = jobStatus.jobId;
  const videoAgent = new AtProtoAgent("https://video.bsky.app");

  while (!blob) {
    const { data: status } = await videoAgent.app.bsky.video.getJobStatus({ jobId: jobId });
    if (status.jobStatus.blob) {
      blob = status.jobStatus.blob;
    }
    // wait a second
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };
  return blob;
};


