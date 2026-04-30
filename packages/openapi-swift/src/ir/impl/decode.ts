import type { SwCallArg, SwExpr, SwStmt, SwType } from "../../sw-dsl/index.js";
import {
  swArg,
  swCall,
  swCase,
  swDoCatch,
  swDotCase,
  swExprStmt,
  swIdent,
  swIntLit,
  swLet,
  swMember,
  swReturn,
  swSwitch,
  swThrow,
  swTry,
  swTryAwait,
  swTuple,
  swTupleBinding,
  swTypeRef,
} from "../../sw-dsl/index.js";
import type {
  OperationSignature,
  ResponseCase,
} from "../operation/signature.js";

/**
 * Tail of an impl method body — delegate to the runtime client. Five
 * shapes, picked from the sig:
 *
 *  - Single 2xx, `Void`                 → `try await client.execute(request, …)`
 *  - Single 2xx, `T`                    → `return try await client.execute(request, as: T.self, …)`
 *  - Single 2xx, `HTTPURLResponse`      → `return try await client.executeWithResponse(request, …)` (`*WithResponse` Void)
 *  - Single 2xx, `(T, HTTPURLResponse)` → `return try await client.executeWithResponse(request, as: T.self, …)`
 *  - Multi 2xx (sum-type)               → `client.executeRaw` + `switch` on status code, decode the matching case
 */
export function buildSendAndDecodeStmts(
  sig: OperationSignature,
): ReadonlyArray<SwStmt> {
  if (sig.responseCases.length > 0) {
    return buildMultiResponseStmts(sig);
  }
  return buildSingleResponseStmts(sig.returnType);
}

// MARK: single-2xx

function buildSingleResponseStmts(returnType: SwType): ReadonlyArray<SwStmt> {
  const dispatch = classifyReturn(returnType);
  const execute = swMember(swIdent("client"), dispatch.method);
  const args: SwCallArg[] = [swArg(swIdent("request"))];
  if (dispatch.decodableType) {
    args.push(swArg(swTypeRef(dispatch.decodableType), "as"));
  }
  args.push(
    swArg(
      swMember(swIdent("options"), "requestInterceptors"),
      "extraInterceptors",
    ),
    swArg(
      swMember(swIdent("options"), "responseValidator"),
      "responseValidator",
    ),
  );
  if (dispatch.includeTransformer) {
    args.push(
      swArg(
        swMember(swIdent("options"), "responseTransformer"),
        "responseTransformer",
      ),
    );
  }
  const call = swTryAwait(swCall(execute, args));
  return dispatch.discardResult ? [swExprStmt(call)] : [swReturn(call)];
}

interface DispatchShape {
  method: "execute" | "executeWithResponse";
  decodableType?: SwType;
  includeTransformer: boolean;
  discardResult: boolean;
}

function classifyReturn(t: SwType): DispatchShape {
  if (t.kind === "primitive" && t.name === "Void") {
    return {
      method: "execute",
      includeTransformer: false,
      discardResult: true,
    };
  }
  if (t.kind === "ref" && t.name === "HTTPURLResponse") {
    return {
      method: "executeWithResponse",
      includeTransformer: false,
      discardResult: false,
    };
  }
  if (t.kind === "tuple") {
    return {
      method: "executeWithResponse",
      decodableType: t.items[0],
      includeTransformer: true,
      discardResult: false,
    };
  }
  return {
    method: "execute",
    decodableType: t,
    includeTransformer: true,
    discardResult: false,
  };
}

// MARK: multi-2xx

function buildMultiResponseStmts(
  sig: OperationSignature,
): ReadonlyArray<SwStmt> {
  const wrapWithResponse = sig.returnType.kind === "tuple";
  const args: SwCallArg[] = [
    swArg(swIdent("request")),
    swArg(
      swMember(swIdent("options"), "requestInterceptors"),
      "extraInterceptors",
    ),
    swArg(
      swMember(swIdent("options"), "responseValidator"),
      "responseValidator",
    ),
    swArg(
      swMember(swIdent("options"), "responseTransformer"),
      "responseTransformer",
    ),
  ];
  return [
    swLet(
      swTupleBinding(["data", "httpResponse"]),
      swTryAwait(swCall(swMember(swIdent("client"), "executeRaw"), args)),
    ),
    swSwitch(
      swMember(swIdent("httpResponse"), "statusCode"),
      sig.responseCases.map((c) =>
        swCase([swIntLit(Number(c.statusCode))], caseBody(c, wrapWithResponse)),
      ),
      [
        swThrow(
          swCall(swMember(swIdent("APIError"), "unexpectedStatus"), [
            swArg(
              swMember(swIdent("httpResponse"), "statusCode"),
              "statusCode",
            ),
            swArg(swIdent("data"), "body"),
          ]),
        ),
      ],
    ),
  ];
}

function caseBody(
  c: ResponseCase,
  wrapWithResponse: boolean,
): ReadonlyArray<SwStmt> {
  if (!c.payloadType) {
    const value: SwExpr = swDotCase(c.caseName);
    return [swReturn(wrapResult(value, wrapWithResponse))];
  }
  return [
    swDoCatch(
      [
        swLet(
          "value",
          swTry(
            swCall(swMember(swMember(swIdent("client"), "decoder"), "decode"), [
              swArg(swTypeRef(c.payloadType)),
              swArg(swIdent("data"), "from"),
            ]),
          ),
        ),
        swReturn(
          wrapResult(
            swCall(swDotCase(c.caseName), [swArg(swIdent("value"))]),
            wrapWithResponse,
          ),
        ),
      ],
      [
        swThrow(
          swCall(swMember(swIdent("APIError"), "decodingFailed"), [
            swArg(swIdent("error")),
          ]),
        ),
      ],
    ),
  ];
}

function wrapResult(value: SwExpr, withResponse: boolean): SwExpr {
  return withResponse ? swTuple([value, swIdent("httpResponse")]) : value;
}
