import { generateOpenAPI } from "../src/endpoints/openapi";
import fs from 'fs/promises';

async function buildOpenAPISpec() {
  try {
    const spec = JSON.stringify(await generateOpenAPI());
    await fs.writeFile("./openapi.json", spec);
    console.log("openapi spec wrote");
  } catch(err) {
    console.error(`failed to write openapi spec, got error ${err}`);
    throw new Error("failed");
  }
}

await buildOpenAPISpec();