import type { OpenAPIV3_1 } from "@hey-api/spec-types";

import { flattenRenames, mergeComponents } from "./components.js";
import { MergeConflictError, mergePaths } from "./paths.js";
import { rewriteRefs } from "./refs.js";
import type {
  Document,
  MergeOptions,
  MergeSource,
  OperationIdPolicy,
  ServerPolicy,
  TagPolicy,
} from "./types.js";

const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

export function merge(
  sources: MergeSource[],
  opts: MergeOptions = {},
): Document {
  if (sources.length === 0) {
    return {
      openapi: "3.1.0",
      info: { title: "Merged API", version: "0.0.0" },
      paths: {},
    };
  }

  const { components, renames } = mergeComponents(sources, opts.components);

  const rewrittenSources: MergeSource[] = sources.map(({ label, spec }) => {
    const renameMap = renames[label];
    if (!renameMap || Object.keys(renameMap).length === 0) {
      return { label, spec };
    }
    const rewrittenPaths = rewriteRefs(spec.paths ?? {}, renameMap);
    const rewrittenWebhooks = spec.webhooks
      ? rewriteRefs(spec.webhooks, renameMap)
      : undefined;
    return {
      label,
      spec: {
        ...spec,
        paths: rewrittenPaths,
        ...(rewrittenWebhooks ? { webhooks: rewrittenWebhooks } : {}),
      } as Document,
    };
  });

  resolveOperationIdConflicts(rewrittenSources, opts.operationIds);

  const { paths } = mergePaths(rewrittenSources, opts.paths);
  const allRenames = flattenRenames(renames);
  const finalPaths = rewriteRefs(paths, allRenames);

  const webhooks = mergeWebhooks(rewrittenSources);
  const tags = mergeTags(sources, opts.tags);
  const servers = mergeServers(sources, opts.servers);
  const security = mergeSecurity(sources);
  const info = mergeInfo(sources, opts.info);

  const out: Document = {
    openapi: "3.1.0",
    info,
    paths: finalPaths,
  };
  if (servers.length > 0) out.servers = servers;
  if (Object.keys(components).length > 0) out.components = components;
  if (tags.length > 0) out.tags = tags;
  if (security.length > 0) out.security = security;
  if (Object.keys(webhooks).length > 0) out.webhooks = webhooks;
  return out;
}

function mergeInfo(
  sources: MergeSource[],
  override: MergeOptions["info"],
): OpenAPIV3_1.InfoObject {
  const first = sources[0]?.spec.info ?? {};
  const merged: OpenAPIV3_1.InfoObject = {
    ...(first as OpenAPIV3_1.InfoObject),
    title: override?.title ?? first.title ?? "Merged API",
    version: override?.version ?? first.version ?? "0.0.0",
  };
  if (override?.description !== undefined)
    merged.description = override.description;
  if (override?.summary !== undefined) merged.summary = override.summary;
  if (override?.contact !== undefined) merged.contact = override.contact;
  if (override?.license !== undefined) merged.license = override.license;
  if (override?.termsOfService !== undefined)
    merged.termsOfService = override.termsOfService;
  return merged;
}

function mergeTags(
  sources: MergeSource[],
  policy: TagPolicy = {},
): OpenAPIV3_1.TagObject[] {
  const strategy = policy.strategy ?? "union";
  const namespace = policy.namespace ?? ((label, tag) => `${label}:${tag}`);
  const seen = new Map<string, OpenAPIV3_1.TagObject>();

  for (const { label, spec } of sources) {
    for (const tag of spec.tags ?? []) {
      const finalName =
        strategy === "namespace" ? namespace(label, tag.name) : tag.name;
      if (!seen.has(finalName)) {
        seen.set(finalName, { ...tag, name: finalName });
      }
    }
  }
  return [...seen.values()];
}

function mergeServers(
  sources: MergeSource[],
  policy: ServerPolicy = {},
): OpenAPIV3_1.ServerObject[] {
  const strategy = policy.strategy ?? "union";
  if (strategy === "first") return sources[0]?.spec.servers ?? [];
  if (strategy === "last") {
    return sources[sources.length - 1]?.spec.servers ?? [];
  }
  const seen = new Set<string>();
  const out: OpenAPIV3_1.ServerObject[] = [];
  for (const { spec } of sources) {
    for (const server of spec.servers ?? []) {
      if (seen.has(server.url)) continue;
      seen.add(server.url);
      out.push(server);
    }
  }
  return out;
}

function mergeSecurity(
  sources: MergeSource[],
): OpenAPIV3_1.SecurityRequirementObject[] {
  const seen = new Set<string>();
  const out: OpenAPIV3_1.SecurityRequirementObject[] = [];
  for (const { spec } of sources) {
    for (const req of spec.security ?? []) {
      const key = JSON.stringify(req);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(req);
    }
  }
  return out;
}

function mergeWebhooks(
  sources: MergeSource[],
): Record<string, OpenAPIV3_1.PathItemObject> {
  const out: Record<string, OpenAPIV3_1.PathItemObject> = {};
  for (const { spec } of sources) {
    for (const [name, item] of Object.entries(spec.webhooks ?? {})) {
      if (!(name in out)) out[name] = item as OpenAPIV3_1.PathItemObject;
    }
  }
  return out;
}

function resolveOperationIdConflicts(
  sources: MergeSource[],
  policy: OperationIdPolicy = {},
): void {
  const onConflict = policy.onConflict ?? "namespace";
  const namespace = policy.namespace ?? ((label, id) => `${label}_${id}`);
  const claimed = new Map<string, string>();

  for (const { label, spec } of sources) {
    for (const item of Object.values(spec.paths ?? {})) {
      if (!item) continue;
      for (const method of HTTP_METHODS) {
        const op = (item as Record<string, unknown>)[method] as
          | (OpenAPIV3_1.OperationObject & { operationId?: string })
          | undefined;
        if (!op?.operationId) continue;

        const id = op.operationId;
        if (onConflict === "namespace") {
          op.operationId = namespace(label, id);
          continue;
        }
        const owner = claimed.get(id);
        if (!owner) {
          claimed.set(id, label);
          continue;
        }
        if (owner === label) continue;
        switch (onConflict) {
          case "error":
            throw new MergeConflictError(
              `operationId "${id}" appears in both "${owner}" and "${label}"`,
            );
          case "first-wins":
            delete op.operationId;
            continue;
          case "last-wins":
            claimed.set(id, label);
            continue;
        }
      }
    }
  }
}
