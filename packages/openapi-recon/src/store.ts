import { inferSchema, mergeSchema } from "./infer/schema";
import type { OperationObservation, Sample, Schema } from "./types";

/** Group key for aggregation by (origin, method) — within an origin we'll later template paths together. */
function groupKey(origin: string, method: string): string {
  return `${origin}|${method}`;
}

/**
 * In-memory observation store. Keeps:
 *   - `groups`: origin+method → set of raw pathnames + folded body schemas
 *   - One observation per (origin, templated path, method) is materialized
 *     during `flush()` (templating happens lazily so multiple samples share
 *     the same template).
 */
export class Store {
  /** group key → folded observation working state */
  private readonly groups = new Map<
    string,
    {
      origin: string;
      method: string;
      observations: Map<string, OperationObservation>;
    }
  >();

  add(sample: Sample): void {
    const k = groupKey(sample.origin, sample.method);
    let group = this.groups.get(k);
    if (!group) {
      group = {
        origin: sample.origin,
        method: sample.method,
        observations: new Map(),
      };
      this.groups.set(k, group);
    }

    // Per-raw-path observation aggregates schemas; templating combines them later.
    let obs = group.observations.get(sample.pathname);
    if (!obs) {
      obs = {
        rawPathnames: new Set(),
        templatedPath: null,
        pathParams: {},
        requestBodySchema: null,
        responseSchemas: new Map(),
        queryParams: inferQueryParamTypes(sample.query),
        sampleCount: 0,
        authSchemes: new Set(),
      };
      group.observations.set(sample.pathname, obs);
    }
    obs.rawPathnames.add(sample.pathname);
    obs.sampleCount += 1;
    if (sample.authSchemeId) obs.authSchemes.add(sample.authSchemeId);

    if (sample.requestBody !== null && sample.requestBody !== undefined) {
      const inferred = inferIfJson(sample.requestBody);
      if (inferred) {
        obs.requestBodySchema = obs.requestBodySchema
          ? mergeSchema(obs.requestBodySchema, inferred)
          : inferred;
      }
    }

    if (sample.responseBody !== null && sample.responseBody !== undefined) {
      const inferred = inferIfJson(sample.responseBody);
      if (inferred) {
        const existing = obs.responseSchemas.get(sample.status);
        obs.responseSchemas.set(
          sample.status,
          existing ? mergeSchema(existing, inferred) : inferred,
        );
      }
    }

    // Widen query param types if a new value disagrees.
    for (const [k2, v] of Object.entries(sample.query)) {
      const t = primitiveType(v);
      const existing = obs.queryParams[k2];
      if (!existing) {
        obs.queryParams[k2] = t;
      } else if (existing !== t) {
        obs.queryParams[k2] = "string";
      }
    }
  }

  /** Snapshot of current groups — for the assembler to read. */
  snapshot(): ReadonlyMap<
    string,
    {
      origin: string;
      method: string;
      observations: ReadonlyMap<string, OperationObservation>;
    }
  > {
    return this.groups;
  }

  clear(): void {
    this.groups.clear();
  }

  clearOrigin(origin: string): void {
    for (const [k, g] of this.groups) {
      if (g.origin === origin) this.groups.delete(k);
    }
  }

  /** Total raw observations across all groups (for diagnostics / UI counters). */
  size(): number {
    let n = 0;
    for (const g of this.groups.values()) {
      for (const o of g.observations.values()) n += o.sampleCount;
    }
    return n;
  }

  /** Per-origin sample counts. Sorted by origin for stable UI. */
  originStats(): Map<string, number> {
    const out = new Map<string, number>();
    for (const g of this.groups.values()) {
      let n = 0;
      for (const o of g.observations.values()) n += o.sampleCount;
      out.set(g.origin, (out.get(g.origin) ?? 0) + n);
    }
    return new Map([...out].sort(([a], [b]) => a.localeCompare(b)));
  }
}

function inferQueryParamTypes(
  q: Record<string, string>,
): Record<string, "string" | "integer" | "boolean"> {
  const out: Record<string, "string" | "integer" | "boolean"> = {};
  for (const [k, v] of Object.entries(q)) out[k] = primitiveType(v);
  return out;
}

function primitiveType(v: string): "string" | "integer" | "boolean" {
  if (v === "true" || v === "false") return "boolean";
  if (/^-?\d+$/.test(v)) return "integer";
  return "string";
}

function inferIfJson(value: unknown): Schema | null {
  if (value === undefined) return null;
  return inferSchema(value);
}
