import type {
  FunctionInfo,
  FunctionKind,
  ParameterInfo,
} from "@ahmedrowaihi/fn-schema-core";
import {
  type ArrowFunction,
  type ExportAssignment,
  type FunctionDeclaration,
  type FunctionExpression,
  type MethodDeclaration,
  type MethodSignature,
  Node,
  type ObjectLiteralExpression,
  type ParameterDeclaration,
  type SignaturedDeclaration,
  type SourceFile,
  type Project as TsMorphProject,
  type VariableDeclaration,
} from "ts-morph";
import { type ResolvedAlias, resolveTypeExpression } from "./aliases.js";
import { parseJsDoc } from "./jsdoc.js";

export interface ResolvedParameter extends ParameterInfo {
  alias: ResolvedAlias;
}

export interface OverloadSignature {
  parameters: ResolvedParameter[];
  returnAlias: ResolvedAlias;
}

/**
 * Internal handle used during discovery and schema generation. Carries
 * pre-resolved type expressions + their required imports so the schema
 * synthesis step is purely string assembly — no further ts-morph work needed.
 */
export interface DiscoveredFunction extends FunctionInfo {
  sourceFilePath: string;
  importable: boolean;
  /** Implementation signature (or the only signature when no overloads). */
  resolvedParameters: ResolvedParameter[];
  returnAlias: ResolvedAlias;
  /**
   * All overload signatures. Always non-empty: contains at least the
   * implementation signature (also reflected in `resolvedParameters` /
   * `returnAlias`). Older overloads come first.
   */
  overloads: OverloadSignature[];
}

export function discoverFunctions(
  project: TsMorphProject,
  files: readonly string[],
  virtualDirFor: (sourceFile: string) => string,
): DiscoveredFunction[] {
  const acc: DiscoveredFunction[] = [];
  for (const filePath of files) {
    const sf = project.getSourceFile(filePath);
    if (!sf) continue;
    acc.push(...discoverInFile(sf, virtualDirFor));
  }
  return acc;
}

function discoverInFile(
  sf: SourceFile,
  virtualDirFor: (sourceFile: string) => string,
): DiscoveredFunction[] {
  const out: DiscoveredFunction[] = [];
  const filePath = sf.getFilePath();
  const virtualDir = virtualDirFor(filePath);

  for (const fd of sf.getFunctions()) {
    const info = describeFunctionDeclaration(fd, filePath, sf, virtualDir);
    if (info) out.push(info);
  }

  for (const vd of sf.getVariableDeclarations()) {
    const info = describeVariableDeclaration(vd, filePath, sf, virtualDir);
    if (info) {
      out.push(info);
      continue;
    }
    // Object-literal methods: `export const api = { create(input: X) {} }`
    out.push(...describeObjectLiteralMembers(vd, filePath, sf, virtualDir));
  }

  for (const cls of sf.getClasses()) {
    const className = cls.getName() ?? "";
    const exported = cls.isExported() || cls.isDefaultExport();
    for (const m of cls.getMethods()) {
      const info = describeMethod(
        m,
        filePath,
        className,
        exported,
        sf,
        virtualDir,
      );
      if (info) out.push(info);
    }
  }

  for (const ea of sf.getExportAssignments()) {
    const info = describeExportAssignment(ea, filePath, sf, virtualDir);
    if (info) out.push(info);
  }

  return out;
}

/* ─────────────────────────── declarations ────────────────────────── */

function describeFunctionDeclaration(
  fd: FunctionDeclaration,
  filePath: string,
  sf: SourceFile,
  virtualDir: string,
): DiscoveredFunction | null {
  const name = fd.getName();
  if (!name) return null;
  const exported = fd.isExported() || fd.isDefaultExport();
  const overloadDecls = collectFunctionOverloads(fd);
  const overloads = overloadDecls.map((decl) =>
    describeSignature(decl, sf, virtualDir),
  );
  const impl = overloads[overloads.length - 1];
  if (!impl) return null;
  return {
    name,
    file: filePath,
    location: positionOf(fd),
    kind: "function",
    language: "typescript",
    exported,
    async: fd.isAsync(),
    generic: hasUnresolvedGenerics(fd.getTypeParameters().length, overloads),
    parameters: impl.parameters.map(stripAlias),
    jsDoc: parseJsDoc(fd.getJsDocs()),
    sourceFilePath: filePath,
    importable: exported,
    resolvedParameters: impl.parameters,
    returnAlias: impl.returnAlias,
    overloads,
  };
}

