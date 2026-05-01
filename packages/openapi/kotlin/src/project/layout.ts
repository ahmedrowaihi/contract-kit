import { posix as pathPosix } from "node:path";
import type { KtDecl } from "../kt-dsl/decl/types.js";

export type LayoutKind = "flat" | "split";

export interface PlacedDecl {
  decl: KtDecl;
  /** Output dir relative to the SDK root, using `/` separators. */
  dir: string;
}

export interface PlacementOptions {
  /**
   * `split` (default) → API-layer decls (interfaces, impl classes,
   * top-level extension funs) live in `api/` and value types in
   * `models/`. `flat` → everything in the SDK root (single package).
   */
  layout?: LayoutKind;
  /** Per-decl override; `undefined` falls back to layout default. */
  fileLocation?: (decl: KtDecl) => { dir: string } | undefined;
}

export function placeDecl(decl: KtDecl, opts: PlacementOptions): PlacedDecl {
  const override = opts.fileLocation?.(decl);
  if (override) return { decl, dir: safeRelativeDir(override.dir) };
  const layout = opts.layout ?? "split";
  if (layout === "flat") return { decl, dir: "." };
  return { decl, dir: isApiDecl(decl) ? "api" : "models" };
}

/**
 * Reject absolute paths and any normalized form that escapes the SDK
 * root via `..`. Generators write into the override dir; an unguarded
 * `../..` could clobber files outside the output tree.
 */
function safeRelativeDir(dir: string): string {
  const normalized = pathPosix.normalize(dir || ".");
  if (
    pathPosix.isAbsolute(normalized) ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`fileLocation: invalid output directory: ${dir}`);
  }
  return normalized;
}

function isApiDecl(decl: KtDecl): boolean {
  if (decl.kind === "interface") return true;
  if (decl.kind === "class") return true;
  if (decl.kind === "topLevelFun") return true;
  if (
    (decl.kind === "enum" ||
      decl.kind === "object" ||
      decl.kind === "sealedClass" ||
      decl.kind === "dataClass") &&
    decl.runtime
  ) {
    return true;
  }
  return false;
}

/**
 * Pick the file name a decl renders into.
 *
 * Top-level extension funs don't have their own decl name — they're
 * named for the function plus receiver. Convention: render them into
 * `<ReceiverName>Extensions.kt`; when several share a receiver they
 * collapse into the same file at orchestration time.
 */
export function declFileName(decl: KtDecl): string {
  if (decl.kind === "topLevelFun") {
    const receiver = decl.fun.receiver;
    const recvName =
      receiver && receiver.kind === "ref" ? receiver.name : "Extensions";
    return `${recvName}Extensions.kt`;
  }
  return `${decl.name}.kt`;
}
