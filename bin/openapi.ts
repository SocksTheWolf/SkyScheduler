import { writeFile, unlink } from "fs/promises";
import { existsSync } from "node:fs";
import { generateOpenAPI } from "../src/endpoints/openapi";
import { error, log } from "./helpers/console";

async function buildOpenAPISpec(): Promise<void> {
  const openapiPath: string = "./openapi.json";
  try {
    const spec = JSON.stringify(await generateOpenAPI());

    await writeFile(openapiPath, spec);

    log("openapi spec wrote");
  } catch (err: unknown) {
    // this is improbable, but if we somehow wrote anything, we need to
    // get rid of it.
    if (existsSync(openapiPath)) {
      await unlink(openapiPath);
    }
    error("failed to write openapi spec, got error " + String(err));
    throw new Error("failed to write openapi spec", { cause: err });
  }
}

await buildOpenAPISpec();
