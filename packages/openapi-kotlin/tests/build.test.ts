import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildKotlinProject,
  operationsToDecls,
  schemasToDecls,
} from "../dist/index.js";
import { ir } from "./_helpers.ts";

describe("buildKotlinProject", () => {
  it("emits one .kt per decl with auto kotlinx imports", () => {
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

  it("split layout (default): interfaces in root pkg, models in .model", () => {
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

    const files = buildKotlinProject(
      [
        ...schemasToDecls(m.components?.schemas ?? {}),
        ...operationsToDecls(m.paths),
      ],
      { packageName: "com.example.api" },
    );

    const byPath = Object.fromEntries(files.map((f) => [f.path, f.content]));
    assert.ok(byPath["com/example/api/model/User.kt"]);
    assert.ok(byPath["com/example/api/UsersApi.kt"]);
    const api = byPath["com/example/api/UsersApi.kt"]!;
    assert.match(api, /import com\.example\.api\.model\.User\n/);
    assert.match(api, /import retrofit2\.http\.GET\n/);
    assert.match(api, /import retrofit2\.http\.Path\n/);
  });

  it("flat layout: same package, no cross-pkg import", () => {
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

    const files = buildKotlinProject(
      [
        ...schemasToDecls(m.components?.schemas ?? {}),
        ...operationsToDecls(m.paths),
      ],
      { packageName: "com.example.api", layout: "flat" },
    );

    const byPath = Object.fromEntries(files.map((f) => [f.path, f.content]));
    assert.ok(byPath["com/example/api/User.kt"]);
    assert.ok(byPath["com/example/api/UsersApi.kt"]);
    assert.doesNotMatch(
      byPath["com/example/api/UsersApi.kt"]!,
      /import com\.example\.api\.User/,
    );
  });

  it("does not import a ref that lives in the same package", () => {
    const m = ir({
      components: {
        schemas: {
          Tag: { type: "string" },
          Page: {
            type: "object",
            required: ["tags"],
            properties: {
              tags: {
                type: "array",
                items: { $ref: "#/components/schemas/Tag" },
              },
            },
          },
        },
      },
    });
    const files = buildKotlinProject(
      schemasToDecls(m.components?.schemas ?? {}),
      { packageName: "com.example.api" },
    );
    const page = files.find((f) => f.path.endsWith("Page.kt"))!;
    assert.doesNotMatch(page.content, /import com\.example\.api\.model\.Tag\n/);
    assert.match(page.content, /val tags: List<Tag>,/);
  });

  it("imports stay sorted alphabetically and deduped", () => {
    const m = ir({
      components: {
        schemas: {
          Body: {
            type: "object",
            required: ["x"],
            properties: { x: { type: "string" } },
          },
        },
      },
      paths: {
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
      },
    });
    const files = buildKotlinProject(operationsToDecls(m.paths), {
      packageName: "com.example.api",
    });
    const importLines = files[0]!.content
      .split("\n")
      .filter((l) => l.startsWith("import "))
      .map((l) => l.replace("import ", ""));
    assert.deepEqual(importLines, [...importLines].sort());
    assert.equal(new Set(importLines).size, importLines.length);
  });

  it("custom fileLocation override wins", () => {
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
      {
        packageName: "com.example.api",
        fileLocation: () => ({
          pkg: "com.example.dto",
          dir: "com/example/dto",
        }),
      },
    );
    assert.equal(files[0]!.path, "com/example/dto/User.kt");
    assert.match(files[0]!.content, /^package com\.example\.dto\n/);
  });

  it("multipart binary refs MultipartBody.Part with okhttp3 import", () => {
    const m = ir({
      paths: {
        "/upload": {
          post: {
            tags: ["Upload"],
            operationId: "upload",
            requestBody: {
              required: true,
              content: {
                "multipart/form-data": {
                  schema: {
                    type: "object",
                    required: ["file"],
                    properties: {
                      file: { type: "string", format: "binary" },
                    },
                  },
                },
              },
            },
            responses: { 200: { description: "ok" } },
          },
        },
      },
    });
    const files = buildKotlinProject(operationsToDecls(m.paths), {
      packageName: "com.example.api",
    });
    const api = files.find((f) => f.path.endsWith("UploadApi.kt"))!;
    assert.match(api.content, /import okhttp3\.MultipartBody\n/);
    assert.match(api.content, /@Part\("file"\) file: MultipartBody\.Part,/);
  });
});
