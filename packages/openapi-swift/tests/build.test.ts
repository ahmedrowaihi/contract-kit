import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSwiftProject,
  operationsToDecls,
  schemasToDecls,
} from "../dist/index.js";
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
      "URLSessionUsersAPI.swift",
      "User.swift",
      "UsersAPI.swift",
    ]);
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
