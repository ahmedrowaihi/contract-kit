import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { normalizeSpec } from "../../src/normalize/index.ts";

const baseSpec = () => ({
  openapi: "3.0.3",
  info: { title: "t", version: "1" },
  paths: {},
  components: { schemas: {} as Record<string, unknown> },
});

describe("hoist metadata preservation", () => {
  it("uses the longest description across enum hits", () => {
    const spec = baseSpec();
    spec.components.schemas.A = {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["x", "y"],
          description: "short",
        },
      },
    };
    spec.components.schemas.B = {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["x", "y"],
          description: "the most detailed one — wins",
        },
      },
    };
    spec.components.schemas.C = {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["x", "y"],
          description: "medium length",
        },
      },
    };

    normalizeSpec(spec, { enums: true });

    const enumName = Object.keys(spec.components.schemas).find((k) =>
      Array.isArray(
        (spec.components.schemas[k] as Record<string, unknown>)?.enum,
      ),
    );
    assert.ok(enumName);
    const hoisted = spec.components.schemas[enumName] as Record<
      string,
      unknown
    >;
    assert.equal(hoisted.description, "the most detailed one — wins");
  });

  it("propagates deprecated when any hit was marked", () => {
    const spec = baseSpec();
    spec.components.schemas.A = {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["x", "y"] },
      },
    };
    spec.components.schemas.B = {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["x", "y"],
          deprecated: true,
        },
      },
    };

    normalizeSpec(spec, { enums: true });

    const enumName = Object.keys(spec.components.schemas).find((k) =>
      Array.isArray(
        (spec.components.schemas[k] as Record<string, unknown>)?.enum,
      ),
    );
    assert.ok(enumName);
    const hoisted = spec.components.schemas[enumName] as Record<
      string,
      unknown
    >;
    assert.equal(hoisted.deprecated, true);
  });

  it("picks first non-undefined example across hits", () => {
    const spec = baseSpec();
    spec.components.schemas.A = {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["x", "y"] },
      },
    };
    spec.components.schemas.B = {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["x", "y"], example: "x" },
      },
    };

    normalizeSpec(spec, { enums: true });

    const enumName = Object.keys(spec.components.schemas).find((k) =>
      Array.isArray(
        (spec.components.schemas[k] as Record<string, unknown>)?.enum,
      ),
    );
    assert.ok(enumName);
    const hoisted = spec.components.schemas[enumName] as Record<
      string,
      unknown
    >;
    assert.equal(hoisted.example, "x");
  });

  it("preserves description on hoisted objects", () => {
    const spec = baseSpec();
    const shape = (description: string) => ({
      title: "Coords",
      description,
      type: "object",
      properties: {
        a: { type: "string" },
        b: { type: "string" },
        c: { type: "string" },
      },
    });
    spec.components.schemas.A = {
      type: "object",
      properties: { coord: shape("first sketch") },
    };
    spec.components.schemas.B = {
      type: "object",
      properties: { coord: shape("the canonical, longest description") },
    };

    normalizeSpec(spec, { objects: true });

    const hoisted = spec.components.schemas.CoordsObject as Record<
      string,
      unknown
    >;
    assert.ok(hoisted);
    assert.equal(hoisted.description, "the canonical, longest description");
    assert.equal(hoisted.title, "Coords");
  });
});
