import type {
  KtAnnotation,
  KtDataClass,
  KtDecl,
  KtFile,
  KtPrimitive,
  KtProp,
  KtType,
} from "./types.js";

const prim = (name: KtPrimitive): KtType => ({ kind: "primitive", name });

export const ktString = prim("String");
export const ktInt = prim("Int");
export const ktLong = prim("Long");
export const ktShort = prim("Short");
export const ktByte = prim("Byte");
export const ktFloat = prim("Float");
export const ktDouble = prim("Double");
export const ktBoolean = prim("Boolean");
export const ktChar = prim("Char");
export const ktUnit = prim("Unit");
export const ktAny = prim("Any");

export const ktNullable = (inner: KtType): KtType => ({
  kind: "nullable",
  inner,
});
export const ktList = (element: KtType): KtType => ({ kind: "list", element });
export const ktMap = (key: KtType, value: KtType): KtType => ({
  kind: "map",
  key,
  value,
});
export const ktRef = (name: string, pkg?: string): KtType => ({
  kind: "ref",
  name,
  pkg,
});

export function ktAnnotation(
  name: string,
  opts: { pkg?: string; args?: string[] } = {},
): KtAnnotation {
  return { kind: "annotation", name, pkg: opts.pkg, args: opts.args };
}

export function ktProp(opts: {
  name: string;
  type: KtType;
  mutable?: boolean;
  default?: string;
  annotations?: KtAnnotation[];
}): KtProp {
  return {
    kind: "prop",
    name: opts.name,
    type: opts.type,
    mutable: opts.mutable ?? false,
    default: opts.default,
    annotations: opts.annotations ?? [],
  };
}

export function ktDataClass(opts: {
  name: string;
  properties: KtProp[];
  annotations?: KtAnnotation[];
}): KtDataClass {
  return {
    kind: "dataClass",
    name: opts.name,
    annotations: opts.annotations ?? [],
    properties: opts.properties,
  };
}

export function ktFile(opts: {
  packageName: string;
  decls: KtDecl[];
  imports?: string[];
}): KtFile {
  return {
    kind: "file",
    packageName: opts.packageName,
    imports: opts.imports ?? [],
    decls: opts.decls,
  };
}
