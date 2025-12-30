import * as z from "zod/v4";
import { fileKeyRegex} from "./regexCases";

export const FileDeleteSchema = z.object({
  key: z.string().toLowerCase().regex(fileKeyRegex, "file key is invalid").nonempty("file key was empty")
});
