import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildKotlinProject,
  operationsToDecls,
  schemasToDecls,
} from "../dist/index.js";

describe("buildKotlinProject — M4", () => {
  it("emits one .kt per decl with correct package + auto kotlinx imports", () => {
    const decls = schemasToDecls({
      User: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" }, name: { type: "string" } },
      },
    });

    const files = buildKotlinProject(decls, {
      packageName: "com.example.api",
    });

    assert.equal(files.length, 1);
    assert.equal(files[0]!.path, "com/example/api/model/User.kt");
    assert.equal(
      files[0]!.content,
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

  it("split layout (default): interfaces in root, models in .model subpkg", () => {
    const schemaDecls = schemasToDecls({
      User: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
    });
    const opDecls = operationsToDecls({
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
    } as never);

    const files = buildKotlinProject([...schemaDecls, ...opDecls], {
      packageName: "com.example.api",
    });

    const byPath = Object.fromEntries(files.map((f) => [f.path, f.content]));
    assert.ok(byPath["com/example/api/model/User.kt"], "User in model/");
    assert.ok(byPath["com/example/api/UsersApi.kt"], "Interface in root");

    // UsersApi must auto-import com.example.api.model.User across the package boundary.
    const api = byPath["com/example/api/UsersApi.kt"]!;
    assert.match(api, /import com\.example\.api\.model\.User\n/);
    assert.match(api, /import retrofit2\.http\.GET\n/);
    assert.match(api, /import retrofit2\.http\.Path\n/);
  });

  it("flat layout: everything in same package, no cross-pkg import", () => {
    const decls = [
      ...schemasToDecls({
        User: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      }),
      ...operationsToDecls({
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
      } as never),
    ];

    const files = buildKotlinProject(decls, {
      packageName: "com.example.api",
      layout: "flat",
    });

    const byPath = Object.fromEntries(files.map((f) => [f.path, f.content]));
    assert.ok(byPath["com/example/api/User.kt"]);
    assert.ok(byPath["com/example/api/UsersApi.kt"]);
    // No cross-package import needed since they share a package.
    assert.doesNotMatch(
      byPath["com/example/api/UsersApi.kt"]!,
      /import com\.example\.api\.User/,
    );
  });

  it("does not import a ref that lives in the same package", () => {
    const decls = schemasToDecls({
      Tag: { type: "string" },
      Page: {
        type: "object",
        required: ["tags"],
        properties: {
          tags: { type: "array", items: { $ref: "#/components/schemas/Tag" } },
        },
      },
    });
    const files = buildKotlinProject(decls, {
      packageName: "com.example.api",
    });
    const page = files.find((f) => f.path.endsWith("Page.kt"))!;
    assert.doesNotMatch(page.content, /import com\.example\.api\.model\.Tag\n/);
    assert.match(page.content, /val tags: List<Tag>,/);
  });

  it("imports stay sorted alphabetically and deduped", () => {
    const decls = operationsToDecls({
      "/x": {
        post: {
          tags: ["X"],
          operationId: "doX",
          parameters: [
            {
              name: "page",
              in: "query",
              required: false,
              schema: { type: "integer" },
            },
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Body" },
              },
            },
          },
          responses: { 200: { description: "ok" } },
        },
      },
    } as never);
    const files = buildKotlinProject(decls, {
      packageName: "com.example.api",
    });
    const f = files[0]!.content;
    // All retrofit2.http.* imports present
    const importLines = f
      .split("\n")
      .filter((l) => l.startsWith("import "))
      .map((l) => l.replace("import ", ""));
    const sorted = [...importLines].sort();
    assert.deepEqual(importLines, sorted, "imports must be sorted");
    // No duplicates
    assert.equal(
      new Set(importLines).size,
      importLines.length,
      "imports must be deduped",
    );
  });

  it("custom fileLocation override wins", () => {
    const decls = schemasToDecls({
      User: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
    });
    const files = buildKotlinProject(decls, {
      packageName: "com.example.api",
      fileLocation: () => ({
        pkg: "com.example.dto",
        dir: "com/example/dto",
      }),
    });
    assert.equal(files[0]!.path, "com/example/dto/User.kt");
    assert.match(files[0]!.content, /^package com\.example\.dto\n/);
  });

  it("inline-promoted synthetic types end up in the same place as their parents", () => {
    const decls = schemasToDecls({
      User: {
        type: "object",
        required: ["address"],
        properties: {
          address: {
            type: "object",
            required: ["street"],
            properties: { street: { type: "string" } },
          },
        },
      },
    });
    const files = buildKotlinProject(decls, {
      packageName: "com.example.api",
    });
    assert.ok(files.find((f) => f.path === "com/example/api/model/User.kt"));
    assert.ok(
      files.find((f) => f.path === "com/example/api/model/User_Address.kt"),
    );
  });
});
