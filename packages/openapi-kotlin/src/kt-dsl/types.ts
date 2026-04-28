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
  args?: string[];
}

export interface KtProp {
  kind: "prop";
  name: string;
  type: KtType;
  mutable: boolean;
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

export type KtFunModifier = "suspend" | "abstract" | "open" | "override";

export interface KtFunParam {
  kind: "funParam";
  name: string;
  type: KtType;
  default?: string;
  annotations: KtAnnotation[];
}

export interface KtFun {
  kind: "fun";
  name: string;
  params: KtFunParam[];
  returnType: KtType;
  modifiers: KtFunModifier[];
  annotations: KtAnnotation[];
  body?: string;
}

export interface KtInterface {
  kind: "interface";
  name: string;
  annotations: KtAnnotation[];
  funs: KtFun[];
}

export type KtDecl = KtDataClass | KtEnum | KtInterface | KtTypeAlias;

export interface KtFile {
  kind: "file";
  packageName: string;
  imports: string[];
  decls: KtDecl[];
}
