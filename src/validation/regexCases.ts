// passwords are 4 groups of 4 char separated by dashes
export const appPasswordRegex = /(?:[0-9a-z]{4}-){3}[0-9a-z]{4}/i;
// protocols to check links against
export const httpProtoRecord = /^https?$/;
// GUID + file extensions
export const fileKeyRegex = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\.(png|jp[e]?g|bmp|webp|heic|svg|mp4|gif|webm|mpeg|mov)$/i;
// Given a link to a post/feed/list/profile record
export interface atpRecordURICaptures {
  account?: string;
  type?: string;
  postid?: string;
}
// did capture from record
export const didCaptureRegex = /(?:^.*\/profile\/)([0-9a-zA-Z\-\.]+)(?:\/post\/\w+)?(?:\/)?$/g;
// any record URI
export const atpRecordURI = /(?:^.*\/profile\/)(?<account>[0-9a-zA-Z\-\.\:]+)\/(?<type>post|feed|lists)\/(?<postid>[a-z0-9]+)(?:\/)?$/i;
// public facing post record URI (for reposts)
export const postRecordURI = /(?:^.*\/profile\/)(?<account>[0-9a-zA-Z\-\.\:]+)\/post\/(?<postid>[a-z0-9]+)(?:\/)?$/i;
// atproto post record URI
export const atProtoPostURI = /at\:\/\/(?:[0-9a-zA-Z\-\.\:]+)\/app\.bsky\.feed\.post\/(?:[a-z0-9]+)(?:\/)?$/i;
// atproto schema uris
export const atProtoRecordURI = /at\:\/\/(?:[0-9a-z\-\.\:]+)\/(?:[a-z0-9\.\#]+)\/(?:[a-z0-9]+)(?:\/)?$/i;
// repost record
export const repostContentRecord = /Repost of (?:.*\/profile\/)(?<account>[0-9a-zA-Z\-\.\:]+)\/post\/(?<postid>[a-z0-9]+)(?:\/)?$/i;
// bsky handle regex
export const domainHandleRegex = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
// mention capture regex
export const mentionCaptureRegex = /@((?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,})/g;