import type { IR } from "@hey-api/shared";

import { type SwDecl, type SwFun, swFun, swProtocol } from "../sw-dsl/index.js";
import { HTTP_METHODS, type HttpMethod } from "./constants.js";
import { pascal } from "./identifiers.js";
import { buildClientClass, urlSessionAPIErrorEnum } from "./impl/index.js";
import {
  type OperationSignature,
  operationSignature,
} from "./operation/index.js";

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
}

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
      const sig = operationSignature(op, method as HttpMethod, pathStr, emit);
      const tag = op.tags?.[0] ?? defaultTag;
      const list = byTag.get(tag);
      if (list) list.push(sig);
      else byTag.set(tag, [sig]);
    }
  }

  let needsErrorEnum = false;
  for (const [tag, sigs] of byTag) {
    const proto = protocolName(tag);
    decls.push(
      swProtocol({ name: proto, funs: sigs.map(signatureToProtocolFun) }),
    );
    if (!opts.protocolOnly) {
      const result = buildClientClass(clientClassName(proto), proto, sigs, {
        open: opts.openImpl,
      });
      decls.push(result.class);
      if (result.needsErrorEnum) needsErrorEnum = true;
    }
  }
  if (needsErrorEnum) decls.push(urlSessionAPIErrorEnum());
  return decls;
}

function signatureToProtocolFun(sig: OperationSignature): SwFun {
  return swFun({
    name: sig.name,
    params: sig.params,
    returnType: sig.returnType,
    effects: ["async", "throws"],
    doc: sig.doc,
    // No body — protocol requirement.
  });
}
