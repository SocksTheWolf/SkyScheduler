import type { Facet } from "@atproto/api";
import { AppBskyRichtextFacet } from "@atproto/api";
import type { MentionCache } from "../../types";
import { mentionCaptureRegex } from "../../validation/regexCases";
import { lookupBskyHandle } from "./bskyUser";

function makeMentionMap(updateWith?: MentionCache[]): Map<string, string> {
  // handle, did
  const mentionMap = new Map<string, string>();
  if (updateWith !== undefined) {
    updateWith.forEach((itm) => {
      mentionMap.set(itm.handle, itm.did);
    })
  };
  return mentionMap;
}

export async function getMentionsFromContent(input: string, updateWith?: MentionCache[]): Promise<MentionCache[]> {
  const mentionMap = makeMentionMap(updateWith);
  const matches = input.match(mentionCaptureRegex) ?? [];
  for (const match of matches) {
    // skip over anything that actually exists rn
    if (mentionMap.has(match))
      continue;
    // make sure to remove the @ character
    const didHandle: string|null = await lookupBskyHandle(match.slice(1));
    // only set if we can lookup
    if (didHandle !== null) {
      console.log(`Adding ${match} (${didHandle}) to mentionMap`);
      mentionMap.set(match, didHandle);
    }
  }
  return Array.from(mentionMap, ([inHandle, inDID]) => ({handle: inHandle, did: inDID}));
}

export const removeOrResolveInvalidFacets = (content: string, inFacets?: Facet[], mentionsCache?: MentionCache[]) => {
  if (inFacets === undefined) {
    return undefined;
  }

  const mentionMap = makeMentionMap(mentionsCache);
  const savedFacets: Facet[] = [];
  for (const facet of inFacets) {
    let facetIsValid = true;
    // mmmmmmm N^2 to fix the dumbest bug.
    for (const feature of facet.features) {
      if (AppBskyRichtextFacet.isMention(feature) && !AppBskyRichtextFacet.validateMention(feature).success) {
        // Attempt to reprocess facet here
        const contentHandle: string = content.substring(facet.index.byteStart, facet.index.byteEnd);
        if (mentionMap.has(contentHandle)) {
          feature.did = mentionMap.get(contentHandle)!;
        } else {
          facetIsValid = false;
          break;
        }
      }
    }
    if (facetIsValid)
      savedFacets.push(facet);
  }
  return savedFacets;
}