import type { IR } from "@hey-api/shared";
import type { SwExpr, SwStmt } from "../../sw-dsl/index.js";
import {
  swArg,
  swCall,
  swExprStmt,
  swIdent,
  swIfLet,
  swInterp,
  swMember,
  swStr,
} from "../../sw-dsl/index.js";
import { paramIdent } from "../identifiers.js";
import type { LocatedParam } from "../operation/params.js";

/**
 * `request.setValue("\(<name>)", forHTTPHeaderField: "<name>")` for each
 * header param. Optional headers are wrapped in `if let`.
 */
export function buildHeaderStmts(
  located: ReadonlyArray<LocatedParam>,
): ReadonlyArray<SwStmt> {
  const headers = located.filter((l) => l.loc === "header").map((l) => l.param);
  return headers.flatMap(buildHeaderStmt);
}

function buildHeaderStmt(p: IR.ParameterObject): ReadonlyArray<SwStmt> {
  const id = paramIdent(p.name);
  const setValue = (ref: SwExpr): SwStmt =>
    swExprStmt(
      swCall(swMember(swIdent("request"), "setValue"), [
        swArg(swInterp([ref])),
        swArg(swStr(p.name), "forHTTPHeaderField"),
      ]),
    );
  if (p.required) return [setValue(swIdent(id))];
  return [swIfLet(id, swIdent(id), [setValue(swIdent(id))])];
}
