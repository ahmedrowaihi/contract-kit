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
  it("emits an interface per tag with WithResponse twin", () => {
    const m = ir(getUserSpec);
    const { decls } = operationsToDecls(m.paths);
    const ifaces = decls.filter((d) => d.kind === "interface");
    assert.equal(ifaces.length, 1);
    const out = printDecl(ifaces[0]!);
    assert.match(out, /type UsersAPI interface \{/);
    assert.match(
      out,
      /GetUser\(ctx context\.Context, id string, opts RequestOptions\) \(\*GetUserResponse, error\)/,
    );
    assert.match(
      out,
      /GetUserWithResponse\(.+\) \(\*GetUserResponse, \*http\.Response, error\)/,
    );
  });

  it("emits an impl struct + constructor + paired methods per op", () => {
    const m = ir(getUserSpec);
    const { decls } = operationsToDecls(m.paths);
    const struct = decls.find(
      (d) => d.kind === "struct" && d.name === "NetHTTPUsersAPI",
    );
    assert.ok(struct);
    const ctor = decls.find(
      (d) => d.kind === "func" && d.name === "NewNetHTTPUsersAPI",
    );
    assert.ok(ctor);
    const methods = decls.filter(
      (d) =>
        d.kind === "func" &&
        d.receiver?.type.kind === "ptr" &&
        d.receiver.type.inner.kind === "ref" &&
        d.receiver.type.inner.name === "NetHTTPUsersAPI",
    );
    // One per op + one *WithResponse twin.
    assert.equal(methods.length, 2);
  });

  it("uses named returns + bare return for err-checks", () => {
    const m = ir(getUserSpec);
    const { decls } = operationsToDecls(m.paths);
    const method = decls.find((d) => d.kind === "func" && d.name === "GetUser");
    assert.ok(method);
    const out = printDecl(method!);
    assert.match(out, /\(result \*GetUserResponse, err error\)/);
    assert.match(out, /err = Wrap\(APIErrorKindTransport, err\)\n\t\treturn/);
  });

  it("ctx is the first param, opts the last", () => {
    const m = ir(getUserSpec);
    const { decls } = operationsToDecls(m.paths);
    const iface = decls.find((d) => d.kind === "interface")!;
    const out = printDecl(iface);
    assert.match(out, /GetUser\(ctx context\.Context.+opts RequestOptions\)/);
  });

  it("path templating: addPathSegment-equivalent via path.Join", () => {
    const m = ir(getUserSpec);
    const { decls } = operationsToDecls(m.paths);
    const method = decls.find(
      (d) => d.kind === "func" && d.name === "GetUser",
    )!;
    const out = printDecl(method);
    assert.match(
      out,
      /u\.Path = path\.Join\(u\.Path, "users", url\.PathEscape\(id\)\)/,
    );
  });

  it("emits Unit-equivalent (no return type) for ops with no 2xx body", () => {
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
    const out = printDecl(iface);
    // No return type means just `error` / `(*http.Response, error)`.
    assert.match(
      out,
      /Ping\(ctx context\.Context, opts RequestOptions\) error/,
    );
    assert.match(
      out,
      /PingWithResponse\(ctx context\.Context, opts RequestOptions\) \(\*http\.Response, error\)/,
    );
  });

  it("emits sealed interface + concrete-case structs for multi-2xx", () => {
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
              204: { description: "no-op" },
            },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const iface = decls.find(
      (d) => d.kind === "interface" && d.name === "SubmitJobResponse",
    );
    assert.ok(iface);
    const status200 = decls.find(
      (d) => d.kind === "struct" && d.name === "SubmitJobResponseStatus200",
    );
    assert.ok(status200);
    const status204 = decls.find(
      (d) => d.kind === "struct" && d.name === "SubmitJobResponseStatus204",
    );
    assert.ok(status204);
  });

  it("auto-wires security: walks scheme names and applies via auth.Apply", () => {
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
                  "application/json": { schema: { type: "string" } },
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
    const method = decls.find((d) => d.kind === "func" && d.name === "Me")!;
    const out = printDecl(method);
    assert.match(out, /for _, name := range \[\]string\{"bearerAuth"\}/);
    assert.match(out, /auth, ok := client\.Auth\[name\]/);
    assert.match(out, /u = auth\.Apply\(req, u\)/);
  });

  it("multipart body builds via NewMultipartFormBody helper", () => {
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
    const method = decls.find((d) => d.kind === "func" && d.name === "Upload")!;
    const out = printDecl(method);
    assert.match(out, /multipart := NewMultipartFormBody\(\)/);
    assert.match(out, /multipart\.AppendFile\("file", "file", file\)/);
    assert.match(
      out,
      /multipart\.AppendText\("caption", fmt\.Sprint\(\*caption\)\)/,
    );
  });

  it("strips PHP-style trailing brackets from query param names", () => {
    const m = ir({
      paths: {
        "/data": {
          get: {
            tags: ["Data"],
            operationId: "list",
            parameters: [
              {
                name: "timeframe[]",
                in: "query",
                required: true,
                schema: { type: "array", items: { type: "string" } },
              },
            ],
            responses: { 204: { description: "ok" } },
          },
        },
      },
    });
    const { decls } = operationsToDecls(m.paths);
    const iface = decls.find((d) => d.kind === "interface")!;
    const out = printDecl(iface);
    // Param ident is `timeframe` (trailing `[]` stripped); the wire-
    // level query name (`timeframe[]`) is still preserved by the impl
    // via the original IR.ParameterObject.name.
    assert.match(out, /List\(.+timeframe \[\]string,/);
  });
});
