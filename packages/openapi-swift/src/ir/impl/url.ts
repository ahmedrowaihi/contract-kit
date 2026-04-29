import type { IR } from "@hey-api/shared";
import type { SwExpr, SwStmt } from "../../sw-dsl/index.js";
import {
  swArg,
  swArrayLit,
  swBoolLit,
  swCall,
  swExprStmt,
  swForceUnwrap,
  swIdent,
  swIfLet,
  swInterp,
  swLet,
  swMember,
  swStr,
  swVar,
} from "../../sw-dsl/index.js";
import { swRef } from "../../sw-dsl/type/index.js";
import { paramIdent } from "../identifiers.js";
import type { LocatedParam } from "../operation/params.js";

/**
 * Statements that build a `URLRequest`-ready URL from `baseURL`, the
 * path template, and query parameters. The result is bound to `url`.
 *
 * Behavior:
 *  - Path template parameters are interpolated into
 *    `baseURL.appendingPathComponent("…/\(id)/…")`.
 *  - When there are no query params, `url` is bound directly.
 *  - When there are query params, we go through `URLComponents`, append
 *    one `URLQueryItem` per param (wrapped in `if let` for optional
 *    params), and unwrap `components.url!` into `url`.
 */
export function buildUrlStmts(
  pathStr: string,
  located: ReadonlyArray<LocatedParam>,
): ReadonlyArray<SwStmt> {
  const pathParams = located
    .filter((l) => l.loc === "path")
    .map((l) => l.param);
  const queryParams = located
    .filter((l) => l.loc === "query")
    .map((l) => l.param);

  const pathExpr = pathInterpolation(pathStr, pathParams);
  const appendPath = swCall(
    swMember(swIdent("baseURL"), "appendingPathComponent"),
    [swArg(pathExpr)],
  );

  if (queryParams.length === 0) {
    return [swLet("url", appendPath)];
  }

  const stmts: SwStmt[] = [];
  // var components = URLComponents(url: <appendPath>, resolvingAgainstBaseURL: false)!
  stmts.push(
    swVar(
      "components",
      swForceUnwrap(
        swCall(swIdent("URLComponents"), [
          swArg(appendPath, "url"),
          swArg(swBoolLit(false), "resolvingAgainstBaseURL"),
        ]),
      ),
    ),
  );
  // components.queryItems = [URLQueryItem]()
  stmts.push({
    kind: "assign",
    target: swMember(swIdent("components"), "queryItems"),
    value: swArrayLit([], swRef("URLQueryItem")),
  });
  // components.queryItems!.append(URLQueryItem(name: "x", value: "\(x)"))
  for (const p of queryParams) {
    stmts.push(...appendQueryItem(p));
  }
  // let url = components.url!
  stmts.push(
    swLet("url", swForceUnwrap(swMember(swIdent("components"), "url"))),
  );
  return stmts;
}

function pathInterpolation(
  pathStr: string,
  pathParams: ReadonlyArray<IR.ParameterObject>,
): SwExpr {
  const stripped = pathStr.startsWith("/") ? pathStr.slice(1) : pathStr;
  const parts: Array<string | SwExpr> = [];
  const re = /\{([^}]+)\}/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    if (m.index > lastEnd) parts.push(stripped.slice(lastEnd, m.index));
    const matched = pathParams.find((p) => p.name === m![1]);
    parts.push(swIdent(paramIdent(matched ? matched.name : m[1]!)));
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < stripped.length) parts.push(stripped.slice(lastEnd));
  if (parts.length === 1 && typeof parts[0] === "string")
    return swStr(parts[0]);
  return swInterp(parts);
}

function appendQueryItem(p: IR.ParameterObject): ReadonlyArray<SwStmt> {
  const id = paramIdent(p.name);
  const valueExpr = (ref: SwExpr): SwExpr => swInterp([ref]);
  const itemFor = (ref: SwExpr): SwExpr =>
    swCall(swIdent("URLQueryItem"), [
      swArg(swStr(p.name), "name"),
      swArg(valueExpr(ref), "value"),
    ]);
  const appendCall = (ref: SwExpr): SwStmt =>
    swExprStmt(
      swCall(
        swMember(
          swForceUnwrap(swMember(swIdent("components"), "queryItems")),
          "append",
        ),
        [swArg(itemFor(ref))],
      ),
    );

  if (p.required) {
    return [appendCall(swIdent(id))];
  }
  return [swIfLet(id, swIdent(id), [appendCall(swIdent(id))])];
}
