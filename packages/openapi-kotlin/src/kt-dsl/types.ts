/**
 * Kotlin AST node types — minimal subset for OpenAPI codegen.
 * Grows as new milestones add interfaces, funs, expressions, etc.
 */

export type KtPrimitive =
  | "String"
  | "Int"
  | "Long"
  | "Short"
  | "Byte"
  | "Float"
  | "Double"
  | "Boolean"
  | "Char"
  | "Unit"
  | "Any";

export type KtType =
  | { kind: "primitive"; name: KtPrimitive }
  | { kind: "list"; element: KtType }
  | { kind: "map"; key: KtType; value: KtType }
  | { kind: "ref"; name: string; pkg?: string }
  | { kind: "nullable"; inner: KtType };

export interface KtAnnotation {
  kind: "annotation";
  name: string;
  pkg?: string;
  /** Raw Kotlin expressions, joined with `, ` inside the parens. */
  args?: string[];
}

export interface KtProp {
  kind: "prop";
  name: string;
  type: KtType;
  /** `var` when true, `val` otherwise. */
  mutable: boolean;
  /** Raw Kotlin expression for the default value, if any. */
  default?: string;
  annotations: KtAnnotation[];
}

export interface KtDataClass {
  kind: "dataClass";
  name: string;
  annotations: KtAnnotation[];
  properties: KtProp[];
}

export interface KtEnumVariant {
  name: string;
  annotations: KtAnnotation[];
}

export interface KtEnum {
  kind: "enum";
  name: string;
  annotations: KtAnnotation[];
  variants: KtEnumVariant[];
}

export interface KtTypeAlias {
  kind: "typeAlias";
  name: string;
  type: KtType;
}

export type KtDecl = KtDataClass | KtEnum | KtTypeAlias;

export interface KtFile {
  kind: "file";
  packageName: string;
  imports: string[];
  decls: KtDecl[];
}
