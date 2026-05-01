import type { IR } from "@hey-api/shared";
import {
  type GoExpr,
  type GoStmt,
  goCall,
  goExprStmt,
  goIdent,
  goIf,
  goNe,
  goNil,
  goSelector,
  goStr,
} from "../../go-dsl/index.js";
import { paramIdent } from "../identifiers.js";
import type { LocatedParam } from "../operation/params.js";

/**
 * `req.Header.Set("<name>", fmt.Sprint(<value>))` for each header
 * param. Optional pointer-typed headers are dereferenced inside an
 * `if <name> != nil` guard.
 */
export function buildHeaderStmts(
  located: ReadonlyArray<LocatedParam>,
): ReadonlyArray<GoStmt> {
  const headers = located.filter((l) => l.loc === "header").map((l) => l.param);
  return headers.flatMap(buildHeaderStmt);
}

function buildHeaderStmt(p: IR.ParameterObject): ReadonlyArray<GoStmt> {
  const id = paramIdent(p.name);
  const valueExpr: GoExpr = p.required
    ? goIdent(id)
    : { kind: "unary", op: "*", operand: goIdent(id) };
  const setStmt = goExprStmt(
    goCall(goSelector(goSelector(goIdent("req"), "Header"), "Set"), [
      { expr: goStr(p.name) },
      {
        expr: goCall(goSelector(goIdent("fmt"), "Sprint"), [
          { expr: valueExpr },
        ]),
      },
    ]),
  );
  if (p.required) return [setStmt];
  return [goIf(goNe(goIdent(id), goNil), [setStmt])];
}
