import { unlink, writeFile } from "fs/promises";
import { existsSync } from "node:fs";
import { copyFile } from "node:fs/promises";
import { PUBLIC_OPENAPI_SPEC } from "../src/config";
import { generateOpenAPI } from "../src/endpoints/openapi";
import { error, log } from "./helpers/console";

export async function buildOpenAPISpec(): BuildRuleFuncPromise {
  const openAPIOutput: string = "./openapi.json";
  try {
    const spec = JSON.stringify(await generateOpenAPI());

    await writeFile(openAPIOutput, spec);

    // if the spec should be publicly available, move it on over.
    if (PUBLIC_OPENAPI_SPEC) {
      await copyFile(openAPIOutput, "assets/openapi.json");
    }

    log("openapi spec wrote");
  } catch (err: unknown) {
    // this is improbable, but if we somehow wrote anything, we need to
    // get rid of it.
    if (existsSync(openAPIOutput)) {
      await unlink(openAPIOutput);
    }
    error("failed to write openapi spec, got error " + String(err));
    throw new Error("failed to write openapi spec", { cause: err });
  }
}

await buildOpenAPISpec();
