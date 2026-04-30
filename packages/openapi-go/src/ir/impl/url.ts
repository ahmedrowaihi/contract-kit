import type { IR } from "@hey-api/shared";
import {
  type GoExpr,
  type GoStmt,
  goAssign,
  goBoolLit,
  goCall,
  goExprStmt,
  goIdent,
  goSelector,
  goShort,
  goStr,
} from "../../go-dsl/index.js";
import { paramIdent } from "../identifiers.js";
import type { LocatedParam } from "../operation/params.js";
import type { ErrCheckFn } from "./errors.js";

const URL_PARSE = goSelector(goIdent("url"), "Parse");
const SPRINT = goSelector(goIdent("fmt"), "Sprint");

/**
 * Statements that build the request `*url.URL` from `baseURL`, the
 * path template, and query params. Result is bound to `u` (mutable).
 *
 *  - `u, err := url.Parse(baseURL)` — error wrapped via the
 *    caller-supplied `errCheck` (return arity differs across impl
 *    methods, so we don't bake it in here).
 *  - Path segments interpolate via `path.Join(u.Path, segs...)` so
 *    reserved characters in dynamic values are escaped per-segment.
 *  - Query params route through the runtime `URLEncoding.AddScalar`
 *    / `URLEncoding.AddArray` so style/explode rules are uniform.
 */
export function buildUrlStmts(
  pathStr: string,
  located: ReadonlyArray<LocatedParam>,
  errCheck: ErrCheckFn,
): ReadonlyArray<GoStmt> {
  const pathParams = located
    .filter((l) => l.loc === "path")
    .map((l) => l.param);
  const queryParams = located
    .filter((l) => l.loc === "query")
    .map((l) => l.param);

  const stmts: GoStmt[] = [
    goShort(["u", "err"], [goCall(URL_PARSE, [{ expr: goIdent("baseURL") }])]),
    errCheck("transport"),
    goAssign(
      [goSelector(goIdent("u"), "Path")],
      [
        goCall(goSelector(goIdent("path"), "Join"), [
          { expr: goSelector(goIdent("u"), "Path") },
          ...splitSegments(pathStr).map((seg) => ({
            expr: segmentExpr(seg, pathParams),
          })),
        ]),
      ],
    ),
  ];

  if (queryParams.length > 0) {
    stmts.push(goShort(["q"], [goCall(goSelector(goIdent("u"), "Query"), [])]));
    for (const p of queryParams) stmts.push(buildQueryStmt(p));
    stmts.push(
      goAssign(
        [goSelector(goIdent("u"), "RawQuery")],
        [goCall(goSelector(goIdent("q"), "Encode"), [])],
      ),
    );
  }

  return stmts;
}

function splitSegments(pathStr: string): string[] {
  const stripped = pathStr.startsWith("/") ? pathStr.slice(1) : pathStr;
  return stripped.split("/").filter((s) => s.length > 0);
}

function segmentExpr(
  seg: string,
  pathParams: ReadonlyArray<IR.ParameterObject>,
): GoExpr {
  const re = /\{([^}]+)\}/g;
  const parts: Array<string | { id: string; isString: boolean }> = [];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg)) !== null) {
    if (m.index > lastEnd) parts.push(seg.slice(lastEnd, m.index));
    const matched = pathParams.find((p) => p.name === m![1]);
    parts.push({
      id: paramIdent(matched ? matched.name : m[1]!),
      isString: matched?.schema.type === "string",
    });
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < seg.length) parts.push(seg.slice(lastEnd));

  if (parts.length === 0) return goStr("");
  if (parts.length === 1 && typeof parts[0] === "string")
    return goStr(parts[0]);
  if (parts.length === 1) {
    const only = parts[0] as { id: string; isString: boolean };
    return only.isString
      ? goIdent(only.id)
      : goCall(SPRINT, [{ expr: goIdent(only.id) }]);
  }
  const fmtParts: string[] = [];
  const args: GoExpr[] = [];
  for (const p of parts) {
    if (typeof p === "string") fmtParts.push(p.replace(/%/g, "%%"));
    else {
      fmtParts.push("%v");
      args.push(goIdent(p.id));
    }
  }
  return goCall(goSelector(goIdent("fmt"), "Sprintf"), [
    { expr: goStr(fmtParts.join("")) },
    ...args.map((a) => ({ expr: a })),
  ]);
}

function buildQueryStmt(p: IR.ParameterObject): GoStmt {
  const id = paramIdent(p.name);
  const isArray = p.schema.type === "array";
  const helper = isArray ? "AddArray" : "AddScalar";
  const args = [
    { expr: goIdent("q") },
    { expr: goStr(p.name) },
    { expr: goIdent(id) },
  ];
  if (isArray) {
    args.push({
      expr: goIdent(`QueryStyle${queryStyleEntry(p.style)}`),
    });
    args.push({ expr: goBoolLit(p.explode ?? true) });
  }
  return goExprStmt(goCall(goSelector(goIdent("URLEncoding"), helper), args));
}

function queryStyleEntry(style: IR.ParameterObject["style"]): string {
  switch (style) {
    case "spaceDelimited":
      return "SpaceDelimited";
    case "pipeDelimited":
      return "PipeDelimited";
    default:
      return "Form";
  }
}
