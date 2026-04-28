import type { KtAnnotation, KtDecl, KtType } from "../kt-dsl/types.js";

/**
 * Compute the imports a single decl needs, given the project-wide map
 * from decl-name → fully-qualified-name. External annotations (those
 * that carry their own `pkg`) and externally-packaged refs are always
 * imported. Cross-package internal refs are imported; same-package
 * refs are not.
 */
export function collectImports(
  decl: KtDecl,
  fqn: ReadonlyMap<string, string>,
  currentPkg: string,
): string[] {
  const out = new Set<string>();
  walkAnnotations(decl, (a) => {
    if (a.pkg) out.add(`${a.pkg}.${a.name}`);
  });
  walkTypes(decl, (t) => collectTypeImport(t, fqn, currentPkg, out));
  return [...out].sort();
}

function collectTypeImport(
  t: KtType,
  fqn: ReadonlyMap<string, string>,
  currentPkg: string,
  out: Set<string>,
): void {
  switch (t.kind) {
    case "primitive":
      return;
    case "list":
      collectTypeImport(t.element, fqn, currentPkg, out);
      return;
    case "map":
      collectTypeImport(t.key, fqn, currentPkg, out);
      collectTypeImport(t.value, fqn, currentPkg, out);
      return;
    case "nullable":
      collectTypeImport(t.inner, fqn, currentPkg, out);
      return;
    case "ref": {
      if (t.pkg) {
        // For nested types like `MultipartBody.Part`, import the outer
        // class so qualified-name use resolves.
        const dot = t.name.indexOf(".");
        const head = dot === -1 ? t.name : t.name.slice(0, dot);
        out.add(`${t.pkg}.${head}`);
        return;
      }
      const target = fqn.get(t.name);
      if (!target) return;
      const targetPkg = target.slice(0, target.lastIndexOf("."));
      if (targetPkg !== currentPkg) out.add(target);
    }
  }
}

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
