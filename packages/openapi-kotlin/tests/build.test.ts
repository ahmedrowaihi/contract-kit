import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildKotlinProject,
  operationsToDecls,
  schemasToDecls,
} from "../dist/index.js";
import { ir } from "./_helpers.ts";

describe("buildKotlinProject", () => {
  it("emits one .kt per decl with package directive + imports", () => {
    const m = ir({
      components: {
        schemas: {
          User: {
            type: "object",
            required: ["id"],
            properties: { id: { type: "string" }, name: { type: "string" } },
          },
        },
      },
    });
    const files = buildKotlinProject(
      schemasToDecls(m.components?.schemas ?? {}),
      { packageName: "com.example.api" },
    );
    assert.equal(files.length, 1);
    assert.equal(files[0]!.path, "com/example/api/models/User.kt");
    assert.match(files[0]!.content, /^package com\.example\.api\.models\n\n/);
    assert.match(
      files[0]!.content,
      /import kotlinx\.serialization\.Serializable/,
    );
  });

  it("split layout (default): API decls in api/, models in models/", () => {
    const m = ir({
      components: {
        schemas: {
          User: {
            type: "object",
            required: ["id"],
            properties: { id: { type: "string" } },
          },
        },
      },
      paths: {
        "/users/{id}": {
          get: {
            tags: ["Users"],
            operationId: "getUser",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              200: {
                description: "ok",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
        },
      },
    });
    const { decls: opDecls } = operationsToDecls(m.paths);
    const files = buildKotlinProject(
      [...schemasToDecls(m.components?.schemas ?? {}), ...opDecls],
      { packageName: "com.example.api" },
    );
    const paths = files.map((f) => f.path);
    assert.ok(paths.includes("com/example/api/models/User.kt"));
    assert.ok(paths.includes("com/example/api/api/UsersApi.kt"));
    assert.ok(paths.includes("com/example/api/api/OkHttpUsersApi.kt"));
  });

  it("collapses extension funs that share a receiver into one file", () => {
    const m = ir({
      paths: {
        "/users": {
          get: {
            tags: ["Users"],
            operationId: "listUsers",
            responses: { 204: { description: "ok" } },
          },
          post: {
            tags: ["Users"],
            operationId: "createUser",
            responses: { 204: { description: "ok" } },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const files = buildKotlinProject(decls, { packageName: "com.example.api" });
    const extFile = files.find(
      (f) => f.path === "com/example/api/api/UsersApiExtensions.kt",
    );
    assert.ok(extFile, "expected extension fun bundle file");
    // Both convenience overloads + their *WithResponse companions live in
    // the same file.
    assert.match(extFile!.content, /fun UsersApi\.listUsers\(/);
    assert.match(extFile!.content, /fun UsersApi\.createUser\(/);
  });

  it("flat layout: everything under <pkg>/", () => {
    const m = ir({
      components: {
        schemas: {
          User: {
            type: "object",
            required: ["id"],
            properties: { id: { type: "string" } },
          },
        },
      },
    });
    const files = buildKotlinProject(
      schemasToDecls(m.components?.schemas ?? {}),
      { packageName: "com.example.api", layout: "flat" },
    );
    assert.equal(files[0]!.path, "com/example/api/User.kt");
    assert.match(files[0]!.content, /^package com\.example\.api\n\n/);
  });

  it("rejects fileLocation overrides that escape the SDK root", () => {
    const m = ir({
      components: {
        schemas: {
          User: {
            type: "object",
            required: ["id"],
            properties: { id: { type: "string" } },
          },
        },
      },
    });
    assert.throws(
      () =>
        buildKotlinProject(schemasToDecls(m.components?.schemas ?? {}), {
          packageName: "com.example.api",
          fileLocation: () => ({ dir: "../../etc" }),
        }),
      /invalid output directory/,
    );
  });
});
