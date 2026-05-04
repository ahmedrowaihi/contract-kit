import path from "node:path";
import {
  type ImportDeclaration,
  Node,
  type SourceFile,
  SyntaxKind,
  type Type,
  type TypeNode,
} from "ts-morph";

export type ImportKind = "named" | "default" | "namespace";

export interface AliasImport {
  /** Module specifier as written (relative or package). */
  module: string;
  /** Local identifier name brought into the virtual file. */
  name: string;
  /** Whether to import as a type-only specifier. */
  typeOnly: boolean;
  /** Specifier shape — distinguishes `{ X }`, `X`, `* as X`. */
  kind: ImportKind;
}

export interface ResolvedAlias {
  /** Source-text expression to put on the right side of `type Foo = …`. */
  text: string;
  /** Imports that must be present in the virtual file for `text` to resolve. */
  imports: AliasImport[];
  /** True when the type contains unresolved generic parameters. */
  hasUnresolvedGenerics: boolean;
}

/**
 * Resolve a parameter / return Type from a host SourceFile into:
 *   • a bare type expression (no `import("…").X` qualifications), and
 *   • the explicit imports needed to bring referenced identifiers into scope.
 *
 * Strategy: prefer the source-level TypeNode when present (preserves user
 * intent — utility types, unions, mapped types). Walk it for type references
 * and resolve each via the type checker. Fall back to the resolved Type
 * formatted with bare names when no annotation exists.
 */
export function resolveTypeExpression(
  node: Node,
  type: Type,
  hostFile: SourceFile,
  virtualDir: string,
  typeNode?: TypeNode,
): ResolvedAlias {
  const acc = new ImportAccumulator(hostFile, virtualDir);

  if (typeNode) {
    collectFromTypeNode(typeNode, acc);
    return {
      text: typeNode.getText(),
      imports: acc.toList(),
      hasUnresolvedGenerics: typeContainsTypeParameter(type),
    };
  }

  // No source annotation — derive from the resolved Type.
  const text = type.getText(node);
  if (text.includes("import(")) {
    // Strip `import("path").X` qualifications and collect imports for them.
    return rewriteImportQualifications(text, acc, hostFile, virtualDir, type);
  }
  return {
    text,
    imports: [],
    hasUnresolvedGenerics: typeContainsTypeParameter(type),
  };
}

/* ────────────────────────── identifier walking ───────────────────────── */

interface AccEntry {
  typeOnly: boolean;
  kind: ImportKind;
}

class ImportAccumulator {
  private readonly entries = new Map<string, Map<string, AccEntry>>();
  /** Exposed for retargeting helper — the virtual directory we render into. */
  readonly virtualDirRef: string;
  constructor(
    private readonly hostFile: SourceFile,
    virtualDir: string,
  ) {
    this.virtualDirRef = virtualDir;
  }

  addLocal(name: string, typeOnly = true, kind: ImportKind = "named"): void {
    const spec = relSpecifier(this.hostFile.getFilePath(), this.virtualDirRef);
    this.add(spec, name, typeOnly, kind);
  }
  addExternal(
    module: string,
    name: string,
    typeOnly = true,
    kind: ImportKind = "named",
  ): void {
    this.add(module, name, typeOnly, kind);
  }
  private add(
    module: string,
    name: string,
    typeOnly: boolean,
    kind: ImportKind,
  ): void {
    let names = this.entries.get(module);
    if (!names) {
      names = new Map();
      this.entries.set(module, names);
    }
    const prior = names.get(name);
    // Once we've seen a non-type import, don't downgrade. Specifier kind
    // is set on first sight — re-imports keep the original shape.
    names.set(name, {
      typeOnly: prior?.typeOnly === false ? false : typeOnly,
      kind: prior?.kind ?? kind,
    });
  }

  toList(): AliasImport[] {
    const out: AliasImport[] = [];
    for (const [module, names] of this.entries) {
      for (const [name, entry] of names) {
        out.push({ module, name, typeOnly: entry.typeOnly, kind: entry.kind });
      }
    }
    return out;
  }
}

