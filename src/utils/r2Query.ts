import { Bindings, ScheduledContext, EmbedData, EmbedDataType, LooseObj } from '../types.d';
import { CF_MAX_DIMENSION, BSKY_IMG_SIZE_LIMIT, CF_FILE_SIZE_LIMIT_IN_MB, CF_FILE_SIZE_LIMIT, 
  BSKY_IMG_MAX_WIDTH, BSKY_IMG_MAX_HEIGHT, TO_MB, BSKY_VIDEO_MIME_TYPES, 
  BSKY_IMG_MIME_TYPES, BSKY_VIDEO_SIZE_LIMIT, BSKY_GIF_MIME_TYPES, 
  R2_FILE_SIZE_LIMIT,
  R2_FILE_SIZE_LIMIT_IN_MB} from "../limits.d";
import { v4 as uuidv4 } from 'uuid';
import { Context } from 'hono';
import { imageDimensionsFromStream } from 'image-dimensions';

type FileMetaData = {
  name: string,
  size: number,
  user: string
  qualityLevel?: number;
};

export const deleteEmbedsFromR2 = (c: Context|ScheduledContext, embeds: EmbedData[]|undefined) => {
  let itemsToDelete:string[] = [];

  if (embeds !== undefined && embeds.length > 0) {
    embeds.forEach((data) => {
      // We don't store any data locally for weblinks
      if (data.type !== EmbedDataType.WebLink) {
        console.log(`Pushing ${data.content} for deletion...`);
        itemsToDelete.push(data.content.toLowerCase());
      }
    });
    deleteFromR2(c, itemsToDelete);
  }
  return itemsToDelete;
};

export const deleteFromR2 = (c: Context|ScheduledContext, embeds: string[]|string) => {
  // TODO: consider pushing this data into another D1 table
  if (embeds.length <= 0)
    return;

  console.log(`Deleting ${embeds}`);
  c.executionCtx.waitUntil(c.env.R2.delete(embeds));
};

const rawUploadToR2 = async (env: Bindings, buffer: ArrayBuffer|ReadableStream, metaData: FileMetaData) => {
  const fileExt:string|undefined = metaData.name.split(".").pop();
  if (fileExt === undefined) {
    return {"success": false, "error": "unable to upload, file name is invalid"};
  }

  const fileName = `${uuidv4()}.${fileExt.toLowerCase()}`;
  const R2UploadRes = await env.R2.put(fileName, buffer, {
    customMetadata: {"user": metaData.user}
  });
  if (R2UploadRes) {
    return {"success": true, "data": R2UploadRes.key, 
      "originalName": metaData.name, "fileSize": metaData.size, 
      "qualityLevel": metaData.qualityLevel};
  } else {
    return {"success": false, "error": "unable to push to file storage"};
  }
};

