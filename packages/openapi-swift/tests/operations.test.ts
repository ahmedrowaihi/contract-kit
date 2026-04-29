import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { operationsToDecls, printFile, swFile } from "../dist/index.js";
import { ir } from "./_helpers.ts";

const decls = (
  paths: Record<string, unknown>,
  schemas: Record<string, unknown> = {},
) => operationsToDecls(ir({ components: { schemas }, paths }).paths);

describe("operations (IR-driven)", () => {
  it("GET protocol with path param + ref return", () => {
    const out = printFile(
      swFile({
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
    assert.match(out, /public protocol UsersAPI \{/);
    assert.match(out, /\/\/\/ GET \/users\/\{id\}/);
    assert.match(out, /func getUser\(\s+id: String\s+\) async throws -> User/);
  });

  it("optional query param → optional + nil default", () => {
    const out = printFile(
      swFile({
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
    assert.match(out, /q: String,\s+limit: Int\? = nil/);
  });

  it("@POST with JSON body", () => {
    const out = printFile(
      swFile({
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
    assert.match(out, /body: CreateUserBody/);
    assert.match(out, /async throws -> User/);
  });

  it("required params lead optional ones", () => {
    const out = printFile(
      swFile({
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
    assert.ok(out.indexOf("id: String") < out.indexOf("apiKey: String?"));
  });

  it("multipart/form-data → per-property params; binary → Data", () => {
    const out = printFile(
      swFile({
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
    assert.match(out, /file: Data,/);
    assert.match(out, /title: String\? = nil/);
  });

  it("application/octet-stream → body: Data", () => {
    const out = printFile(
      swFile({
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
    assert.match(out, /body: Data/);
  });

  it("204 / empty 2xx → no `-> Type` (Void)", () => {
    const out = printFile(
      swFile({
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
    assert.match(out, /func logout\(\) async throws\n/);
  });

  it("groups operations by first tag → distinct protocols", () => {
    const out = printFile(
      swFile({
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
    assert.match(out, /public protocol UsersAPI \{/);
    assert.match(out, /public protocol OrdersAPI \{/);
  });

  it("emits a URLSession impl class alongside each protocol", () => {
    const out = printFile(
      swFile({
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
    assert.match(out, /public final class URLSessionUsersAPI: UsersAPI \{/);
    assert.match(out, /^ {4}let baseURL: URL$/m);
    assert.match(out, /^ {4}let session: URLSession$/m);
    assert.match(out, /public init\(/);
    assert.match(out, /session: URLSession = \.shared/);
    assert.match(
      out,
      /let url = baseURL\.appendingPathComponent\("users\/\\\(id\)"\)/,
    );
    assert.match(out, /var request = URLRequest\(url: url\)/);
    assert.match(out, /request\.httpMethod = "GET"/);
    assert.match(
      out,
      /let \(data, _\) = try await session\.data\(for: request\)/,
    );
    assert.match(out, /return try decoder\.decode\(User\.self, from: data\)/);
  });

  it("optional query param → if let / append URLQueryItem", () => {
    const out = printFile(
      swFile({
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
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    assert.match(
      out,
      /var components = URLComponents\(url: baseURL\.appendingPathComponent\("search"\), resolvingAgainstBaseURL: false\)!/,
    );
    assert.match(out, /components\.queryItems = \[URLQueryItem\]\(\)/);
    assert.match(
      out,
      /components\.queryItems!\.append\(URLQueryItem\(name: "q", value: "\\\(q\)"\)\)/,
    );
    assert.match(out, /if let limit = limit \{/);
    assert.match(out, /let url = components\.url!/);
  });

  it("JSON body impl: setValue Content-Type + try encoder.encode", () => {
    const out = printFile(
      swFile({
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
                responses: { 200: { description: "ok" } },
              },
            },
          },
          {
            CreateUserBody: {
              type: "object",
              required: ["email"],
              properties: { email: { type: "string" } },
            },
          },
        ),
      }),
    );
    assert.match(
      out,
      /request\.setValue\("application\/json", forHTTPHeaderField: "Content-Type"\)/,
    );
    assert.match(out, /request\.httpBody = try encoder\.encode\(body\)/);
  });

  it("multipart body impl throws unimplementedBody for now", () => {
    const out = printFile(
      swFile({
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
    assert.match(
      out,
      /throw URLSessionAPIError\.unimplementedBody\(mediaType: "multipart\/form-data"\)/,
    );
  });

  it("optional header is wrapped in if let", () => {
    const out = printFile(
      swFile({
        decls: decls({
          "/x": {
            get: {
              tags: ["X"],
              operationId: "doX",
              parameters: [
                {
                  name: "x-trace-id",
                  in: "header",
                  required: false,
                  schema: { type: "string" },
                },
              ],
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    assert.match(out, /if let xTraceId = xTraceId \{/);
    assert.match(
      out,
      /request\.setValue\("\\\(xTraceId\)", forHTTPHeaderField: "x-trace-id"\)/,
    );
  });

  it("protocolOnly: true skips the impl class", () => {
    const out = printFile(
      swFile({
        decls: operationsToDecls(
          ir({
            paths: {
              "/u": {
                get: {
                  tags: ["U"],
                  operationId: "u",
                  responses: { 200: { description: "ok" } },
                },
              },
            },
          }).paths,
          { protocolOnly: true },
        ),
      }),
    );
    assert.match(out, /public protocol UAPI \{/);
    assert.doesNotMatch(out, /class URLSessionUAPI/);
  });

  it("custom protocol name function", () => {
    const out = printFile(
      swFile({
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
          { protocolName: (tag) => `${tag}Service` },
        ),
      }),
    );
    assert.match(out, /public protocol UsersService \{/);
  });
});
