import type { IR } from "@hey-api/shared";

import {
  ktAnnotation,
  ktFun,
  ktFunParam,
  ktInterface,
  ktNullable,
  ktUnit,
} from "../kt-dsl/builders.js";
import type {
  KtAnnotation,
  KtDecl,
  KtFun,
  KtFunParam,
  KtType,
} from "../kt-dsl/types.js";
import { bodyToParams } from "./body.js";
import { camel, paramIdent, pascal } from "./identifiers.js";
import {
  HTTP_METHODS,
  type HttpMethod,
  RETROFIT_HTTP,
  RETROFIT_METHOD_ANNOTATION,
} from "./retrofit.js";
import { isMeaningless, schemaToType, type TypeCtx } from "./schema-to-type.js";

const PARAM_LOCATIONS = ["path", "query", "header", "cookie"] as const;
type ParamLocation = (typeof PARAM_LOCATIONS)[number];

export interface OperationsOptions {
  /** Default: `"Default"`. */
  defaultTag?: string;
  /** Default: `(tag) => `${PascalCase(tag)}Api``. */
  interfaceName?: (tag: string) => string;
}

/**
 * Translate `IR.Model.paths` into Retrofit interfaces grouped by each
 * operation's first tag. Inline body / response / param schemas are
 * promoted to synthetic top-level decls in the same output array.
 */
export function operationsToDecls(
  paths: IR.PathsObject | undefined,
  opts: OperationsOptions = {},
): KtDecl[] {
  const defaultTag = opts.defaultTag ?? "Default";
  const interfaceName =
    opts.interfaceName ?? ((tag: string) => `${pascal(tag)}Api`);

  const decls: KtDecl[] = [];
  const emit = (d: KtDecl) => decls.push(d);
  const byTag = new Map<string, KtFun[]>();

  for (const [pathStr, pathItem] of Object.entries(paths ?? {})) {
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as IR.OperationObject | undefined;
      if (!op) continue;

      const fn = operationToFun(op, method, pathStr, emit);
      const tag = op.tags?.[0] ?? defaultTag;
      const list = byTag.get(tag);
      if (list) list.push(fn);
      else byTag.set(tag, [fn]);
    }
  }

  for (const [tag, funs] of byTag) {
    decls.push(ktInterface({ name: interfaceName(tag), funs }));
  }
  return decls;
}

function operationToFun(
  op: IR.OperationObject,
  method: HttpMethod,
  pathStr: string,
  emit: TypeCtx["emit"],
): KtFun {
  const fnName = pickFnName(op, method, pathStr);
  const ctxOwner = pascal(fnName);

  const fnAnnotations: KtAnnotation[] = [
    ktAnnotation(RETROFIT_METHOD_ANNOTATION[method], {
      pkg: RETROFIT_HTTP,
      args: [JSON.stringify(stripLeadingSlash(pathStr))],
    }),
  ];
  const params: KtFunParam[] = [...nonBodyParams(op, ctxOwner, emit)];

  if (op.body) {
    const result = bodyToParams(op.body, {
      emit,
      ownerName: ctxOwner,
      propPath: ["body"],
    });
    fnAnnotations.push(...result.fnAnnotations);
    params.push(...result.params);
  }

  return ktFun({
    name: camel(fnName),
    params,
    returnType: returnType(op, {
      emit,
      ownerName: ctxOwner,
      propPath: ["response"],
    }),
    modifiers: ["suspend"],
    annotations: fnAnnotations,
  });
}

function nonBodyParams(
  op: IR.OperationObject,
  ctxOwner: string,
  emit: TypeCtx["emit"],
): KtFunParam[] {
  const all: Array<{ p: IR.ParameterObject; loc: ParamLocation }> = [];
  for (const loc of PARAM_LOCATIONS) {
    const bucket = op.parameters?.[loc];
    if (!bucket) continue;
    for (const p of Object.values(bucket)) all.push({ p, loc });
  }
  // Required first so trailing optional defaults don't break positional calls.
  all.sort((a, b) => Number(!a.p.required) - Number(!b.p.required));

  const params: KtFunParam[] = [];
  for (const { p, loc } of all) {
    const annotation = paramAnnotation(p, loc);
    if (!annotation) continue;
    const t = schemaToType(p.schema, {
      emit,
      ownerName: ctxOwner,
      propPath: ["param", p.name],
    });
    const finalType = p.required ? t : ktNullable(t);
    params.push(
      ktFunParam({
        name: paramIdent(p.name),
        type: finalType,
        annotations: [annotation],
        default: p.required ? undefined : "null",
      }),
    );
  }
  return params;
}

function paramAnnotation(
  p: IR.ParameterObject,
  loc: ParamLocation,
): KtAnnotation | undefined {
  if (loc === "cookie") return undefined;
  const name = loc === "path" ? "Path" : loc === "query" ? "Query" : "Header";
  return ktAnnotation(name, {
    pkg: RETROFIT_HTTP,
    args: [JSON.stringify(p.name)],
  });
}

function returnType(op: IR.OperationObject, ctx: TypeCtx): KtType {
  const responses = op.responses ?? {};
  const successCode = Object.keys(responses).find((k) => /^2\d\d$/.test(k));
  if (!successCode) return ktUnit;
  const resp = responses[successCode];
  if (!resp?.schema || isMeaningless(resp.schema)) return ktUnit;
  return schemaToType(resp.schema, ctx);
}

function pickFnName(
  op: IR.OperationObject,
  method: HttpMethod,
  path: string,
): string {
  if (op.operationId) return op.operationId;
  const segments = path
    .split("/")
    .filter(Boolean)
    .map((s) => s.replace(/[{}]/g, ""));
  return [method, ...segments].join("_") || method;
}

function stripLeadingSlash(s: string): string {
  return s.startsWith("/") ? s.slice(1) : s;
}
