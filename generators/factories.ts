import { $ } from "@hey-api/openapi-ts";

import { buildFakerExpression } from "../core/builders";
import type { PropertyInfo } from "../core/types";
import {
  schemaToBatchFactoryName,
  schemaToFactoryName,
  shouldIncludeSchema,
} from "../utils/helpers";
import type { GenerateFactoriesInput } from "./types";

/**
 * Converts an IR schema property to a PropertyInfo for the shared faker builder.
 */
function irToPropertyInfo(propName: string, propSchema: unknown): PropertyInfo {
  const schema = propSchema as {
    type?: string;
    format?: string;
    enum?: (string | number | boolean)[];
    properties?: Record<string, unknown>;
    items?: unknown;
    [key: string]: unknown;
  };

  const info: PropertyInfo = {
    type: schema.type ?? "string",
    format: schema.format,
    name: propName,
  };

  if (schema.enum && schema.enum.length > 0) {
    info.enum = schema.enum;
  }

  if (schema.type === "object" && schema.properties) {
    info.children = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      if (value) info.children[key] = irToPropertyInfo(key, value);
    }
  }

  if (schema.type === "array" && schema.items) {
    info.items = irToPropertyInfo("item", schema.items);
  }

  return info;
}

export const generateFactories = ({
  plugin,
  outputFile,
}: GenerateFactoriesInput): void => {
  const config = plugin.config;
  const faker = plugin.external("@faker-js/faker.faker");

  const generatedFactories: string[] = [];

  plugin.forEach("schema", (event) => {
    const { schema, name } = event;

    if (schema.type !== "object") return;
    if (!name) return;
    const schemaName = name;

    if (!shouldIncludeSchema(schemaName, config.include, config.exclude)) {
      return;
    }

    if (config.filter && !config.filter(schema)) {
      return;
    }

    const factoryName = schemaToFactoryName(schemaName);

    const factorySymbol = plugin.symbol(factoryName, {
      getFilePath: () => outputFile,
    });

    const properties = schema.properties || {};
    let factoryObj = $.object().pretty();

    for (const [propName, propSchema] of Object.entries(properties)) {
      if (!propSchema) continue;

      const propInfo = irToPropertyInfo(propName, propSchema);
      const fakerExpr = buildFakerExpression(faker, propInfo);
      factoryObj = factoryObj.prop(
        propName,
        fakerExpr as Parameters<typeof factoryObj.prop>[1],
      );
    }

    const factoryFn = $.func().do($.return(factoryObj));

    const statement = $.const(factorySymbol as Parameters<typeof $.const>[0])
      .export()
      .assign(factoryFn);
    plugin.node(statement);

    generatedFactories.push(schemaName);
  });

  if (config.generateBatchCreators && generatedFactories.length > 0) {
    generateBatchCreators({
      plugin,
      outputFile,
      schemaNames: generatedFactories,
      faker: faker as any,
    });
  }
};

function generateBatchCreators({
  plugin,
  outputFile,
  schemaNames,
  faker,
}: {
  plugin: unknown;
  outputFile: string;
  schemaNames: string[];
  faker: any;
}): void {
  const pluginInstance = plugin as {
    symbol: (name: string, opts: { getFilePath: () => string }) => unknown;
    node: (node: unknown) => void;
  };

  for (const schemaName of schemaNames) {
    const factoryName = schemaToFactoryName(schemaName);
    const batchFactoryName = schemaToBatchFactoryName(schemaName);

    const batchSymbol = pluginInstance.symbol(batchFactoryName, {
      getFilePath: () => outputFile,
    });

    const countParam = $.id("count");
    const batchCall = $(faker)
      .attr("helpers")
      .attr("multiple")
      .call($.id(factoryName), $.object().prop("count", countParam));

    const batchFn = $.func()
      .param("count", (p) => p.type($.type.expr("number")))
      .do($.return(batchCall));

    const statement = $.const(batchSymbol as Parameters<typeof $.const>[0])
      .export()
      .assign(batchFn);
    pluginInstance.node(statement);
  }
}
