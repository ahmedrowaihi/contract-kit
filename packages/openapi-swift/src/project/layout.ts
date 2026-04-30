import type { SwDecl } from "../sw-dsl/index.js";

export type LayoutKind = "split" | "flat";

export interface PlacedDecl {
  decl: SwDecl;
  /** Output dir relative to the SDK root, using `/` separators. */
  dir: string;
}

export interface PlacementOptions {
  /**
   * `split` (default) → protocols, impl classes, and runtime helpers in
   * `API/`; user value types in `Models/`. `flat` → everything in the
   * SDK root.
   */
  layout?: LayoutKind;
  /** Per-decl override; `undefined` falls back to layout default. */
  fileLocation?: (decl: SwDecl) => { dir: string } | undefined;
}

/**
 * Pick the output dir for a single decl. Runtime-helper decls (tagged
 * via `runtime: true` at emission time) ride in `API/` alongside the
 * protocols + URLSession impls; only user-domain `Codable` types land
 * in `Models/`.
 */
export function placeDecl(decl: SwDecl, opts: PlacementOptions): PlacedDecl {
  const override = opts.fileLocation?.(decl);
  if (override) return { decl, dir: override.dir };
  const layout = opts.layout ?? "split";
  if (layout === "flat") return { decl, dir: "." };
  if (isApiDecl(decl)) return { decl, dir: "API" };
  return { decl, dir: "Models" };
}

function isApiDecl(decl: SwDecl): boolean {
  if (decl.kind === "protocol") return true;
  if (decl.kind === "class") return true;
  if (decl.kind === "extension") return true;
  if ((decl.kind === "enum" || decl.kind === "struct") && decl.runtime) {
    return true;
  }
  return false;
}
