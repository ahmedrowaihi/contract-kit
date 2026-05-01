import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { normalizeSpec } from "../../src/normalize/index.ts";
import { pruneUnusedSchemas } from "../../src/normalize/prune.ts";

const baseSpec = () => ({
  openapi: "3.0.3",
  info: { title: "t", version: "1" },
  paths: {} as Record<string, unknown>,
  components: { schemas: {} as Record<string, unknown> },
});

describe("prune (low-level, with targets)", () => {
  it("drops only schemas in `targets` that are unreferenced", () => {
    const spec = baseSpec();
    spec.components.schemas.UsedHoisted = { type: "object" };
    spec.components.schemas.UnusedHoisted = { type: "object" };
    spec.components.schemas.UnusedAuthored = { type: "object" };
    spec.paths["/x"] = {
      get: {
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UsedHoisted" },
              },
            },
          },
        },
      },
    };

    pruneUnusedSchemas(spec, {
      targets: new Set(["UsedHoisted", "UnusedHoisted"]),
    });

    const remaining = Object.keys(spec.components.schemas).sort();
    assert.deepEqual(remaining, ["UnusedAuthored", "UsedHoisted"]);
  });

  it("does global sweep when targets is omitted", () => {
    const spec = baseSpec();
    spec.components.schemas.Used = { type: "object" };
    spec.components.schemas.Unused = { type: "object" };
    spec.paths["/x"] = {
      get: {
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Used" },
              },
            },
          },
        },
      },
    };

    pruneUnusedSchemas(spec);

    assert.deepEqual(Object.keys(spec.components.schemas), ["Used"]);
  });

  it("keeps transitively referenced schemas", () => {
    const spec = baseSpec();
    spec.components.schemas.Root = {
      type: "object",
      properties: { child: { $ref: "#/components/schemas/Child" } },
    };
    spec.components.schemas.Child = { type: "object" };
    spec.components.schemas.Lonely = { type: "object" };
    spec.paths["/x"] = {
      get: {
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Root" },
              },
            },
          },
        },
      },
    };

    pruneUnusedSchemas(spec);

    const remaining = Object.keys(spec.components.schemas).sort();
    assert.deepEqual(remaining, ["Child", "Root"]);
  });
});

describe("prune via orchestrator (scoped to hoisted)", () => {
  it("never deletes user-authored schemas, even when unreferenced", () => {
    const spec = baseSpec();
    spec.components.schemas.Authored = { type: "object" };
    spec.components.schemas.Island1 = {
      type: "object",
      properties: { x: { $ref: "#/components/schemas/Island2" } },
    };
    spec.components.schemas.Island2 = {
      type: "object",
      properties: { y: { $ref: "#/components/schemas/Island1" } },
    };

    normalizeSpec(spec, { prune: true });

    const remaining = Object.keys(spec.components.schemas).sort();
    assert.deepEqual(remaining, ["Authored", "Island1", "Island2"]);
  });

  it("keeps hoisted enums alive when their authored host is reachable", () => {
    const spec = baseSpec();
    spec.components.schemas.Authored = {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["a", "b"] },
      },
    };
    spec.components.schemas.AnotherAuthored = {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["a", "b"] },
      },
    };
    spec.paths["/x"] = {
      get: {
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Authored" },
              },
            },
          },
        },
      },
    };

    normalizeSpec(spec, { enums: true, prune: true });

    const names = Object.keys(spec.components.schemas).sort();
    assert.ok(names.includes("Authored"));
    assert.ok(names.includes("AnotherAuthored"));
    assert.ok(names.some((n) => n.endsWith("Enum")));
  });
});
