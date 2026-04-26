import { DEFAULT_FORMAT_MAPPING } from "./hints";
import type {
  FakerMethodPath,
  FieldNameHints,
  FormatMapping,
  PropertyInfo,
} from "./types";

const NULL_METHOD = "__null__" as const;
export type ResolvedFakerMethod = FakerMethodPath | typeof NULL_METHOD;

export interface ResolveOptions {
  fieldHints?: FieldNameHints;
  formatHints?: FormatMapping;
  respectConstraints?: boolean;
}

export interface FakerCallSpec {
  method: ResolvedFakerMethod;
  args?: Record<string, number>;
}

const hasNumericConstraint = (info: PropertyInfo): boolean =>
  info.minimum !== undefined || info.maximum !== undefined;

const hasLengthConstraint = (info: PropertyInfo): boolean =>
  info.minLength !== undefined || info.maxLength !== undefined;

export function resolveFakerCall(
  info: PropertyInfo,
  opts: ResolveOptions = {},
): FakerCallSpec {
  const fieldHints = opts.fieldHints ?? {};
  const formatHints = opts.formatHints ?? (DEFAULT_FORMAT_MAPPING as FormatMapping);
  const respect = opts.respectConstraints ?? false;

  if (info.format && formatHints[info.format]) {
    return { method: formatHints[info.format] };
  }

  const normalized = info.name.toLowerCase().replace(/[_-]/g, "");
  if (fieldHints[normalized]) {
    return { method: fieldHints[normalized] };
  }

  switch (info.type) {
    case "integer":
    case "number": {
      const method: FakerMethodPath = info.type === "integer" ? "number.int" : "number.float";
      if (respect && hasNumericConstraint(info)) {
        const args: Record<string, number> = {};
        if (info.minimum !== undefined) args.min = info.minimum;
        if (info.maximum !== undefined) args.max = info.maximum;
        return { method, args };
      }
      return { method };
    }
    case "boolean":
      return { method: "datatype.boolean" };
    case "null":
      return { method: NULL_METHOD };
    default: {
      if (respect && hasLengthConstraint(info)) {
        const length = info.maxLength ?? info.minLength!;
        return { method: "string.alpha", args: { length } };
      }
      return { method: "lorem.word" };
    }
  }
}
