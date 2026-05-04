import path from "node:path";
import { fileURLToPath } from "node:url";
import { emit } from "@ahmedrowaihi/fn-schema-core";
import { createReader } from "@ahmedrowaihi/fn-schema-loader";
import { extract } from "@ahmedrowaihi/fn-schema-typescript";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));

async function buildBundle() {
  const result = await extract({
    files: [path.resolve(here, "../src/handlers.ts")],
    tsConfigPath: path.resolve(here, "../tsconfig.json"),
    schema: {
      identity: "x-fn-schema-ts",
    },
  });
  const json = emit.toBundle(result);
  return JSON.parse(json) as Parameters<typeof createReader>[0];
}

describe("loader integration with extract → bundle → reader", () => {
  it("end-to-end: extract a real handler set, bundle, then read via createReader", async () => {
    const bundle = await buildBundle();
    const reader = createReader(bundle);

    expect(reader.has("createUser")).toBe(true);
    const sig = reader.get("createUser")!;
    expect(sig.input).toBeDefined();
    expect(sig.output).toBeDefined();
  });

  it("findByIdentity matches functions whose input/output carries x-fn-schema-ts", async () => {
    const bundle = await buildBundle();
    const reader = createReader(bundle);
    const matches = reader.findByIdentity("User", "x-fn-schema-ts");
    const ids = matches.map((m) => m.signatureId).sort();
    expect(ids).toContain("createUser");
  });

  it("inputOf / outputOf resolve top-level $refs", async () => {
    const result = await extract({
      files: [path.resolve(here, "../src/handlers.ts")],
      tsConfigPath: path.resolve(here, "../tsconfig.json"),
      signature: { parameters: "first-only" },
      schema: { identity: "x-fn-schema-ts" },
    });
    const reader = createReader(
      JSON.parse(emit.toBundle(result)) as Parameters<typeof createReader>[0],
    );
    const inputResolved = reader.inputOf("createUser") as Record<
      string,
      unknown
    >;
    expect(inputResolved.type).toBe("object");
    expect(inputResolved["x-fn-schema-ts"]).toBe("CreateUserInput");
  });
});
