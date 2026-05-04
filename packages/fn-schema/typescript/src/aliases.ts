import path from "node:path";
import type { JSONSchema } from "@ahmedrowaihi/fn-schema-core";
import {
  type ImportDeclaration,
  Node,
  type SourceFile,
  SyntaxKind,
  type Type,
  type TypeNode,
  ts,
} from "ts-morph";
import {
  LOSSY_REASONS,
  NOT_REPRESENTABLE,
  sentinelTypeAlias,
  WELL_KNOWN_NAMES,
} from "./well-known.js";

export type ImportKind = "named" | "default" | "namespace";

export interface AliasImport {
  module: string;
  name: string;
  typeOnly: boolean;
  kind: ImportKind;
}

export type AliasNote =
  | { kind: "well-known"; name: string; defaultSchema?: JSONSchema }
  | { kind: "not-representable"; name: string }
  | { kind: "lossy"; name: string; reason: string };

const PRIMITIVE_DEFAULTS: Record<string, JSONSchema> = {
  string: { type: "string" },
  number: { type: "number" },
  boolean: { type: "boolean" },
  null: { type: "null" },
  bigint: { type: "integer" },
};

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface ResolvedAlias {
  text: string;
  imports: AliasImport[];
  hasUnresolvedGenerics: boolean;
  notes: AliasNote[];
  /** Per-named-type declaration sites — used for the source-location keyword. */
  sources: Record<string, SourceLocation>;
}

/** Use ts.TypeFlags directly — the numeric value drifts across TS releases. */
const SYMBOL_FLAGS = ts.TypeFlags.ESSymbol | ts.TypeFlags.UniqueESSymbol;

export function resolveTypeExpression(
  node: Node,
  type: Type,
  hostFile: SourceFile,
  virtualDir: string,
  typeNode?: TypeNode,
): ResolvedAlias {
  const acc = new ImportAccumulator(hostFile, virtualDir);
  const notes: AliasNote[] = [];
  const sources: Record<string, SourceLocation> = {};

  if (!type.isLiteral()) {
    const flags = type.compilerType.flags;
    if ((flags & SYMBOL_FLAGS) !== 0) {
      notes.push({ kind: "not-representable", name: "symbol" });
    }
  }

  if (typeNode) {
    collectFromTypeNode(typeNode, acc, notes, sources);
    const { text, brand, primitive } = stripBrand(typeNode.getText());
    if (brand) {
      notes.push({
        kind: "well-known",
        name: brand,
        defaultSchema: primitive ? PRIMITIVE_DEFAULTS[primitive] : undefined,
      });
    }
    return {
      text: rewriteWellKnown(text, notes),
      imports: acc.toList(),
      hasUnresolvedGenerics: typeContainsTypeParameter(type),
      notes,
      sources,
    };
  }

  const text = type.getText(node);
  if (text.includes("import(")) {
    return rewriteImportQualifications(
      text,
      acc,
      hostFile,
      virtualDir,
      type,
      notes,
    );
  }
  return {
    text: rewriteWellKnown(text, notes),
    imports: [],
    hasUnresolvedGenerics: typeContainsTypeParameter(type),
    notes,
    sources,
  };
}

interface AccEntry {
  typeOnly: boolean;
  kind: ImportKind;
}

