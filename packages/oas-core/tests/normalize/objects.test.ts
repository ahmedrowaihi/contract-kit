import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { normalizeSpec } from "../../src/normalize/index.ts";

const baseSpec = () => ({
  openapi: "3.0.3",
  info: { title: "t", version: "1" },
  paths: {},
  components: { schemas: {} as Record<string, unknown> },
});

describe("object dedup", () => {
  it("hoists identical inline objects with the same property shape", () => {
    const spec = baseSpec();
    spec.components.schemas.Outer1 = {
      type: "object",
      properties: {
        coord: {
          type: "object",
          properties: {
            lat: { type: "number" },
            lng: { type: "number" },
            alt: { type: "number" },
          },
          required: ["lat", "lng"],
        },
      },
    };
    spec.components.schemas.Outer2 = {
      type: "object",
      properties: {
        coord: {
          type: "object",
          properties: {
            lat: { type: "number" },
            lng: { type: "number" },
            alt: { type: "number" },
          },
          required: ["lat", "lng"],
        },
      },
    };

    normalizeSpec(spec, { objects: true });

    const ref1 = (
      spec.components.schemas.Outer1 as {
        properties: Record<string, unknown>;
      }
    ).properties.coord;
    const ref2 = (
      spec.components.schemas.Outer2 as {
        properties: Record<string, unknown>;
      }
    ).properties.coord;
    assert.deepEqual(ref1, ref2);
    assert.ok(typeof ref1 === "object" && ref1 !== null && "$ref" in ref1);
  });

  it("does not hoist single-occurrence inline objects", () => {
    const spec = baseSpec();
    spec.components.schemas.Outer = {
      type: "object",
      properties: {
        once: {
          type: "object",
          properties: {
            a: { type: "string" },
            b: { type: "string" },
            c: { type: "string" },
          },
        },
      },
    };

    normalizeSpec(spec, { objects: true });

    const namesAfter = Object.keys(spec.components.schemas);
    assert.deepEqual(namesAfter, ["Outer"]);
  });

  it("respects minProperties to skip too-tiny shapes", () => {
    const spec = baseSpec();
    spec.components.schemas.A = {
      type: "object",
      properties: {
        slim: {
          type: "object",
          properties: { id: { type: "string" } },
        },
      },
    };
    spec.components.schemas.B = {
      type: "object",
      properties: {
        slim: {
          type: "object",
          properties: { id: { type: "string" } },
        },
      },
    };

    normalizeSpec(spec, { objects: { minProperties: 3 } });

    const namesAfter = Object.keys(spec.components.schemas).sort();
    assert.deepEqual(namesAfter, ["A", "B"]);
  });

  it("does not reuse an existing root schema with matching signature", () => {
    const spec = baseSpec();
    spec.components.schemas.LiveEventInfo = {
      type: "object",
      properties: {
        a: { type: "string" },
        b: { type: "string" },
        c: { type: "string" },
      },
    };
    spec.components.schemas.Wrapper = {
      type: "object",
      properties: {
        widget: {
          type: "object",
          properties: {
            a: { type: "string" },
            b: { type: "string" },
            c: { type: "string" },
          },
        },
      },
    };
    normalizeSpec(spec, { objects: true });

    const widget = (
      spec.components.schemas.Wrapper as {
        properties: Record<string, unknown>;
      }
    ).properties.widget as Record<string, unknown>;
    assert.equal(widget.$ref, undefined);
    assert.equal(widget.type, "object");
  });

  it("skips numeric / generic property keys when no title is set", () => {
    const spec = baseSpec();
    const shape = {
      type: "object",
      properties: {
        a: { type: "string" },
        b: { type: "string" },
        c: { type: "string" },
      },
    };
    spec.components.schemas.A = {
      type: "object",
      properties: { data: shape },
    };
    spec.components.schemas.B = {
      type: "object",
      properties: { data: shape },
    };
    normalizeSpec(spec, { objects: true });

    const names = Object.keys(spec.components.schemas).sort();
    assert.deepEqual(names, ["A", "B"]);
  });

  it("hoists generic-keyed inlines when the schema carries a title", () => {
    const spec = baseSpec();
    const shape = {
      title: "Coords",
      type: "object",
      properties: {
        a: { type: "string" },
        b: { type: "string" },
        c: { type: "string" },
      },
    };
    spec.components.schemas.A = {
      type: "object",
      properties: { data: shape },
    };
    spec.components.schemas.B = {
      type: "object",
      properties: { data: shape },
    };
    normalizeSpec(spec, { objects: true });

    const names = Object.keys(spec.components.schemas).sort();
    assert.ok(names.includes("CoordsObject"));
  });

  it("skips objects carrying composition keywords", () => {
    const spec = baseSpec();
    spec.components.schemas.A = {
      type: "object",
      properties: {
        composed: {
          allOf: [{ $ref: "#/components/schemas/X" }],
          properties: {
            a: { type: "string" },
            b: { type: "string" },
            c: { type: "string" },
          },
        },
      },
    };
    spec.components.schemas.B = {
      type: "object",
      properties: {
        composed: {
          allOf: [{ $ref: "#/components/schemas/X" }],
          properties: {
            a: { type: "string" },
            b: { type: "string" },
            c: { type: "string" },
          },
        },
      },
    };
    spec.components.schemas.X = { type: "object" };

    normalizeSpec(spec, { objects: true });

    const namesAfter = Object.keys(spec.components.schemas).sort();
    assert.deepEqual(namesAfter, ["A", "B", "X"]);
  });
});
