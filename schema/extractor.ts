/**
 * Extracts response schema info from OpenAPI operations for faker mode.
 * Walks the raw OpenAPI spec resolving $ref, allOf, oneOf/anyOf, and
 * nested object/array schemas into a flat PropertyInfo tree.
 */

import type { IR } from "@hey-api/shared";

import type {
  PropertyInfo,
  ResponseSchemaInfo,
} from "../generators/handlers/ast";
import type { ORPCPlugin } from "../types";

type PluginCtx = ORPCPlugin["Instance"];

/**
 * Lightweight shape for the OpenAPI schema nodes we walk.
 * The actual spec types from @hey-api/shared are deeply nested unions
 * across OpenAPI 2.0/3.0/3.1 — a narrow interface is more practical here
 * than importing and intersecting all three.
 */
interface OpenApiSchemaNode {
  $ref?: string;
  type?: string | string[];
  format?: string;
  enum?: (string | number | boolean)[];
  properties?: Record<string, OpenApiSchemaNode>;
  items?: OpenApiSchemaNode;
  allOf?: OpenApiSchemaNode[];
  oneOf?: OpenApiSchemaNode[];
  anyOf?: OpenApiSchemaNode[];
  content?: Record<string, { schema?: OpenApiSchemaNode }>;
  responses?: Record<string, OpenApiSchemaNode>;
  [key: string]: unknown;
}

function resolve(
  schema: OpenApiSchemaNode | undefined,
  plugin: PluginCtx,
): OpenApiSchemaNode | undefined {
  if (!schema) return schema;
  if (schema.$ref)
    return resolve(
      plugin.context.resolveRef<OpenApiSchemaNode>(schema.$ref),
      plugin,
    );
  return schema;
}

/**
 * Extract response schema info from an operation's success response.
 * Handles $ref, allOf composition, oneOf/anyOf unions, and nested schemas.
 */
export function extractResponseSchema(
  operation: IR.OperationObject,
  plugin: PluginCtx,
): ResponseSchemaInfo | null {
  if (!operation.responses) return null;

  const pathItem = plugin.context.spec.paths?.[operation.path];
  const openApiOp = pathItem?.[operation.method];
  if (!openApiOp?.responses) return null;

  for (const statusCode in openApiOp.responses) {
    const numeric = Number.parseInt(statusCode, 10);
    if (numeric < 200 || numeric >= 300) continue;

    const response = resolve(openApiOp.responses[statusCode], plugin);
    if (!response) continue;

    // Prefer application/json, fall back to first available content type
    const content = response?.content;
    const jsonSchema =
      content?.["application/json"]?.schema ??
      Object.values(content ?? {}).find((c) => c?.schema)?.schema;
    if (!jsonSchema) continue;

    return buildSchemaInfo(resolve(jsonSchema, plugin), plugin);
  }

  return null;
}

/** Build a ResponseSchemaInfo from a resolved JSON schema node. */
function buildSchemaInfo(
  schema: OpenApiSchemaNode | undefined,
  plugin: PluginCtx,
): ResponseSchemaInfo | null {
  const resolved = resolve(schema, plugin);
  if (!resolved) return null;

  if (resolved.type === "array") {
    const itemSchema = resolve(resolved.items, plugin);
    const itemInfo = itemSchema
      ? buildPropertyInfo("item", itemSchema, plugin)
      : undefined;
    if (itemInfo?.children) {
      return { properties: itemInfo.children, isArray: true };
    }
    return { properties: {}, isArray: true };
  }

  if (resolved.allOf) {
    const merged = mergeAllOf(resolved.allOf, plugin);
    return { properties: merged, isArray: false };
  }

  const unionVariants = resolved.oneOf ?? resolved.anyOf;
  if (unionVariants && unionVariants.length > 0) {
    const firstVariant = resolve(unionVariants[0], plugin);
    if (firstVariant) return buildSchemaInfo(firstVariant, plugin);
  }

  if (resolved.properties) {
    const props = extractProperties(resolved, plugin);
    return { properties: props, isArray: false };
  }

  return null;
}

/** Merge an allOf array into a flat properties map. */
function mergeAllOf(
  allOf: OpenApiSchemaNode[],
  plugin: PluginCtx,
): Record<string, PropertyInfo> {
  const merged: Record<string, PropertyInfo> = {};
  for (const part of allOf) {
    const resolved = resolve(part, plugin);
    if (!resolved) continue;
    if (resolved.allOf) {
      Object.assign(merged, mergeAllOf(resolved.allOf, plugin));
      continue;
    }
    if (resolved.properties) {
      Object.assign(merged, extractProperties(resolved, plugin));
    }
  }
  return merged;
}

/** Extract properties from an object schema into PropertyInfo records. */
function extractProperties(
  schema: OpenApiSchemaNode,
  plugin: PluginCtx,
): Record<string, PropertyInfo> {
  const result: Record<string, PropertyInfo> = {};
  if (!schema.properties) return result;

  for (const [key, rawProp] of Object.entries(schema.properties)) {
    result[key] = buildPropertyInfo(key, resolve(rawProp, plugin), plugin);
  }
  return result;
}

/** Build a single PropertyInfo, recursing into nested objects/arrays. */
function buildPropertyInfo(
  name: string,
  schema: OpenApiSchemaNode | undefined,
  plugin: PluginCtx,
): PropertyInfo {
  const resolved = resolve(schema, plugin);
  if (!resolved) return { type: "string", name };

  const type = Array.isArray(resolved.type)
    ? (resolved.type.find((t) => t !== "null") ?? "string")
    : (resolved.type ?? "string");

  const info: PropertyInfo = { type, format: resolved.format, name };

  if (resolved.enum && resolved.enum.length > 0) {
    info.enum = resolved.enum;
  }

  if (resolved.allOf) {
    info.type = "object";
    info.children = mergeAllOf(resolved.allOf, plugin);
    return info;
  }

  const unionVariants = resolved.oneOf ?? resolved.anyOf;
  if (unionVariants && unionVariants.length > 0) {
    const firstVariant = resolve(unionVariants[0], plugin);
    if (firstVariant) return buildPropertyInfo(name, firstVariant, plugin);
  }

  if (type === "object" && resolved.properties) {
    info.children = extractProperties(resolved, plugin);
  }

  if (type === "array" && resolved.items) {
    const itemResolved = resolve(resolved.items, plugin);
    if (itemResolved) {
      info.items = buildPropertyInfo("item", itemResolved, plugin);
    }
  }

  return info;
}
