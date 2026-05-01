/**
 * OpenAPI spec normalization pipeline. Pure spec → spec passes
 * applied to the raw bundled doc before IR codegen.
 *
 * Order: allOf collapse → enum dedup → object dedup (opt-in) → prune.
 * Pattern adapted from @hey-api/openapi-ts (MIT) `transformOpenApiSpec`.
 */
import { collapseSingleAllOf } from "./allOf.js";
import type { EnumPassOptions } from "./enums.js";
import { dedupeInlineEnums } from "./enums.js";
import type { ObjectPassOptions } from "./objects.js";
import { dedupeInlineObjects } from "./objects.js";
import { pruneUnusedSchemas } from "./prune.js";

export type { EnumPassOptions } from "./enums.js";
export type { Casing, NamingConfig, NamingRule } from "./name.js";
export type { ObjectPassOptions } from "./objects.js";

export interface NormalizeOptions {
  /** Hoist identical inline enums to `components.schemas`. */
  enums?: boolean | EnumPassOptions;
  /** Collapse single-element `allOf` compositions. */
  allOf?: boolean;
  /** Hoist identical inline objects. Opt-in: structural equality ≠ domain equality. */
  objects?: boolean | ObjectPassOptions;
  /** Drop unreferenced schemas. Scoped to pipeline-hoisted entries; authored schemas are never touched. */
  prune?: boolean;
}

/** Apply enabled passes to `spec` in place. Returns the same reference. */
export function normalizeSpec<T>(spec: T, opts: NormalizeOptions = {}): T {
  if (opts.allOf) collapseSingleAllOf(spec);
  const hoisted = new Set<string>();
  if (opts.enums) {
    const added = dedupeInlineEnums(
      spec,
      opts.enums === true ? {} : opts.enums,
    );
    for (const name of added) hoisted.add(name);
  }
  if (opts.objects) {
    const added = dedupeInlineObjects(
      spec,
      opts.objects === true ? {} : opts.objects,
    );
    for (const name of added) hoisted.add(name);
  }
  if (opts.prune) pruneUnusedSchemas(spec, { targets: hoisted });
  return spec;
}

/** Every pass except `objects` (kept opt-in for its false-merge risk). */
export const SAFE_NORMALIZE: NormalizeOptions = {
  allOf: true,
  enums: true,
  prune: true,
};
