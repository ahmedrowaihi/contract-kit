import type { IR } from "@hey-api/shared";

import {
  type KtDecl,
  type KtFun,
  type KtType,
  ktArg,
  ktCall,
  ktExprStmt,
  ktFun,
  ktIdent,
  ktInterface,
  ktMember,
  ktRef,
  ktReturn,
  ktTopLevelFun,
} from "../kt-dsl/index.js";
import { HTTP_METHODS, type HttpMethod } from "./constants.js";
import { pascal } from "./identifiers.js";
import { buildClientClass } from "./impl/index.js";
import {
  type OperationSignature,
  operationSignature,
} from "./operation/index.js";

export interface OperationsOptions {
  /** Default: `"Default"`. */
  defaultTag?: string;
  /** Default: `(tag) => `${PascalCase(tag)}Api``. */
  interfaceName?: (tag: string) => string;
  /** Default: `(interfaceName) => `OkHttp${interfaceName}``. */
  clientClassName?: (interfaceName: string) => string;
  /** Skip emitting the OkHttp impl class. Default: `false`. */
  interfaceOnly?: boolean;
  /**
   * Emit the impl class as `open` instead of `final` so consumers can
   * subclass and override individual methods. Default: `false`.
   */
  openImpl?: boolean;
  /**
   * Per-operation security-scheme names, keyed by `${pathStr}|${method}`.
   * The IR drops scheme names from `op.security`, so the caller (usually
   * `generate()`) resolves them from the raw spec and threads the map
   * here. Empty / missing entries → no auto-auth wiring for that op.
   */
  securitySchemeNames?: ReadonlyMap<string, ReadonlyArray<string>>;
}

/** Key used in `securitySchemeNames` for one (path, method) pair. */
export const securityKey = (path: string, method: string): string =>
  `${path}|${method}`;

export interface OperationsResult {
  decls: KtDecl[];
  /** True when at least one impl class needs the `MultipartFormBody`
   *  helper. The orchestrator uses this to decide whether to emit the
   *  runtime file. */
  needsMultipart: boolean;
  /** True when at least one op declares `security` requirements. The
   *  orchestrator uses this to decide whether to emit `Auth.kt` /
   *  `APIKeyLocation.kt` and the `auth` field on `APIClient`. */
  needsAuth: boolean;
}

/**
 * Translate `IR.Model.paths` into Kotlin interfaces (one per tag) and
 * matching OkHttp + kotlinx-serialization impl classes. Inline body /
 * response / param schemas are promoted to synthetic top-level decls
 * in the same output array.
 */
export function operationsToDecls(
  paths: IR.PathsObject | undefined,
  opts: OperationsOptions = {},
): OperationsResult {
  const defaultTag = opts.defaultTag ?? "Default";
  const interfaceName =
    opts.interfaceName ?? ((tag: string) => `${pascal(tag)}Api`);
  const clientClassName = opts.clientClassName ?? ((p: string) => `OkHttp${p}`);

  const decls: KtDecl[] = [];
  const emit = (d: KtDecl) => decls.push(d);
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
    const allSigs: ReadonlyArray<OperationSignature> = sigs.flatMap((s) => [
      s,
      withResponseSignature(s),
    ]);
    decls.push(
      ktInterface({
        name: ifaceName,
        funs: allSigs.map(signatureToInterfaceFun),
      }),
    );
    for (const sig of allSigs) {
      decls.push(ktTopLevelFun(signatureToConvenienceFun(sig, ifaceName)));
    }
    if (sigs.some(hasSecurity)) needsAuth = true;
    if (!opts.interfaceOnly) {
      const result = buildClientClass(
        clientClassName(ifaceName),
        ifaceName,
        allSigs,
        {
          open: opts.openImpl,
        },
      );
      decls.push(result.class);
      if (result.needsMultipart) needsMultipart = true;
    }
  }
  return { decls, needsMultipart, needsAuth };
}

/**
 * Derive the `*WithResponse` companion of a signature: name suffix
 * `WithResponse`, and return type wraps the original alongside
 * OkHttp's `Response`. Void operations bundle to just `Response`
 * (no payload to pair with).
 */
function withResponseSignature(sig: OperationSignature): OperationSignature {
  return {
    ...sig,
    name: `${sig.name}WithResponse`,
    returnType: withResponseReturnType(sig.returnType),
  };
}

function withResponseReturnType(t: KtType): KtType {
  const isUnit = t.kind === "primitive" && t.name === "Unit";
  return isUnit ? ktRef("Response") : ktRef("Pair", [t, ktRef("Response")]);
}

function hasSecurity(sig: OperationSignature): boolean {
  return sig.securitySchemeNames.length > 0;
}

/**
 * Strip defaults from interface-fun parameters. Kotlin allows defaults
 * on interface methods, but the convention is to keep interface
 * signatures lean and put defaults on the implementation; the
 * convenience extension below provides the no-options overload.
 */
function signatureToInterfaceFun(sig: OperationSignature): KtFun {
  const ifaceParams = sig.params.map((p) =>
    p.default === undefined ? p : { ...p, default: undefined },
  );
  return ktFun({
    name: sig.name,
    params: ifaceParams,
    returnType: sig.returnType,
    modifiers: ["suspend"],
    doc: sig.doc,
    // No body — interface requirement.
  });
}

/**
 * Convenience overload emitted as a top-level extension fun. Drops the
 * trailing `options` param and forwards with `RequestOptions()` defaults.
 *
 * @example
 * ```kotlin
 * public suspend fun PetApi.getPetById(petId: Long): Pet {
 *     return getPetById(petId = petId, options = RequestOptions())
 * }
 * ```
 */
function signatureToConvenienceFun(
  sig: OperationSignature,
  receiverName: string,
): KtFun {
  // Drop the trailing options param — that's the whole point of the overload.
  const baseParams = sig.params.slice(0, -1).map((p) =>
    // The convenience overload also drops defaults — when callers reach
    // for it, they already opted into the no-options shape.
    p.default === undefined ? p : { ...p, default: undefined },
  );
  const callArgs = baseParams.map((p) => ktArg(ktIdent(p.name), p.name));
  callArgs.push(ktArg(ktCall(ktIdent("RequestOptions"), []), "options"));
  const forwarded = ktCall(ktMember(ktIdent("this"), sig.name), callArgs);
  const isUnit =
    sig.returnType.kind === "primitive" && sig.returnType.name === "Unit";
  return ktFun({
    name: sig.name,
    params: baseParams,
    returnType: sig.returnType,
    modifiers: ["suspend"],
    doc: sig.doc,
    receiver: ktRef(receiverName),
    body: [isUnit ? ktExprStmt(forwarded) : ktReturn(forwarded)],
  });
}
