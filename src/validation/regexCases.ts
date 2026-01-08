// passwords are 4 groups of 4 char separated by dashes
export const appPasswordRegex = /(?:[0-9a-z]{4}-){3}[0-9a-z]{4}/i;
// GUID + file extensions
export const fileKeyRegex = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\.(png|jp[e]?g|bmp|webp|heic|svg|mp[4|4v|2]|qt|mpg4|m4v|[a]?gif|webm|mp[e]?g|m[1-2]v|mov)$/i;
// Given a link to a post/profile record
export const postRecordURI = /(?:^.*\/profile\/)(?<account>[0-9a-zA-Z\-\.\:]+)\/(?<type>post|feed|lists)\/(?<postid>[a-z0-9]+)(?:\/)?$/i;