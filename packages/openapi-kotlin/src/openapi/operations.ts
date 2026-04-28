import type { OpenAPIV3_1 } from "@hey-api/spec-types";

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
import { camel, pascal } from "../utils/idents.js";
import {
  isRef,
  type SchemaOrRef,
  schemaToType,
  type TypeCtx,
} from "./types.js";

const RETROFIT_HTTP = "retrofit2.http";

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "head",
  "options",
] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

const RETROFIT_ANNOTATION: Record<HttpMethod, string> = {
  get: "GET",
  post: "POST",
  put: "PUT",
  delete: "DELETE",
  patch: "PATCH",
  head: "HEAD",
  options: "OPTIONS",
};

type ParameterObject = OpenAPIV3_1.ParameterObject;
type Operation = OpenAPIV3_1.OperationObject;

export interface OperationsOptions {
  /** Default: `"Default"`. */
  defaultTag?: string;
  /** Default: `(tag) => `${PascalCase(tag)}Api``. */
  interfaceName?: (tag: string) => string;
}

/**
 * Translate an OpenAPI `paths` object into Retrofit interfaces grouped by
 * each operation's first tag. Inline body/response/param schemas are
 * promoted to synthetic top-level decls and included in the output.
 */
export function operationsToDecls(
  paths: OpenAPIV3_1.PathsObject | undefined,
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
    const pathLevelParams = (pathItem.parameters ?? []) as Array<
      ParameterObject | OpenAPIV3_1.ReferenceObject
    >;

    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as Operation | undefined;
      if (!op) continue;

      const fnName = pickFnName(op, method, pathStr);
      const tag = op.tags?.[0] ?? defaultTag;
      const ctxOwner = pascal(fnName);

      const fnParams: KtFunParam[] = [];

      // Required params lead so trailing `= null` optionals don't break
      // positional calls.
      const sortedParams = [
        ...pathLevelParams,
        ...((op.parameters ?? []) as typeof pathLevelParams),
      ]
        .map((p, i) => ({ p, i }))
        .sort((a, b) => {
          const ra = (a.p as ParameterObject).required ? 0 : 1;
          const rb = (b.p as ParameterObject).required ? 0 : 1;
          return ra === rb ? a.i - b.i : ra - rb;
        })
        .map(({ p }) => p);

      for (const rawParam of sortedParams) {
        if (isRef(rawParam as SchemaOrRef)) continue;
        const param = rawParam as ParameterObject;
        const ann = paramAnnotation(param);
        if (!ann) continue;
        const baseSchema = (param.schema ?? { type: "string" }) as SchemaOrRef;
        const ctx: TypeCtx = {
          emit,
          ownerName: ctxOwner,
          propPath: ["param", param.name],
        };
        const t = schemaToType(baseSchema, ctx);
        const finalType = param.required ? t : ktNullable(t);
        fnParams.push(
          ktFunParam({
            name: identifier(param.name),
            type: finalType,
            annotations: [ann],
            default: param.required ? undefined : "null",
          }),
        );
      }

      const bodySchema = extractBodySchema(op);
      if (bodySchema) {
        const ctx: TypeCtx = {
          emit,
          ownerName: ctxOwner,
          propPath: ["body"],
        };
        const t = schemaToType(bodySchema, ctx);
        fnParams.push(
          ktFunParam({
            name: "body",
            type: t,
            annotations: [ktAnnotation("Body", { pkg: RETROFIT_HTTP })],
          }),
        );
      }

      const returnType = extractReturnType(op, {
        emit,
        ownerName: ctxOwner,
        propPath: ["response"],
      });

      const methodAnnotation = ktAnnotation(RETROFIT_ANNOTATION[method], {
        pkg: RETROFIT_HTTP,
        args: [JSON.stringify(stripLeadingSlash(pathStr))],
      });

      const fn = ktFun({
        name: camel(fnName),
        params: fnParams,
        returnType,
        modifiers: ["suspend"],
        annotations: [methodAnnotation],
      });

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

function pickFnName(op: Operation, method: HttpMethod, path: string): string {
  if (op.operationId) return op.operationId;
  const segments = path
    .split("/")
    .filter(Boolean)
    .map((s) => s.replace(/[{}]/g, ""));
  return [method, ...segments].join("_") || method;
}

function paramAnnotation(p: ParameterObject): KtAnnotation | undefined {
  switch (p.in) {
    case "path":
      return ktAnnotation("Path", {
        pkg: RETROFIT_HTTP,
        args: [JSON.stringify(p.name)],
      });
    case "query":
      return ktAnnotation("Query", {
        pkg: RETROFIT_HTTP,
        args: [JSON.stringify(p.name)],
      });
    case "header":
      return ktAnnotation("Header", {
        pkg: RETROFIT_HTTP,
        args: [JSON.stringify(p.name)],
      });
    default:
      return undefined;
  }
}

function extractBodySchema(op: Operation): SchemaOrRef | undefined {
  const rb = op.requestBody;
  if (!rb || isRef(rb as SchemaOrRef)) return undefined;
  const json = (rb as OpenAPIV3_1.RequestBodyObject).content?.[
    "application/json"
  ];
  return json?.schema as SchemaOrRef | undefined;
}

function extractReturnType(op: Operation, ctx: TypeCtx): KtType {
  const responses = op.responses ?? {};
  const successCode = Object.keys(responses).find((k) => /^2\d\d$/.test(k));
  if (!successCode) return ktUnit;
  const resp = responses[successCode];
  if (!resp || isRef(resp as SchemaOrRef)) return ktUnit;
  const json = (resp as OpenAPIV3_1.ResponseObject).content?.[
    "application/json"
  ];
  const schema = json?.schema as SchemaOrRef | undefined;
  if (!schema) return ktUnit;
  return schemaToType(schema, ctx);
}

function stripLeadingSlash(s: string): string {
  return s.startsWith("/") ? s.slice(1) : s;
}

function identifier(name: string): string {
  const camelLike = name.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) =>
    c.toUpperCase(),
  );
  return /^[0-9]/.test(camelLike) ? `_${camelLike}` : camelLike;
}
