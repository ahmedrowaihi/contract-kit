import type { IR } from "@hey-api/shared";
import type { SwCallArg, SwExpr, SwStmt } from "../../sw-dsl/index.js";
import {
  swArg,
  swArrayLit,
  swAssign,
  swBoolLit,
  swCall,
  swDotCase,
  swExprStmt,
  swGuardLet,
  swIdent,
  swInterp,
  swLet,
  swMember,
  swOptChain,
  swRef,
  swStr,
  swThrow,
  swVar,
} from "../../sw-dsl/index.js";
import { paramIdent } from "../identifiers.js";
import type { LocatedParam } from "../operation/params.js";

/**
 * Statements that build a `URLRequest`-ready URL from `baseURL`, the
 * path template, and query parameters. The result is bound to `url`.
 *
 *  - Path-template parameters are interpolated into
 *    `baseURL.appendingPathComponent("…/\(id)/…")`.
 *  - When there are no query params, `url` is bound directly.
 *  - When there are query params, we route through `URLComponents`,
 *    append-contentsOf a `URLEncoding.query(...)` result per param,
 *    and unwrap `components.url!` into `url`.
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

  const appendPath = buildPathChain(swIdent("baseURL"), pathStr, pathParams);

  if (queryParams.length === 0) {
    return [swLet("url", appendPath)];
  }

  return [
    swGuardLet(
      "urlComponents",
      swCall(swIdent("URLComponents"), [
        swArg(appendPath, "url"),
        swArg(swBoolLit(false), "resolvingAgainstBaseURL"),
      ]),
      [throwBadURL()],
    ),
    swVar("components", swIdent("urlComponents")),
    swAssign(
      swMember(swIdent("components"), "queryItems"),
      swArrayLit([], swRef("URLQueryItem")),
    ),
    ...queryParams.map(appendQueryItemsCall),
    swGuardLet("url", swMember(swIdent("components"), "url"), [throwBadURL()]),
  ];
}

function throwBadURL(): SwStmt {
  return swThrow(
    swCall(swMember(swIdent("APIError"), "transport"), [
      swArg(swCall(swIdent("URLError"), [swArg(swDotCase("badURL"))])),
    ]),
  );
}

function appendQueryItemsCall(p: IR.ParameterObject): SwStmt {
  return swExprStmt(
    swCall(
      swOptChain(swMember(swIdent("components"), "queryItems"), "append"),
      [swArg(urlEncodingQueryCall(p), "contentsOf")],
    ),
  );
}

function urlEncodingQueryCall(p: IR.ParameterObject): SwExpr {
  const id = paramIdent(p.name);
  const isArray = p.schema.type === "array";
  const args: SwCallArg[] = [
    swArg(swStr(p.name)),
    swArg(swIdent(id), isArray ? "values" : "value"),
  ];
  if (isArray) {
    args.push(swArg(swDotCase(styleCase(p.style)), "style"));
    args.push(swArg(swBoolLit(p.explode ?? true), "explode"));
  }
  return swCall(swMember(swIdent("URLEncoding"), "query"), args);
}

function styleCase(style: IR.ParameterObject["style"]): string {
  switch (style) {
    case "spaceDelimited":
      return "spaceDelimited";
    case "pipeDelimited":
      return "pipeDelimited";
    default:
      // form, simple, label, matrix, deepObject all collapse to `.form`
      // for query encoding — others are path/header-specific styles.
      return "form";
  }
}

/**
 * Build a chain of `.appendingPathComponent(<seg>)` calls, one per
 * `/`-separated segment of the path template. Each dynamic segment
 * goes through `appendingPathComponent` separately so reserved
 * characters in the value (`/`, `?`, `#`, spaces) are percent-encoded
 * and stay inside their own component instead of leaking into the
 * URL structure.
 */
function buildPathChain(
  base: SwExpr,
  pathStr: string,
  pathParams: ReadonlyArray<IR.ParameterObject>,
): SwExpr {
  const stripped = pathStr.startsWith("/") ? pathStr.slice(1) : pathStr;
  const segments = stripped.split("/").filter((s) => s.length > 0);
  return segments.reduce<SwExpr>(
    (acc, seg) =>
      swCall(swMember(acc, "appendingPathComponent"), [
        swArg(segmentExpr(seg, pathParams)),
      ]),
    base,
  );
}

function segmentExpr(
  seg: string,
  pathParams: ReadonlyArray<IR.ParameterObject>,
): SwExpr {
  const parts: Array<string | SwExpr> = [];
  const re = /\{([^}]+)\}/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg)) !== null) {
    if (m.index > lastEnd) parts.push(seg.slice(lastEnd, m.index));
    const matched = pathParams.find((p) => p.name === m![1]);
    parts.push(swIdent(paramIdent(matched ? matched.name : m[1]!)));
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < seg.length) parts.push(seg.slice(lastEnd));
  if (parts.length === 0) return swStr("");
  if (parts.length === 1 && typeof parts[0] === "string")
    return swStr(parts[0]);
  return swInterp(parts);
}
