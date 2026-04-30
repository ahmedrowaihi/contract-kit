import {
  type GoCallArg,
  type GoExpr,
  type GoStmt,
  type GoType,
  goCall,
  goCase,
  goIdent,
  goIntLit,
  goNil,
  goRef,
  goReturn,
  goSelector,
  goShort,
  goStructLit,
  goSwitch,
  goVar,
} from "../../go-dsl/index.js";
import type {
  OperationSignature,
  ResponseCase,
} from "../operation/signature.js";
import type { ErrCheckFn } from "./errors.js";

/**
 * Tail of an impl method body — delegate to the runtime client. Five
 * shapes, picked from the sig:
 *
 *  - Single 2xx, no return       → `return ExecuteUnit(client, req, opts)`
 *  - Single 2xx, T               → `return Execute[T](client, req, opts)`
 *  - Multi 2xx (interface)       → `ExecuteRaw + switch resp.StatusCode`
 *
 * `withResponse=true` switches each shape to the matching
 * `*WithResponse` runtime helper that returns the raw `*http.Response`
 * alongside the decoded payload (Go has no method overloading, so the
 * orchestrator emits these as separate top-level methods named
 * `<Op>WithResponse`).
 */
export function buildSendAndDecodeStmts(
  sig: OperationSignature,
  withResponse: boolean,
  errCheck: ErrCheckFn,
): ReadonlyArray<GoStmt> {
  if (sig.responseCases.length > 0) {
    return buildMultiResponseStmts(sig, withResponse, errCheck);
  }
  return buildSingleResponseStmts(sig.returnType, withResponse);
}

function clientArg(): GoCallArg {
  return { expr: goIdent("client") };
}
function reqArg(): GoCallArg {
  return { expr: goIdent("req") };
}
function optsArg(): GoCallArg {
  return { expr: goIdent("opts") };
}

function buildSingleResponseStmts(
  returnType: GoType | undefined,
  withResponse: boolean,
): ReadonlyArray<GoStmt> {
  if (returnType === undefined) {
    const fn = withResponse ? "ExecuteUnitWithResponse" : "ExecuteUnit";
    return [
      goReturn([goCall(goIdent(fn), [clientArg(), reqArg(), optsArg()])]),
    ];
  }
  const fn = withResponse ? "ExecuteWithResponse" : "Execute";
  return [
    goReturn([
      goCall(goIdent(fn), [clientArg(), reqArg(), optsArg()], [returnType]),
    ]),
  ];
}

function unwrapPtr(t: GoType): GoType {
  return t.kind === "ptr" ? t.inner : t;
}

function buildMultiResponseStmts(
  sig: OperationSignature,
  withResponse: boolean,
  errCheck: ErrCheckFn,
): ReadonlyArray<GoStmt> {
  return [
    goShort(
      ["body", "resp", "err"],
      [goCall(goIdent("ExecuteRaw"), [clientArg(), reqArg(), optsArg()])],
    ),
    errCheck("transport"),
    goSwitch(
      goSelector(goIdent("resp"), "StatusCode"),
      sig.responseCases.map((c) =>
        goCase(
          [goIntLit(Number(c.statusCode))],
          caseBody(c, withResponse, errCheck),
        ),
      ),
      [defaultBranch(withResponse)],
    ),
  ];
}

function caseBody(
  c: ResponseCase,
  withResponse: boolean,
  errCheck: ErrCheckFn,
): ReadonlyArray<GoStmt> {
  if (!c.payloadType) {
    const result = goStructLit(goRef(c.caseName), []);
    return withResponse
      ? [goReturn([result, goIdent("resp"), goNil])]
      : [goReturn([result, goNil])];
  }
  // Decode into a local of the underlying type, then wrap in the
  // concrete sealed-impl struct. The wrapper's `Value` field type
  // matches whatever `payloadType` originally was — pointer-typed
  // (`*Pet`) means we wrap with `&value`; bare type means `value`.
  const underlying = unwrapPtr(c.payloadType);
  const wrapped: GoExpr =
    c.payloadType.kind === "ptr"
      ? { kind: "unary", op: "&", operand: goIdent("value") }
      : goIdent("value");
  const result = goStructLit(goRef(c.caseName), [
    { name: "Value", value: wrapped },
  ]);
  return [
    goVar("value", underlying),
    goShort(
      ["err"],
      [
        goCall(goSelector(goIdent("json"), "Unmarshal"), [
          { expr: goIdent("body") },
          { expr: { kind: "unary", op: "&", operand: goIdent("value") } },
        ]),
      ],
    ),
    errCheck("decoding"),
    goReturn(withResponse ? [result, goIdent("resp"), goNil] : [result, goNil]),
  ];
}

function defaultBranch(withResponse: boolean): GoStmt {
  const apiErr = goCall(goIdent("Unexpected"), [
    { expr: goSelector(goIdent("resp"), "StatusCode") },
    { expr: goIdent("body") },
  ]);
  return withResponse
    ? goReturn([goNil, goNil, apiErr])
    : goReturn([goNil, apiErr]);
}
