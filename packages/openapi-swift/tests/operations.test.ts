import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { operationsToDecls, printFile, swFile } from "../dist/index.js";
import { ir, securityNamesMap } from "./_helpers.ts";

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

  it("application/x-www-form-urlencoded → URLComponents.percentEncodedQuery", () => {
    const out = printFile(
      swFile({
        decls: decls({
          "/forms": {
            post: {
              tags: ["Forms"],
              operationId: "submit",
              requestBody: {
                required: true,
                content: {
                  "application/x-www-form-urlencoded": {
                    schema: {
                      type: "object",
                      required: ["name"],
                      properties: {
                        name: { type: "string" },
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
    // Build via URLComponents so percent-encoding is correct for keys
    // and values (the prior `name=value` interpolation mis-encoded `&` etc).
    assert.match(out, /var formComponents = URLComponents\(\)/);
    assert.match(out, /formComponents\.queryItems = \[URLQueryItem\]\(\)/);
    assert.match(
      out,
      /formComponents\.queryItems\?\.append\(URLQueryItem\(name: "name", value: "\\\(name\)"\)\)/,
    );
    assert.match(
      out,
      /request\.httpBody = formComponents\.percentEncodedQuery\?\.data\(using: \.utf8\) \?\? Data\(\)/,
    );
  });

  it("path with multiple dynamic segments → chain of appendingPathComponent calls", () => {
    const out = printFile(
      swFile({
        decls: decls({
          "/users/{id}/items/{type}": {
            get: {
              tags: ["Users"],
              operationId: "getUserItem",
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                },
                {
                  name: "type",
                  in: "path",
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
    // One appendingPathComponent per segment so reserved chars in path
    // values are percent-encoded inside their own component.
    assert.match(
      out,
      /baseURL\.appendingPathComponent\("users"\)\.appendingPathComponent\("\\\(id\)"\)\.appendingPathComponent\("items"\)\.appendingPathComponent\("\\\(type\)"\)/,
    );
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
    // Protocol method has options but no `-> Type` (Void return).
    assert.match(
      out,
      /func logout\(\s+options: RequestOptions\s+\) async throws\n/,
    );
    // Convenience overload in the extension drops options entirely.
    assert.match(out, /func logout\(\) async throws \{/);
    // Neither form leaks `-> Void` into the source.
    assert.doesNotMatch(out, /func logout\([^)]*\) async throws -> Void/);
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
    // Impl class holds a single `client: APIClient` and delegates send/
    // dispatch/decode to it.
    assert.match(out, /public final class URLSessionUsersAPI: UsersAPI \{/);
    assert.match(out, /^ {4}let client: APIClient$/m);
    assert.match(out, /public init\(\s+client: APIClient\s+\)/);
    assert.match(
      out,
      /let url = baseURL\.appendingPathComponent\("users"\)\.appendingPathComponent\("\\\(id\)"\)/,
    );
    assert.match(out, /var request = URLRequest\(url: url\)/);
    assert.match(out, /request\.httpMethod = "GET"/);
    assert.match(
      out,
      /return try await client\.execute\(request, as: User\.self, extraInterceptors: options\.requestInterceptors, responseValidator: options\.responseValidator, responseTransformer: options\.responseTransformer\)/,
    );
    // Runtime helpers live at the bottom of the file: APIClient owns
    // session/decoder/encoder + status dispatch, APIError carries 4XX/5XX.
    assert.match(out, /public final class APIClient \{/);
    assert.match(out, /public func execute<T: Decodable>\(/);
    assert.match(
      out,
      /let \(data, response\) = try await session\.data\(for: req\)/,
    );
    assert.match(
      out,
      /guard let httpResponse = response as\? HTTPURLResponse else/,
    );
    assert.match(out, /switch httpResponse\.statusCode \{/);
    assert.match(out, /case 200\.\.<300:/);
    assert.match(out, /case 400\.\.<500:/);
    assert.match(out, /case 500\.\.<600:/);
    assert.match(out, /return try decoder\.decode\(T\.self, from: body\)/);
    assert.match(
      out,
      /throw APIError\.clientError\(statusCode: httpResponse\.statusCode, body: data\)/,
    );
    assert.match(out, /throw APIError\.decodingFailed\(error\)/);
    assert.match(out, /public enum APIError: Error \{/);
  });

  it("query params route through URLEncoding.query() (handles required + optional uniformly)", () => {
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
                {
                  name: "tags",
                  in: "query",
                  required: false,
                  schema: { type: "array", items: { type: "string" } },
                },
              ],
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    // URLComponents is constructed via guard-let; force-unwrap is gone.
    assert.match(
      out,
      /guard let urlComponents = URLComponents\(url: baseURL\.appendingPathComponent\("search"\), resolvingAgainstBaseURL: false\) else/,
    );
    assert.match(out, /var components = urlComponents/);
    assert.match(out, /components\.queryItems = \[URLQueryItem\]\(\)/);
    // Scalar — emits the value variant; appends use optional chaining.
    assert.match(
      out,
      /components\.queryItems\?\.append\(contentsOf: URLEncoding\.query\("q", value: q\)\)/,
    );
    assert.match(
      out,
      /components\.queryItems\?\.append\(contentsOf: URLEncoding\.query\("limit", value: limit\)\)/,
    );
    // Array — emits the values variant with style + explode.
    assert.match(
      out,
      /components\.queryItems\?\.append\(contentsOf: URLEncoding\.query\("tags", values: tags, style: \.form, explode: true\)\)/,
    );
    assert.match(out, /guard let url = components\.url else/);
    // The runtime helper itself is included at the bottom of the file.
    assert.match(out, /public final class URLEncoding \{/);
    assert.match(out, /public enum QueryStyle \{/);
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
    assert.match(
      out,
      /request\.httpBody = try client\.encoder\.encode\(body\)/,
    );
  });

  it("multipart body impl: assemble MultipartFormBody + finalize() into httpBody", () => {
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
    // Method body uses the runtime helper.
    assert.match(out, /let multipart = MultipartFormBody\(\)/);
    assert.match(
      out,
      /multipart\.append\(file, name: "file", filename: "file"\)/,
    );
    assert.match(out, /if let title = title \{/);
    assert.match(out, /multipart\.append\("\\\(title\)", name: "title"\)/);
    assert.match(
      out,
      /request\.setValue\(multipart\.contentType, forHTTPHeaderField: "Content-Type"\)/,
    );
    assert.match(out, /request\.httpBody = multipart\.finalize\(\)/);
    // Helper class also lands in the output.
    assert.match(out, /public final class MultipartFormBody \{/);
    assert.match(out, /public let boundary: String\n/);
    assert.match(out, /public let contentType: String\n/);
    // finalize() is idempotent — guarded by a `finalized` flag so the
    // closing boundary isn't appended twice on repeat calls.
    assert.match(out, /private var finalized: Bool = false/);
    assert.match(out, /if finalized \{\s+return data\s+\}\s+finalized = true/);
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

  it("emits per-call RequestOptions with override + protocol-extension overload", () => {
    const out = printFile(
      swFile({
        decls: decls({
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
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    // RequestOptions struct ships with overridable fields.
    assert.match(out, /public struct RequestOptions \{/);
    assert.match(out, /public var client: APIClient\? = nil/);
    assert.match(out, /public var baseURL: URL\? = nil/);
    assert.match(out, /public var headers: \[String: String\] = \[:\]/);
    // Protocol method takes options (no default — protocol decls forbid it).
    assert.match(out, /public protocol UsersAPI \{/);
    assert.match(
      out,
      /func getUser\(\s+id: String,\s+options: RequestOptions\s+\) async throws/,
    );
    // Extension provides the no-options convenience overload.
    assert.match(out, /public extension UsersAPI \{/);
    assert.match(
      out,
      /try await self\.getUser\(id: id, options: RequestOptions\(\)\)/,
    );
    // Impl resolves overrides at the top of every method body.
    assert.match(out, /let client = options\.client \?\? self\.client/);
    assert.match(out, /let baseURL = options\.baseURL \?\? client\.baseURL/);
    // Per-call headers loop runs before send.
    assert.match(
      out,
      /for header in options\.headers \{\s+request\.setValue\(header\.value, forHTTPHeaderField: header\.key\)/,
    );
    // execute receives options.requestInterceptors as extraInterceptors.
    assert.match(
      out,
      /client\.execute\(request[^)]*extraInterceptors: options\.requestInterceptors[^)]*\)/,
    );
  });

  it("multi-2xx → emits sum-type enum + status-dispatch decode in the impl", () => {
    const out = printFile(
      swFile({
        decls: decls(
          {
            "/jobs": {
              post: {
                tags: ["Jobs"],
                operationId: "submitJob",
                responses: {
                  200: {
                    description: "completed",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/JobResult" },
                      },
                    },
                  },
                  202: {
                    description: "accepted",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/Pending" },
                      },
                    },
                  },
                  204: { description: "no content" },
                },
              },
            },
          },
          {
            JobResult: {
              type: "object",
              required: ["id"],
              properties: { id: { type: "string" } },
            },
            Pending: {
              type: "object",
              required: ["queueId"],
              properties: { queueId: { type: "string" } },
            },
          },
        ),
      }),
    );
    // Sum-type enum lands in Models with one case per 2xx code.
    assert.match(out, /public enum SubmitJob_Response \{/);
    assert.match(out, /case status200\(JobResult\)/);
    assert.match(out, /case status202\(Pending\)/);
    assert.match(out, /case status204\b/);
    // Method returns the enum.
    assert.match(
      out,
      /func submitJob\([\s\S]+?\) async throws -> SubmitJob_Response/,
    );
    // Impl uses executeRaw + status-dispatch decode.
    assert.match(out, /try await client\.executeRaw\(request,/);
    assert.match(out, /switch httpResponse\.statusCode \{/);
    assert.match(
      out,
      /case 200:[\s\S]+?try client\.decoder\.decode\(JobResult\.self, from: data\)[\s\S]+?return \.status200\(value\)/,
    );
    assert.match(out, /case 204:\s+return \.status204/);
    assert.match(out, /default:\s+throw APIError\.unexpectedStatus\(/);
    // WithResponse companion bundles the case with httpResponse.
    assert.match(
      out,
      /func submitJobWithResponse\([\s\S]+?\) async throws -> \(SubmitJob_Response, HTTPURLResponse\)/,
    );
    assert.match(out, /return \(\.status200\(value\), httpResponse\)/);
  });

  it("emits *WithResponse overloads exposing HTTPURLResponse alongside the body", () => {
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
                responses: { 204: { description: "no content" } },
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
    // Decodable variant — pairs the body with HTTPURLResponse.
    assert.match(
      out,
      /func getUserWithResponse\([\s\S]+?\) async throws -> \(User, HTTPURLResponse\)/,
    );
    // Void variant — returns just HTTPURLResponse.
    assert.match(
      out,
      /func deleteUserWithResponse\([\s\S]+?\) async throws -> HTTPURLResponse/,
    );
    // Impl methods route through the WithResponse runtime helper.
    assert.match(
      out,
      /return try await client\.executeWithResponse\(request, as: User\.self,/,
    );
    assert.match(
      out,
      /return try await client\.executeWithResponse\(request, extraInterceptors:/,
    );
    // APIClient ships both variants of executeWithResponse.
    assert.match(
      out,
      /public func executeWithResponse<T: Decodable>\([\s\S]+?\) async throws -> \(T, HTTPURLResponse\)/,
    );
    assert.match(
      out,
      /public func executeWithResponse\(\s+_ request: URLRequest[\s\S]+?\) async throws -> HTTPURLResponse/,
    );
  });

  it("RequestOptions carries timeout / responseValidator / responseTransformer through to the wire", () => {
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
    // Three new optional fields on RequestOptions.
    assert.match(out, /public var timeout: TimeInterval\? = nil/);
    assert.match(
      out,
      /public var responseValidator: \(\(Data, HTTPURLResponse\) async throws -> Void\)\? = nil/,
    );
    assert.match(
      out,
      /public var responseTransformer: \(\(Data\) async throws -> Data\)\? = nil/,
    );
    // Impl applies the timeout right after building the request.
    assert.match(
      out,
      /if let timeout = options\.timeout \{\s+request\.timeoutInterval = timeout\s+\}/,
    );
    // Validator + transformer threaded through to client.execute.
    assert.match(
      out,
      /responseValidator: options\.responseValidator, responseTransformer: options\.responseTransformer/,
    );
    // APIClient.execute runs validator then transformer, decodes the
    // (possibly transformed) body.
    assert.match(
      out,
      /if let validator = responseValidator \{\s+try await validator\(data, httpResponse\)\s+\}/,
    );
    assert.match(
      out,
      /var body = data\s+if let transformer = responseTransformer \{\s+body = try await transformer\(data\)\s+\}/,
    );
    // sendAndDispatch returns the tuple so execute can hand both halves
    // to the validator.
    assert.match(
      out,
      /private func sendAndDispatch[\s\S]+?async throws -> \(Data, HTTPURLResponse\)/,
    );
  });

  it("APIClient exposes a composable interceptor pipeline", () => {
    const out = printFile(
      swFile({
        decls: decls({
          "/u": {
            get: {
              tags: ["U"],
              operationId: "u",
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    // APIInterceptors ships alongside APIClient with a mutable
    // request-interceptor array.
    assert.match(out, /public final class APIInterceptors \{/);
    assert.match(
      out,
      /public var request: \[\(URLRequest\) async throws -> URLRequest\] = \[\]/,
    );
    // Client exposes it as an immutable property.
    assert.match(out, /public let interceptors: APIInterceptors/);
    // sendAndDispatch walks the array per request.
    assert.match(
      out,
      /for interceptor in interceptors\.request \{\n\s+req = try await interceptor\(req\)\n\s+\}/,
    );
  });

  it("openImpl: true emits `open class` instead of `final class`", () => {
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
          { openImpl: true },
        ),
      }),
    );
    assert.match(out, /public open class URLSessionUAPI: UAPI \{/);
    assert.doesNotMatch(out, /final class URLSessionUAPI/);
  });

  it("emits Auth enum + apply(to:) when any operation has security", () => {
    const fragment = {
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
        },
      },
      paths: {
        "/me": {
          get: {
            tags: ["Profile"],
            operationId: "me",
            security: [{ bearerAuth: [] }],
            responses: { 200: { description: "ok" } },
          },
        },
      },
    };
    const m = ir(fragment);
    const out = printFile(
      swFile({
        decls: operationsToDecls(m.paths, {
          securitySchemeNames: securityNamesMap(fragment),
        }),
      }),
    );
    assert.match(out, /public enum Auth \{/);
    assert.match(out, /case bearer\(token: String\)/);
    assert.match(
      out,
      /case apiKey\(name: String, value: String, in: APIKeyLocation\)/,
    );
    assert.match(out, /public enum APIKeyLocation \{/);
    assert.match(out, /case basic\(username: String, password: String\)/);
    assert.match(
      out,
      /public func apply\(\s+to request: URLRequest\s+\) -> URLRequest/,
    );
    assert.match(out, /case \.bearer\(let token\):/);
    assert.match(
      out,
      /request\.setValue\("Bearer \\\(token\)", forHTTPHeaderField: "Authorization"\)/,
    );
  });

  it("Auth.apiKey routes header / query / cookie via APIKeyLocation", () => {
    const fragment = {
      components: {
        securitySchemes: {
          headerKey: { type: "apiKey", in: "header", name: "X-API-Key" },
        },
      },
      paths: {
        "/me": {
          get: {
            tags: ["Profile"],
            operationId: "me",
            security: [{ headerKey: [] }],
            responses: { 200: { description: "ok" } },
          },
        },
      },
    };
    const m = ir(fragment);
    const out = printFile(
      swFile({
        decls: operationsToDecls(m.paths, {
          securitySchemeNames: securityNamesMap(fragment),
        }),
      }),
    );
    // Header branch (existing behavior).
    assert.match(
      out,
      /case \.header:\s+request\.setValue\(value, forHTTPHeaderField: name\)/,
    );
    // Query branch — appends URLQueryItem to request.url.
    assert.match(out, /case \.query:/);
    assert.match(out, /URLQueryItem\(name: name, value: value\)/);
    // Cookie branch — appends `<name>=<value>` to the Cookie header.
    assert.match(out, /case \.cookie:/);
    assert.match(out, /let cookie = "\\\(name\)=\\\(value\)"/);
  });

  it("auto-wires per-op security from client.auth bag", () => {
    const fragment = {
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
          apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
        },
      },
      paths: {
        "/me": {
          get: {
            tags: ["Profile"],
            operationId: "me",
            security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
            responses: { 200: { description: "ok" } },
          },
        },
        "/public": {
          get: {
            tags: ["Profile"],
            operationId: "publicPing",
            responses: { 200: { description: "ok" } },
          },
        },
      },
    };
    const m = ir(fragment);
    const out = printFile(
      swFile({
        decls: operationsToDecls(m.paths, {
          securitySchemeNames: securityNamesMap(fragment),
        }),
      }),
    );
    // APIClient gets a name-keyed auth bag.
    assert.match(out, /public var auth: \[String: Auth\] = \[:\]/);
    // Op with security iterates its declared scheme names and applies
    // any the consumer has configured.
    assert.match(
      out,
      /for schemeName in \["bearerAuth", "apiKeyAuth"\] \{\s+if let auth = client\.auth\[schemeName\] \{\s+request = auth\.apply\(to: request\)\s+\}\s+\}/,
    );
    // Op without security has no auth loop. Anchor on the impl method
    // (the protocol/extension forms run from the same regex otherwise).
    const publicImpl = out.match(
      /public func publicPing\([\s\S]+?try await client\.execute/,
    );
    assert.ok(publicImpl, "publicPing impl method should exist");
    assert.doesNotMatch(publicImpl![0], /for schemeName in/);
  });

  it("does not emit Auth when no operation has security", () => {
    const out = printFile(
      swFile({
        decls: decls({
          "/ping": {
            get: {
              tags: ["X"],
              operationId: "ping",
              responses: { 200: { description: "ok" } },
            },
          },
        }),
      }),
    );
    assert.doesNotMatch(out, /public enum Auth/);
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
