import * as z from "zod/v4";
import { fileKeyRegex } from "./regexCases";

export const FileDeleteSchema = z.object({
    key: z.string().regex(fileKeyRegex).nonempty()
});
