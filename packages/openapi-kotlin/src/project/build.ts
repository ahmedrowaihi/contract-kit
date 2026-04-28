import { printFile } from "../kt-compiler/printer.js";
import { ktFile } from "../kt-dsl/builders.js";
import type { KtAnnotation, KtDecl, KtType } from "../kt-dsl/types.js";

export type LayoutKind = "split" | "flat";

export interface BuildOptions {
  /** Root Kotlin package, e.g. `com.example.api`. */
  packageName: string;
  /**
   * `split` (default): interfaces in `<packageName>`, everything else in
   * `<packageName>.model`. `flat`: everything in `<packageName>`.
   */
  layout?: LayoutKind;
  /**
   * Per-decl override. Returning `undefined` falls back to the layout default.
   * `dir` is relative to the output root and must use `/` separators.
   */
  fileLocation?: (decl: KtDecl) => { pkg: string; dir: string } | undefined;
}

export interface BuiltFile {
  /** Path relative to the output root, using `/` separators. */
  path: string;
  /** Kotlin source. */
  content: string;
}

interface PlacedDecl {
  decl: KtDecl;
  pkg: string;
  dir: string;
}

/**
 * Walks every type position in a decl to collect external symbol
 * references (refs to other generated decls + annotation pkg pointers).
 */
export function buildKotlinProject(
  decls: KtDecl[],
  opts: BuildOptions,
): BuiltFile[] {
  const placements = decls.map((decl) => placeDecl(decl, opts));
  const fqn = new Map<string, string>(
    placements.map(({ decl, pkg }) => [decl.name, `${pkg}.${decl.name}`]),
  );

  return placements.map(({ decl, pkg, dir }) => {
    const externalImports = new Set<string>();
    const refImports = new Set<string>();

    walkAnnotations(decl, (a) => collectAnnotationImport(a, externalImports));
    walkTypes(decl, (t) => collectTypeImports(t, fqn, pkg, refImports));

    const imports = [...externalImports, ...refImports].sort();

    const file = ktFile({
      packageName: pkg,
      imports,
      decls: [decl],
    });

    return {
      path: `${dir}/${decl.name}.kt`,
      content: printFile(file),
    };
  });
}

function placeDecl(decl: KtDecl, opts: BuildOptions): PlacedDecl {
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

function collectAnnotationImport(a: KtAnnotation, out: Set<string>): void {
  if (a.pkg) out.add(`${a.pkg}.${a.name}`);
}

function collectTypeImports(
  t: KtType,
  fqn: Map<string, string>,
  currentPkg: string,
  refImports: Set<string>,
): void {
  switch (t.kind) {
    case "primitive":
      return;
    case "list":
      collectTypeImports(t.element, fqn, currentPkg, refImports);
      return;
    case "map":
      collectTypeImports(t.key, fqn, currentPkg, refImports);
      collectTypeImports(t.value, fqn, currentPkg, refImports);
      return;
    case "nullable":
      collectTypeImports(t.inner, fqn, currentPkg, refImports);
      return;
    case "ref": {
      // External package on the ref wins (e.g., kotlinx.datetime.Instant).
      if (t.pkg) {
        refImports.add(`${t.pkg}.${t.name}`);
        return;
      }
      // Otherwise look up in the project's symbol table.
      const target = fqn.get(t.name);
      if (!target) return;
      const targetPkg = target.slice(0, target.lastIndexOf("."));
      if (targetPkg !== currentPkg) refImports.add(target);
    }
  }
}

/**
 * Visit every annotation site within a decl. Used to collect imports for
 * built-in framework annotations (kotlinx.serialization.*, retrofit2.http.*).
 */
function walkAnnotations(decl: KtDecl, visit: (a: KtAnnotation) => void): void {
  switch (decl.kind) {
    case "dataClass":
      decl.annotations.forEach(visit);
      for (const p of decl.properties) p.annotations.forEach(visit);
      return;
    case "enum":
      decl.annotations.forEach(visit);
      for (const v of decl.variants) v.annotations.forEach(visit);
      return;
    case "interface":
      decl.annotations.forEach(visit);
      for (const fn of decl.funs) {
        fn.annotations.forEach(visit);
        for (const p of fn.params) p.annotations.forEach(visit);
      }
      return;
    case "typeAlias":
      return;
  }
}

/**
 * Visit every `KtType` position within a decl. Used to collect imports for
 * cross-decl `KtRef` and externally-packaged refs.
 */
function walkTypes(decl: KtDecl, visit: (t: KtType) => void): void {
  switch (decl.kind) {
    case "dataClass":
      for (const p of decl.properties) visit(p.type);
      return;
    case "enum":
      return;
    case "interface":
      for (const fn of decl.funs) {
        visit(fn.returnType);
        for (const p of fn.params) visit(p.type);
      }
      return;
    case "typeAlias":
      visit(decl.type);
      return;
  }
}
