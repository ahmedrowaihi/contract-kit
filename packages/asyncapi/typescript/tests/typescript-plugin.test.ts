import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { generate, typescript } from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, "../../../../fixtures/user-events.yaml");

describe("typescript plugin", () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = await mkdtemp(join(tmpdir(), "asyncapi-ts-plugin-"));
  });

  afterAll(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  it("emits types.gen.ts with interfaces for each message payload", async () => {
    const result = await generate({
      input: FIXTURE,
      output: outDir,
      plugins: [typescript()],
    });

    expect(result.files.map((f) => f.path)).toEqual(["types.gen.ts"]);

    const written = await readFile(join(outDir, "types.gen.ts"), "utf8");
    expect(written).toContain("AUTO-GENERATED");

    // Modelina names interfaces after the message id; both fixture messages
    // should produce some kind of TS declaration.
    expect(written).toMatch(/(interface|type)\s/);
    // Inner data fields from components.schemas should be present.
    expect(written).toContain("userId");
    expect(written).toContain("email");
  });
});
