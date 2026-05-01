import { DEFAULT_PACKAGE } from "../ir/constants.js";
import { printDecl, printFile } from "../kt-compiler/index.js";
import { type KtDecl, ktFile } from "../kt-dsl/index.js";
import { importsForSource, isApiSurface } from "./imports.js";
import { declFileName, type PlacementOptions, placeDecl } from "./layout.js";

export interface BuildOptions extends PlacementOptions {
  /**
   * Kotlin package every generated file lives in (e.g. `"com.example.petstore"`).
   * Default: `"com.example.api"`. Pass an explicit value to match the
   * consumer's app structure.
   */
  packageName?: string;
}

export interface BuiltFile {
  /** Output path relative to the SDK root, using POSIX separators. */
  path: string;
  content: string;
}

/**
 * Project assembler: places each decl in a file, picks imports, prints
 * one Kotlin source per group. Decls that share an output path
 * (currently the per-receiver extension-fun bundle) collapse into one
 * file; everything else lives in its own.
 *
 * The package directory layout (`com/example/petstore/...`) is built
 * into `path` so the result drops directly into a `src/main/kotlin/`
 * tree.
 */
export function buildKotlinProject(
  decls: ReadonlyArray<KtDecl>,
  opts: BuildOptions = {},
): BuiltFile[] {
  const pkg = opts.packageName ?? DEFAULT_PACKAGE;
  const pkgPath = pkg.replace(/\./g, "/");
  const groups = new Map<string, { decls: KtDecl[]; subPkg: string }>();
  for (const decl of decls) {
    const { dir } = placeDecl(decl, opts);
    const fileName = declFileName(decl);
    const subPath = dir === "." ? fileName : `${dir}/${fileName}`;
    const path = `${pkgPath}/${subPath}`;
    const subPkg = declPackage(pkg, dir);
    const existing = groups.get(path);
    if (existing) existing.decls.push(decl);
    else groups.set(path, { decls: [decl], subPkg });
  }
  return [...groups.entries()].map(([path, group]) => {
    // Print bodies first, scan the printed output for actually-used
    // identifiers, then re-print with the right imports. Avoids
    // shipping unused imports per file.
    const bodyOnly = group.decls.map((d) => printDecl(d)).join("\n\n");
    const apiSurface = group.decls.some(isApiSurface);
    const imports = importsForSource(bodyOnly, {
      isApiSurface: apiSurface,
      rootPkg: pkg,
      subPkg: group.subPkg,
    });
    return {
      path,
      content: printFile(
        ktFile({ pkg: group.subPkg, imports, decls: group.decls }),
      ),
    };
  });
}

/**
 * Sub-package suffix for a decl based on its placement dir. Mirrors
 * the kotlin convention where filesystem directories under
 * `src/main/kotlin/` map to package suffixes — e.g. files placed in
 * `api/` belong to `<root>.api`.
 */
function declPackage(rootPkg: string, dir: string): string {
  if (dir === "." || dir === "") return rootPkg;
  const suffix = dir.replace(/\//g, ".");
  return `${rootPkg}.${suffix}`;
}

/**
 * Wrap a runtime-helper file (raw kotlin source) in a `BuiltFile`. The
 * runtime templates already carry their own `package` directive, so we
 * just route them through the layout.
 */
export function runtimeFileToBuilt(
  pkg: string,
  pkgDir: string,
  fileName: string,
  content: string,
): BuiltFile {
  const pkgPath = pkg.replace(/\./g, "/");
  return {
    path: `${pkgPath}/${pkgDir}/${fileName}`,
    content,
  };
}
