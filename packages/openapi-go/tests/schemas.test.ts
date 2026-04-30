import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { printDecl, schemasToDecls } from "../dist/index.js";
import { ir } from "./_helpers.ts";

describe("schemasToDecls", () => {
  it("emits a struct with json tags + omitempty for optional fields", () => {
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
    assert.match(out, /type User struct \{/);
    assert.match(out, /\tId string `json:"id"`/);
    assert.match(out, /\tName \*string `json:"name,omitempty"`/);
  });

  it("emits typed-string + const-block for enum schemas", () => {
    const m = ir({
      components: {
        schemas: {
          Status: { type: "string", enum: ["active", "pending"] },
        },
      },
    });
    const decls = schemasToDecls(m.components?.schemas ?? {});
    const out = decls.map(printDecl).join("\n");
    assert.match(out, /type Status string/);
    assert.match(out, /StatusActive Status = "active"/);
    assert.match(out, /StatusPending Status = "pending"/);
  });

  it("maps integer formats: int64 → int64, default → int", () => {
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
    const out = schemasToDecls(m.components?.schemas ?? {})
      .map(printDecl)
      .join("\n");
    assert.match(out, /Small int /);
    assert.match(out, /Big int64 /);
  });

  it("maps date-time / date to time.Time; uuid → string", () => {
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
    assert.match(out, /StartedAt time\.Time /);
    assert.match(out, /Day time\.Time /);
    assert.match(out, /Id string /);
  });

  it("inlines nested objects as Owner+Property structs (no underscore)", () => {
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
    const names = decls
      .filter((d) => d.kind !== "constBlock")
      .map((d) => (d as { name: string }).name);
    assert.deepEqual(names.sort(), ["User", "UserAddress"]);
  });

  it("collapses additionalProperties-only objects to map alias", () => {
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
    assert.match(
      printDecl(schemasToDecls(m.components?.schemas ?? {})[0]!),
      /type Headers map\[string\]string/,
    );
  });

  it("rejects enums whose normalized entry names collide", () => {
    const m = ir({
      components: {
        schemas: {
          // Both raw values normalize via enumEntrySuffix to "UserName".
          Foo: { type: "string", enum: ["user_name", "userName"] },
        },
      },
    });
    assert.throws(
      () => schemasToDecls(m.components?.schemas ?? {}),
      /entry name "FooUserName" collides/,
    );
  });

  it("emits a typed-int enum for integer-valued enum schemas", () => {
    const m = ir({
      components: {
        schemas: {
          Rotate: { type: "integer", enum: [0, 90, 180, 270] },
        },
      },
    });
    const out = schemasToDecls(m.components?.schemas ?? {})
      .map(printDecl)
      .join("\n");
    assert.match(out, /type Rotate int/);
    assert.match(out, /Rotate0 Rotate = 0/);
    assert.match(out, /Rotate90 Rotate = 90/);
    assert.match(out, /Rotate180 Rotate = 180/);
    assert.match(out, /Rotate270 Rotate = 270/);
  });

  it("integer-enum negative values get a Neg<abs> suffix", () => {
    const m = ir({
      components: {
        schemas: {
          Bias: { type: "integer", enum: [-1, 0, 1] },
        },
      },
    });
    const out = schemasToDecls(m.components?.schemas ?? {})
      .map(printDecl)
      .join("\n");
    assert.match(out, /BiasNeg1 Bias = -1/);
    assert.match(out, /Bias0 Bias = 0/);
    assert.match(out, /Bias1 Bias = 1/);
  });

  it("rejects enums with mixed string + integer members", () => {
    const m = ir({
      components: {
        schemas: {
          Mixed: { type: "string", enum: ["a", 1] },
        },
      },
    });
    assert.throws(
      () => schemasToDecls(m.components?.schemas ?? {}),
      /must all be strings or all integers/,
    );
  });
});