class ImportAccumulator {
  private readonly entries = new Map<string, Map<string, AccEntry>>();
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

function collectFromTypeNode(
  node: TypeNode,
  acc: ImportAccumulator,
  notes: AliasNote[],
  sources: Record<string, SourceLocation>,
): void {
  const visit = (n: Node): void => {
    if (Node.isTypeReference(n)) {
      const nameNode = n.getTypeName();
      const ident = leftmostIdentifier(nameNode);
      if (ident) registerIdentifier(ident, acc, notes, sources);
    } else if (Node.isExpressionWithTypeArguments(n)) {
      const expr = n.getExpression();
      if (Node.isIdentifier(expr))
        registerIdentifier(expr, acc, notes, sources);
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

function registerIdentifier(
  ident: Node,
  acc: ImportAccumulator,
  notes: AliasNote[],
  sources: Record<string, SourceLocation>,
): void {
  if (!Node.isIdentifier(ident)) return;
  const name = ident.getText();
  if (isTsLibraryName(name)) return;
  if (isTypeParameter(ident)) return;

  const sourceFile = ident.getSourceFile();
  const decls = ident.getSymbol()?.getDeclarations() ?? [];

  for (const decl of decls) {
    if (decl.getSourceFile().isDeclarationFile()) continue;
    const target = canonicalDecl(decl);
    if (!target) continue;
    const sf = target.getSourceFile();
    const { line, column } = sf.getLineAndColumnAtPos(target.getStart());
    sources[name] = { file: sf.getFilePath(), line, column };
    break;
  }

  const allAmbient =
    decls.length > 0 &&
    decls.every((d) => d.getSourceFile().isDeclarationFile());

  if (allAmbient && WELL_KNOWN_NAMES.has(name)) {
    notes.push({ kind: "well-known", name });
    return;
  }
  if (allAmbient && NOT_REPRESENTABLE.has(name)) {
    notes.push({ kind: "not-representable", name });
    return;
  }
  if (allAmbient) return;

  for (const decl of decls) {
    // Import bindings live in the host file, so check ImportDeclaration
    // first — otherwise they'd be misclassified as host-declared.
    const importDecl = decl.getFirstAncestorByKind(
      SyntaxKind.ImportDeclaration,
    );
    if (importDecl) {
      const spec = (importDecl as ImportDeclaration).getModuleSpecifierValue();
      if (spec) {
        acc.addExternal(
          retargetSpecifier(spec, sourceFile, acc),
          exportedNameFromDecl(decl, name),
          true,
          importKindFromDecl(decl),
        );
        return;
      }
    }

    const declSf = decl.getSourceFile();
    if (declSf === sourceFile || !declSf.isDeclarationFile()) {
      const branded = detectBrandedAlias(decl);
      if (branded) {
        notes.push({
          kind: "well-known",
          name,
          defaultSchema: branded.primitive
            ? PRIMITIVE_DEFAULTS[branded.primitive]
            : undefined,
        });
        return;
      }
      if (declSf === sourceFile) {
        acc.addLocal(name, true, "named");
        return;
      }
      acc.addLocal(name, true, "named");
      return;
    }
    if (declSf.isDeclarationFile()) return;
  }
}

/** Follow import bindings up to the original declaration so source locations
 *  point at the actual definition, not the import site in the host file. */
function canonicalDecl(decl: Node): Node | null {
  if (
    Node.isImportSpecifier(decl) ||
    Node.isImportClause(decl) ||
    Node.isNamespaceImport(decl)
  ) {
    const sym = (decl as Node).getSymbol();
    if (!sym) return decl;
    const aliasedSym = sym.getAliasedSymbol?.();
    if (!aliasedSym) return decl;
    const target = aliasedSym.getDeclarations()[0];
    return target ?? decl;
  }
  return decl;
}

/** `import { Foo as Bar }` — the virtual file uses the exported name `Foo`. */
function exportedNameFromDecl(decl: Node, fallback: string): string {
  if (Node.isImportSpecifier(decl)) {
    const propertyName = decl.compilerNode.propertyName;
    if (propertyName) return propertyName.text;
  }
  return fallback;
}

/** Relative specifiers in the host get re-expressed against the virtual file's directory. */
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
  "Error",
  "String",
  "Number",
  "Boolean",
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

function rewriteImportQualifications(
  text: string,
  acc: ImportAccumulator,
  hostFile: SourceFile,
  virtualDir: string,
  _type: Type,
  notes: AliasNote[],
): ResolvedAlias {
  const importRe = /import\("([^"]+)"\)\.([A-Za-z_$][\w$]*)/g;
  const rewritten = text.replace(importRe, (_match, modulePath, name) => {
    const hostNoExt = hostFile.getFilePath().replace(/\.tsx?$/, "");
    if (path.normalize(modulePath) === path.normalize(hostNoExt)) {
      acc.addLocal(name);
    } else {
      acc.addExternal(relSpecifierFromAbs(modulePath, virtualDir), name);
    }
    return name;
  });
  return {
    text: rewriteWellKnown(rewritten, notes),
    imports: acc.toList(),
    hasUnresolvedGenerics: false,
    notes,
    sources: {},
  };
}

/** Substitute well-known names with sentinels, but skip text inside string
 *  literals so `"Date" | "URL"` literal-type unions stay intact. */
function rewriteWellKnown(text: string, notes: AliasNote[]): string {
  const parts = splitOutsideStrings(text);
  const dynamicNames = new Set(
    notes.filter((n) => n.kind === "well-known").map((n) => n.name),
  );
  const lossySeen = new Set(
    notes.filter((n) => n.kind === "lossy").map((n) => n.name),
  );
  const allNames = new Set<string>([...WELL_KNOWN_NAMES, ...dynamicNames]);

  return parts
    .map((part) => {
      if (part.kind === "string") return part.text;
      let out = part.text;
      for (const name of allNames) {
        const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, "g");
        if (re.test(out)) {
          if (!dynamicNames.has(name)) {
            notes.push({ kind: "well-known", name });
            dynamicNames.add(name);
          }
          const lossyReason = LOSSY_REASONS[name];
          if (lossyReason && !lossySeen.has(name)) {
            notes.push({ kind: "lossy", name, reason: lossyReason });
            lossySeen.add(name);
          }
          out = out.replace(
            new RegExp(`\\b${escapeRegExp(name)}\\b`, "g"),
            sentinelTypeAlias(name),
          );
        }
      }
      return out;
    })
    .join("");
}

function splitOutsideStrings(
  text: string,
): { kind: "code" | "string"; text: string }[] {
  const out: { kind: "code" | "string"; text: string }[] = [];
  let buf = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    if (c === '"' || c === "'" || c === "`") {
      if (buf) {
        out.push({ kind: "code", text: buf });
        buf = "";
      }
      let lit = c;
      i++;
      while (i < text.length) {
        const k = text[i]!;
        lit += k;
        i++;
        if (k === "\\" && i < text.length) {
          lit += text[i];
          i++;
          continue;
        }
        if (k === c) break;
      }
      out.push({ kind: "string", text: lit });
      continue;
    }
    buf += c;
    i++;
  }
  if (buf) out.push({ kind: "code", text: buf });
  return out;
}

function stripBrand(text: string): {
  text: string;
  brand: string | null;
  primitive: string | null;
} {
  const brandRe =
    /^(.+?)\s*&\s*\{\s*(?:readonly\s+)?(?:__brand|_brand|brand|kind)\s*:\s*(["'])(.*?)\2\s*;?\s*\}\s*$/;
  const m = text.match(brandRe);
  if (!m) return { text, brand: null, primitive: null };
  const stripped = m[1]!.trim();
  return { text: stripped, brand: m[3]!, primitive: stripped };
}

/**
 * Detect named branded aliases (`type UserId = string & { __brand: "UserId" }`).
 * The brand-text regex only catches inline forms; this resolves the alias's
 * RHS via ts-morph and runs the same matcher against it.
 */
function detectBrandedAlias(
  decl: Node,
): { brand: string; primitive: string | null } | null {
  if (!Node.isTypeAliasDeclaration(decl)) return null;
  const rhs = decl.getTypeNode();
  if (!rhs) return null;
  const { brand, primitive } = stripBrand(rhs.getText());
  if (!brand) return null;
  return { brand, primitive };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
