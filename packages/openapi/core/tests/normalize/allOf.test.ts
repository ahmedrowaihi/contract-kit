import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { normalizeSpec } from "../../src/normalize/index.ts";

const baseSpec = () => ({
  openapi: "3.0.3",
  info: { title: "t", version: "1" },
  paths: {},
  components: { schemas: {} as Record<string, unknown> },
});

describe("allOf collapse", () => {
  it("folds single-element allOf into its parent", () => {
    const spec = baseSpec();
    spec.components.schemas.Wrapper = {
      allOf: [{ $ref: "#/components/schemas/Inner" }],
    };
    spec.components.schemas.Inner = {
      type: "object",
      properties: { id: { type: "string" } },
    };

    normalizeSpec(spec, { allOf: true });

    assert.deepEqual(spec.components.schemas.Wrapper, {
      $ref: "#/components/schemas/Inner",
    });
  });

  it("preserves description sibling but still collapses", () => {
    const spec = baseSpec();
    spec.components.schemas.Wrapper = {
      description: "wraps inner",
      allOf: [{ $ref: "#/components/schemas/Inner" }],
    };
    spec.components.schemas.Inner = { type: "object" };

    normalizeSpec(spec, { allOf: true });

    assert.deepEqual(spec.components.schemas.Wrapper, {
      description: "wraps inner",
      $ref: "#/components/schemas/Inner",
    });
  });

  it("leaves multi-element allOf untouched", () => {
    const spec = baseSpec();
    spec.components.schemas.Wrapper = {
      allOf: [
        { $ref: "#/components/schemas/A" },
        { $ref: "#/components/schemas/B" },
      ],
    };

    normalizeSpec(spec, { allOf: true });

    const wrapper = spec.components.schemas.Wrapper as { allOf: unknown[] };
    assert.equal(wrapper.allOf.length, 2);
  });

  it("does not collapse when meaningful schema siblings exist", () => {
    const spec = baseSpec();
    spec.components.schemas.Wrapper = {
      allOf: [{ $ref: "#/components/schemas/Inner" }],
      properties: { extra: { type: "string" } },
    };

    normalizeSpec(spec, { allOf: true });

    const wrapper = spec.components.schemas.Wrapper as Record<string, unknown>;
    assert.ok(Array.isArray(wrapper.allOf));
    assert.ok(wrapper.properties);
  });
});
