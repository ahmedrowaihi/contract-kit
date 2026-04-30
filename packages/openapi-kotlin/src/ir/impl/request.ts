import { HTTP_METHOD_LITERAL, type HttpMethod } from "@ahmedrowaihi/oas-core";

import {
  type KtStmt,
  ktArg,
  ktCall,
  ktExprStmt,
  ktIdent,
  ktMember,
  ktNull,
  ktStr,
  ktVal,
} from "../../kt-dsl/index.js";

/**
 * Initial request builder + HTTP method. Body-bearing methods can re-call
 * `.method(verb, body)` later from the body builder; bodyless methods
 * (`GET` / `HEAD` / `DELETE` without body) keep the `null` body set here.
 *
 *   val builder = Request.Builder().url(url).method("GET", null)
 */
export function buildRequestStmts(method: HttpMethod): ReadonlyArray<KtStmt> {
  return [
    ktVal(
      "builder",
      ktCall(
        ktMember(
          ktCall(ktMember(ktCall(ktIdent("Request.Builder"), []), "url"), [
            ktArg(ktIdent("url")),
          ]),
          "method",
        ),
        [ktArg(ktStr(HTTP_METHOD_LITERAL[method])), ktArg(ktNull)],
      ),
    ),
  ];
}

/** Convenience for the body builder to re-set the method when a
 *  RequestBody is produced. */
export function setMethodWithBody(
  method: HttpMethod,
  bodyExpr: import("../../kt-dsl/index.js").KtExpr,
): KtStmt {
  return ktExprStmt(
    ktCall(ktMember(ktIdent("builder"), "method"), [
      ktArg(ktStr(HTTP_METHOD_LITERAL[method])),
      ktArg(bodyExpr),
    ]),
  );
}
