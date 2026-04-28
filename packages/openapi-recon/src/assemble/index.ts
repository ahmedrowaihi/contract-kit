import type { OpenAPIV3_1 } from "@hey-api/spec-types";

import type { DetectedAuth } from "../infer/auth";
import { templatePathFor } from "../infer/path";
import type { OperationObservation } from "../types";
import { OperationBuilder } from "./operation";

export interface AssembleOptions {
  pathTemplating: boolean;
  title: string;
  version: string;
  detectedAuthSchemes: ReadonlyMap<string, DetectedAuth | null>;
}

export type GroupSnapshot = ReadonlyMap<
  string,
  {
    origin: string;
    method: string;
    observations: ReadonlyMap<string, OperationObservation>;
  }
>;

/** Build an OpenAPI 3.1 document from a store snapshot. */
export function assembleDocument(
  groups: GroupSnapshot,
  opts: AssembleOptions,
): OpenAPIV3_1.Document {
  const operationsByOrigin = aggregateOperations(groups, opts.pathTemplating);
  const origins = new Set(operationsByOrigin.keys());

  const paths = renderPaths(operationsByOrigin, origins.size > 1);
  const servers: OpenAPIV3_1.ServerObject[] = [...origins].map((url) => ({
    url,
  }));
  const securitySchemes = collectSecuritySchemes(opts.detectedAuthSchemes);

  const doc: OpenAPIV3_1.Document = {
    openapi: "3.1.0",
    info: { title: opts.title, version: opts.version },
    servers,
    paths: paths as OpenAPIV3_1.Document["paths"],
  };
  if (Object.keys(securitySchemes).length > 0) {
    doc.components = { securitySchemes };
  }
  return doc;
}

type OperationMap = Map<string, OperationBuilder>;
type OriginMap = Map<string, Map<string, OperationMap>>;

/** Pivot raw observations into `origin → templatedPath → method → builder`. */
function aggregateOperations(
  groups: GroupSnapshot,
  pathTemplating: boolean,
): OriginMap {
  const out: OriginMap = new Map();
  for (const group of groups.values()) {
    const rawPaths = [...group.observations.keys()];
    for (const [rawPath, obs] of group.observations) {
      const tpl = pathTemplating
        ? templatePathFor(rawPath, rawPaths)
        : { template: rawPath, paramTypes: {} };
      const next = OperationBuilder.fromObservation(obs, tpl.paramTypes);

      const byPath = ensureMap(out, group.origin);
      const byMethod = ensureMap(byPath, tpl.template);
      const existing = byMethod.get(group.method);
      byMethod.set(group.method, existing ? existing.merge(next) : next);
    }
  }
  return out;
}

/**
 * Compose the `paths` object. When the snapshot covers multiple origins,
 * prefix each path with `/__<host>` so they don't collide; emit each origin
 * as a `server` so consumers can reconstruct the full URL.
 */
function renderPaths(
  byOrigin: OriginMap,
  multiOrigin: boolean,
): Record<string, OpenAPIV3_1.PathItemObject> {
  const out: Record<string, OpenAPIV3_1.PathItemObject> = {};
  for (const [origin, byPath] of byOrigin) {
    const prefix = multiOrigin ? `/__${slugify(origin)}` : "";
    for (const [tpl, byMethod] of byPath) {
      const fullPath = `${prefix}${tpl}`;
      const item: OpenAPIV3_1.PathItemObject = out[fullPath] ?? {};
      for (const [method, op] of byMethod) {
        (item as Record<string, unknown>)[method] = op.toOpenApi(method);
      }
      out[fullPath] = item;
    }
  }
  return out;
}

function collectSecuritySchemes(
  detected: ReadonlyMap<string, DetectedAuth | null>,
): Record<string, OpenAPIV3_1.SecuritySchemeObject> {
  const out: Record<string, OpenAPIV3_1.SecuritySchemeObject> = {};
  for (const [id, d] of detected) {
    if (id && d) out[id] = d.scheme;
  }
  return out;
}

function ensureMap<K, V>(
  parent: Map<K, Map<string, V>>,
  key: K,
): Map<string, V> {
  let v = parent.get(key);
  if (!v) {
    v = new Map();
    parent.set(key, v);
  }
  return v;
}

function slugify(origin: string): string {
  return origin.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_");
}
