import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { normalizeSpec, SAFE_NORMALIZE } from "../../src/normalize/index.ts";

describe("pipeline", () => {
  it("runs allOf collapse → enum dedup → prune in one pass", () => {
    const spec = {
      openapi: "3.0.3",
      info: { title: "t", version: "1" },
      paths: {
        "/items": {
          get: {
            responses: {
              "200": {
                description: "ok",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Item" },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Item: {
            allOf: [{ $ref: "#/components/schemas/RawItem" }],
          },
          RawItem: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["on", "off"] },
            },
          },
          Dead1: {
            type: "object",
            properties: { d: { $ref: "#/components/schemas/Dead2" } },
          },
          Dead2: { type: "object" },
          AltItem: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["on", "off"] },
            },
          },
        } as Record<string, unknown>,
      },
    };

    normalizeSpec(spec, SAFE_NORMALIZE);

    assert.deepEqual(spec.components.schemas.Item, {
      $ref: "#/components/schemas/RawItem",
    });

    const enumNames = Object.keys(spec.components.schemas).filter((k) =>
      Array.isArray(
        (spec.components.schemas[k] as Record<string, unknown>)?.enum,
      ),
    );
    assert.equal(enumNames.length, 1);

    const remaining = Object.keys(spec.components.schemas).sort();
    assert.ok(remaining.includes("Dead1"));
    assert.ok(remaining.includes("Dead2"));
    assert.ok(remaining.includes("AltItem"));
  });

  it("is a no-op when no flags are passed", () => {
    const spec = {
      openapi: "3.0.3",
      info: { title: "t", version: "1" },
      paths: {},
      components: {
        schemas: {
          Unused: { type: "object" },
        },
      },
    };
    const before = JSON.stringify(spec);
    normalizeSpec(spec, {});
    assert.equal(JSON.stringify(spec), before);
  });
});
