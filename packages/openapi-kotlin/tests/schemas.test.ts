import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ktFile, printFile, schemasToDecls } from "../dist/index.js";

describe("schemasToDecls — M2", () => {
  it("primitives + nullable: required wins, omitted prop becomes nullable", () => {
    const decls = schemasToDecls({
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
    });

    const out = printFile(
      ktFile({
        packageName: "x",
        imports: ["kotlinx.serialization.Serializable"],
        decls,
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
    const decls = schemasToDecls({
      Big: {
        type: "object",
        required: ["bigId", "ratio"],
        properties: {
          bigId: { type: "integer", format: "int64" },
          ratio: { type: "number", format: "float" },
        },
      },
    });
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /val bigId: Long,/);
    assert.match(out, /val ratio: Float,/);
  });

  it("3.1 nullable via type=[T,null] AND 3.0 nullable:true", () => {
    const decls = schemasToDecls({
      A: {
        type: "object",
        required: ["modern", "legacy"],
        properties: {
          modern: { type: ["string", "null"] } as never,
          legacy: { type: "string", nullable: true } as never,
        },
      },
    });
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /val modern: String\?,/);
    assert.match(out, /val legacy: String\?,/);
  });

  it("arrays + refs", () => {
    const decls = schemasToDecls({
      Tag: { type: "string" },
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
    });
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /typealias Tag = String/);
    assert.match(out, /val items: List<User>,/);
    assert.match(out, /val tags: List<Tag>,/);
  });

  it("inline nested object → promoted to synthetic data class", () => {
    const decls = schemasToDecls({
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
    });
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /data class User\(\s+val address: User_Address,/);
    assert.match(
      out,
      /data class User_Address\(\s+val street: String,\s+val zip: String\?,/,
    );
  });

  it("top-level string enum → @Serializable enum class with @SerialName", () => {
    const decls = schemasToDecls({
      Status: {
        type: "string",
        enum: ["active", "pending", "archived"],
      },
    });
    const out = printFile(
      ktFile({
        packageName: "x",
        imports: [
          "kotlinx.serialization.SerialName",
          "kotlinx.serialization.Serializable",
        ],
        decls,
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
    const decls = schemasToDecls({
      User: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["a", "b"] },
        },
      },
    });
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /val status: User_Status,/);
    assert.match(out, /enum class User_Status \{/);
  });

  it("top-level object with additionalProperties: schema → typealias Map<String, T>", () => {
    const decls = schemasToDecls({
      Bag: {
        type: "object",
        additionalProperties: { type: "integer" },
      } as never,
      Anything: {
        type: "object",
        additionalProperties: true,
      } as never,
      Sealed: {
        type: "object",
        additionalProperties: false,
      } as never,
    });
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /typealias Bag = Map<String, Int>/);
    assert.match(out, /typealias Anything = Map<String, Any>/);
    // additionalProperties: false → sealed empty shape → data class
    assert.match(out, /data class Sealed\(\)/);
  });

  it("snake_case property names preserved verbatim (M2 — no rename)", () => {
    const decls = schemasToDecls({
      X: {
        type: "object",
        required: ["snake_case_field", "camelCase"],
        properties: {
          snake_case_field: { type: "string" },
          camelCase: { type: "string" },
        },
      },
    });
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /val snake_case_field: String,/);
    assert.match(out, /val camelCase: String,/);
  });
});
