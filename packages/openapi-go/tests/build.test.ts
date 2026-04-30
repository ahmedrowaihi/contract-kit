import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGoProject,
  operationsToDecls,
  schemasToDecls,
} from "../dist/index.js";
import { ir } from "./_helpers.ts";

describe("buildGoProject", () => {
  it("emits one file per type with package directive + needed imports", () => {
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
        },
      },
    });
    const files = buildGoProject(schemasToDecls(m.components?.schemas ?? {}), {
      packageName: "petstore",
    });
    assert.equal(files.length, 1);
    assert.equal(files[0]!.path, "user.go");
    assert.match(files[0]!.content, /^package petstore\n/);
    assert.match(files[0]!.content, /import "time"/);
  });

  it("groups impl methods by receiver into one file", () => {
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
    const implFile = files.find((f) => f.path === "net_http_users_api.go");
    assert.ok(implFile, "expected per-receiver impl file");
    // All four methods (get + delete + their *WithResponse) collapse here.
    assert.match(implFile!.content, /func \(a \*NetHTTPUsersAPI\) GetUser\(/);
    assert.match(
      implFile!.content,
      /func \(a \*NetHTTPUsersAPI\) GetUserWithResponse\(/,
    );
    assert.match(
      implFile!.content,
      /func \(a \*NetHTTPUsersAPI\) DeleteUser\(/,
    );
    assert.match(
      implFile!.content,
      /func \(a \*NetHTTPUsersAPI\) DeleteUserWithResponse\(/,
    );
  });

  it("snake_case respects acronyms (NetHTTPPetAPI → net_http_pet_api)", () => {
    const m = ir({
      paths: {
        "/pets": {
          get: {
            tags: ["Pet"],
            operationId: "listPets",
            responses: { 204: { description: "ok" } },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const files = buildGoProject(decls, { packageName: "petstore" });
    assert.ok(files.some((f) => f.path === "net_http_pet_api.go"));
  });

  it("emits the constructor in the same file as the receiver type", () => {
    const m = ir({
      paths: {
        "/things": {
          get: {
            tags: ["Thing"],
            operationId: "thing",
            responses: { 204: { description: "ok" } },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const files = buildGoProject(decls, { packageName: "petstore" });
    const implFile = files.find((f) => f.path === "net_http_thing_api.go");
    assert.ok(implFile);
    assert.match(implFile!.content, /func NewNetHTTPThingAPI\(/);
    assert.match(implFile!.content, /type NetHTTPThingAPI struct/);
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