function collectFromTypeNode(node: TypeNode, acc: ImportAccumulator): void {
  const visit = (n: Node): void => {
    if (Node.isTypeReference(n)) {
      const nameNode = n.getTypeName();
      const ident = leftmostIdentifier(nameNode);
      if (ident) registerIdentifier(ident, acc);
    } else if (Node.isExpressionWithTypeArguments(n)) {
      const expr = n.getExpression();
      if (Node.isIdentifier(expr)) registerIdentifier(expr, acc);
    }
    n.forEachChild(visit);
  };
  visit(node);
}

function leftmostIdentifier(node: Node): Node | null {
  if (Node.isIdentifier(node)) return node;
  if (Node.isQualifiedName(node)) return leftmostIdentifier(node.getLeft());
  return null;
}

function registerIdentifier(ident: Node, acc: ImportAccumulator): void {
  if (!Node.isIdentifier(ident)) return;
  const name = ident.getText();
  if (isTsLibraryName(name)) return;
  if (isTypeParameter(ident)) return;

  const sourceFile = ident.getSourceFile();
  const decls = ident.getSymbol()?.getDeclarations() ?? [];

  for (const decl of decls) {
    // Check ImportDeclaration ancestor FIRST — an import binding's source
    // file is the host, so the local-declaration check below would
    // misclassify imported types as "declared in host".
    const importDecl = decl.getFirstAncestorByKind(
      SyntaxKind.ImportDeclaration,
    );
    if (importDecl) {
      const spec = (importDecl as ImportDeclaration).getModuleSpecifierValue();
      if (spec) {
        // Re-target relative specifiers so they resolve from the
        // virtual file's location, not the host's.
        const reTargeted = retargetSpecifier(spec, sourceFile, acc);
        acc.addExternal(reTargeted, name, true, importKindFromDecl(decl));
        return;
      }
    }

    const declSf = decl.getSourceFile();
    // Genuinely declared in the host: re-import from host (named, type-only).
    if (declSf === sourceFile) {
      acc.addLocal(name, true, "named");
      return;
    }

    // Some other ambient/global decl — best-effort fall back to host.
    acc.addLocal(name, true, "named");
    return;
  }
}

/**
 * Translate a module specifier written from the host's POV into one the
 * virtual file can resolve. Bare specifiers (packages) pass through; relative
 * specifiers get resolved against the host directory then re-expressed as
 * relative to the virtual directory.
 */
function retargetSpecifier(
  spec: string,
  hostFile: SourceFile,
  acc: ImportAccumulator,
): string {
  if (!spec.startsWith(".") && !spec.startsWith("/")) return spec;
  const hostDir = path.dirname(hostFile.getFilePath());
  const abs = path.resolve(hostDir, spec).replace(/\.(m|c)?js$/, "");
  return relSpecifierFromAbs(abs, acc.virtualDirRef);
}

function importKindFromDecl(decl: Node): ImportKind {
  if (Node.isImportSpecifier(decl)) return "named";
  if (Node.isNamespaceImport(decl)) return "namespace";
  if (Node.isImportClause(decl)) return "default";
  return "named";
}

function isTypeParameter(ident: Node): boolean {
  const sym = ident.getSymbol();
  if (!sym) return false;
  for (const decl of sym.getDeclarations()) {
    if (decl.getKind() === SyntaxKind.TypeParameter) return true;
  }
  return false;
}

function isTsLibraryName(name: string): boolean {
  // Built-in names that ts-json-schema-generator handles natively or that
  // don't need an import. Conservative — better to over-import than miss.
  return TS_LIB.has(name);
}

const TS_LIB = new Set<string>([
  "Array",
  "ReadonlyArray",
  "Record",
  "Readonly",
  "Partial",
  "Required",
  "Pick",
  "Omit",
  "Exclude",
  "Extract",
  "NonNullable",
  "Parameters",
  "ConstructorParameters",
  "ReturnType",
  "InstanceType",
  "ThisParameterType",
  "OmitThisParameter",
  "Awaited",
  "Promise",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Date",
  "RegExp",
  "Error",
  "String",
  "Number",
  "Boolean",
  "Symbol",
  "BigInt",
  "Object",
  "Function",
  "Uppercase",
  "Lowercase",
  "Capitalize",
  "Uncapitalize",
]);

