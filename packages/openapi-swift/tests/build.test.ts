import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  buildSwiftProject,
  operationsToDecls,
  schemasToDecls,
} from "../src/index.ts";
import { ir } from "./_helpers.ts";

describe("buildSwiftProject", () => {
  it("emits one .swift per decl with import Foundation", () => {
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
    const files = buildSwiftProject(
      schemasToDecls(m.components?.schemas ?? {}),
    );
    assert.equal(files.length, 1);
    assert.equal(files[0]!.path, "Models/User.swift");
    assert.match(files[0]!.content, /^import Foundation\n\n/);
  });

  it("split layout (default): protocols in API/, models in Models/", () => {
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
    const files = buildSwiftProject([
      ...schemasToDecls(m.components?.schemas ?? {}),
      ...operationsToDecls(m.paths),
    ]);
    const paths = files.map((f) => f.path);
    assert.ok(paths.includes("Models/User.swift"));
    assert.ok(paths.includes("API/UsersAPI.swift"));
  });

  it("flat layout: everything at root", () => {
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
        "/users": {
          get: {
            tags: ["Users"],
            operationId: "listUsers",
            responses: {
              200: {
                description: "ok",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: { $ref: "#/components/schemas/User" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const files = buildSwiftProject(
      [
        ...schemasToDecls(m.components?.schemas ?? {}),
        ...operationsToDecls(m.paths),
      ],
      { layout: "flat" },
    );
    assert.deepEqual(files.map((f) => f.path).sort(), [
      "APIClient.swift",
      "APIError.swift",
      "APIInterceptors.swift",
      "RequestOptions.swift",
      "URLSessionUsersAPI.swift",
      "User.swift",
      "UsersAPI+Defaults.swift",
      "UsersAPI.swift",
    ]);
  });

  it("split layout: runtime helpers ride in API/, user models in Models/", () => {
    const m = ir({
      components: {
        schemas: {
          User: {
            type: "object",
            required: ["id"],
            properties: { id: { type: "string" } },
          },
        },
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
      },
      paths: {
        "/users": {
          post: {
            tags: ["Users"],
            operationId: "createUser",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/User" },
                },
              },
            },
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
    const files = buildSwiftProject([
      ...schemasToDecls(m.components?.schemas ?? {}),
      ...operationsToDecls(m.paths),
    ]);
    const paths = files.map((f) => f.path).sort();
    // Runtime helpers (APIClient, APIError, Auth) sit alongside the
    // protocols + impl class under API/.
    assert.ok(paths.includes("API/APIClient.swift"));
    assert.ok(paths.includes("API/APIError.swift"));
    assert.ok(paths.includes("API/Auth.swift"));
    assert.ok(paths.includes("API/UsersAPI.swift"));
    assert.ok(paths.includes("API/URLSessionUsersAPI.swift"));
    // Only user-domain types land in Models/.
    assert.ok(paths.includes("Models/User.swift"));
    assert.ok(!paths.some((p) => p.startsWith("Models/APIError")));
    assert.ok(!paths.some((p) => p.startsWith("Models/Auth")));
  });

  it("package option emits a Package.swift describing a SwiftPM library", async () => {
    const { generate } = await import("../dist/index.js");
    const { mkdtemp, rm: rmDir, readFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");

    const out = await mkdtemp(path.join(tmpdir(), "openapi-swift-pkg-"));
    try {
      await generate({
        input: {
          openapi: "3.0.0",
          info: { title: "t", version: "1" },
          components: {
            schemas: {
              User: {
                type: "object",
                required: ["id"],
                properties: { id: { type: "string" } },
              },
            },
          },
          paths: {},
        },
        output: out,
        package: { name: "MyAPIClient" },
      });

      const pkg = await readFile(path.join(out, "Package.swift"), "utf8");
      assert.match(pkg, /^\/\/ swift-tools-version:5\.9\b/);
      assert.match(pkg, /name: "MyAPIClient"/);
      assert.match(
        pkg,
        /products: \[\s+\.library\(name: "MyAPIClient", targets: \["MyAPIClient"\]\),/,
      );
      assert.match(pkg, /sources: \["API", "Models"\]/);
      assert.match(pkg, /\.iOS\(\.v15\), \.macOS\(\.v13\)/);
    } finally {
      await rmDir(out, { recursive: true, force: true });
    }
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
    const files = buildSwiftProject(
      schemasToDecls(m.components?.schemas ?? {}),
      {
        fileLocation: () => ({ dir: "Sources/MyAPI" }),
      },
    );
    assert.equal(files[0]!.path, "Sources/MyAPI/User.swift");
  });
});
