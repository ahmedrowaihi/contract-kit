import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ktAnnotation,
  ktDataClass,
  ktFile,
  ktInt,
  ktList,
  ktNullable,
  ktProp,
  ktRef,
  ktString,
  printFile,
} from "../dist/index.js";

describe("printer — M1", () => {
  it("emits @Serializable data class with required + nullable props", () => {
    const file = ktFile({
      packageName: "com.example.api.model",
      imports: ["kotlinx.serialization.Serializable"],
      decls: [
        ktDataClass({
          name: "User",
          annotations: [ktAnnotation("Serializable")],
          properties: [
            ktProp({ name: "id", type: ktString }),
            ktProp({ name: "name", type: ktNullable(ktString) }),
          ],
        }),
      ],
    });

    const expected = `package com.example.api.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val name: String?,
)
`;

    assert.equal(printFile(file), expected);
  });

  it("supports list, ref, primitive composition", () => {
    const file = ktFile({
      packageName: "com.example.api.model",
      imports: [],
      decls: [
        ktDataClass({
          name: "Page",
          annotations: [ktAnnotation("Serializable")],
          properties: [
            ktProp({ name: "items", type: ktList(ktRef("User")) }),
            ktProp({ name: "total", type: ktInt }),
            ktProp({ name: "next", type: ktNullable(ktString) }),
          ],
        }),
      ],
    });

    const expected = `package com.example.api.model

@Serializable
data class Page(
    val items: List<User>,
    val total: Int,
    val next: String?,
)
`;

    assert.equal(printFile(file), expected);
  });

  it("emits empty data class when no properties", () => {
    const file = ktFile({
      packageName: "x",
      decls: [
        ktDataClass({
          name: "Empty",
          properties: [],
          annotations: [ktAnnotation("Serializable")],
        }),
      ],
    });

    const expected = `package x

@Serializable
data class Empty()
`;

    assert.equal(printFile(file), expected);
  });

  it("emits annotation args verbatim", () => {
    const file = ktFile({
      packageName: "x",
      imports: [
        "kotlinx.serialization.SerialName",
        "kotlinx.serialization.Serializable",
      ],
      decls: [
        ktDataClass({
          name: "Foo",
          annotations: [ktAnnotation("Serializable")],
          properties: [
            ktProp({
              name: "raw",
              type: ktString,
              annotations: [
                ktAnnotation("SerialName", { args: ['"raw_field"'] }),
              ],
            }),
          ],
        }),
      ],
    });

    const expected = `package x

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Foo(
    @SerialName("raw_field") val raw: String,
)
`;

    assert.equal(printFile(file), expected);
  });
});
