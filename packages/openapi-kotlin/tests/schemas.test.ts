import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ktFile, printFile, schemasToDecls } from "../dist/index.js";
import { ir } from "./_helpers.ts";

const decls = (components: Record<string, unknown>) =>
  schemasToDecls(
    ir({ components: { schemas: components } }).components?.schemas ?? {},
  );

describe("schemas (IR-driven)", () => {
  it("primitives + required vs optional", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        imports: ["kotlinx.serialization.Serializable"],
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

    assert.equal(
      out,
      `package x

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val name: String?,
    val age: Int,
    val weight: Double?,
    val active: Boolean?,
)
`,
    );
  });

  it("integer format=int64 → Long; number format=float → Float", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
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
    assert.match(out, /val bigId: Long,/);
    assert.match(out, /val ratio: Float,/);
  });

  it("3.1 nullable via type=[T,null]", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
          A: {
            type: "object",
            required: ["modern"],
            properties: { modern: { type: ["string", "null"] } },
          },
        }),
      }),
    );
    assert.match(out, /val modern: String\?,/);
  });

  it("3.0 nullable: true is honored when openapi version is 3.0", () => {
    const m = ir(
      {
        components: {
          schemas: {
            A: {
              type: "object",
              required: ["legacy"],
              properties: { legacy: { type: "string", nullable: true } },
            },
          },
        },
      },
      "3.0",
    );
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: schemasToDecls(m.components?.schemas ?? {}),
      }),
    );
    assert.match(out, /val legacy: String\?,/);
  });

  it("arrays + refs", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
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
    assert.match(out, /typealias Tag = String/);
    assert.match(out, /val items: List<User>,/);
    assert.match(out, /val tags: List<Tag>,/);
  });

  it("inline nested object → promoted to synthetic data class", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
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
    assert.match(out, /data class User\(\s+val address: User_Address,/);
    assert.match(
      out,
      /data class User_Address\(\s+val street: String,\s+val zip: String\?,/,
    );
  });

  it("string enum at top level → @Serializable enum class", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        imports: [
          "kotlinx.serialization.SerialName",
          "kotlinx.serialization.Serializable",
        ],
        decls: decls({
          Status: {
            type: "string",
            enum: ["active", "pending", "archived"],
          },
        }),
      }),
    );
    assert.equal(
      out,
      `package x

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Status {
    @SerialName("active") Active,
    @SerialName("pending") Pending,
    @SerialName("archived") Archived,
}
`,
    );
  });

  it("inline enum on a property → promoted to synthetic enum", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
          User: {
            type: "object",
            required: ["status"],
            properties: {
              status: { type: "string", enum: ["a", "b"] },
            },
          },
        }),
      }),
    );
    assert.match(out, /val status: User_Status,/);
    assert.match(out, /enum class User_Status \{/);
  });

  it("additionalProperties: schema → typealias Map<String, T>; sealed → empty data class", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
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
    assert.match(out, /typealias Bag = Map<String, Int>/);
    assert.match(out, /typealias Anything = Map<String, Any>/);
    assert.match(out, /data class Sealed\(\)/);
  });

  it("snake_case property names preserved verbatim", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
          X: {
            type: "object",
            required: ["snake_case_field", "camelCase"],
            properties: {
              snake_case_field: { type: "string" },
              camelCase: { type: "string" },
            },
          },
        }),
      }),
    );
    assert.match(out, /val snake_case_field: String,/);
    assert.match(out, /val camelCase: String,/);
  });
});
