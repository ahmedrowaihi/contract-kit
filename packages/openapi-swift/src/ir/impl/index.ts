import {
  type SwClass,
  type SwClassModifier,
  type SwFun,
  type SwStmt,
  swArg,
  swAssign,
  swCall,
  swClass,
  swFun,
  swFunParam,
  swIdent,
  swIfLet,
  swInit,
  swProp,
  swTryAwait,
} from "../../sw-dsl/index.js";
import { swFunc, swOptional, swRef } from "../../sw-dsl/type/index.js";
import type { OperationSignature } from "../operation/signature.js";
import { buildBodyStmts } from "./body.js";
import { buildSendAndDecodeStmts } from "./decode.js";
import { urlSessionAPIErrorEnum } from "./error-type.js";
import { buildHeaderStmts } from "./headers.js";
import { buildRequestStmts } from "./request.js";
import { buildUrlStmts } from "./url.js";

interface BuiltMethod {
  fun: SwFun;
  needsErrorEnum: boolean;
}

/**
 * Compose statement-level builders into the full body of a single impl
 * method. Order:
 *  1. URL + URLComponents/queryItems
 *  2. URLRequest construction + httpMethod
 *  3. Header `setValue` calls
 *  4. Body wire encoding (JSON / multipart / form / binary)
 *  5. Optional `requestDecorator` hook — runs once after build, before send.
 *  6. `try await session.data(for: request)` + JSON decode
 *
 * Steps 5 and 6 are skipped when the body builder terminates (`throw`)
 * to avoid emitting unreachable code.
 */
function buildImplFun(sig: OperationSignature): BuiltMethod {
  const stmts: SwStmt[] = [];
  stmts.push(...buildUrlStmts(sig.pathStr, sig.locatedParams));
  stmts.push(...buildRequestStmts(sig.method));
  stmts.push(...buildHeaderStmts(sig.locatedParams));

  let needsErrorEnum = false;
  let terminated = false;
  if (sig.op.body) {
    const result = buildBodyStmts(sig.op.body);
    stmts.push(...result.stmts);
    needsErrorEnum = result.needsErrorEnum;
    terminated = result.terminates;
  }
  if (!terminated) {
    stmts.push(decoratorHookStmt());
    stmts.push(...buildSendAndDecodeStmts(sig.returnType));
  }

  const fun = swFun({
    name: sig.name,
    params: sig.params,
    returnType: sig.returnType,
    effects: ["async", "throws"],
    doc: sig.doc,
    body: stmts,
  });
  return { fun, needsErrorEnum };
}

/**
 * `if let decorator = requestDecorator { request = try await decorator(request) }`
 *
 * Lets consumers inject per-request mutation (auth header refresh, request
 * signing, dynamic logging) without having to reimplement the protocol.
 */
function decoratorHookStmt(): SwStmt {
  return swIfLet("decorator", swIdent("requestDecorator"), [
    swAssign(
      swIdent("request"),
      swTryAwait(swCall(swIdent("decorator"), [swArg(swIdent("request"))])),
    ),
  ]);
}

export interface ClientClassResult {
  /** The impl class itself. */
  class: SwClass;
  /** True when at least one method emitted the unimplemented-body throw,
   * so the orchestrator should also emit `URLSessionAPIError`. */
  needsErrorEnum: boolean;
}

export interface ClientClassOptions {
  /** When true, the class is `open` (subclassable) instead of `final`. Default: `false`. */
  open?: boolean;
}

/**
 * Convert a list of `OperationSignature`s for a tag into a class that
 * conforms to the matching protocol and contains a working URLSession-
 * based impl for each operation.
 */
export function buildClientClass(
  className: string,
  protocolName: string,
  signatures: ReadonlyArray<OperationSignature>,
  opts: ClientClassOptions = {},
): ClientClassResult {
  const built = signatures.map(buildImplFun);
  const modifiers: ReadonlyArray<SwClassModifier> = opts.open
    ? ["open"]
    : ["final"];
  const cls = swClass({
    name: className,
    conforms: [protocolName],
    modifiers,
    properties: clientStoredProps(),
    inits: [clientInit()],
    funs: built.map((b) => b.fun),
  });
  return {
    class: cls,
    needsErrorEnum: built.some((b) => b.needsErrorEnum),
  };
}

const requestDecoratorType = swOptional(
  swFunc([swRef("URLRequest")], swRef("URLRequest"), ["async", "throws"]),
);

function clientStoredProps() {
  return [
    swProp({ name: "baseURL", type: swRef("URL"), access: "internal" }),
    swProp({ name: "session", type: swRef("URLSession"), access: "internal" }),
    swProp({
      name: "decoder",
      type: swRef("JSONDecoder"),
      access: "internal",
    }),
    swProp({
      name: "encoder",
      type: swRef("JSONEncoder"),
      access: "internal",
    }),
    // Optional per-request mutation hook. Mutable so consumers can swap
    // it in after construction (e.g. once auth is loaded).
    swProp({
      name: "requestDecorator",
      type: requestDecoratorType,
      mutable: true,
      access: "public",
      default: "nil",
    }),
  ];
}

function clientInit() {
  return swInit({
    params: [
      swFunParam({ name: "baseURL", type: swRef("URL") }),
      swFunParam({
        name: "session",
        type: swRef("URLSession"),
        default: ".shared",
      }),
      swFunParam({
        name: "decoder",
        type: swRef("JSONDecoder"),
        default: "JSONDecoder()",
      }),
      swFunParam({
        name: "encoder",
        type: swRef("JSONEncoder"),
        default: "JSONEncoder()",
      }),
      swFunParam({
        name: "requestDecorator",
        type: requestDecoratorType,
        default: "nil",
      }),
    ],
  });
}

export { urlSessionAPIErrorEnum } from "./error-type.js";
