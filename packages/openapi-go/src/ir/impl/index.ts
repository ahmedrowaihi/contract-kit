import {
  type GoDecl,
  type GoExpr,
  type GoFuncResult,
  type GoStmt,
  type GoType,
  goAssign,
  goCall,
  goError,
  goExprStmt,
  goField,
  goForRange,
  goFuncDecl,
  goFuncParam,
  goFuncResult,
  goIdent,
  goIf,
  goNil,
  goPtr,
  goReceiver,
  goRef,
  goSelector,
  goShort,
  goSliceLit,
  goStr,
  goString,
  goStruct,
} from "../../go-dsl/index.js";
import type { OperationSignature } from "../operation/signature.js";
import { buildBodyStmts } from "./body.js";
import { buildSendAndDecodeStmts } from "./decode.js";
import { errCheck } from "./errors.js";
import { buildHeaderStmts } from "./headers.js";
import { buildRequestStmts } from "./request.js";
import { buildUrlStmts } from "./url.js";

export interface ClientStructResult {
  /** All decls the impl class produces — the struct itself, the
   *  constructor, plus one method (and one *WithResponse method) per
   *  operation. */
  decls: ReadonlyArray<GoDecl>;
  needsMultipart: boolean;
}

/**
 * Convert a list of `OperationSignature`s for a tag into:
 *
 *  - `type NetHTTP<Tag>API struct { client *APIClient }`
 *  - `func New<...>(...) *NetHTTP<Tag>API` constructor
 *  - one method per op + one `<Op>WithResponse` method per op
 *
 * Each method:
 *  1. Resolves overrides — `client = opts.Client ?? a.client`,
 *     `baseURL = opts.BaseURL ?? client.BaseURL`.
 *  2. Builds URL via `net/url` + per-segment join + query items.
 *  3. Builds the request via `http.NewRequestWithContext(ctx, ...)`.
 *  4. Sets header params via `req.Header.Set`.
 *  5. Builds the body (JSON / multipart / form / binary).
 *  6. Applies security — walks `client.Auth["<scheme>"]`, calls
 *     `auth.Apply(req, u)` and re-sets `req.URL`.
 *  7. Applies `opts.Headers` (last-write-wins).
 *  8. Delegates to `Execute` / `ExecuteRaw` / `ExecuteWithResponse`.
 */
export function buildClientStruct(
  className: string,
  signatures: ReadonlyArray<OperationSignature>,
): ClientStructResult {
  const decls: GoDecl[] = [];
  // The struct itself.
  decls.push(
    goStruct({
      name: className,
      fields: [goField("client", goPtr(goRef("APIClient")))],
    }),
  );
  // Constructor — `func NewNetHTTPPetAPI(client *APIClient) *NetHTTPPetAPI`.
  decls.push(
    goFuncDecl({
      name: `New${className}`,
      params: [goFuncParam("client", goPtr(goRef("APIClient")))],
      results: [goFuncResult(goPtr(goRef(className)))],
      body: [
        {
          kind: "return",
          values: [
            {
              kind: "unary",
              op: "&",
              operand: {
                kind: "structLit",
                type: goRef(className),
                fields: [{ name: "client", value: goIdent("client") }],
              },
            },
          ],
        },
      ],
    }),
  );

  let needsMultipart = false;
  for (const sig of signatures) {
    const a = buildMethod(className, sig, /* withResponse */ false);
    const b = buildMethod(className, sig, /* withResponse */ true);
    decls.push(a.fn, b.fn);
    if (a.needsMultipart || b.needsMultipart) needsMultipart = true;
  }
  return { decls, needsMultipart };
}

