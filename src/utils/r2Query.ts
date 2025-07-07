import { Bindings, EmbedData } from '../types';
import { R2_FILE_SIZE_LIMIT, BSKY_FILE_SIZE_LIMIT, TO_MB, BSKY_MAX_WIDTH, BSKY_MAX_HEIGHT } from "../limits.d";
import { v4 as uuidv4 } from 'uuid';

export const deleteFromR2 = async (env: Bindings, embeds: EmbedData[]|undefined) => {
  if (embeds !== undefined && embeds.length > 0) {
    let itemsToDelete:string[] = [];
    embeds.forEach(async (data) => {
      console.log(`Deleting ${data.content}...`);
      itemsToDelete.push(data.content);
    });
    if (itemsToDelete.length > 0)
      await env.R2.delete(itemsToDelete);
  }
};

export const uploadFileR2 = async (env: Bindings, file: File|string) => {
  let finalQualityLevel = 100;

  if (!(file instanceof File)) {
    console.warn("Failed to upload", 400);
    return {"success": false, "error": "data invalid"};
  }

  const originalName = file.name;
  let finalFileSize = file.size;

  // The file size limit for R2 without chunking
  if (file.size > R2_FILE_SIZE_LIMIT) {
    return {"success": false, "error": `max file size is ${R2_FILE_SIZE_LIMIT * TO_MB}MB`};
  }

  let fileToProcess: ArrayBuffer|ReadableStream = await file.arrayBuffer();
  // We need to double check this image for various size information.
  const imageMetaData = await env.IMAGES.info(await file.stream());
  // If the image is over any bsky limits, we will need to resize it
  if (file.size > BSKY_FILE_SIZE_LIMIT || imageMetaData.width > BSKY_MAX_WIDTH || imageMetaData.height > BSKY_MAX_HEIGHT) {
    let failedToResize = true;

    if (env.USE_IMAGE_TRANSFORMS) {
      const degradePerStep:number = env.IMAGE_DEGRADE_PER_STEP;
      var attempts:number = 1;
      do {
        const qualityLevel:number = 100 - degradePerStep*attempts;
        const response = (
          await env.IMAGES.input(await file.stream())
            .transform({ width: BSKY_MAX_WIDTH, height: BSKY_MAX_HEIGHT, fit: "scale-down", quality: qualityLevel, metadata: "copyright" })
            .output({ format: "image/jpeg" })
        ).response();

        // Break the responses into two streams so that we can read the data as both an info as well as the actual R2 upload
        const [infoStream, dataStream] = await response.body.tee();

        // Figure out how big of a transform this was
        const transformInfo = await env.IMAGES.info(infoStream);
        console.log(`Attempting quality level ${qualityLevel}% for ${file.name}, size: ${transformInfo.fileSize}`);

        // If we make the file size less than the actual limit 
        if (transformInfo.fileSize < BSKY_FILE_SIZE_LIMIT) {
          console.log(`${originalName}: Quality level ${qualityLevel}% processed, fits correctly with size.`);
          failedToResize = false;
          // Set some extra variables
          finalQualityLevel = qualityLevel;
          finalFileSize = transformInfo.fileSize;
          fileToProcess = dataStream;
          break;
        } else {
          // Print how over the image was if we cannot properly resize it
          console.log(`${originalName}: file size was ${transformInfo.fileSize} which is ${transformInfo.fileSize - BSKY_FILE_SIZE_LIMIT} over the appropriate size`);
        }
        ++attempts;
      } while (attempts < env.MAX_IMAGE_QUALITY_STEPS);
    }

    if (failedToResize)
      return {"success": false, "originalName": originalName, "error": `image is too large for bsky, size is over by ${file.size - BSKY_FILE_SIZE_LIMIT}MB, 
          with width ${imageMetaData.width} and height ${imageMetaData.height}`};
  }
  
  const fileExt = originalName.split(".").pop();
  const fileName = `${uuidv4()}.${fileExt}`;

  const R2UploadRes = await env.R2.put(fileName, fileToProcess);
  if (R2UploadRes)
    return {"success": true, "data": R2UploadRes.key, "originalName": originalName, "qualityLevel": finalQualityLevel, "fileSize": finalFileSize};
  else
    return {"success": false, "error": "unable to push to R2"};
};