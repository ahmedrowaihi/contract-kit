import type { IR } from "@hey-api/shared";
import {
  type KtCallArg,
  type KtExpr,
  type KtStmt,
  ktArg,
  ktBoolLit,
  ktCall,
  ktExprStmt,
  ktIdent,
  ktInterp,
  ktMember,
  ktStr,
  ktVal,
  ktVar,
} from "../../kt-dsl/index.js";
import { paramIdent } from "../identifiers.js";
import type { LocatedParam } from "../operation/params.js";

/**
 * Statements that build an `HttpUrl` from `baseUrl`, the path template,
 * and query parameters. The result is bound to `url`.
 *
 *  - Path-template parameters become `addPathSegment(<expr>.toString())`.
 *  - Mixed segments like `users-{id}` interpolate into a single
 *    `addPathSegment("users-$id")` call (OkHttp percent-encodes the
 *    full segment, so reserved characters in the value stay scoped to
 *    that segment).
 *  - Query params route through `URLEncoding.addScalar` /
 *    `URLEncoding.addArray` so style+explode is uniform.
 */
export function buildUrlStmts(
  pathStr: string,
  located: ReadonlyArray<LocatedParam>,
): ReadonlyArray<KtStmt> {
  const pathParams = located
    .filter((l) => l.loc === "path")
    .map((l) => l.param);
  const queryParams = located
    .filter((l) => l.loc === "query")
    .map((l) => l.param);

  const stmts: KtStmt[] = [
    ktVar("urlBuilder", ktCall(ktMember(ktIdent("baseUrl"), "newBuilder"), [])),
  ];
  for (const seg of splitSegments(pathStr)) {
    stmts.push(
      ktExprStmt(
        ktCall(ktMember(ktIdent("urlBuilder"), "addPathSegment"), [
          ktArg(segmentExpr(seg, pathParams)),
        ]),
      ),
    );
  }
  for (const p of queryParams) {
    stmts.push(buildQueryStmt(p));
  }
  stmts.push(
    ktVal("url", ktCall(ktMember(ktIdent("urlBuilder"), "build"), [])),
  );
  return stmts;
}

function splitSegments(pathStr: string): string[] {
  const stripped = pathStr.startsWith("/") ? pathStr.slice(1) : pathStr;
  return stripped.split("/").filter((s) => s.length > 0);
}

function segmentExpr(
  seg: string,
  pathParams: ReadonlyArray<IR.ParameterObject>,
): KtExpr {
  const parts: Array<string | KtExpr> = [];
  const re = /\{([^}]+)\}/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg)) !== null) {
    if (m.index > lastEnd) parts.push(seg.slice(lastEnd, m.index));
    const matched = pathParams.find((p) => p.name === m![1]);
    parts.push(ktIdent(paramIdent(matched ? matched.name : m[1]!)));
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < seg.length) parts.push(seg.slice(lastEnd));

  if (parts.length === 0) return ktStr("");
  if (parts.length === 1 && typeof parts[0] === "string")
    return ktStr(parts[0]);
  if (parts.length === 1)
    return ktCall(ktMember(parts[0] as KtExpr, "toString"), []);
  return ktInterp(parts);
}

function buildQueryStmt(p: IR.ParameterObject): KtStmt {
  const id = paramIdent(p.name);
  const isArray = p.schema.type === "array";
  const helper = isArray ? "addArray" : "addScalar";
  const args: KtCallArg[] = [
    ktArg(ktIdent("urlBuilder")),
    ktArg(ktStr(p.name)),
    ktArg(ktIdent(id)),
  ];
  if (isArray) {
    args.push(
      ktArg(ktIdent(`QueryStyle.${queryStyleEntry(p.style)}`), "style"),
    );
    args.push(ktArg(ktBoolLit(p.explode ?? true), "explode"));
  }
  return ktExprStmt(ktCall(ktMember(ktIdent("URLEncoding"), helper), args));
}

function queryStyleEntry(style: IR.ParameterObject["style"]): string {
  switch (style) {
    case "spaceDelimited":
      return "SPACE_DELIMITED";
    case "pipeDelimited":
      return "PIPE_DELIMITED";
    default:
      return "FORM";
  }
}
