import {
  type KtCallArg,
  type KtExpr,
  type KtStmt,
  type KtType,
  ktArg,
  ktCall,
  ktExprStmt,
  ktIdent,
  ktIntLit,
  ktMember,
  ktReturn,
  ktThrow,
  ktVal,
  ktWhen,
  ktWhenCase,
} from "../../kt-dsl/index.js";
import type {
  OperationSignature,
  ResponseCase,
} from "../operation/signature.js";
import { serializerFor } from "./serializer.js";

/**
 * Tail of an impl method body — delegate to the runtime client. Five
 * shapes, picked from the sig:
 *
 *  - Single 2xx, `Unit`               → `client.executeUnit(builder.build(), …)`
 *  - Single 2xx, `T`                  → `return client.execute(builder.build(), <ser>, …)`
 *  - Single 2xx, `Response`           → `return client.executeUnitWithResponse(builder.build(), …)`
 *  - Single 2xx, `Pair<T, Response>`  → `return client.executeWithResponse(builder.build(), <ser>, …)`
 *  - Multi 2xx (sealed-class)         → `client.executeRaw(...)` + `when (response.code)` switch, decode each case
 */
export function buildSendAndDecodeStmts(
  sig: OperationSignature,
): ReadonlyArray<KtStmt> {
  if (sig.responseCases.length > 0) return buildMultiResponseStmts(sig);
  return buildSingleResponseStmts(sig.returnType);
}

// MARK: single-2xx

function buildSingleResponseStmts(returnType: KtType): ReadonlyArray<KtStmt> {
  const dispatch = classifyReturn(returnType);
  const callee = ktMember(ktIdent("client"), dispatch.method);
  const args: KtCallArg[] = [
    ktArg(ktCall(ktMember(ktIdent("builder"), "build"), [])),
  ];
  if (dispatch.deserializerType) {
    args.push(ktArg(serializerFor(dispatch.deserializerType)));
  }
  args.push(
    ktArg(ktMember(ktIdent("options"), "timeout"), "timeout"),
    ktArg(
      ktMember(ktIdent("options"), "requestInterceptors"),
      "extraInterceptors",
    ),
    ktArg(
      ktMember(ktIdent("options"), "responseValidator"),
      "responseValidator",
    ),
  );
  if (dispatch.includeTransformer) {
    args.push(
      ktArg(
        ktMember(ktIdent("options"), "responseTransformer"),
        "responseTransformer",
      ),
    );
  }
  const call = ktCall(callee, args);
  return dispatch.discardResult ? [ktExprStmt(call)] : [ktReturn(call)];
}

interface DispatchShape {
  method:
    | "execute"
    | "executeUnit"
    | "executeWithResponse"
    | "executeUnitWithResponse";
  deserializerType?: KtType;
  includeTransformer: boolean;
  discardResult: boolean;
}

function classifyReturn(t: KtType): DispatchShape {
  if (t.kind === "primitive" && t.name === "Unit") {
    return {
      method: "executeUnit",
      includeTransformer: false,
      discardResult: true,
    };
  }
  if (t.kind === "ref" && t.name === "Response") {
    return {
      method: "executeUnitWithResponse",
      includeTransformer: false,
      discardResult: false,
    };
  }
  if (t.kind === "ref" && t.name === "Pair" && t.args && t.args.length > 0) {
    return {
      method: "executeWithResponse",
      deserializerType: t.args[0],
      includeTransformer: true,
      discardResult: false,
    };
  }
  return {
    method: "execute",
    deserializerType: t,
    includeTransformer: true,
    discardResult: false,
  };
}

// MARK: multi-2xx

function buildMultiResponseStmts(
  sig: OperationSignature,
): ReadonlyArray<KtStmt> {
  const wrapWithResponse =
    sig.returnType.kind === "ref" && sig.returnType.name === "Pair";
  const sealedName = `${sig.ownerName}_Response`;
  const args: KtCallArg[] = [
    ktArg(ktCall(ktMember(ktIdent("builder"), "build"), [])),
    ktArg(ktMember(ktIdent("options"), "timeout"), "timeout"),
    ktArg(
      ktMember(ktIdent("options"), "requestInterceptors"),
      "extraInterceptors",
    ),
    ktArg(
      ktMember(ktIdent("options"), "responseValidator"),
      "responseValidator",
    ),
    ktArg(
      ktMember(ktIdent("options"), "responseTransformer"),
      "responseTransformer",
    ),
  ];
  return [
    ktVal("raw", ktCall(ktMember(ktIdent("client"), "executeRaw"), args)),
    ktVal("data", ktMember(ktIdent("raw"), "first")),
    ktVal("response", ktMember(ktIdent("raw"), "second")),
    ktWhen(
      ktMember(ktIdent("response"), "code"),
      sig.responseCases.map((c) =>
        ktWhenCase(
          [ktIntLit(Number(c.statusCode))],
          caseBody(c, sealedName, wrapWithResponse),
        ),
      ),
      [
        ktThrow(
          ktCall(ktIdent("APIError.UnexpectedStatus"), [
            ktArg(ktMember(ktIdent("response"), "code")),
            ktArg(ktIdent("data")),
          ]),
        ),
      ],
    ),
  ];
}

function caseBody(
  c: ResponseCase,
  sealedName: string,
  wrapWithResponse: boolean,
): ReadonlyArray<KtStmt> {
  if (!c.payloadType) {
    return [
      ktReturn(
        wrapResult(ktIdent(`${sealedName}.${c.caseName}`), wrapWithResponse),
      ),
    ];
  }
  const decoded = ktCall(
    ktMember(ktMember(ktIdent("client"), "json"), "decodeFromString"),
    [
      ktArg(serializerFor(c.payloadType)),
      ktArg(ktCall(ktMember(ktIdent("data"), "decodeToString"), [])),
    ],
  );
  return [
    ktVal("value", decoded),
    ktReturn(
      wrapResult(
        ktCall(ktIdent(`${sealedName}.${c.caseName}`), [
          ktArg(ktIdent("value")),
        ]),
        wrapWithResponse,
      ),
    ),
  ];
}

function wrapResult(value: KtExpr, withResponse: boolean): KtExpr {
  if (!withResponse) return value;
  return ktCall(ktIdent("Pair"), [ktArg(value), ktArg(ktIdent("response"))]);
}
