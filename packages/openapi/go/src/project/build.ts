import { printDecl, printFile } from "../go-compiler/index.js";
import { type GoDecl, goFile } from "../go-dsl/index.js";
import { DEFAULT_PACKAGE } from "../ir/constants.js";
import { importsForSource } from "./imports.js";
import { type PlacementOptions, placeDecl } from "./layout.js";

export interface BuildOptions extends PlacementOptions {
  /**
   * Go package every generated file declares (e.g. `"petstoresdk"`).
   * Default: `"api"`. Pass an explicit value to match the consumer's
   * vendored package path.
   */
  packageName?: string;
}

export interface BuiltFile {
  /** Output path relative to the SDK root, using POSIX separators. */
  path: string;
  content: string;
}

/**
 * Project assembler: groups decls by output path (one file per
 * decl, but enum const blocks bundle with their type alias),
 * computes per-file imports via print-then-scan, prints. Multi-decl
 * files (e.g. multi-2xx interface + concrete structs + marker
 * methods) collapse cleanly thanks to the grouping.
 */
export function buildGoProject(
  decls: ReadonlyArray<GoDecl>,
  opts: BuildOptions = {},
): BuiltFile[] {
  const pkg = opts.packageName ?? DEFAULT_PACKAGE;
  const groups = new Map<string, GoDecl[]>();
  for (const decl of decls) {
    const placed = placeDecl(decl, opts);
    const path =
      placed.dir === "." ? placed.fileName : `${placed.dir}/${placed.fileName}`;
    const existing = groups.get(path);
    if (existing) existing.push(decl);
    else groups.set(path, [decl]);
  }
  return [...groups.entries()].map(([path, group]) => {
    const body = group.map((d) => printDecl(d)).join("\n\n");
    const imports = importsForSource(body);
    return {
      path,
      content: printFile(goFile({ pkg, imports, decls: group })),
    };
  });
}
