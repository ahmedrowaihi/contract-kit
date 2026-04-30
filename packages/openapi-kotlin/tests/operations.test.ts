import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { operationsToDecls, printDecl } from "../dist/index.js";
import { ir, securityNamesMap } from "./_helpers.ts";

const getUserSpec = {
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
                schema: {
                  type: "object",
                  required: ["id"],
                  properties: { id: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },
  },
};

describe("operationsToDecls", () => {
  it("emits one interface per tag with suspend + WithResponse overloads", () => {
    const m = ir(getUserSpec);
    const { decls } = operationsToDecls(m.paths);
    const ifaces = decls.filter((d) => d.kind === "interface");
    assert.equal(ifaces.length, 1);
    const out = printDecl(ifaces[0]!);
    assert.match(out, /interface UsersApi/);
    assert.match(out, /suspend fun getUser\(/);
    assert.match(out, /suspend fun getUserWithResponse\(/);
    assert.match(out, /\): Pair<.+, Response>/);
  });

  it("emits matching OkHttp impl class with override + suspend", () => {
    const m = ir(getUserSpec);
    const { decls } = operationsToDecls(m.paths);
    const cls = decls.find((d) => d.kind === "class");
    assert.ok(cls);
    const out = printDecl(cls!);
    assert.match(out, /class OkHttpUsersApi\(/);
    assert.match(out, /public val client: APIClient,/);
    assert.match(out, /\) : UsersApi /);
    assert.match(out, /override suspend fun getUser/);
  });

  it("emits top-level extension funs as the no-options convenience overload", () => {
    const m = ir(getUserSpec);
    const { decls } = operationsToDecls(m.paths);
    const ext = decls.find(
      (d) => d.kind === "topLevelFun" && d.fun.name === "getUser",
    );
    assert.ok(ext);
    const out = printDecl(ext!);
    assert.match(out, /suspend fun UsersApi\.getUser\(/);
    assert.match(out, /options = RequestOptions\(\)/);
  });

  it("uses HttpUrl.Builder + addPathSegment for paths", () => {
    const m = ir(getUserSpec);
    const { decls } = operationsToDecls(m.paths);
    const cls = decls.find((d) => d.kind === "class");
    const out = printDecl(cls!);
    assert.match(out, /baseUrl\.newBuilder\(\)/);
    assert.match(out, /urlBuilder\.addPathSegment\("users"\)/);
    assert.match(out, /urlBuilder\.addPathSegment\(id\)/);
  });

  it("calls .toString() on numeric path params (addPathSegment needs String)", () => {
    const m = ir({
      paths: {
        "/orders/{id}": {
          get: {
            tags: ["Orders"],
            operationId: "getOrder",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "integer", format: "int64" },
              },
            ],
            responses: { 204: { description: "ok" } },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const cls = decls.find((d) => d.kind === "class")!;
    assert.match(
      printDecl(cls),
      /urlBuilder\.addPathSegment\(id\.toString\(\)\)/,
    );
  });

  it("threads required-first param ordering with optional defaults", () => {
    const m = ir({
      paths: {
        "/search": {
          get: {
            tags: ["Search"],
            operationId: "search",
            parameters: [
              {
                name: "limit",
                in: "query",
                required: false,
                schema: { type: "integer" },
              },
              {
                name: "q",
                in: "query",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              200: {
                description: "ok",
                content: {
                  "application/json": {
                    schema: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const cls = decls.find((d) => d.kind === "class")!;
    const out = printDecl(cls);
    assert.match(out, /q: String,\s+limit: Int\?,/);
  });

  it("emits Unit return for ops with no 2xx body", () => {
    const m = ir({
      paths: {
        "/ping": {
          get: {
            tags: ["Health"],
            operationId: "ping",
            responses: { 204: { description: "ok" } },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const iface = decls.find((d) => d.kind === "interface")!;
    assert.match(printDecl(iface), /suspend fun ping\([^)]*\)\n\s*$/m);
  });

  it("emits sealed class for multi-2xx responses + when-dispatch", () => {
    const m = ir({
      paths: {
        "/job": {
          post: {
            tags: ["Jobs"],
            operationId: "submitJob",
            responses: {
              200: {
                description: "done",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      required: ["jobId"],
                      properties: { jobId: { type: "string" } },
                    },
                  },
                },
              },
              202: {
                description: "queued",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      required: ["queuePosition"],
                      properties: {
                        queuePosition: { type: "integer" },
                      },
                    },
                  },
                },
              },
              204: { description: "no-op" },
            },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const sealed = decls.find((d) => d.kind === "sealedClass");
    assert.ok(sealed);
    const out = printDecl(sealed!);
    assert.match(out, /sealed class SubmitJob_Response/);
    assert.match(out, /data class Status200\(/);
    assert.match(out, /data class Status202\(/);
    assert.match(out, /object Status204 :/);

    const cls = decls.find((d) => d.kind === "class")!;
    const implOut = printDecl(cls);
    assert.match(implOut, /executeRaw/);
    assert.match(implOut, /when \(response\.code\)/);
    assert.match(implOut, /200 ->/);
    assert.match(implOut, /SubmitJob_Response\.Status204/);
  });

  it("auto-wires security: walks scheme names and applies via Auth.apply", () => {
    const fragment = {
      paths: {
        "/me": {
          get: {
            tags: ["Auth"],
            operationId: "me",
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: "ok",
                content: {
                  "application/json": {
                    schema: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    };
    const m = ir(fragment);
    const { decls, needsAuth } = operationsToDecls(m.paths, {
      securitySchemeNames: securityNamesMap(fragment),
    });
    assert.equal(needsAuth, true);
    const cls = decls.find((d) => d.kind === "class")!;
    const out = printDecl(cls);
    assert.match(out, /for \(schemeName in listOf\("bearerAuth"\)\)/);
    assert.match(out, /client\.auth\[schemeName\]\?\.let \{ auth ->/);
    assert.match(out, /auth\.apply\(builder, currentUrl\)/);
  });

  it("multipart body assembles via MultipartFormBody helper", () => {
    const m = ir({
      paths: {
        "/upload": {
          post: {
            tags: ["Files"],
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
                      caption: { type: "string" },
                    },
                  },
                },
              },
            },
            responses: { 204: { description: "ok" } },
          },
        },
      },
    });
    const { decls, needsMultipart } = operationsToDecls(m.paths);
    assert.equal(needsMultipart, true);
    const cls = decls.find((d) => d.kind === "class")!;
    const out = printDecl(cls);
    assert.match(out, /val multipart = MultipartFormBody\(\)/);
    assert.match(out, /multipart\.appendFile\("file", "file", file\)/);
    assert.match(
      out,
      /if \(caption != null\) \{\s+multipart\.appendText\("caption", "\$caption"\)/,
    );
  });

  it("form-urlencoded body assembles via FormBody.Builder", () => {
    const m = ir({
      paths: {
        "/login": {
          post: {
            tags: ["Auth"],
            operationId: "login",
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
            responses: { 204: { description: "ok" } },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const cls = decls.find((d) => d.kind === "class")!;
    const out = printDecl(cls);
    assert.match(out, /val formBuilder = FormBody\.Builder\(\)/);
    assert.match(out, /formBuilder\.add\("username", "\$username"\)/);
    assert.match(out, /formBuilder\.build\(\)/);
  });

  it("interfaceOnly: skips impl class emission", () => {
    const m = ir(getUserSpec);
    const { decls } = operationsToDecls(m.paths, { interfaceOnly: true });
    assert.ok(!decls.some((d) => d.kind === "class"));
    assert.ok(decls.some((d) => d.kind === "interface"));
  });

  it("openImpl: emits open class so consumers can subclass", () => {
    const m = ir(getUserSpec);
    const { decls } = operationsToDecls(m.paths, { openImpl: true });
    const cls = decls.find((d) => d.kind === "class")!;
    assert.match(printDecl(cls), /open class OkHttpUsersApi/);
  });

  it("escapes Kotlin reserved keywords in path/query param names", () => {
    const m = ir({
      paths: {
        "/types": {
          get: {
            tags: ["Types"],
            operationId: "types",
            parameters: [
              {
                name: "class",
                in: "query",
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
    const iface = decls.find((d) => d.kind === "interface")!;
    assert.match(printDecl(iface), /`class`: String/);
  });
});
