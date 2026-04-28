import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ktFile, operationsToDecls, printFile } from "../dist/index.js";

describe("operationsToDecls — M3", () => {
  it("emits @GET interface with @Path param + ref return", () => {
    const decls = operationsToDecls({
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

    const out = printFile(
      ktFile({
        packageName: "x",
        imports: ["retrofit2.http.GET", "retrofit2.http.Path"],
        decls,
      }),
    );

    assert.equal(
      out,
      `package x

import retrofit2.http.GET
import retrofit2.http.Path

interface UsersApi {
    @GET("users/{id}")
    suspend fun getUser(
        @Path("id") id: String,
    ): User
}
`,
    );
  });

  it("optional query param → nullable + default null", () => {
    const decls = operationsToDecls({
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
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Hit" },
                  },
                },
              },
            },
          },
        },
      },
    } as never);

    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /@GET\("search"\)/);
    assert.match(out, /@Query\("q"\) q: String,/);
    assert.match(out, /@Query\("limit"\) limit: Int\? = null,/);
    assert.match(out, /\): List<Hit>/);
  });

  it("@POST with @Body request body", () => {
    const decls = operationsToDecls({
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
    } as never);

    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /@POST\("users"\)/);
    assert.match(out, /@Body body: CreateUserBody,/);
    assert.match(out, /\): User/);
  });

  it("groups operations by first tag, distinct interfaces", () => {
    const decls = operationsToDecls({
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
    } as never);

    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /interface UsersApi \{/);
    assert.match(out, /interface OrdersApi \{/);
    assert.match(out, /suspend fun listUsers/);
    assert.match(out, /suspend fun listOrders/);
  });

  it("falls back to default tag when none provided", () => {
    const decls = operationsToDecls(
      {
        "/ping": {
          get: {
            operationId: "ping",
            responses: { 200: { description: "ok" } },
          },
        },
      } as never,
      { defaultTag: "Health" },
    );
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /interface HealthApi \{/);
  });

  it("synthesizes operation name from method+path when operationId missing", () => {
    const decls = operationsToDecls({
      "/users/{id}/orders": {
        get: {
          tags: ["Users"],
          responses: { 200: { description: "ok" } },
        },
      },
    } as never);
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /suspend fun getUsersIdOrders/);
  });

  it("sanitizes hyphenated param names → camelCase", () => {
    const decls = operationsToDecls({
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
            {
              name: "page-size",
              in: "query",
              required: false,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "ok" } },
        },
      },
    } as never);
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /@Header\("x-trace-id"\) xTraceId: String,/);
    assert.match(out, /@Query\("page-size"\) pageSize: Int\? = null,/);
  });

  it("response with no schema → Unit return", () => {
    const decls = operationsToDecls({
      "/logout": {
        post: {
          tags: ["Auth"],
          operationId: "logout",
          responses: { 204: { description: "no content" } },
        },
      },
    } as never);
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /suspend fun logout\(\)\n/);
  });

  it("custom interface name function", () => {
    const decls = operationsToDecls(
      {
        "/u": {
          get: {
            tags: ["Users"],
            operationId: "u",
            responses: { 200: { description: "ok" } },
          },
        },
      } as never,
      { interfaceName: (tag) => `${tag}RemoteDS` },
    );
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /interface UsersRemoteDS \{/);
  });

  it("required params precede optional params (Kotlin convention)", () => {
    const decls = operationsToDecls({
      "/x/{id}": {
        delete: {
          tags: ["X"],
          operationId: "deleteX",
          // Spec order: optional header first, then required path. Generator
          // must reorder so required-first.
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
    } as never);
    const out = printFile(ktFile({ packageName: "x", decls }));
    const idLine = out.indexOf("@Path");
    const apiKeyLine = out.indexOf("@Header");
    assert.ok(
      idLine < apiKeyLine,
      "required @Path must come before optional @Header",
    );
  });

  it("inline body schema → promoted to synthetic data class", () => {
    const decls = operationsToDecls({
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
    } as never);
    const out = printFile(ktFile({ packageName: "x", decls }));
    assert.match(out, /data class CreateThing_Body\(/);
    assert.match(out, /@Body body: CreateThing_Body,/);
  });
});
