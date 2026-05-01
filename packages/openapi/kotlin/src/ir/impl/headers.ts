import type { IR } from "@hey-api/shared";
import {
  type KtStmt,
  ktArg,
  ktCall,
  ktExprStmt,
  ktIdent,
  ktIf,
  ktInterp,
  ktMember,
  ktNe,
  ktNull,
  ktStr,
} from "../../kt-dsl/index.js";
import { paramIdent } from "../identifiers.js";
import type { LocatedParam } from "../operation/params.js";

/**
 * `builder.header("<name>", "$<value>")` for each header param. Optional
 * headers are wrapped in `if (<name> != null)`.
 */
export function buildHeaderStmts(
  located: ReadonlyArray<LocatedParam>,
): ReadonlyArray<KtStmt> {
  const headers = located.filter((l) => l.loc === "header").map((l) => l.param);
  return headers.flatMap(buildHeaderStmt);
}

function buildHeaderStmt(p: IR.ParameterObject): ReadonlyArray<KtStmt> {
  const id = paramIdent(p.name);
  const setStmt = ktExprStmt(
    ktCall(ktMember(ktIdent("builder"), "header"), [
      ktArg(ktStr(p.name)),
      ktArg(ktInterp([ktIdent(id)])),
    ]),
  );
  if (p.required) return [setStmt];
  return [ktIf(ktNe(ktIdent(id), ktNull), [setStmt])];
}
