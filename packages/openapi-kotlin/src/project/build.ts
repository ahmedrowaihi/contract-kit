import { printFile } from "../kt-compiler/printer.js";
import { ktFile } from "../kt-dsl/builders.js";
import type { KtDecl } from "../kt-dsl/types.js";
import { collectImports } from "./imports.js";
import { type PlacementOptions, placeDecl } from "./layout.js";

export type BuildOptions = PlacementOptions;

export interface BuiltFile {
  path: string;
  content: string;
}

/**
 * Project assembler: places each decl in a file, walks types/annotations
 * to compute imports, prints. One Kotlin file per decl. Imports are
 * sorted and deduped.
 */
export function buildKotlinProject(
  decls: KtDecl[],
  opts: BuildOptions,
): BuiltFile[] {
  const placements = decls.map((decl) => placeDecl(decl, opts));
  const fqn = new Map<string, string>(
    placements.map(({ decl, pkg }) => [decl.name, `${pkg}.${decl.name}`]),
  );

  return placements.map(({ decl, pkg, dir }) => ({
    path: `${dir}/${decl.name}.kt`,
    content: printFile(
      ktFile({
        packageName: pkg,
        imports: collectImports(decl, fqn, pkg),
        decls: [decl],
      }),
    ),
  }));
}
