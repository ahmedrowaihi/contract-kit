import { $ } from "@hey-api/openapi-ts";
import { buildGraph, type IR } from "@hey-api/shared";

import { buildFakerExpression, type FakerSymbol } from "../core/builders";
import type { PropertyInfo } from "../core/types";
import {
  schemaToBatchFactoryName,
  schemaToFactoryName,
  shouldIncludeSchema,
} from "../utils/helpers";
import type { FakerPluginInstance, GenerateFactoriesInput } from "./types";

const schemaNameFromRef = (ref: string): string | null => {
  const m = ref.match(/\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]!) : null;
};

/**
 * IR walker. Produces a `PropertyInfo` tree from an `IR.SchemaObject`.
 *
 * Refs (`$ref`) are recorded but not followed — the builder emits a sibling
 * factory call via `opts.resolveRef`. The exception is `allOf` composition,
 * which must inline ref'd properties to merge them; for that path we resolve
 * refs via `plugin.context.resolveIrRef` and guard cycles with `visited`.
 */
function irToPropertyInfo(
  name: string,
  schema: IR.SchemaObject,
  plugin: FakerPluginInstance,
  visited: ReadonlySet<string> = new Set(),
): PropertyInfo {
  if (schema.$ref) {
    return { type: "ref", name, $ref: schema.$ref };
  }

  // IR encodes enums as { type: "enum", items: [{ const: value }, ...] }
  if (schema.type === "enum" && schema.items?.length) {
    const values = schema.items
      .map((item) => item.const)
      .filter((v): v is string | number | boolean => v !== undefined);
    return {
      type: "string",
      format: schema.format,
      name,
      ...(values.length > 0 && { enum: values }),
    };
  }

  // allOf — merge children. Resolve refs inline since merging requires the
  // target's properties.
  if (schema.logicalOperator === "and" && schema.items?.length) {
    const merged: Record<string, PropertyInfo> = {};
    for (const part of schema.items) {
      const partInfo = mergePart(part, plugin, visited);
      if (partInfo?.children) Object.assign(merged, partInfo.children);
    }
    return { type: "object", name, children: merged };
  }

  // oneOf / anyOf — record variants for runtime random pick.
  if (schema.logicalOperator === "or" && schema.items?.length) {
    return {
      type: "union",
      name,
      variants: schema.items.map((variant, i) =>
        irToPropertyInfo(`${name}_v${i}`, variant, plugin, visited),
      ),
    };
  }

  const type = Array.isArray(schema.type)
    ? (schema.type.find((t) => t !== "null") ?? "string")
    : (schema.type ?? "string");

  const info: PropertyInfo = { type, format: schema.format, name };

  if (schema.minimum !== undefined) info.minimum = schema.minimum;
  if (schema.maximum !== undefined) info.maximum = schema.maximum;
  if (schema.minLength !== undefined) info.minLength = schema.minLength;
  if (schema.maxLength !== undefined) info.maxLength = schema.maxLength;
  if (schema.minItems !== undefined) info.minItems = schema.minItems;
  if (schema.maxItems !== undefined) info.maxItems = schema.maxItems;

  if (type === "object" && schema.properties) {
    info.children = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      if (value) info.children[key] = irToPropertyInfo(key, value, plugin, visited);
    }
  }

  if (type === "array" && schema.items?.length) {
    info.items = irToPropertyInfo("item", schema.items[0], plugin, visited);
  }

  return info;
}

/** Resolve a part of an allOf composition into an object PropertyInfo. */
function mergePart(
  part: IR.SchemaObject,
  plugin: FakerPluginInstance,
  visited: ReadonlySet<string>,
): PropertyInfo | null {
  if (part.$ref) {
    if (visited.has(part.$ref)) return null;
    const next = new Set(visited);
    next.add(part.$ref);
    const target = plugin.context.resolveIrRef<IR.SchemaObject>(part.$ref);
    if (!target) return null;
    return irToPropertyInfo("merged", target, plugin, next);
  }
  return irToPropertyInfo("merged", part, plugin, visited);
}

const refToSchemaName = (ref: string): string | null => schemaNameFromRef(ref);

export const generateFactories = ({
  plugin,
  outputFile,
}: GenerateFactoriesInput): void => {
  const config = plugin.config;
  const faker = plugin.external("@faker-js/faker.faker");

  const { graph } = buildGraph(plugin.context.spec, plugin.context.logger);
  const reaches = (fromName: string, toName: string): boolean => {
    for (const [refKey, deps] of graph.transitiveDependencies) {
      if (refToSchemaName(refKey) !== fromName) continue;
      for (const dep of deps) {
        if (refToSchemaName(dep) === toName) return true;
      }
    }
    return false;
  };

  const generatedFactories: string[] = [];

  // Schemas we emit a factory for: plain objects + allOf composition + oneOf/
  // anyOf unions. Skip raw scalars, top-level enums, and standalone arrays.
  const isFactoryable = (s: IR.SchemaObject): boolean =>
    s.type === "object" ||
    s.logicalOperator === "and" ||
    s.logicalOperator === "or";

  // Pass 2: emit factories.
  plugin.forEach("schema", (event) => {
    const { schema, name } = event;
    if (!name) return;
    const schemaName = name;

    if (!isFactoryable(schema)) return;
    if (!shouldIncludeSchema(schemaName, config.include, config.exclude)) {
      return;
    }
    if (config.filter && !config.filter(schema)) return;

    const factoryName = schemaToFactoryName(schemaName);
    const factorySymbol = plugin.symbol(factoryName, {
      getFilePath: () => outputFile,
    });

    const rootInfo = irToPropertyInfo(schemaName, schema, plugin);
    const body = buildFakerExpression(faker, rootInfo, {
      fieldHints: config.fieldNameHints,
      formatHints: config.formatMapping,
      respectConstraints: config.respectConstraints,
      resolveRef: (ref) => {
        const target = refToSchemaName(ref);
        if (!target) return null;
        if (target === schemaName || reaches(target, schemaName)) {
          return $.literal(null);
        }
        return $(schemaToFactoryName(target)).call();
      },
    });

    const factoryFn = $.func().do($.return(body));
    const statement = $.const(factorySymbol).export().assign(factoryFn);
    plugin.node(statement);

    generatedFactories.push(schemaName);
  });

  if (config.generateBatchCreators && generatedFactories.length > 0) {
    generateBatchCreators({
      plugin,
      outputFile,
      schemaNames: generatedFactories,
      faker,
      defaultCount: config.defaultBatchCount,
    });
  }
};

function generateBatchCreators({
  plugin,
  outputFile,
  schemaNames,
  faker,
  defaultCount,
}: {
  plugin: FakerPluginInstance;
  outputFile: string;
  schemaNames: string[];
  faker: FakerSymbol;
  defaultCount: number;
}): void {
  for (const schemaName of schemaNames) {
    const factoryName = schemaToFactoryName(schemaName);
    const batchFactoryName = schemaToBatchFactoryName(schemaName);

    const batchSymbol = plugin.symbol(batchFactoryName, {
      getFilePath: () => outputFile,
    });

    const countExpr = $.binary($.id("count"), "??", $.literal(defaultCount));
    const batchCall = $(faker)
      .attr("helpers")
      .attr("multiple")
      .call($.id(factoryName), $.object().prop("count", countExpr));

    const batchFn = $.func()
      .param("count", (p) => p.type($.type.expr("number")).optional())
      .do($.return(batchCall));

    const statement = $.const(batchSymbol).export().assign(batchFn);
    plugin.node(statement);
  }
}