const uploadImageToR2 = async(env: Bindings, file: File, userId: string) => {
  const originalName = file.name;
  // The maximum size of CF Image transforms.
  if (file.size > CF_FILE_SIZE_LIMIT) {
    return {"success": false, "error": `An image has a maximum file size of ${CF_FILE_SIZE_LIMIT_IN_MB}MB`};
  }

  // We need to double check this image for various size information.
  const imageMetaData = await imageDimensionsFromStream(file.stream());
  if (imageMetaData === undefined) {
    return {"success": false, "error": "image data could not be processed "}
  }

  // if the image is over the cf image transforms, then return an error.
  if (imageMetaData.width > CF_MAX_DIMENSION || imageMetaData.height > CF_MAX_DIMENSION) {
    return {"success": false, "error": 
      `Image dimensions are too large to autosize. Make sure your files fit the requirements listed.`};
  }

  // Check if the image is over the bluesky image dimension limits
  const imageDimensionsTooLarge: boolean = imageMetaData.width > BSKY_IMG_MAX_WIDTH || 
    imageMetaData.height > BSKY_IMG_MAX_HEIGHT;

  // If the image is over any bsky limits, we will need to resize it
  let finalFileSize: number = file.size;
  // final quality level
  let finalQualityLevel: number = 100;

  // The file we'll eventually upload to R2 (this object will change based on compression/resizes)
  let fileToProcess: ArrayBuffer|ReadableStream|null = null;

  // if we should force to bsky image dimensions
  const fitToBSkyDim: boolean = env.USE_BSKY_IMAGE_DIMENSIONS;
  if (file.size > BSKY_IMG_SIZE_LIMIT || (fitToBSkyDim && imageDimensionsTooLarge)) {
    let failedToResize = true;

    if (env.USE_IMAGE_TRANSFORMS) {
      // number of attempts to fit the image to BSky's requirements
      var attempts: number = 1;
      // quality of the degrade per steps
      const degradePerStep: number = env.IMAGE_DEGRADE_PER_STEP;

      const transformRules: LooseObj = { metadata: "copyright" };
      // Fit to aspect ratio, but only if we're too large.
      if (fitToBSkyDim) {
        transformRules.width = BSKY_IMG_MAX_WIDTH;
        transformRules.height = BSKY_IMG_MAX_HEIGHT;
        transformRules.fit = "scale-down";
      }
      do {
        // Set the quality level for this step
        const qualityLevel: number = 100 - degradePerStep*attempts;
        transformRules.quality = qualityLevel;

        const response = (
          await env.IMAGES.input(file.stream())
            .transform(transformRules)
            .output({ format: "image/jpeg" })
        ).response();

        // Break the responses into two streams so that we can read the data as both an info as well as the actual R2 upload
        const [infoStream, dataStream] = await response.body.tee();

        // Figure out how big of a transform this was
        const transformInfo = await env.IMAGES.info(infoStream);
        console.log(`Attempting quality level ${qualityLevel}% for ${originalName}, size: ${transformInfo.fileSize}`);

        // If we make the file size less than the actual limit 
        if (transformInfo.fileSize < BSKY_IMG_SIZE_LIMIT) {
          console.log(`${originalName}: Quality level ${qualityLevel}% processed, fits correctly with size.`);
          failedToResize = false;
          // Set some extra variables
          finalQualityLevel = qualityLevel;
          finalFileSize = transformInfo.fileSize;
          fileToProcess = dataStream;
          break;
        } else {
          // Print how over the image was if we cannot properly resize it
          console.log(`${originalName}: file size was ${transformInfo.fileSize} which is 
            ${transformInfo.fileSize - BSKY_IMG_SIZE_LIMIT} over the appropriate size`);
        }
        ++attempts;
      } while (attempts < env.MAX_IMAGE_QUALITY_STEPS);
    }

    if (failedToResize) {
      const fileSizeOverAmount: string = ((file.size - BSKY_IMG_SIZE_LIMIT)/TO_MB).toFixed(2);
      return {"success": false, "originalName": originalName, "error": `Image is too large for bsky, over by ${fileSizeOverAmount}MB`};
    }
  }

  const fileMetaData: FileMetaData = {
    name: originalName,
    size: finalFileSize,
    user: userId,
    qualityLevel: finalQualityLevel
  };

  if (fileToProcess === null)
    fileToProcess = await file.arrayBuffer();
  return await rawUploadToR2(env, fileToProcess, fileMetaData);
};

const uploadVideoToR2 = async (env: Bindings, file: File, userId: string) => {
  // Technically this will never hit because it is greater than our own internal limits
  if (file.size > BSKY_VIDEO_SIZE_LIMIT) {
    return {"success": false, "error": `max video size is ${BSKY_VIDEO_SIZE_LIMIT}MB`};
  }  

  const fileMetaData: FileMetaData = {
    name: file.name,
    size: file.size,
    user: userId
  };
  return await rawUploadToR2(env, await file.stream(), fileMetaData);
};

export const uploadFileR2 = async (env: Bindings, file: File|string, userId: string) => {
  if (!(file instanceof File)) {
    console.warn("Failed to upload");
    return {"success": false, "error": "data invalid"};
  }

  // The file size limit for R2 before having to do a multipart upload.
  if (file.size > R2_FILE_SIZE_LIMIT) {
    return {"success": false, "error": `max file size is ${R2_FILE_SIZE_LIMIT_IN_MB}MB`};
  }

  const fileType: string = file.type.toLowerCase();
  if (BSKY_IMG_MIME_TYPES.includes(fileType)) {
    return await uploadImageToR2(env, file, userId);
  } else if (BSKY_VIDEO_MIME_TYPES.includes(fileType) || BSKY_GIF_MIME_TYPES.includes(fileType)) {
    return await uploadVideoToR2(env, file, userId);
  }
  return {"success": false, "error": "unable to push to R2"};
};