function typeContainsTypeParameter(type: Type): boolean {
  if (type.isTypeParameter()) return true;
  if (type.getTypeArguments().some(typeContainsTypeParameter)) return true;
  if (type.getUnionTypes().some(typeContainsTypeParameter)) return true;
  if (type.getIntersectionTypes().some(typeContainsTypeParameter)) return true;
  return false;
}

/* ──────────────── fallback for inferred (no-typeNode) types ──────────────── */

function rewriteImportQualifications(
  text: string,
  acc: ImportAccumulator,
  hostFile: SourceFile,
  virtualDir: string,
  _type: Type,
): ResolvedAlias {
  // Replace each `import("/abs/path").Identifier` with `Identifier` and
  // register an import sourced from that path.
  const importRe = /import\("([^"]+)"\)\.([A-Za-z_$][\w$]*)/g;
  const rewritten = text.replace(importRe, (_match, modulePath, name) => {
    // Heuristic: if the module path matches the host file (modulo extension),
    // re-import from the host. Otherwise import from the absolute path.
    const hostNoExt = hostFile.getFilePath().replace(/\.tsx?$/, "");
    if (path.normalize(modulePath) === path.normalize(hostNoExt)) {
      acc.addLocal(name);
    } else {
      const spec = relSpecifierFromAbs(modulePath, virtualDir);
      acc.addExternal(spec, name);
    }
    return name;
  });
  return {
    text: rewritten,
    imports: acc.toList(),
    hasUnresolvedGenerics: false,
  };
}

/* ──────────────────────── module-specifier helpers ──────────────────────── */

function relSpecifier(absHostFile: string, virtualDir: string): string {
  const noExt = absHostFile.replace(/\.tsx?$/, "");
  return relSpecifierFromAbs(noExt, virtualDir);
}

function relSpecifierFromAbs(absPath: string, virtualDir: string): string {
  let rel = path.relative(virtualDir, absPath).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

/* ─────────────────────────── public render ─────────────────────────── */

export function renderImports(imports: AliasImport[]): string {
  if (imports.length === 0) return "";

  interface Bucket {
    named: { type: string[]; value: string[] };
    default: { type: string | null; value: string | null };
    namespace: { type: string | null; value: string | null };
  }
  const byModule = new Map<string, Bucket>();

  for (const imp of imports) {
    let bucket = byModule.get(imp.module);
    if (!bucket) {
      bucket = {
        named: { type: [], value: [] },
        default: { type: null, value: null },
        namespace: { type: null, value: null },
      };
      byModule.set(imp.module, bucket);
    }
    if (imp.kind === "named") {
      (imp.typeOnly ? bucket.named.type : bucket.named.value).push(imp.name);
    } else if (imp.kind === "default") {
      if (imp.typeOnly) bucket.default.type = imp.name;
      else bucket.default.value = imp.name;
    } else {
      if (imp.typeOnly) bucket.namespace.type = imp.name;
      else bucket.namespace.value = imp.name;
    }
  }

  const lines: string[] = [];
  for (const [module, bucket] of byModule) {
    // Default + named on the same line: `import D, { A, B } from "x"` is
    // valid TS, but mixing type-only is not — keep them on separate lines
    // for simplicity and TS strictness.
    if (bucket.namespace.value) {
      lines.push(`import * as ${bucket.namespace.value} from "${module}";`);
    }
    if (bucket.namespace.type) {
      lines.push(`import type * as ${bucket.namespace.type} from "${module}";`);
    }
    if (bucket.default.value) {
      lines.push(`import ${bucket.default.value} from "${module}";`);
    }
    if (bucket.default.type) {
      lines.push(`import type ${bucket.default.type} from "${module}";`);
    }
    const valueNames = unique(bucket.named.value);
    const typeNames = unique(bucket.named.type);
    if (valueNames.length > 0) {
      lines.push(`import { ${valueNames.join(", ")} } from "${module}";`);
    }
    if (typeNames.length > 0) {
      lines.push(`import type { ${typeNames.join(", ")} } from "${module}";`);
    }
  }
  return lines.join("\n");
}

function unique(xs: string[]): string[] {
  return Array.from(new Set(xs));
}
