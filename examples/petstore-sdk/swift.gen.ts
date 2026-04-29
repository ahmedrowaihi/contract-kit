import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { generate } from "@ahmedrowaihi/openapi-swift";

const here = dirname(fileURLToPath(import.meta.url));

const result = await generate({
  input: resolve(here, "../../fixtures/petstore.yaml"),
  output: resolve(here, "sdk-swift"),
});

console.log(`wrote ${result.files.length} files → ${result.output}`);
