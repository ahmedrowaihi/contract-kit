import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { normalizeSpec } from "../../src/normalize/index.ts";

const baseSpec = () => ({
  openapi: "3.0.3",
  info: { title: "t", version: "1" },
  paths: {},
  components: { schemas: {} as Record<string, unknown> },
});

describe("enum dedup", () => {
  it("hoists identical inline enums to a single shared schema", () => {
    const spec = baseSpec();
    spec.components.schemas.ClipDTO = {
      type: "object",
      properties: {
        access_type: { type: "string", enum: ["free", "premium"] },
      },
    };
    spec.components.schemas.EpisodeDTO = {
      type: "object",
      properties: {
        access_type: { type: "string", enum: ["free", "premium"] },
      },
    };

    normalizeSpec(spec, { enums: true });

    const schemas = spec.components.schemas;
    const enumKeys = Object.keys(schemas).filter(
      (k) => (schemas[k] as Record<string, unknown>)?.enum,
    );
    assert.equal(enumKeys.length, 1);

    const [enumName] = enumKeys;
    const ref = `#/components/schemas/${enumName}`;
    assert.deepEqual(
      (schemas.ClipDTO as { properties: Record<string, unknown> }).properties
        .access_type,
      { $ref: ref },
    );
    assert.deepEqual(
      (schemas.EpisodeDTO as { properties: Record<string, unknown> }).properties
        .access_type,
      { $ref: ref },
    );
  });

  it("does not merge enums that differ in format", () => {
    const spec = baseSpec();
    spec.components.schemas.A = {
      type: "object",
      properties: {
        n: { type: "integer", format: "int32", enum: [1, 2] },
      },
    };
    spec.components.schemas.B = {
      type: "object",
      properties: {
        n: { type: "integer", format: "int64", enum: [1, 2] },
      },
    };

    normalizeSpec(spec, { enums: true });

    const enumKeys = Object.keys(spec.components.schemas).filter(
      (k) => (spec.components.schemas[k] as Record<string, unknown>)?.enum,
    );
    assert.equal(enumKeys.length, 2);
  });

  it("reuses an existing root enum when an inline matches it", () => {
    const spec = baseSpec();
    spec.components.schemas.AccessType = {
      type: "string",
      enum: ["free", "premium"],
    };
    spec.components.schemas.ClipDTO = {
      type: "object",
      properties: {
        access_type: { type: "string", enum: ["free", "premium"] },
      },
    };

    normalizeSpec(spec, { enums: true });

    const enumKeys = Object.keys(spec.components.schemas).filter(
      (k) => (spec.components.schemas[k] as Record<string, unknown>)?.enum,
    );
    assert.deepEqual(enumKeys, ["AccessType"]);
    assert.deepEqual(
      (
        spec.components.schemas.ClipDTO as {
          properties: Record<string, unknown>;
        }
      ).properties.access_type,
      { $ref: "#/components/schemas/AccessType" },
    );
  });

  it("ignores description when computing signature", () => {
    const spec = baseSpec();
    spec.components.schemas.A = {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["x", "y"],
          description: "first",
        },
      },
    };
    spec.components.schemas.B = {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["x", "y"],
          description: "second",
        },
      },
    };

    normalizeSpec(spec, { enums: true });

    const enumKeys = Object.keys(spec.components.schemas).filter(
      (k) => (spec.components.schemas[k] as Record<string, unknown>)?.enum,
    );
    assert.equal(enumKeys.length, 1);
  });

  it("uses schema title as the canonical base when present", () => {
    const spec = baseSpec();
    spec.components.schemas.A = {
      type: "object",
      properties: {
        kind: {
          title: "Visibility",
          type: "string",
          enum: ["public", "private"],
        },
      },
    };

    normalizeSpec(spec, { enums: true });

    const names = Object.keys(spec.components.schemas).filter((k) => k !== "A");
    assert.deepEqual(names, ["VisibilityEnum"]);
  });

  it("suffixes the canonical name on collision", () => {
    const spec = baseSpec();
    spec.components.schemas.AccessTypeEnum = {
      type: "string",
      enum: ["a", "b"],
    };
    spec.components.schemas.A = {
      type: "object",
      properties: {
        access_type: { type: "string", enum: ["c", "d"] },
      },
    };
    spec.components.schemas.B = {
      type: "object",
      properties: {
        access_type: { type: "string", enum: ["c", "d"] },
      },
    };

    normalizeSpec(spec, { enums: true });

    const names = Object.keys(spec.components.schemas);
    assert.ok(names.includes("AccessTypeEnum"));
    assert.ok(names.includes("AccessTypeEnum2"));
  });
});
