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
  // OPTIONS isn't a built-in Retrofit annotation — emit @HTTP(method = "OPTIONS").
  options: "OPTIONS",
};

type ParameterObject = OpenAPIV3_1.ParameterObject;
type Operation = OpenAPIV3_1.OperationObject;

export interface OperationsOptions {
  /** Tag for operations with no `tags`. Default: `"Default"`. */
  defaultTag?: string;
  /** Tag → interface name. Default: `(tag) => `${PascalCase(tag)}Api``. */
  interfaceName?: (tag: string) => string;
}

/**
 * Translate an OpenAPI `paths` object into Retrofit interfaces grouped by
 * the first tag of each operation. Returns a flat decl list including the
 * generated interfaces and any synthesized inline-schema decls.
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
  // Preserve insertion order of tags as encountered while walking paths.
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

      const allParams = [
        ...pathLevelParams,
        ...((op.parameters ?? []) as typeof pathLevelParams),
      ];
      for (const rawParam of allParams) {
        if (isRef(rawParam as SchemaOrRef)) continue; // skip param refs for M3
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
  // Synthesize: method_segment_segment ; preserves casing source for camel().
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
      // cookie: Retrofit has no built-in annotation. Skip.
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

/**
 * Convert an arbitrary parameter name into a Kotlin-safe camelCase
 * identifier. `user-id` → `userId`; `2fa_token` → `_2faToken`.
 */
function identifier(name: string): string {
  const camelLike = name.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) =>
    c.toUpperCase(),
  );
  // Kotlin identifiers cannot start with a digit.
  return /^[0-9]/.test(camelLike) ? `_${camelLike}` : camelLike;
}
