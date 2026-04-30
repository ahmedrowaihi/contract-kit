import type { IR } from "@hey-api/shared";

import {
  type SwDecl,
  type SwFun,
  type SwType,
  swArg,
  swCall,
  swExprStmt,
  swExtension,
  swFun,
  swIdent,
  swMember,
  swProtocol,
  swRef,
  swReturn,
  swTryAwait,
  swTupleType,
} from "../sw-dsl/index.js";
import { HTTP_METHODS, type HttpMethod } from "./constants.js";
import { pascal } from "./identifiers.js";
import { buildClientClass } from "./impl/index.js";
import {
  type OperationSignature,
  operationSignature,
} from "./operation/index.js";
import {
  apiClientDecl,
  apiErrorEnum,
  apiInterceptorsDecl,
  authDecls,
  multipartFormBodyDecl,
  requestOptionsDecl,
  unimplementedBodyEnum,
  urlEncodingDecls,
} from "./runtime/index.js";

export interface OperationsOptions {
  /** Default: `"Default"`. */
  defaultTag?: string;
  /** Default: `(tag) => `${PascalCase(tag)}API``. */
  protocolName?: (tag: string) => string;
  /** Default: `(protocolName) => `URLSession${protocolName}``. */
  clientClassName?: (protocolName: string) => string;
  /** Skip emitting the URLSession impl class. Default: `false`. */
  protocolOnly?: boolean;
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

/**
 * Translate `IR.Model.paths` into Swift protocols (one per tag) and
 * matching `URLSession`-based default impl classes. Inline body /
 * response / param schemas are promoted to synthetic top-level decls
 * in the same output array.
 */
export function operationsToDecls(
  paths: IR.PathsObject | undefined,
  opts: OperationsOptions = {},
): SwDecl[] {
  const defaultTag = opts.defaultTag ?? "Default";
  const protocolName =
    opts.protocolName ?? ((tag: string) => `${pascal(tag)}API`);
  const clientClassName =
    opts.clientClassName ?? ((p: string) => `URLSession${p}`);

  const decls: SwDecl[] = [];
  const emit = (d: SwDecl) => decls.push(d);
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

  let needsUnimplementedEnum = false;
  let needsUrlEncoding = false;
  let needsAuth = false;
  let needsMultipart = false;
  let anyImplEmitted = false;
  let anyProtocolEmitted = false;
  for (const [tag, sigs] of byTag) {
    const proto = protocolName(tag);
    const allSigs: ReadonlyArray<OperationSignature> = sigs.flatMap((s) => [
      s,
      withResponseSignature(s),
    ]);
    decls.push(
      swProtocol({ name: proto, funs: allSigs.map(signatureToProtocolFun) }),
    );
    decls.push(
      swExtension({
        on: proto,
        funs: allSigs.map(signatureToConvenienceFun),
        runtime: true,
      }),
    );
    anyProtocolEmitted = true;
    if (sigs.some(hasSecurity)) needsAuth = true;
    if (!opts.protocolOnly) {
      anyImplEmitted = true;
      const result = buildClientClass(clientClassName(proto), proto, allSigs, {
        open: opts.openImpl,
      });
      decls.push(result.class);
      if (result.needsErrorEnum) needsUnimplementedEnum = true;
      if (result.needsMultipart) needsMultipart = true;
      if (sigs.some(hasQueryParams)) needsUrlEncoding = true;
    }
  }
  if (anyProtocolEmitted) decls.push(requestOptionsDecl());
  if (anyImplEmitted) {
    decls.push(apiInterceptorsDecl());
    decls.push(apiClientDecl({ hasAuth: needsAuth }));
    decls.push(apiErrorEnum());
  }
  if (needsUnimplementedEnum) decls.push(unimplementedBodyEnum());
  if (needsUrlEncoding) decls.push(...urlEncodingDecls());
  if (needsMultipart) decls.push(multipartFormBodyDecl());
  if (needsAuth) decls.push(...authDecls());
  return decls;
}

function hasQueryParams(sig: OperationSignature): boolean {
  return sig.locatedParams.some((p) => p.loc === "query");
}

/**
 * Derive the `*WithResponse` companion of a signature: name suffix
 * `WithResponse`, and return type wraps the original alongside
 * `HTTPURLResponse`. Void operations bundle to just `HTTPURLResponse`
 * (no payload to pair with).
 */
function withResponseSignature(sig: OperationSignature): OperationSignature {
  return {
    ...sig,
    name: `${sig.name}WithResponse`,
    returnType: withResponseReturnType(sig.returnType),
  };
}

function withResponseReturnType(t: SwType): SwType {
  const isVoid = t.kind === "primitive" && t.name === "Void";
  return isVoid
    ? swRef("HTTPURLResponse")
    : swTupleType([t, swRef("HTTPURLResponse")]);
}

function hasSecurity(sig: OperationSignature): boolean {
  const security = sig.op.security;
  return Array.isArray(security) && security.length > 0;
}

/**
 * Default values are illegal in protocol requirements (Swift compile
 * error: "default argument not permitted in a protocol method"). They
 * stay on the impl class — calls through the protocol still resolve
 * since Swift looks defaults up at the call site against the static
 * type, which is the impl when called directly.
 */
function signatureToProtocolFun(sig: OperationSignature): SwFun {
  const protoParams = sig.params.map((p) =>
    p.default === undefined ? p : { ...p, default: undefined },
  );
  return swFun({
    name: sig.name,
    params: protoParams,
    returnType: sig.returnType,
    effects: ["async", "throws"],
    doc: sig.doc,
    // No body — protocol requirement.
  });
}

/**
 * Convenience overload emitted into a protocol extension. Drops the
 * trailing `options` param and forwards to the with-options form with
 * `RequestOptions()` defaults. Lets callers who don't need overrides
 * skip the options param even when holding a protocol-typed reference
 * (defaults on protocol decls are illegal in Swift, so the overload
 * is the workaround).
 *
 * @example
 * ```swift
 * public extension PetAPI {
 *     func getPetById(petId: Int64) async throws -> Pet {
 *         try await getPetById(petId: petId, options: RequestOptions())
 *     }
 * }
 * ```
 */
function signatureToConvenienceFun(sig: OperationSignature): SwFun {
  // Drop the trailing options param — that's the whole point of the overload.
  const baseParams = sig.params.slice(0, -1);
  const callArgs = baseParams.map((p) => {
    const label = p.label === "_" ? undefined : (p.label ?? p.name);
    return swArg(swIdent(p.name), label);
  });
  callArgs.push(swArg(swCall(swIdent("RequestOptions"), []), "options"));
  const forwarded = swTryAwait(
    swCall(swMember(swIdent("self"), sig.name), callArgs),
  );
  const isVoid =
    sig.returnType.kind === "primitive" && sig.returnType.name === "Void";
  return swFun({
    name: sig.name,
    params: baseParams,
    returnType: sig.returnType,
    effects: ["async", "throws"],
    doc: sig.doc,
    body: [isVoid ? swExprStmt(forwarded) : swReturn(forwarded)],
  });
}
