import { printFile } from "../sw-compiler/index.js";
import type { SwDecl } from "../sw-dsl/decl/types.js";
import { swFile } from "../sw-dsl/file.js";
import { collectImports } from "./imports.js";
import { type PlacementOptions, placeDecl } from "./layout.js";

export type BuildOptions = PlacementOptions;

export interface BuiltFile {
  path: string;
  content: string;
}

/**
 * Project assembler: places each decl in a file, computes Swift module
 * imports, prints. One Swift file per decl.
 */
export function buildSwiftProject(
  decls: ReadonlyArray<SwDecl>,
  opts: BuildOptions = {},
): BuiltFile[] {
  return decls.map((decl) => {
    const { dir } = placeDecl(decl, opts);
    return {
      path: dir === "." ? `${decl.name}.swift` : `${dir}/${decl.name}.swift`,
      content: printFile(
        swFile({ imports: collectImports(decl), decls: [decl] }),
      ),
    };
  });
}
