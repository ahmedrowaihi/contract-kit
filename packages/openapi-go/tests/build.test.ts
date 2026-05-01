import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  buildGoProject,
  operationsToDecls,
  schemasToDecls,
} from "../src/index.ts";
import { ir } from "./_helpers.ts";

describe("buildGoProject", () => {
  it("consolidates schema-derived types into models.go", () => {
    const m = ir({
      components: {
        schemas: {
          User: {
            type: "object",
            required: ["id"],
            properties: {
              id: { type: "string" },
              startedAt: { type: "string", format: "date-time" },
            },
          },
          Pet: {
            type: "object",
            required: ["name"],
            properties: { name: { type: "string" } },
          },
        },
      },
    });
    const files = buildGoProject(schemasToDecls(m.components?.schemas ?? {}), {
      packageName: "petstore",
    });
    assert.equal(files.length, 1);
    assert.equal(files[0]!.path, "models.go");
    assert.match(files[0]!.content, /^package petstore\n/);
    assert.match(files[0]!.content, /import "time"/);
    assert.match(files[0]!.content, /type User struct/);
    assert.match(files[0]!.content, /type Pet struct/);
  });

  it("groups each tag's interface + impl + methods into <tag>.go", () => {
    const m = ir({
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
            responses: { 204: { description: "ok" } },
          },
          delete: {
            tags: ["Users"],
            operationId: "deleteUser",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: { 204: { description: "ok" } },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const files = buildGoProject(decls, { packageName: "petstore" });
    const tagFile = files.find((f) => f.path === "users.go");
    assert.ok(tagFile, "expected per-tag file");
    // Interface + impl struct + constructor + every method (incl.
    // *WithResponse twins) all collapse into the same file.
    assert.match(tagFile!.content, /type UsersAPI interface/);
    assert.match(tagFile!.content, /type NetHTTPUsersAPI struct/);
    assert.match(tagFile!.content, /func NewNetHTTPUsersAPI\(/);
    assert.match(tagFile!.content, /func \(a \*NetHTTPUsersAPI\) GetUser\(/);
    assert.match(
      tagFile!.content,
      /func \(a \*NetHTTPUsersAPI\) GetUserWithResponse\(/,
    );
    assert.match(tagFile!.content, /func \(a \*NetHTTPUsersAPI\) DeleteUser\(/);
    assert.match(
      tagFile!.content,
      /func \(a \*NetHTTPUsersAPI\) DeleteUserWithResponse\(/,
    );
  });

  it("snake_case respects acronyms when forming the tag filename", () => {
    const m = ir({
      paths: {
        "/x": {
          get: {
            tags: ["VideoStream"],
            operationId: "x",
            responses: { 204: { description: "ok" } },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const files = buildGoProject(decls, { packageName: "petstore" });
    assert.ok(files.some((f) => f.path === "video_stream.go"));
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
        buildGoProject(schemasToDecls(m.components?.schemas ?? {}), {
          packageName: "petstore",
          fileLocation: () => ({ dir: "../../etc" }),
        }),
      /invalid output directory/,
    );
  });
});
