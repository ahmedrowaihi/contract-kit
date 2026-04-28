import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildKotlinProject,
  operationsToDecls,
  schemasToDecls,
} from "@ahmedrowaihi/openapi-kotlin";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(here, "../../fixtures/petstore.yaml");
const outRoot = resolve(here, "sdk-kotlin");

const spec = YAML.parse(readFileSync(specPath, "utf8")) as {
  components?: { schemas?: Record<string, unknown> };
  paths?: Record<string, unknown>;
};

const schemaDecls = schemasToDecls(
  (spec.components?.schemas ?? {}) as Parameters<typeof schemasToDecls>[0],
);

const opDecls = operationsToDecls(
  spec.paths as Parameters<typeof operationsToDecls>[0],
);

const files = buildKotlinProject([...schemaDecls, ...opDecls], {
  packageName: "com.example.petstore",
});

rmSync(outRoot, { recursive: true, force: true });
for (const file of files) {
  const full = join(outRoot, file.path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, file.content);
}

console.log(`wrote ${files.length} files → ${outRoot}`);
