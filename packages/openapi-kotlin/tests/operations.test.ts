import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ktFile, operationsToDecls, printFile } from "../dist/index.js";
import { ir } from "./_helpers.ts";

const decls = (
  paths: Record<string, unknown>,
  schemas: Record<string, unknown> = {},
) => operationsToDecls(ir({ components: { schemas }, paths }).paths);

describe("operations (IR-driven)", () => {
  it("@GET interface with @Path param + ref return", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls(
          {
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
          {
            User: {
              type: "object",
              required: ["id"],
              properties: { id: { type: "string" } },
            },
          },
        ),
      }),
    );

    assert.match(out, /interface UsersApi \{/);
    assert.match(out, /@GET\("users\/\{id\}"\)/);
    assert.match(
      out,
      /suspend fun getUser\(\s+@Path\("id"\) id: String,\s+\): User/,
    );
  });

  it("optional query param → nullable + default null", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
          "/search": {
            get: {
              tags: ["Search"],
              operationId: "search",
              parameters: [
                {
                  name: "q",
                  in: "query",
                  required: true,
                  schema: { type: "string" },
                },
                {
                  name: "limit",
                  in: "query",
                  required: false,
                  schema: { type: "integer" },
                },
              ],
              responses: {
                200: {
                  description: "ok",
                  content: {
                    "application/json": {
                      schema: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        }),
      }),
    );
    assert.match(out, /@Query\("q"\) q: String,/);
    assert.match(out, /@Query\("limit"\) limit: Int\? = null,/);
  });

  it("@POST + @Body for application/json", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls(
          {
            "/users": {
              post: {
                tags: ["Users"],
                operationId: "createUser",
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/CreateUserBody" },
                    },
                  },
                },
                responses: {
                  201: {
                    description: "created",
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
          {
            CreateUserBody: {
              type: "object",
              required: ["email"],
              properties: { email: { type: "string" } },
            },
            User: {
              type: "object",
              required: ["id"],
              properties: { id: { type: "string" } },
            },
          },
        ),
      }),
    );
    assert.match(out, /@POST\("users"\)/);
    assert.match(out, /@Body body: CreateUserBody,/);
    assert.match(out, /\): User/);
  });

  it("required params lead optional ones", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
          "/x/{id}": {
            delete: {
              tags: ["X"],
              operationId: "deleteX",
              parameters: [
                {
                  name: "api_key",
                  in: "header",
                  required: false,
                  schema: { type: "string" },
                },
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
        }),
      }),
    );
    assert.ok(out.indexOf("@Path") < out.indexOf("@Header"));
  });

  it("multipart/form-data → @Multipart + @Part per property; binary → MultipartBody.Part", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
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
                        title: { type: "string" },
                      },
                    },
                  },
                },
              },
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    assert.match(out, /@Multipart/);
    assert.match(out, /@Part\("file"\) file: MultipartBody\.Part,/);
    assert.match(out, /@Part\("title"\) title: String\? = null,/);
  });

  it("application/x-www-form-urlencoded → @FormUrlEncoded + @Field", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
          "/auth/token": {
            post: {
              tags: ["Auth"],
              operationId: "token",
              requestBody: {
                required: true,
                content: {
                  "application/x-www-form-urlencoded": {
                    schema: {
                      type: "object",
                      required: ["username", "password"],
                      properties: {
                        username: { type: "string" },
                        password: { type: "string" },
                      },
                    },
                  },
                },
              },
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    assert.match(out, /@FormUrlEncoded/);
    assert.match(out, /@Field\("username"\) username: String,/);
    assert.match(out, /@Field\("password"\) password: String,/);
  });

  it("application/octet-stream → @Body body: RequestBody", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
          "/upload": {
            post: {
              tags: ["Upload"],
              operationId: "uploadRaw",
              requestBody: {
                required: true,
                content: {
                  "application/octet-stream": {
                    schema: { type: "string", format: "binary" },
                  },
                },
              },
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    assert.match(out, /@Body body: RequestBody,/);
  });

  it("204 / empty 2xx → Unit return (function has no `: Type`)", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
          "/logout": {
            post: {
              tags: ["Auth"],
              operationId: "logout",
              responses: { 204: { description: "no content" } },
            },
          },
        }),
      }),
    );
    assert.match(out, /suspend fun logout\(\)\n/);
  });

  it("groups operations by first tag → distinct interfaces", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
          "/users": {
            get: {
              tags: ["Users"],
              operationId: "listUsers",
              responses: { 200: { description: "ok" } },
            },
          },
          "/orders": {
            get: {
              tags: ["Orders"],
              operationId: "listOrders",
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    assert.match(out, /interface UsersApi \{/);
    assert.match(out, /interface OrdersApi \{/);
  });

  it("hyphenated param names → camelCase identifier; raw spec name kept in annotation", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
          "/items": {
            get: {
              tags: ["Items"],
              operationId: "listItems",
              parameters: [
                {
                  name: "x-trace-id",
                  in: "header",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    assert.match(out, /@Header\("x-trace-id"\) xTraceId: String,/);
  });

  it("inline body schema → promoted to synthetic data class", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: decls({
          "/things": {
            post: {
              tags: ["Things"],
              operationId: "createThing",
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      required: ["name"],
                      properties: {
                        name: { type: "string" },
                        tags: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    assert.match(out, /data class CreateThing_Body\(/);
    assert.match(out, /@Body body: CreateThing_Body,/);
  });

  it("custom interface name function", () => {
    const out = printFile(
      ktFile({
        packageName: "x",
        decls: operationsToDecls(
          ir({
            paths: {
              "/u": {
                get: {
                  tags: ["Users"],
                  operationId: "u",
                  responses: { 200: { description: "ok" } },
                },
              },
            },
          }).paths,
          { interfaceName: (tag) => `${tag}RemoteDS` },
        ),
      }),
    );
    assert.match(out, /interface UsersRemoteDS \{/);
  });
});
