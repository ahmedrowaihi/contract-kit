import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { printFile, schemasToDecls, swFile } from "../dist/index.js";
import { ir } from "./_helpers.ts";

const decls = (components: Record<string, unknown>) =>
  schemasToDecls(
    ir({ components: { schemas: components } }).components?.schemas ?? {},
  );

describe("schemas (IR-driven)", () => {
  it("primitives + required vs optional", () => {
    const out = printFile(
      swFile({
        decls: decls({
          User: {
            type: "object",
            required: ["id", "age"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              age: { type: "integer" },
              weight: { type: "number" },
              active: { type: "boolean" },
            },
          },
        }),
      }),
    );
    assert.match(out, /public struct User: Codable \{/);
    assert.match(out, /public let id: String\n/);
    assert.match(out, /public let name: String\?\n/);
    assert.match(out, /public let age: Int\n/);
    assert.match(out, /public let weight: Double\?\n/);
    assert.match(out, /public let active: Bool\?\n/);
  });

  it("integer format=int64 → Int64; number format=float → Float", () => {
    const out = printFile(
      swFile({
        decls: decls({
          Big: {
            type: "object",
            required: ["bigId", "ratio"],
            properties: {
              bigId: { type: "integer", format: "int64" },
              ratio: { type: "number", format: "float" },
            },
          },
        }),
      }),
    );
    assert.match(out, /public let bigId: Int64\n/);
    assert.match(out, /public let ratio: Float\n/);
  });

  it("3.1 nullable via type=[T,null]", () => {
    const out = printFile(
      swFile({
        decls: decls({
          A: {
            type: "object",
            required: ["modern"],
            properties: { modern: { type: ["string", "null"] } },
          },
        }),
      }),
    );
    assert.match(out, /public let modern: String\?\n/);
  });

  it("arrays + refs", () => {
    const out = printFile(
      swFile({
        decls: decls({
          Tag: { type: "string" },
          User: {
            type: "object",
            required: ["id"],
            properties: { id: { type: "string" } },
          },
          Page: {
            type: "object",
            required: ["items", "tags"],
            properties: {
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/User" },
              },
              tags: {
                type: "array",
                items: { $ref: "#/components/schemas/Tag" },
              },
            },
          },
        }),
      }),
    );
    assert.match(out, /public typealias Tag = String/);
    assert.match(out, /public let items: \[User\]/);
    assert.match(out, /public let tags: \[Tag\]/);
  });

  it("inline nested object → promoted to synthetic struct", () => {
    const out = printFile(
      swFile({
        decls: decls({
          User: {
            type: "object",
            required: ["address"],
            properties: {
              address: {
                type: "object",
                required: ["street"],
                properties: {
                  street: { type: "string" },
                  zip: { type: "string" },
                },
              },
            },
          },
        }),
      }),
    );
    assert.match(
      out,
      /public struct User: Codable \{\n\s+public let address: User_Address\n/,
    );
    assert.match(
      out,
      /public struct User_Address: Codable \{\n\s+public let street: String\n\s+public let zip: String\?\n/,
    );
  });

  it("string enum at top level → String-raw Codable enum", () => {
    const out = printFile(
      swFile({
        decls: decls({
          Status: {
            type: "string",
            enum: ["active", "pending", "archived"],
          },
        }),
      }),
    );
    assert.match(
      out,
      /public enum Status: String, Codable \{\n\s+case active = "active"\n\s+case pending = "pending"\n\s+case archived = "archived"\n\}/,
    );
  });

  it("inline enum on a property → promoted to synthetic enum", () => {
    const out = printFile(
      swFile({
        decls: decls({
          User: {
            type: "object",
            required: ["status"],
            properties: { status: { type: "string", enum: ["a", "b"] } },
          },
        }),
      }),
    );
    assert.match(out, /public let status: User_Status\n/);
    assert.match(out, /public enum User_Status: String, Codable \{/);
  });

  it("additionalProperties: schema → typealias [String: T]; sealed → empty struct", () => {
    const out = printFile(
      swFile({
        decls: decls({
          Bag: {
            type: "object",
            additionalProperties: { type: "integer" },
          },
          Anything: {
            type: "object",
            additionalProperties: true,
          },
          Sealed: {
            type: "object",
            additionalProperties: false,
          },
        }),
      }),
    );
    assert.match(out, /public typealias Bag = \[String: Int\]/);
    assert.match(out, /public typealias Anything = \[String: Any\]/);
    assert.match(out, /public struct Sealed: Codable \{\}/);
  });
});
