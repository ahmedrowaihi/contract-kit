import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MergeConflictError, merge } from "../dist/index.js";
import type { Document } from "../dist/types.js";

const minimal = (overrides: Partial<Document> = {}): Document => ({
  openapi: "3.1.0",
  info: { title: "x", version: "0" },
  paths: {},
  ...overrides,
});

describe("merge — paths", () => {
  it("merges non-conflicting paths", () => {
    const a = minimal({ paths: { "/a": { get: { responses: {} } } } });
    const b = minimal({ paths: { "/b": { get: { responses: {} } } } });
    const out = merge([
      { label: "a", spec: a },
      { label: "b", spec: b },
    ]);
    assert.deepEqual(Object.keys(out.paths ?? {}).sort(), ["/a", "/b"]);
  });

  it("error policy throws on path collision", () => {
    const a = minimal({ paths: { "/x": { get: { responses: {} } } } });
    const b = minimal({ paths: { "/x": { get: { responses: {} } } } });
    assert.throws(
      () =>
        merge(
          [
            { label: "a", spec: a },
            { label: "b", spec: b },
          ],
          { paths: { onConflict: "error" } },
        ),
      MergeConflictError,
    );
  });

  it("first-wins keeps the earlier source", () => {
    const a = minimal({
      paths: { "/x": { get: { description: "A", responses: {} } } },
    });
    const b = minimal({
      paths: { "/x": { get: { description: "B", responses: {} } } },
    });
    const out = merge(
      [
        { label: "a", spec: a },
        { label: "b", spec: b },
      ],
      { paths: { onConflict: "first-wins" } },
    );
    assert.equal(
      (out.paths?.["/x"]?.get as { description?: string })?.description,
      "A",
    );
  });

  it("prefix policy rewrites all paths even when no collision", () => {
    const a = minimal({ paths: { "/users": { get: { responses: {} } } } });
    const b = minimal({ paths: { "/orders": { get: { responses: {} } } } });
    const out = merge(
      [
        { label: "a", spec: a },
        { label: "b", spec: b },
      ],
      { paths: { onConflict: "prefix" } },
    );
    assert.deepEqual(Object.keys(out.paths ?? {}).sort(), [
      "/a/users",
      "/b/orders",
    ]);
  });
});

