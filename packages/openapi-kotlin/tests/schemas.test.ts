import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { printDecl, schemasToDecls } from "../dist/index.js";
import { ir } from "./_helpers.ts";

describe("schemasToDecls", () => {
  it("emits a @Serializable data class with required + optional props", () => {
    const m = ir({
      components: {
        schemas: {
          User: {
            type: "object",
            required: ["id"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
            },
          },
        },
      },
    });
    const decls = schemasToDecls(m.components?.schemas ?? {});
    assert.equal(decls.length, 1);
    const out = printDecl(decls[0]!);
    assert.match(out, /@Serializable/);
    assert.match(out, /public data class User\(/);
    assert.match(out, /public val id: String,/);
    assert.match(out, /public val name: String\? = null,/);
  });

  it("emits a @Serializable enum class with raw value + @SerialName", () => {
    const m = ir({
      components: {
        schemas: {
          Status: {
            type: "string",
            enum: ["active", "pending"],
          },
        },
      },
    });
    const decls = schemasToDecls(m.components?.schemas ?? {});
    const out = decls.map(printDecl).join("\n");
    assert.match(out, /enum class Status/);
    assert.match(out, /@SerialName\("active"\) ACTIVE\("active"\)/);
    assert.match(out, /@SerialName\("pending"\) PENDING\("pending"\)/);
  });

  it("emits a typealias for a primitive schema", () => {
    const m = ir({
      components: {
        schemas: {
          Email: { type: "string" },
        },
      },
    });
    const decls = schemasToDecls(m.components?.schemas ?? {});
    assert.equal(decls.length, 1);
    assert.match(printDecl(decls[0]!), /typealias Email = String/);
  });

  it("emits a Map<String, V> typealias for additionalProperties-only objects", () => {
    const m = ir({
      components: {
        schemas: {
          Headers: {
            type: "object",
            additionalProperties: { type: "string" },
          },
        },
      },
    });
    const decls = schemasToDecls(m.components?.schemas ?? {});
    assert.match(
      printDecl(decls[0]!),
      /typealias Headers = Map<String, String>/,
    );
  });

  it("renames camelCase from snake_case + emits @SerialName", () => {
    const m = ir({
      components: {
        schemas: {
          User: {
            type: "object",
            required: ["first_name"],
            properties: {
              first_name: { type: "string" },
            },
          },
        },
      },
    });
    const decls = schemasToDecls(m.components?.schemas ?? {});
    const out = printDecl(decls[0]!);
    assert.match(
      out,
      /@SerialName\("first_name"\) public val firstName: String,/,
    );
  });

  it("maps integer formats: int64 → Long, default → Int", () => {
    const m = ir({
      components: {
        schemas: {
          Counts: {
            type: "object",
            required: ["small", "big"],
            properties: {
              small: { type: "integer" },
              big: { type: "integer", format: "int64" },
            },
          },
        },
      },
    });
    const decls = schemasToDecls(m.components?.schemas ?? {});
    const out = decls.map(printDecl).join("\n");
    assert.match(out, /public val small: Int,/);
    assert.match(out, /public val big: Long,/);
  });

  it("inlines nested object schemas as Owner_Property data classes", () => {
    const m = ir({
      components: {
        schemas: {
          User: {
            type: "object",
            required: ["address"],
            properties: {
              address: {
                type: "object",
                required: ["city"],
                properties: { city: { type: "string" } },
              },
            },
          },
        },
      },
    });
    const decls = schemasToDecls(m.components?.schemas ?? {});
    const names = decls.map((d) =>
      d.kind === "topLevelFun" ? d.fun.name : (d as { name: string }).name,
    );
    assert.deepEqual(names.sort(), ["User", "User_Address"]);
  });

  it("maps date-time / date formats to Instant / LocalDate; uuid → String", () => {
    const m = ir({
      components: {
        schemas: {
          Event: {
            type: "object",
            required: ["startedAt", "day", "id"],
            properties: {
              startedAt: { type: "string", format: "date-time" },
              day: { type: "string", format: "date" },
              id: { type: "string", format: "uuid" },
            },
          },
        },
      },
    });
    const out = printDecl(schemasToDecls(m.components?.schemas ?? {})[0]!);
    assert.match(out, /public val startedAt: Instant,/);
    assert.match(out, /public val day: LocalDate,/);
    assert.match(out, /public val id: String,/);
  });

  it("rejects enums whose normalized entry names collide", () => {
    const m = ir({
      components: {
        schemas: {
          Foo: { type: "string", enum: ["USER", "user"] },
        },
      },
    });
    assert.throws(
      () => schemasToDecls(m.components?.schemas ?? {}),
      /entry name "USER" collides/,
    );
  });
});
