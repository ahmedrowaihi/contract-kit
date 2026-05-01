import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, it } from "vitest";

import { generate } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const SPEC = resolve(here, "../../../fixtures/petstore.yaml");

describe("generate (default plugins)", () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = await mkdtemp(join(tmpdir(), "openapi-ts-wrapper-"));
  });

  afterAll(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  it("writes a non-empty file list and emits the canonical hey-api shape", async () => {
    const result = await generate({ input: SPEC, output: outDir });
    assert.equal(result.output, resolve(outDir));
    assert.ok(result.files.length > 0, "expected at least one file emitted");
    const paths = result.files.map((f) => f.path).sort();
    // hey-api's default sdk + typescript plugins emit these canonical
    // module names. If they ever rename them, this assertion is the
    // signal to revisit our default plugin set.
    assert.ok(paths.some((p) => p.endsWith("types.gen.ts")));
    assert.ok(paths.some((p) => p.endsWith("sdk.gen.ts")));
    assert.ok(paths.some((p) => p.endsWith("client.gen.ts")));
  });

  it("emits TypeScript that references hey-api's fetch client", async () => {
    const sdk = await readFile(join(outDir, "sdk.gen.ts"), "utf8");
    assert.match(sdk, /from ['"]\.\/client\.gen['"]/);
  });
});

describe("generate (plugin override)", () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = await mkdtemp(join(tmpdir(), "openapi-ts-wrapper-"));
  });

  afterAll(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  it("respects an explicit plugins override (types-only)", async () => {
    const result = await generate({
      input: SPEC,
      output: outDir,
      // Just types — no sdk, no client. Verifies the override path
      // actually replaces the defaults rather than appending to them.
      plugins: ["@hey-api/typescript"],
    });
    const paths = result.files.map((f) => f.path);
    assert.ok(paths.some((p) => p.endsWith("types.gen.ts")));
    assert.ok(
      !paths.some((p) => p.endsWith("sdk.gen.ts")),
      "expected sdk.gen.ts to be skipped when sdk plugin is dropped",
    );
  });
});
