import type { SwAccess } from "../access.js";
import type { SwType } from "../type/types.js";

/** Associated value on an enum case: `(<label>: <type>)`. */
export interface SwEnumAssoc {
  label?: string;
  type: SwType;
}

export interface SwEnumCase {
  name: string;
  /** Raw value when the enum has a raw type. Mutually exclusive with `assocs`. */
  rawValue?: string;
  /** Associated values for sum-type payload. */
  assocs?: ReadonlyArray<SwEnumAssoc>;
}

export interface SwEnum {
  kind: "enum";
  name: string;
  access: SwAccess;
  rawType?: SwType;
  conforms: ReadonlyArray<string>;
  cases: ReadonlyArray<SwEnumCase>;
}

export const swEnumCase = (
  name: string,
  rawValue?: string,
  assocs?: ReadonlyArray<SwEnumAssoc>,
): SwEnumCase => ({ name, rawValue, assocs });

export const swAssoc = (type: SwType, label?: string): SwEnumAssoc => ({
  type,
  label,
});

export function swEnum(opts: {
  name: string;
  cases: ReadonlyArray<SwEnumCase>;
  rawType?: SwType;
  conforms?: ReadonlyArray<string>;
  access?: SwAccess;
}): SwEnum {
  return {
    kind: "enum",
    name: opts.name,
    access: opts.access ?? "public",
    rawType: opts.rawType,
    conforms: opts.conforms ?? [],
    cases: opts.cases,
  };
}
