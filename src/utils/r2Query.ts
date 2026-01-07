import { Bindings, ScheduledContext, EmbedData, EmbedDataType } from '../types.d';
import { CF_MAX_DIMENSION, BSKY_IMG_SIZE_LIMIT, CF_IMAGES_FILE_SIZE_LIMIT_IN_MB, 
  CF_IMAGES_FILE_SIZE_LIMIT, R2_FILE_SIZE_LIMIT,
  MB_TO_BYTES, BSKY_VIDEO_MIME_TYPES, R2_FILE_SIZE_LIMIT_IN_MB,
  BSKY_IMG_MIME_TYPES, BSKY_VIDEO_SIZE_LIMIT, BSKY_GIF_MIME_TYPES } from "../limits.d";
import { v4 as uuidv4 } from 'uuid';
import { Context } from 'hono';
import { imageDimensionsFromStream } from 'image-dimensions';

type FileMetaData = {
  name: string,
  size: number,
  user: string,
  type: string,
  qualityLevel?: number;
};

export const deleteEmbedsFromR2 = async (c: Context|ScheduledContext, embeds: EmbedData[]|undefined, isQueued: boolean=false) => {
  let itemsToDelete:string[] = [];

  if (embeds !== undefined && embeds.length > 0) {
    embeds.forEach((data) => {
      // We don't store any data locally for weblinks/records
      if (data.type === EmbedDataType.Image || data.type === EmbedDataType.Video) {
        console.log(`Pushing ${data.content} for deletion...`);
        itemsToDelete.push(data.content.toLowerCase());
      }
    });
    await deleteFromR2(c, itemsToDelete, isQueued);
  }
  return itemsToDelete;
};

export const deleteFromR2 = async (c: Context|ScheduledContext, embeds: string[]|string, isQueued: boolean=false) => {
  if (embeds.length <= 0)
    return;

  console.log(`Deleting ${embeds}`);
  const killFilesPromise = c.env.R2.delete(embeds);
  if (isQueued)
    await killFilesPromise;
  else 
    c.executionCtx.waitUntil(killFilesPromise);
};

const rawUploadToR2 = async (env: Bindings, buffer: ArrayBuffer|ReadableStream, metaData: FileMetaData) => {
  const fileExt:string|undefined = metaData.name.split(".").pop();
  if (fileExt === undefined) {
    return {"success": false, "error": "unable to upload, file name is invalid"};
  }

  const fileName = `${uuidv4()}.${fileExt.toLowerCase()}`;
  const R2UploadRes = await env.R2.put(fileName, buffer, {
    customMetadata: {"user": metaData.user, "type": metaData.type }
  });
  if (R2UploadRes) {
    return {"success": true, "data": R2UploadRes.key, 
      "originalName": metaData.name, "fileSize": metaData.size, 
      "qualityLevel": metaData.qualityLevel};
  } else {
    return {"success": false, "error": "unable to push to file storage"};
  }
};

