import type { SwStmt } from "../../sw-dsl/index.js";
import {
  swArg,
  swAssign,
  swCall,
  swIdent,
  swMember,
  swStr,
  swVar,
} from "../../sw-dsl/index.js";
import { HTTP_METHOD_LITERAL, type HttpMethod } from "../constants.js";

/**
 * `var request = URLRequest(url: url)` followed by `request.httpMethod = "GET"`.
 */
export function buildRequestStmts(method: HttpMethod): ReadonlyArray<SwStmt> {
  return [
    swVar(
      "request",
      swCall(swIdent("URLRequest"), [swArg(swIdent("url"), "url")]),
    ),
    swAssign(
      swMember(swIdent("request"), "httpMethod"),
      swStr(HTTP_METHOD_LITERAL[method]),
    ),
  ];
}
