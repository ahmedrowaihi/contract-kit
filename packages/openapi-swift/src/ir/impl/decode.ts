import type { SwStmt, SwType } from "../../sw-dsl/index.js";
import {
  swArg,
  swCall,
  swIdent,
  swLet,
  swMember,
  swReturn,
  swTry,
  swTryAwait,
  swTupleBinding,
  swTypeRef,
} from "../../sw-dsl/index.js";

/**
 * `let (data, _) = try await session.data(for: request)` and (when the
 * response type isn't `Void`) `return try decoder.decode(T.self, from: data)`.
 */
export function buildSendAndDecodeStmts(
  returnType: SwType,
): ReadonlyArray<SwStmt> {
  const stmts: SwStmt[] = [];
  stmts.push(
    swLet(
      swTupleBinding(["data", "_"]),
      swTryAwait(
        swCall(swMember(swIdent("session"), "data"), [
          swArg(swIdent("request"), "for"),
        ]),
      ),
    ),
  );
  const isVoid = returnType.kind === "primitive" && returnType.name === "Void";
  if (!isVoid) {
    stmts.push(
      swReturn(
        swTry(
          swCall(swMember(swIdent("decoder"), "decode"), [
            swArg(swTypeRef(returnType)),
            swArg(swIdent("data"), "from"),
          ]),
        ),
      ),
    );
  }
  return stmts;
}