function describeVariableDeclaration(
  vd: VariableDeclaration,
  filePath: string,
  sf: SourceFile,
  virtualDir: string,
): DiscoveredFunction | null {
  const init = vd.getInitializer();
  if (!init) return null;
  if (!Node.isArrowFunction(init) && !Node.isFunctionExpression(init))
    return null;

  const stmt = vd.getVariableStatement();
  const exported = stmt?.isExported() ?? false;
  const name = vd.getName();
  const fn = init as ArrowFunction | FunctionExpression;
  const kind: FunctionKind = Node.isArrowFunction(init)
    ? "arrow"
    : "expression";
  const sig = describeSignature(fn, sf, virtualDir);
  return {
    name,
    file: filePath,
    location: positionOf(vd),
    kind,
    language: "typescript",
    exported,
    async: fn.isAsync(),
    generic: hasUnresolvedGenerics(fn.getTypeParameters().length, [sig]),
    parameters: sig.parameters.map(stripAlias),
    jsDoc: parseJsDoc(stmt?.getJsDocs() ?? []),
    sourceFilePath: filePath,
    importable: exported,
    resolvedParameters: sig.parameters,
    returnAlias: sig.returnAlias,
    overloads: [sig],
  };
}

function describeObjectLiteralMembers(
  vd: VariableDeclaration,
  filePath: string,
  sf: SourceFile,
  virtualDir: string,
): DiscoveredFunction[] {
  const init = vd.getInitializer();
  if (!init || !Node.isObjectLiteralExpression(init)) return [];
  const stmt = vd.getVariableStatement();
  const exported = stmt?.isExported() ?? false;
  const containerName = vd.getName();

  const out: DiscoveredFunction[] = [];
  const obj = init as ObjectLiteralExpression;
  for (const prop of obj.getProperties()) {
    // `create(input: X) { ... }` shorthand
    if (Node.isMethodDeclaration(prop)) {
      const memberName = prop.getName();
      const sig = describeSignature(prop, sf, virtualDir);
      out.push({
        name: memberName,
        file: filePath,
        location: positionOf(prop),
        kind: "method",
        language: "typescript",
        exported,
        async: prop.isAsync(),
        generic: prop.getTypeParameters().length > 0,
        parameters: sig.parameters.map(stripAlias),
        jsDoc: parseJsDoc(prop.getJsDocs()),
        className: containerName,
        sourceFilePath: filePath,
        importable: exported,
        resolvedParameters: sig.parameters,
        returnAlias: sig.returnAlias,
        overloads: [sig],
      });
      continue;
    }
    // `create: (input: X) => ...` or `create: function(...) {}`
    if (Node.isPropertyAssignment(prop)) {
      const memberInit = prop.getInitializer();
      if (
        !memberInit ||
        (!Node.isArrowFunction(memberInit) &&
          !Node.isFunctionExpression(memberInit))
      )
        continue;
      const fn = memberInit as ArrowFunction | FunctionExpression;
      const sig = describeSignature(fn, sf, virtualDir);
      const memberName = prop.getName();
      out.push({
        name: memberName,
        file: filePath,
        location: positionOf(prop),
        kind: Node.isArrowFunction(memberInit) ? "arrow" : "expression",
        language: "typescript",
        exported,
        async: fn.isAsync(),
        generic: fn.getTypeParameters().length > 0,
        parameters: sig.parameters.map(stripAlias),
        // PropertyAssignment doesn't expose getJsDocs(); skip — JSDoc on
        // the inner function expression is rare in practice.
        jsDoc: undefined,
        className: containerName,
        sourceFilePath: filePath,
        importable: exported,
        resolvedParameters: sig.parameters,
        returnAlias: sig.returnAlias,
        overloads: [sig],
      });
    }
  }
  return out;
}

function describeMethod(
  m: MethodDeclaration,
  filePath: string,
  className: string,
  classExported: boolean,
  sf: SourceFile,
  virtualDir: string,
): DiscoveredFunction | null {
  const name = m.getName();
  if (!name) return null;
  if (m.isAbstract()) return null;
  const overloadDecls = collectMethodOverloads(m);
  const overloads = overloadDecls.map((decl) =>
    describeSignature(decl, sf, virtualDir),
  );
  const impl = overloads[overloads.length - 1];
  if (!impl) return null;
  return {
    name,
    file: filePath,
    location: positionOf(m),
    kind: "method",
    language: "typescript",
    exported: classExported,
    async: m.isAsync(),
    generic: hasUnresolvedGenerics(m.getTypeParameters().length, overloads),
    parameters: impl.parameters.map(stripAlias),
    jsDoc: parseJsDoc(m.getJsDocs()),
    className,
    decorators: m.getDecorators().map((d) => d.getName()),
    sourceFilePath: filePath,
    importable: classExported,
    resolvedParameters: impl.parameters,
    returnAlias: impl.returnAlias,
    overloads,
  };
}

