import type { KtDecl } from "../kt-dsl/types.js";

export type LayoutKind = "split" | "flat";

export interface PlacedDecl {
  decl: KtDecl;
  pkg: string;
  dir: string;
}

export interface PlacementOptions {
  packageName: string;
  layout?: LayoutKind;
  /** Per-decl override; returning `undefined` falls back to the layout default. */
  fileLocation?: (decl: KtDecl) => { pkg: string; dir: string } | undefined;
}

export function placeDecl(decl: KtDecl, opts: PlacementOptions): PlacedDecl {
  const override = opts.fileLocation?.(decl);
  if (override) return { decl, ...override };

  const layout = opts.layout ?? "split";
  const isApi = decl.kind === "interface";
  const pkg =
    layout === "split" && !isApi
      ? `${opts.packageName}.model`
      : opts.packageName;
  return { decl, pkg, dir: pkg.replaceAll(".", "/") };
}
