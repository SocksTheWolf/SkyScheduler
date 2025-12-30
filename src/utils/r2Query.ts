import { Bindings, EmbedData, EmbedDataType, LooseObj } from '../types.d';
import { CF_MAX_DIMENSION, BSKY_IMG_SIZE_LIMIT, CF_FILE_SIZE_LIMIT_IN_MB, CF_FILE_SIZE_LIMIT, 
  BSKY_IMG_MAX_WIDTH, BSKY_IMG_MAX_HEIGHT, TO_MB, BSKY_VIDEO_MIME_TYPES, 
  BSKY_IMG_MIME_TYPES, BSKY_VIDEO_SIZE_LIMIT } from "../limits.d";
import { v4 as uuidv4 } from 'uuid';

export const deleteEmbedsFromR2 = async (env: Bindings, embeds: EmbedData[]|undefined) => {
  let itemsToDelete:string[] = [];

  if (embeds !== undefined && embeds.length > 0) {
    embeds.forEach(async (data) => {
      if (data.type !== EmbedDataType.WebLink) {
        console.log(`Deleting ${data.content}...`);
        itemsToDelete.push(data.content.toLowerCase());
      }
    });
    await deleteFromR2(env, itemsToDelete);
  }
  return itemsToDelete;
};

export const deleteFromR2 = async (env: Bindings, embeds: string[]) => {
  if (embeds.length > 0)
    await env.R2.delete(embeds);
};

const rawUploadToR2 = async (env: Bindings, inFileName: string, buffer: ArrayBuffer|ReadableStream, 
    fileSize: number, additionalArgs: any={}) => {
  const fileExt:string|undefined = inFileName.split(".").pop();
  if (fileExt === undefined) {
    return {"success": false, "error": "unable to upload, file name is invalid"};
  }

  const fileName = `${uuidv4()}.${fileExt.toLowerCase()}`;
  const R2UploadRes = await env.R2.put(fileName, buffer);
  if (R2UploadRes) {
    return {"success": true, "data": R2UploadRes.key, "originalName": inFileName, 
      "fileSize": fileSize, ...additionalArgs};

  } else {
    return {"success": false, "error": "unable to push to R2"};
  }
};

const uploadImageToR2 = async(env: Bindings, file: File) => {
  const originalName = file.name;
  let finalFileSize = file.size;
  let finalQualityLevel = 100;

  // The file we'll eventually upload to R2 (this object will change based on compression/resizes)
  let fileToProcess: ArrayBuffer|ReadableStream = await file.arrayBuffer();
  // We need to double check this image for various size information.
  const imageMetaData = await env.IMAGES.info(await file.stream());

  // if the image is over the cf image transforms, then return an error.
  if (imageMetaData.width > CF_MAX_DIMENSION || imageMetaData.height > CF_MAX_DIMENSION){
    return {"success": false, "error": 
      `Image dimensions are too large to autosize. Make sure your files fit the requirements listed.`};
  }

  // Check if the image is over the bluesky image dimension limits
  const imageDimensionsTooLarge:boolean = imageMetaData.width > BSKY_IMG_MAX_WIDTH || 
    imageMetaData.height > BSKY_IMG_MAX_HEIGHT;

  // If the image is over any bsky limits, we will need to resize it

  // if we should force to bsky image dimensions
  const fitToBSkyDim: boolean = env.USE_BSKY_IMAGE_DIMENSIONS;
  if (file.size > BSKY_IMG_SIZE_LIMIT || (fitToBSkyDim && imageDimensionsTooLarge)) {
    let failedToResize = true;

    if (env.USE_IMAGE_TRANSFORMS) {
      // number of attempts to fit the image to BSky's requirements
      var attempts:number = 1;
      // quality of the degrade per steps
      const degradePerStep:number = env.IMAGE_DEGRADE_PER_STEP;

      const transformRules:LooseObj = { metadata: "copyright" };
      // Fit to aspect ratio, but only if we're too large.
      if (fitToBSkyDim) {
        transformRules.width = BSKY_IMG_MAX_WIDTH;
        transformRules.height = BSKY_IMG_MAX_HEIGHT;
        transformRules.fit = "scale-down";
      }
      do {
        // Set the quality level for this step
        const qualityLevel:number = 100 - degradePerStep*attempts;
        transformRules.quality = qualityLevel;

        const response = (
          await env.IMAGES.input(await file.stream())
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
      const fileSizeOverAmount = ((file.size - BSKY_IMG_SIZE_LIMIT)/TO_MB).toFixed(2);
      return {"success": false, "originalName": originalName, "error": `Image is too large for bsky, over by ${fileSizeOverAmount}MB`};
    }
  }

  return await rawUploadToR2(env, originalName, fileToProcess, finalFileSize, {"qualityLevel": finalQualityLevel});
};

const uploadVideoToR2 = async (env: Bindings, file: File) => {
  // Technically this will never hit because it is greater than our own internal limits
  if (file.size > BSKY_VIDEO_SIZE_LIMIT) {
    return {"success": false, "error": `max video size is ${BSKY_VIDEO_SIZE_LIMIT}MB`};
  }  
  return await rawUploadToR2(env, file.name, await file.stream(), file.size);
};

export const uploadFileR2 = async (env: Bindings, file: File|string) => {
  if (!(file instanceof File)) {
    console.warn("Failed to upload");
    return {"success": false, "error": "data invalid"};
  }

  // The file size limit for ImageTransforms
  if (file.size > CF_FILE_SIZE_LIMIT) {
    return {"success": false, "error": `max file size is ${CF_FILE_SIZE_LIMIT_IN_MB}MB`};
  }

  const fileType: string = file.type.toLowerCase();
  if (BSKY_IMG_MIME_TYPES.includes(fileType)) {
    return await uploadImageToR2(env, file);
  } else if (BSKY_VIDEO_MIME_TYPES.includes(fileType)) {
    return await uploadVideoToR2(env, file);
  }
  return {"success": false, "error": "unable to push to R2"};
};
