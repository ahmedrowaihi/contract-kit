import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ktAnnotation,
  ktDataClass,
  ktEnum,
  ktEnumEntry,
  ktFile,
  ktFun,
  ktFunParam,
  ktInt,
  ktInterface,
  ktList,
  ktNullable,
  ktProp,
  ktRef,
  ktString,
  printFile,
} from "../dist/index.js";

describe("printer", () => {
  it("emits a public @Serializable data class with required + optional props", () => {
    const file = ktFile({
      pkg: "com.example.api",
      imports: ["kotlinx.serialization.Serializable"],
      decls: [
        ktDataClass({
          name: "User",
          annotations: [ktAnnotation("Serializable")],
          properties: [
            ktProp({ name: "id", type: ktString, inPrimary: true }),
            ktProp({
              name: "name",
              type: ktNullable(ktString),
              inPrimary: true,
              default: "null",
            }),
          ],
        }),
      ],
    });

    assert.equal(
      printFile(file),
      `package com.example.api

import kotlinx.serialization.Serializable

@Serializable
public data class User(
    public val id: String,
    public val name: String? = null,
)
`,
    );
  });

  it("emits a String-raw @Serializable enum class", () => {
    const file = ktFile({
      pkg: "com.example.api",
      decls: [
        ktEnum({
          name: "Status",
          annotations: [ktAnnotation("Serializable")],
          properties: [
            ktProp({ name: "raw", type: ktString, inPrimary: true }),
          ],
          entries: [
            ktEnumEntry("ACTIVE", `"active"`, [
              ktAnnotation("SerialName", `"active"`),
            ]),
            ktEnumEntry("PENDING", `"pending"`, [
              ktAnnotation("SerialName", `"pending"`),
            ]),
          ],
        }),
      ],
    });
    const out = printFile(file);
    assert.match(out, /enum class Status\(\n\s+public val raw: String,\n\)/);
    assert.match(out, /@SerialName\("active"\) ACTIVE\("active"\)/);
  });

  it("emits an interface with suspend funs and no body", () => {
    const file = ktFile({
      pkg: "com.example.api",
      decls: [
        ktInterface({
          name: "UsersApi",
          funs: [
            ktFun({
              name: "getUser",
              params: [ktFunParam({ name: "id", type: ktString })],
              returnType: ktRef("User"),
              modifiers: ["suspend"],
              doc: "GET /users/{id}",
            }),
          ],
        }),
      ],
    });
    assert.equal(
      printFile(file),
      `package com.example.api

public interface UsersApi {
    /** GET /users/{id} */
    suspend fun getUser(
        id: String
    ): User
}
`,
    );
  });

  it("composes List, nullable, ref types", () => {
    const file = ktFile({
      pkg: "com.example.api",
      decls: [
        ktDataClass({
          name: "Page",
          annotations: [ktAnnotation("Serializable")],
          properties: [
            ktProp({
              name: "items",
              type: ktList(ktRef("User")),
              inPrimary: true,
            }),
            ktProp({ name: "total", type: ktInt, inPrimary: true }),
            ktProp({
              name: "next",
              type: ktNullable(ktString),
              inPrimary: true,
              default: "null",
            }),
          ],
        }),
      ],
    });
    const out = printFile(file);
    assert.match(out, /public val items: List<User>/);
    assert.match(out, /public val next: String\? = null/);
  });

  it("ktNullable is idempotent (does not double-wrap)", () => {
    const t = ktNullable(ktNullable(ktString));
    assert.equal(t.kind, "nullable");
    if (t.kind === "nullable") {
      assert.equal(t.inner.kind, "primitive");
    }
  });
});
