import path from "node:path";
import { fileURLToPath } from "node:url";
import { extract } from "@ahmedrowaihi/fn-schema-typescript";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const handlersFile = path.resolve(here, "../src/handlers.ts");
const advancedFile = path.resolve(here, "../src/advanced.ts");
const tsConfig = path.resolve(here, "../tsconfig.json");

function resolve(
  schema: Record<string, unknown>,
  definitions: Record<string, unknown>,
): Record<string, unknown> {
  const ref = schema.$ref;
  if (typeof ref !== "string") return schema;
  const name = ref.replace(/^#\/definitions\//, "");
  const target = definitions[name];
  if (!target) throw new Error(`Unresolved $ref: ${ref}`);
  return target as Record<string, unknown>;
}

describe("fn-schema-typescript: extract", () => {
  it("extracts JSON Schemas for exported functions", async () => {
    const result = await extract({
      files: [handlersFile],
      tsConfigPath: path.resolve(here, "../tsconfig.json"),
      naming: "function-name",
    });

    const ids = result.signatures.map((s) => s.id);
    expect(ids).toContain("createUser");
    expect(ids).toContain("listUsers");
    expect(ids).toContain("ping");

    const generic = result.diagnostics.find(
      (d) => d.function === "identity" && d.code === "GENERIC_SKIPPED",
    );
    expect(
      generic,
      "identity<T> should produce a GENERIC_SKIPPED diagnostic",
    ).toBeDefined();

    const errs = result.diagnostics.filter((d) => d.severity === "error");
    expect(
      errs,
      `unexpected errors: ${JSON.stringify(errs, null, 2)}`,
    ).toHaveLength(0);
  });

  it("derives the correct shape for createUser", async () => {
    const result = await extract({
      files: [handlersFile],
      tsConfigPath: path.resolve(here, "../tsconfig.json"),
      signature: { parameters: "first-only", unwrapPromise: true },
    });

    const sig = result.signatures.find((s) => s.id === "createUser");
    expect(sig).toBeDefined();

    // `CreateUserInput` is exported, so the input becomes a $ref into
    // `result.definitions`. Resolve it for shape assertions.
    const input = resolve(
      sig?.input as Record<string, unknown>,
      result.definitions,
    );
    expect(input.type).toBe("object");
    expect(input.required).toEqual(
      expect.arrayContaining(["email", "name", "roles"]),
    );

    const output = resolve(
      sig?.output as Record<string, unknown>,
      result.definitions,
    );
    expect(output.type).toBe("object");
    expect((output.properties as Record<string, unknown>).id).toBeDefined();
  });

  it("emits exported types as shared definitions", async () => {
    const result = await extract({
      files: [handlersFile],
      tsConfigPath: path.resolve(here, "../tsconfig.json"),
    });
    expect(Object.keys(result.definitions)).toEqual(
      expect.arrayContaining(["CreateUserInput", "User"]),
    );
  });

  it("returns an array of input schemas for multi-arg fns when parameters=array", async () => {
    const result = await extract({
      files: [handlersFile],
      tsConfigPath: path.resolve(here, "../tsconfig.json"),
      signature: { parameters: "array" },
    });

    const sig = result.signatures.find((s) => s.id === "listUsers");
    expect(sig).toBeDefined();
    expect(Array.isArray(sig?.input)).toBe(true);
    expect((sig?.input as unknown[]).length).toBe(2);
  });

  it("emits a JSON bundle to disk via emit.toBundle", async () => {
    const { emit } = await import("@ahmedrowaihi/fn-schema-core");
    const result = await extract({
      files: [handlersFile],
      tsConfigPath: path.resolve(here, "../tsconfig.json"),
      naming: "function-name",
    });
    const json = emit.toBundle(result, { pretty: true });
    const parsed = JSON.parse(json);
    expect(parsed.signatures.createUser).toBeDefined();
    expect(parsed.definitions.CreateUserInput).toBeDefined();
  });

  it("respects jsdoc-tag naming", async () => {
    const result = await extract({
      files: [handlersFile],
      tsConfigPath: path.resolve(here, "../tsconfig.json"),
      naming: "jsdoc-tag",
    });
    const ids = new Set(result.signatures.map((s) => s.id));
    expect(ids.has("users.create")).toBe(true);
    expect(ids.has("users.list")).toBe(true);
  });
});

describe("fn-schema-typescript: advanced shapes", () => {
  it("skips the `this` parameter and discovers default-export arrows + object-literal methods", async () => {
    const result = await extract({
      files: [advancedFile],
      tsConfigPath: tsConfig,
      naming: "function-name",
    });

    const ids = new Set(result.signatures.map((s) => s.id));
    expect(ids).toContain("labelArticle");
    expect(ids).toContain("default");
    expect(ids).toContain("articles.create");
    expect(ids).toContain("articles.tag");
    expect(ids).toContain("findArticle");

    const errs = result.diagnostics.filter((d) => d.severity === "error");
    expect(
      errs,
      `unexpected errors: ${JSON.stringify(errs, null, 2)}`,
    ).toHaveLength(0);

    // `this: Article` should NOT show up as input[0]; only `label` does.
    const label = result.signatures.find((s) => s.id === "labelArticle");
    expect(label).toBeDefined();
    const labelInput = label?.input as unknown[];
    expect(Array.isArray(labelInput)).toBe(true);
    expect(labelInput).toHaveLength(1);
    expect((labelInput[0] as Record<string, unknown>).type).toBe("string");
  });

  it("merges function overloads (default = 'all' → union)", async () => {
    const result = await extract({
      files: [advancedFile],
      tsConfigPath: tsConfig,
      naming: "function-name",
      signature: { parameters: "first-only", overloads: "merge" },
    });
    const find = result.signatures.find((s) => s.id === "findArticle");
    expect(find).toBeDefined();
    // Merged input is a union of `string` and `{ tag: string }`.
    const input = find?.input as Record<string, unknown>;
    const anyOf = (input.anyOf ?? input.oneOf) as unknown[] | undefined;
    expect(
      anyOf,
      `expected union for merged overload input; got ${JSON.stringify(input)}`,
    ).toBeDefined();
  });

  it("supports overloads='first' to lock onto the first declaration", async () => {
    const result = await extract({
      files: [advancedFile],
      tsConfigPath: tsConfig,
      naming: "function-name",
      signature: { parameters: "first-only", overloads: "first" },
    });
    const find = result.signatures.find((s) => s.id === "findArticle");
    const input = find?.input as Record<string, unknown>;
    // First overload: `findArticle(id: string)`.
    expect(input.type).toBe("string");
  });

  it("emits valid imports for default + namespace specifiers", async () => {
    const result = await extract({
      files: [advancedFile],
      tsConfigPath: tsConfig,
    });
    const errs = result.diagnostics.filter((d) => d.severity === "error");
    expect(
      errs,
      `unexpected errors: ${JSON.stringify(errs, null, 2)}`,
    ).toHaveLength(0);

    // Definitions for cross-file types should be present.
    const defKeys = new Set(Object.keys(result.definitions));
    expect(defKeys.has("Article")).toBe(true);
    expect(defKeys.has("Tag")).toBe(true);
  });
});
