import {
  HTTP_METHODS,
  type HttpMethod,
  securityKey,
} from "@ahmedrowaihi/openapi-core";
import type { IR } from "@hey-api/shared";

import {
  type GoDecl,
  type GoFuncResult,
  type GoMethodSignature,
  type GoType,
  goError,
  goFuncResult,
  goInterface,
  goMethodSig,
  goPtr,
  goRef,
} from "../go-dsl/index.js";
import { exportedIdent } from "./identifiers.js";
import { buildClientStruct } from "./impl/index.js";
import {
  type OperationSignature,
  operationSignature,
} from "./operation/index.js";

export interface OperationsOptions {
  /** Default: `"Default"`. */
  defaultTag?: string;
  /** Default: `(tag) => `${PascalCase(tag)}API``. */
  interfaceName?: (tag: string) => string;
  /** Default: `(interfaceName) => `NetHTTP${interfaceName}``. */
  clientStructName?: (interfaceName: string) => string;
  /** Skip emitting the impl struct. Default: `false`. */
  interfaceOnly?: boolean;
  /** Per-operation security-scheme names. See swift / kotlin generators. */
  securitySchemeNames?: ReadonlyMap<string, ReadonlyArray<string>>;
}

export interface OperationsResult {
  decls: GoDecl[];
  needsMultipart: boolean;
  needsAuth: boolean;
}

/**
 * Translate `IR.Model.paths` into Go interfaces (one per tag) +
 * matching `net/http`-backed impl structs. Inline body / response /
 * param schemas are promoted to top-level decls in the same array.
 *
 * Each operation produces two methods: `<Op>` returning the decoded
 * payload, and `<Op>WithResponse` additionally returning the raw
 * `*http.Response`. Go has no method overloading, so they're separate
 * named methods.
 */
export function operationsToDecls(
  paths: IR.PathsObject | undefined,
  opts: OperationsOptions = {},
): OperationsResult {
  const defaultTag = opts.defaultTag ?? "Default";
  const interfaceName =
    opts.interfaceName ?? ((tag: string) => `${exportedIdent(tag)}API`);
  const clientStructName =
    opts.clientStructName ?? ((p: string) => `NetHTTP${p}`);

  const decls: GoDecl[] = [];
  const emit = (d: GoDecl) => decls.push(d);
  const byTag = new Map<string, OperationSignature[]>();

  for (const [pathStr, pathItem] of Object.entries(paths ?? {})) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as IR.OperationObject | undefined;
      if (!op) continue;
      const schemeNames =
        opts.securitySchemeNames?.get(securityKey(pathStr, method)) ?? [];
      const sig = operationSignature(
        op,
        method as HttpMethod,
        pathStr,
        emit,
        schemeNames,
      );
      const tag = op.tags?.[0] ?? defaultTag;
      const list = byTag.get(tag);
      if (list) list.push(sig);
      else byTag.set(tag, [sig]);
    }
  }

  let needsMultipart = false;
  let needsAuth = false;
  for (const [tag, sigs] of byTag) {
    const ifaceName = interfaceName(tag);
    decls.push(
      goInterface({
        name: ifaceName,
        methods: sigs.flatMap((sig) => [
          buildInterfaceMethod(sig, /* withResponse */ false),
          buildInterfaceMethod(sig, /* withResponse */ true),
        ]),
      }),
    );
    if (sigs.some(hasSecurity)) needsAuth = true;
    if (!opts.interfaceOnly) {
      const result = buildClientStruct(clientStructName(ifaceName), sigs);
      for (const d of result.decls) decls.push(d);
      if (result.needsMultipart) needsMultipart = true;
    }
  }
  return { decls, needsMultipart, needsAuth };
}

function buildInterfaceMethod(
  sig: OperationSignature,
  withResponse: boolean,
): GoMethodSignature {
  const name = withResponse ? `${sig.name}WithResponse` : sig.name;
  const results: GoFuncResult[] = [];
  if (sig.returnType)
    results.push(goFuncResult(returnTypeShape(sig.returnType)));
  if (withResponse) results.push(goFuncResult(goPtr(goRef("http.Response"))));
  results.push(goFuncResult(goError));
  return goMethodSig(
    name,
    sig.params.map((p) => ({ name: p.name, type: p.type })),
    results,
    sig.doc,
  );
}

function returnTypeShape(t: GoType): GoType {
  return t.kind === "ref" ? goPtr(t) : t;
}

function hasSecurity(sig: OperationSignature): boolean {
  return sig.securitySchemeNames.length > 0;
}