function describeExportAssignment(
  ea: ExportAssignment,
  filePath: string,
  sf: SourceFile,
  virtualDir: string,
): DiscoveredFunction | null {
  if (ea.isExportEquals()) return null;
  const expr = ea.getExpression();
  if (!Node.isArrowFunction(expr) && !Node.isFunctionExpression(expr))
    return null;
  const fn = expr as ArrowFunction | FunctionExpression;
  const sig = describeSignature(fn, sf, virtualDir);
  const kind: FunctionKind = Node.isArrowFunction(expr)
    ? "arrow"
    : "expression";
  return {
    name: "default",
    file: filePath,
    location: positionOf(ea),
    kind,
    language: "typescript",
    exported: true,
    async: fn.isAsync(),
    generic: hasUnresolvedGenerics(fn.getTypeParameters().length, [sig]),
    parameters: sig.parameters.map(stripAlias),
    jsDoc: parseJsDoc(ea.getJsDocs()),
    sourceFilePath: filePath,
    importable: true,
    resolvedParameters: sig.parameters,
    returnAlias: sig.returnAlias,
    overloads: [sig],
  };
}

/* ─────────────────────────── signature helper ────────────────────── */

type SignatureNode =
  | FunctionDeclaration
  | ArrowFunction
  | FunctionExpression
  | MethodDeclaration
  | MethodSignature
  | SignaturedDeclaration;

function describeSignature(
  node: SignatureNode,
  hostFile: SourceFile,
  virtualDir: string,
): OverloadSignature {
  const params = node.getParameters();
  const resolved: ResolvedParameter[] = [];
  for (let i = 0; i < params.length; i++) {
    const p = params[i]!;
    // Skip the `this` parameter — TS uses it only for type narrowing,
    // it isn't a real argument.
    if (i === 0 && p.getName() === "this") continue;
    resolved.push(resolveParameter(p, resolved.length, hostFile, virtualDir));
  }
  const returnAlias = resolveTypeExpression(
    node as Node,
    node.getReturnType(),
    hostFile,
    virtualDir,
    node.getReturnTypeNode(),
  );
  return { parameters: resolved, returnAlias };
}

function resolveParameter(
  p: ParameterDeclaration,
  index: number,
  hostFile: SourceFile,
  virtualDir: string,
): ResolvedParameter {
  const alias = resolveTypeExpression(
    p,
    p.getType(),
    hostFile,
    virtualDir,
    p.getTypeNode(),
  );
  return {
    name: p.getName(),
    index,
    optional: p.isOptional() || p.hasInitializer(),
    rest: p.isRestParameter(),
    typeText: p.getTypeNode()?.getText(),
    alias,
  };
}

function stripAlias(p: ResolvedParameter): ParameterInfo {
  const { alias: _drop, ...rest } = p;
  return rest;
}

/**
 * A function should be treated as generic when EITHER its declaration carries
 * type parameters OR any resolved parameter / return references an
 * unresolved type parameter (e.g. methods on a generic class:
 * `class Box<T> { get(): T }` has 0 type-params at the method level but `T`
 * still escapes into the schema). Without this, buildSchemas() would attempt
 * extraction and fail at runtime with a tjsg parser error.
 */
function hasUnresolvedGenerics(
  declaredTypeParamCount: number,
  overloads: OverloadSignature[],
): boolean {
  if (declaredTypeParamCount > 0) return true;
  return overloads.some(
    (o) =>
      o.returnAlias.hasUnresolvedGenerics ||
      o.parameters.some((p) => p.alias.hasUnresolvedGenerics),
  );
}

/* ─────────────────────────── overload collection ────────────────────── */

function collectFunctionOverloads(
  impl: FunctionDeclaration,
): FunctionDeclaration[] {
  const overloads = impl.getOverloads();
  return [...overloads, impl];
}

function collectMethodOverloads(impl: MethodDeclaration): MethodDeclaration[] {
  const overloads = impl.getOverloads();
  return [...overloads, impl];
}

/* ─────────────────────────── misc ────────────────────── */

function positionOf(node: Node): { line: number; column: number } {
  const sf = node.getSourceFile();
  const pos = node.getStart();
  const { line, column } = sf.getLineAndColumnAtPos(pos);
  return { line, column };
}