const uploadImageToR2 = async(c: Context, file: File, userId: string) => {
  const originalName = file.name;
  const env: Bindings = c.env;
  // The maximum size of CF Image transforms.
  if (file.size > CF_IMAGES_FILE_SIZE_LIMIT) {
    return {"success": false, "error": `An image has a maximum file size of ${CF_IMAGES_FILE_SIZE_LIMIT_IN_MB}MB`};
  }

  // We need to double check this image for various size information.
  const imageMetaData = await imageDimensionsFromStream(file.stream());
  if (imageMetaData === undefined) {
    return {"success": false, "error": "image data could not be processed "}
  }

  // if the image is over the cf image transforms, then return an error.
  if (imageMetaData.width > CF_MAX_DIMENSION || imageMetaData.height > CF_MAX_DIMENSION) {
    return {"success": false, "error": "image dimensions are too large to autosize. make sure your files fit the limits."};
  }

  // If the image is over any bsky limits, we will need to resize it
  let finalFileSize: number = file.size;
  // final quality level
  let finalQualityLevel: number = 100;

  // The file we'll eventually upload to R2 (this object will change based on compression/resizes)
  let fileToProcess: ArrayBuffer|ReadableStream|null = null;

  if (file.size > BSKY_IMG_SIZE_LIMIT) {
    let failedToResize = true;

    if (env.IMAGE_SETTINGS.enabled) {
      const resizeFilename = uuidv4();
      const resizeBucketPush = await env.R2RESIZE.put(resizeFilename, await file.bytes(), {
        customMetadata: {"user": userId },
        httpMetadata: { contentType: file.type }
      });

      if (!resizeBucketPush) {
        console.error(`Failed to push ${file.name} to the resizing bucket`);
        return {"success": false, "error": "unable to handle image for resize, please make it smaller"}
      }

      for (var i = 0; i < env.IMAGE_SETTINGS.steps.length; ++i) {
        const qualityLevel = env.IMAGE_SETTINGS.steps[i];
        const response = await fetch(new URL(resizeFilename, env.IMAGE_SETTINGS.bucket_url), {
          headers: {
            "x-skyscheduler-helper": env.RESIZE_SECRET_HEADER
          },
          cf: {
            image: {
              quality: qualityLevel,
              metadata: "copyright",
              format: "jpeg"
            }
          }
        });
        if (response.ok) {
          const resizedHeader = response.headers.get("Cf-Resized");
          const returnType = response.headers.get("Content-Type") || "";
          const transformFileSize: number = Number(response.headers.get("Content-Length")) || 0;
          const resizeHadError = resizedHeader === null || resizedHeader.indexOf("err=") !== -1;
          
          if (!resizeHadError && BSKY_IMG_MIME_TYPES.includes(returnType)) {
            console.log(`Attempting quality level ${qualityLevel}% for ${originalName}, size: ${transformFileSize}`);
            
            // If we make the file size less than the actual limit 
            if (transformFileSize < BSKY_IMG_SIZE_LIMIT && transformFileSize !== 0) {
              console.log(`${originalName}: Quality level ${qualityLevel}% processed, fits correctly with size.`);
              failedToResize = false;
              // Set some extra variables
              finalQualityLevel = qualityLevel;
              finalFileSize = transformFileSize;
              fileToProcess = response.body;
              break;
            } else {
              if (transformFileSize !== 0) {
                // Print how over the image was if we cannot properly resize it
                console.log(`${originalName}: file size ${transformFileSize - BSKY_IMG_SIZE_LIMIT} over the appropriate size`);
              }

              // dispose the body
              await response.body?.cancel();
            }
          } else {
            console.warn(`File ${file.name} was not handled ${response.statusText}`);
          }
        } else {
          console.error(`image tfs got error: ${response.statusText}`);
        }
      }
      // Delete the file from the resize bucket.
      c.executionCtx.waitUntil(env.R2RESIZE.delete(resizeFilename));
    }

    if (failedToResize) {
      const fileSizeOverAmount: string = ((file.size - BSKY_IMG_SIZE_LIMIT)/MB_TO_BYTES).toFixed(2);
      return {"success": false, "originalName": originalName, "error": `Image is too large for bsky, over by ${fileSizeOverAmount}MB`};
    }
  }

  const fileMetaData: FileMetaData = {
    name: originalName,
    size: finalFileSize,
    user: userId,
    type: file.type,
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
    type: file.type,
    user: userId
  };
  return await rawUploadToR2(env, await file.stream(), fileMetaData);
};

export const uploadFileR2 = async (c: Context, file: File|string, userId: string) => {
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
    return await uploadImageToR2(c, file, userId);
  } else if (BSKY_VIDEO_MIME_TYPES.includes(fileType) || BSKY_GIF_MIME_TYPES.includes(fileType)) {
    return await uploadVideoToR2(c.env, file, userId);
  }
  return {"success": false, "error": "unable to push to R2"};
};