describe("merge — components + refs", () => {
  it("namespace policy renames every component and rewrites refs in paths", () => {
    const a = minimal({
      paths: {
        "/p": {
          get: {
            responses: {
              200: {
                description: "ok",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Pet" },
                  },
                },
              },
            },
          },
        },
      },
      components: { schemas: { Pet: { type: "object" } } },
    });
    const out = merge([{ label: "api", spec: a }], {
      components: { onConflict: "namespace" },
    });
    assert.ok(out.components?.schemas?.api_Pet);
    assert.equal(
      (
        out.paths?.["/p"]?.get?.responses?.[200] as {
          content: { "application/json": { schema: { $ref: string } } };
        }
      ).content["application/json"].schema.$ref,
      "#/components/schemas/api_Pet",
    );
  });

  it("rewrites deep ref pointers (Pet/properties/name)", () => {
    const a = minimal({
      paths: {
        "/p": {
          get: {
            responses: {
              200: {
                description: "ok",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/Pet/properties/name",
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Pet: {
            type: "object",
            properties: { name: { type: "string" } },
          },
        },
      },
    });
    const out = merge([{ label: "api", spec: a }], {
      components: { onConflict: "namespace" },
    });
    const ref = (
      out.paths?.["/p"]?.get?.responses?.[200] as {
        content: { "application/json": { schema: { $ref: string } } };
      }
    ).content["application/json"].schema.$ref;
    assert.equal(ref, "#/components/schemas/api_Pet/properties/name");
  });

  it("rewrites cross-section component refs (parameter -> schema)", () => {
    const a = minimal({
      paths: {},
      components: {
        schemas: { PetId: { type: "integer" } },
        parameters: {
          PetIdParam: {
            name: "id",
            in: "path",
            required: true,
            schema: { $ref: "#/components/schemas/PetId" },
          },
        },
      },
    });
    const out = merge([{ label: "api", spec: a }], {
      components: { onConflict: "namespace" },
    });
    const ref = (
      out.components?.parameters?.api_PetIdParam as {
        schema: { $ref: string };
      }
    ).schema.$ref;
    assert.equal(ref, "#/components/schemas/api_PetId");
  });

  it("rewrites refs nested inside allOf/oneOf/anyOf", () => {
    const a = minimal({
      paths: {
        "/p": {
          get: {
            responses: {
              200: {
                description: "ok",
                content: {
                  "application/json": {
                    schema: {
                      allOf: [
                        { $ref: "#/components/schemas/Base" },
                        {
                          type: "object",
                          properties: {
                            tags: {
                              type: "array",
                              items: { $ref: "#/components/schemas/Tag" },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Base: { type: "object" },
          Tag: { type: "string" },
        },
      },
    });
    const out = merge([{ label: "api", spec: a }], {
      components: { onConflict: "namespace" },
    });
    const schema = (
      out.paths?.["/p"]?.get?.responses?.[200] as {
        content: { "application/json": { schema: { allOf: unknown[] } } };
      }
    ).content["application/json"].schema;
    assert.deepEqual(schema.allOf, [
      { $ref: "#/components/schemas/api_Base" },
      {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: { $ref: "#/components/schemas/api_Tag" },
          },
        },
      },
    ]);
  });

  it("leaves external refs untouched", () => {
    const a = minimal({
      paths: {
        "/p": {
          get: {
            responses: {
              200: {
                description: "ok",
                content: {
                  "application/json": {
                    schema: { $ref: "external.yaml#/Foo" },
                  },
                },
              },
            },
          },
        },
      },
    });
    const out = merge([{ label: "api", spec: a }], {
      components: { onConflict: "namespace" },
    });
    assert.equal(
      (
        out.paths?.["/p"]?.get?.responses?.[200] as {
          content: { "application/json": { schema: { $ref: string } } };
        }
      ).content["application/json"].schema.$ref,
      "external.yaml#/Foo",
    );
  });
});

describe("merge — operationId", () => {
  it("namespaces operationIds by default", () => {
    const a = minimal({
      paths: { "/x": { get: { operationId: "list", responses: {} } } },
    });
    const b = minimal({
      paths: { "/y": { get: { operationId: "list", responses: {} } } },
    });
    const out = merge([
      { label: "a", spec: a },
      { label: "b", spec: b },
    ]);
    const ids = Object.values(out.paths ?? {})
      .map((p) => (p?.get as { operationId?: string } | undefined)?.operationId)
      .filter(Boolean)
      .sort();
    assert.deepEqual(ids, ["a_list", "b_list"]);
  });

  it("error policy throws on operationId collision", () => {
    const a = minimal({
      paths: { "/x": { get: { operationId: "shared", responses: {} } } },
    });
    const b = minimal({
      paths: { "/y": { get: { operationId: "shared", responses: {} } } },
    });
    assert.throws(
      () =>
        merge(
          [
            { label: "a", spec: a },
            { label: "b", spec: b },
          ],
          {
            paths: { onConflict: "first-wins" },
            operationIds: { onConflict: "error" },
          },
        ),
      MergeConflictError,
    );
  });
});

describe("merge — tags / servers / security / info / webhooks", () => {
  it("dedupes tags by name (union)", () => {
    const a = minimal({ tags: [{ name: "x" }, { name: "y" }] });
    const b = minimal({ tags: [{ name: "y" }, { name: "z" }] });
    const out = merge([
      { label: "a", spec: a },
      { label: "b", spec: b },
    ]);
    assert.deepEqual((out.tags ?? []).map((t) => t.name).sort(), [
      "x",
      "y",
      "z",
    ]);
  });

  it("namespaces tags when policy says so", () => {
    const a = minimal({ tags: [{ name: "x" }] });
    const b = minimal({ tags: [{ name: "x" }] });
    const out = merge(
      [
        { label: "a", spec: a },
        { label: "b", spec: b },
      ],
      { tags: { strategy: "namespace" } },
    );
    assert.deepEqual((out.tags ?? []).map((t) => t.name).sort(), [
      "a:x",
      "b:x",
    ]);
  });

  it("union-merges servers, dedup by url", () => {
    const a = minimal({ servers: [{ url: "https://a.com" }] });
    const b = minimal({
      servers: [{ url: "https://a.com" }, { url: "https://b.com" }],
    });
    const out = merge([
      { label: "a", spec: a },
      { label: "b", spec: b },
    ]);
    assert.deepEqual(out.servers, [
      { url: "https://a.com" },
      { url: "https://b.com" },
    ]);
  });

  it("merges security requirements as union", () => {
    const a = minimal({ security: [{ bearerAuth: [] }] });
    const b = minimal({ security: [{ bearerAuth: [] }, { apiKey: [] }] });
    const out = merge([
      { label: "a", spec: a },
      { label: "b", spec: b },
    ]);
    assert.deepEqual(out.security, [{ bearerAuth: [] }, { apiKey: [] }]);
  });

  it("preserves first source info fields, allows override", () => {
    const a = minimal({
      info: {
        title: "A",
        version: "1.0",
        description: "first",
        license: { name: "MIT" },
      },
    });
    const out = merge([{ label: "a", spec: a }], {
      info: { title: "Combined", version: "2.0" },
    });
    assert.equal(out.info.title, "Combined");
    assert.equal(out.info.version, "2.0");
    assert.equal(out.info.description, "first");
    assert.deepEqual(out.info.license, { name: "MIT" });
  });

  it("merges webhooks (3.1)", () => {
    const a = minimal({
      webhooks: { petCreated: { post: { responses: {} } } },
    });
    const b = minimal({
      webhooks: { orderPlaced: { post: { responses: {} } } },
    });
    const out = merge([
      { label: "a", spec: a },
      { label: "b", spec: b },
    ]);
    assert.deepEqual(Object.keys(out.webhooks ?? {}).sort(), [
      "orderPlaced",
      "petCreated",
    ]);
  });
});

describe("merge — empty / single source", () => {
  it("returns minimal doc for empty input", () => {
    const out = merge([]);
    assert.equal(out.openapi, "3.1.0");
    assert.deepEqual(out.paths, {});
  });

  it("passes a single source through with namespacing applied", () => {
    const a = minimal({
      paths: {
        "/p": {
          get: {
            responses: {
              200: {
                description: "ok",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Pet" },
                  },
                },
              },
            },
          },
        },
      },
      components: { schemas: { Pet: { type: "object" } } },
    });
    const out = merge([{ label: "api", spec: a }]);
    assert.ok(out.components?.schemas?.api_Pet);
  });
});
