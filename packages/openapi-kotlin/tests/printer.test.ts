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

describe("printer", () => {
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

    assert.equal(
      printFile(file),
      `package com.example.api.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val name: String?,
)
`,
    );
  });

  it("composes list, ref, primitive types", () => {
    const file = ktFile({
      packageName: "x",
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

    assert.equal(
      printFile(file),
      `package x

@Serializable
data class Page(
    val items: List<User>,
    val total: Int,
    val next: String?,
)
`,
    );
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
    assert.equal(
      printFile(file),
      `package x

@Serializable
data class Empty()
`,
    );
  });

  it("emits annotation args verbatim on properties", () => {
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

    assert.equal(
      printFile(file),
      `package x

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Foo(
    @SerialName("raw_field") val raw: String,
)
`,
    );
  });
});
