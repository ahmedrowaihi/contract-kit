import type { GoType } from "../type/types.js";

export interface GoMethodSignature {
  name: string;
  params: ReadonlyArray<{ name: string; type: GoType }>;
  results: ReadonlyArray<{ name?: string; type: GoType }>;
  doc?: string;
}

export interface GoInterface {
  kind: "interface";
  name: string;
  methods: ReadonlyArray<GoMethodSignature>;
  /** Embedded interfaces — `MyIface { OtherIface; … }`. */
  embedded: ReadonlyArray<string>;
  doc?: string;
  runtime?: boolean;
}

/**
 * One method signature inside an interface decl.
 *
 * @example
 * ```go
 * // goMethodSig("GetPet",
 * //   [{ name: "ctx", type: goContext }, { name: "id", type: goInt64 }],
 * //   [{ type: goPtr(goRef("Pet")) }, { type: goError }])
 * //   → GetPet(ctx context.Context, id int64) (*Pet, error)
 * ```
 */
export const goMethodSig = (
  name: string,
  params: ReadonlyArray<{ name: string; type: GoType }>,
  results: ReadonlyArray<{ name?: string; type: GoType }>,
  doc?: string,
): GoMethodSignature => ({ name, params, results, doc });

/**
 * Top-level interface decl.
 *
 * @example
 * ```go
 * // goInterface({ name: "PetAPI", methods: [...] })
 * //   → type PetAPI interface {
 * //         GetPet(ctx context.Context, id int64) (*Pet, error)
 * //     }
 * ```
 */
export function goInterface(opts: {
  name: string;
  methods?: ReadonlyArray<GoMethodSignature>;
  embedded?: ReadonlyArray<string>;
  doc?: string;
  runtime?: boolean;
}): GoInterface {
  return {
    kind: "interface",
    name: opts.name,
    methods: opts.methods ?? [],
    embedded: opts.embedded ?? [],
    doc: opts.doc,
    runtime: opts.runtime,
  };
}
