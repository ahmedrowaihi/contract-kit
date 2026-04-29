import type { SwDecl } from "../sw-dsl/decl/types.js";

export type LayoutKind = "split" | "flat";

export interface PlacedDecl {
  decl: SwDecl;
  /** Output dir relative to the SDK root, using `/` separators. */
  dir: string;
}

export interface PlacementOptions {
  /**
   * `split` (default) → protocols + classes in `API/`, value types in `Models/`.
   * `flat` → everything in the SDK root.
   */
  layout?: LayoutKind;
  /** Per-decl override; `undefined` falls back to layout default. */
  fileLocation?: (decl: SwDecl) => { dir: string } | undefined;
}

export function placeDecl(decl: SwDecl, opts: PlacementOptions): PlacedDecl {
  const override = opts.fileLocation?.(decl);
  if (override) return { decl, dir: override.dir };
  const layout = opts.layout ?? "split";
  if (layout === "flat") return { decl, dir: "." };
  return {
    decl,
    dir: decl.kind === "protocol" || decl.kind === "class" ? "API" : "Models",
  };
}
