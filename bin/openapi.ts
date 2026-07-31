import fs from "fs/promises";
import { existsSync } from "node:fs";
import { generateOpenAPI } from "../src/endpoints/openapi";

async function buildOpenAPISpec() {
  const openapiPath: string = "./openapi.json";
  try {
    const spec = JSON.stringify(await generateOpenAPI());

    await fs.writeFile(openapiPath, spec);

    console.log("openapi spec wrote");
  } catch(err) {
    // this is improbable, but if we somehow wrote anything, we need to
    // get rid of it.
    if (existsSync(openapiPath)) {
      await fs.unlink(openapiPath);
    }
    console.error(`failed to write openapi spec, got error ${err}`);
    throw new Error("failed");
  }
}

await buildOpenAPISpec();