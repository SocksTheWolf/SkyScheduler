import { Bindings } from '../types.d';
import { getPostRecords } from './bskyApi';
import { getAllPostedPosts, getAllPostedPostsOfUser } from './dbQuery';
import split from 'just-split';
import isEmpty from 'just-is-empty';

export const pruneBskyPosts = async (env: Bindings, userId?:string) => {
  const allPostedPosts = (userId !== undefined) ? await getAllPostedPostsOfUser(env, userId) : await getAllPostedPosts(env);
  let removePostIds:string[] = [];
  let postedGroups = split(allPostedPosts, 25);
  while (!isEmpty(postedGroups)) {
    const currentGroup = postedGroups.pop();
    // This technically shouldn't be possible because we do a check in the while loop beforehand.
    if (currentGroup === undefined) {
      console.log("current group was somehow undefined...");
      break;
    }

    // Create a map and an array so we can do lookups for reconciliation later
    // to figure out what posts can be removed.
    let urisOnly:string[] = [];
    const postMap = new Map<string, string>();
    currentGroup.forEach((itm) => {
      if (itm.uri === null) {
        console.log(`Skipping a "posted" post that does not have an uri: ${itm.id}`);
        return;
      }
      postMap.set(itm.uri, itm.id);
      urisOnly.push(itm.uri);
    });

    // Records from the public bsky api service
    const bskyLookupResults = await getPostRecords(urisOnly);
    if (bskyLookupResults !== null) {
      // There is a discrepency, we need to find which record it is.
      if (bskyLookupResults.length !== urisOnly.length) {
        // Go through the entire lookup results
        while (!isEmpty(bskyLookupResults)) {
          // remove the object at the end so we can try to figure out what's left
          const currentRecord = bskyLookupResults.pop();
          if (currentRecord === undefined)
            break;

          // remove it from our post map.
          postMap.delete(currentRecord.uri);
        }
        // All all the deleted keys to the main array.
        postMap.forEach((value, key) => {
          removePostIds.push(value);
        });
      }
    }
  }
  return removePostIds;
} 