function buildMethod(
  recvName: string,
  sig: OperationSignature,
  withResponse: boolean,
): { fn: GoDecl; needsMultipart: boolean } {
  const results = buildResults(sig, withResponse);

  const stmts: GoStmt[] = [];
  stmts.push(...resolveOverrideStmts());
  stmts.push(...buildUrlStmts(sig.pathStr, sig.locatedParams, errCheck));
  stmts.push(...buildRequestStmts(sig.method, errCheck));
  stmts.push(...buildHeaderStmts(sig.locatedParams));

  let needsMultipart = false;
  if (sig.op.body) {
    const result = buildBodyStmts(sig.op.body, errCheck);
    stmts.push(...result.stmts);
    needsMultipart = result.needsMultipart;
  }

  if (sig.securitySchemeNames.length > 0) {
    stmts.push(...applyAuthStmts(sig.securitySchemeNames));
  }
  stmts.push(applyOptionsHeadersStmt());
  stmts.push(...buildSendAndDecodeStmts(sig, withResponse, errCheck));

  const name = withResponse ? `${sig.name}WithResponse` : sig.name;
  return {
    fn: goFuncDecl({
      name,
      receiver: goReceiver("a", goPtr(goRef(recvName))),
      params: sig.params.slice(),
      results,
      doc: sig.doc,
      body: stmts,
    }),
    needsMultipart,
  };
}

/**
 * Named results — `(result T, [resp *http.Response,] err error)`.
 * Named returns let err-check sites do bare `return` regardless of
 * the success-path return type (no zero-literal-per-type matching).
 */
function buildResults(
  sig: OperationSignature,
  withResponse: boolean,
): GoFuncResult[] {
  const out: GoFuncResult[] = [];
  if (sig.returnType)
    out.push({ name: "result", type: returnTypeShape(sig.returnType) });
  if (withResponse)
    out.push({ name: "resp", type: goPtr(goRef("http.Response")) });
  out.push({ name: "err", type: goError });
  return out;
}

/**
 * Pointer-wrap named struct refs only. Slices / maps / primitives /
 * already-pointers / interfaces stay bare — the runtime `Execute[T]`
 * returns `T` exactly, so the method's declared result needs to match
 * what the consumer passes as the type parameter.
 */
function returnTypeShape(t: GoType): GoType {
  return t.kind === "ref" ? goPtr(t) : t;
}

function resolveOverrideStmts(): GoStmt[] {
  return [
    goShort(["client"], [goSelector(goIdent("opts"), "Client")]),
    goIf(goEqNil(goIdent("client")), [
      goAssign([goIdent("client")], [goSelector(goIdent("a"), "client")]),
    ]),
    goIf(goEqNil(goIdent("client")), [
      goAssign(
        [goIdent("err")],
        [
          goCall(goIdent("Wrap"), [
            { expr: goIdent("APIErrorKindTransport") },
            {
              expr: goCall(goSelector(goIdent("errors"), "New"), [
                { expr: goStr("APIClient is nil") },
              ]),
            },
          ]),
        ],
      ),
      { kind: "return", values: [] },
    ]),
    goShort(["baseURL"], [goSelector(goIdent("opts"), "BaseURL")]),
    goIf(goEqEmpty(goIdent("baseURL")), [
      goAssign(
        [goIdent("baseURL")],
        [goSelector(goIdent("client"), "BaseURL")],
      ),
    ]),
  ];
}

function goEqNil(e: GoExpr): GoExpr {
  return { kind: "binOp", op: "==", left: e, right: goNil };
}

function goEqEmpty(e: GoExpr): GoExpr {
  return { kind: "binOp", op: "==", left: e, right: goStr("") };
}

function applyOptionsHeadersStmt(): GoStmt {
  return goForRange(
    { key: "k", value: "v" },
    goSelector(goIdent("opts"), "Headers"),
    [
      goExprStmt(
        goCall(goSelector(goSelector(goIdent("req"), "Header"), "Set"), [
          { expr: goIdent("k") },
          { expr: goIdent("v") },
        ]),
      ),
    ],
  );
}

function applyAuthStmts(schemeNames: ReadonlyArray<string>): GoStmt[] {
  return [
    goForRange(
      { value: "name" },
      goSliceLit(
        goString,
        schemeNames.map((n) => goStr(n)),
      ),
      [
        goShort(
          ["auth", "ok"],
          [
            {
              kind: "index",
              on: goSelector(goIdent("client"), "Auth"),
              index: goIdent("name"),
            },
          ],
        ),
        goIf(goIdent("ok"), [
          goAssign(
            [goIdent("u")],
            [
              goCall(goSelector(goIdent("auth"), "Apply"), [
                { expr: goIdent("req") },
                { expr: goIdent("u") },
              ]),
            ],
          ),
        ]),
      ],
    ),
    goAssign([goSelector(goIdent("req"), "URL")], [goIdent("u")]),
  ];
}
