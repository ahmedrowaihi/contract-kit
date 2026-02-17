import { $ } from "@hey-api/openapi-ts";
import {
  schemaToBatchFactoryName,
  schemaToFactoryName,
  shouldIncludeSchema,
} from "../utils/helpers";
import type { GenerateFactoriesInput } from "./types";

/**
 * Generate faker factory functions from OpenAPI schemas
 */
export const generateFactories = ({
  plugin,
  outputFile,
}: GenerateFactoriesInput): void => {
  const config = plugin.config;
  // Get the faker symbol that was registered in registerExternalSymbols
  const faker = plugin.external("@faker-js/faker.faker");

  // Track generated factories for batch creators
  const generatedFactories: string[] = [];

  // Iterate through all schema definitions
  plugin.forEach("schema", (event) => {
    const { schema, name } = event;

    // Skip non-object schemas
    if (schema.type !== "object") return;

    // Use event.name as the schema name
    if (!name) return;
    const schemaName = name;

    // Check filters
    if (!shouldIncludeSchema(schemaName, config.include, config.exclude)) {
      return;
    }

    // Check custom filter
    if (config.filter && !config.filter(schema)) {
      return;
    }

    const factoryName = schemaToFactoryName(schemaName);

    // Create factory symbol
    const factorySymbol = plugin.symbol(factoryName, {
      getFilePath: () => outputFile,
    });

    // Build factory function body
    const properties = schema.properties || {};
    let factoryObj = $.object().pretty();

    for (const [propName, propSchema] of Object.entries(properties)) {
      if (!propSchema) continue;

      // Generate faker expression for this property
      const fakerExpr = generateFakerExpression(
        propName,
        propSchema,
        faker as any,
      );
      factoryObj = factoryObj.prop(
        propName,
        fakerExpr as Parameters<typeof factoryObj.prop>[1],
      );
    }

    // Simple function that returns the object (no overrides for now to avoid symbol issues)
    const factoryFn = $.func().do($.return(factoryObj));

    // Export the factory
    const statement = $.const(factorySymbol as Parameters<typeof $.const>[0])
      .export()
      .assign(factoryFn);
    plugin.node(statement);

    generatedFactories.push(schemaName);
  });

  // Generate batch creators if enabled
  if (config.generateBatchCreators && generatedFactories.length > 0) {
    generateBatchCreators({
      plugin,
      outputFile,
      schemaNames: generatedFactories,
      faker: faker as any,
    });
  }
};

/**
 * Generate faker expression for a property
 */
function generateFakerExpression(
  propName: string,
  propSchema: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  faker: any,
): unknown {
  const schema = propSchema as {
    type?: string;
    format?: string;
    [key: string]: unknown;
  };
  const type = schema.type;

  // Handle different types
  switch (type) {
    case "string":
      return generateStringExpression(propName, schema, faker);
    case "number":
    case "integer":
      return generateNumberExpression(schema, faker);
    case "boolean":
      return $(faker).attr("datatype").attr("boolean").call();
    case "array":
      return $.array(); // Simplified for now
    default:
      return $(faker).attr("lorem").attr("word").call();
  }
}

/**
 * Generate faker expression for string fields
 */
function generateStringExpression(
  propName: string,
  propSchema: { format?: string; [key: string]: unknown },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  faker: any,
): unknown {
  const format = propSchema.format;
  const normalizedName = propName.toLowerCase().replace(/[_-]/g, "");

  // Check format first
  if (format === "email") {
    return $(faker).attr("internet").attr("email").call();
  }
  if (format === "uri" || format === "url") {
    return $(faker).attr("internet").attr("url").call();
  }
  if (format === "uuid") {
    return $(faker).attr("string").attr("uuid").call();
  }
  if (format === "date-time" || format === "date") {
    return $(faker)
      .attr("date")
      .attr("recent")
      .call()
      .attr("toISOString")
      .call();
  }

  // Check field name patterns
  if (normalizedName.includes("email")) {
    return $(faker).attr("internet").attr("email").call();
  }
  if (normalizedName.includes("name")) {
    return $(faker).attr("person").attr("fullName").call();
  }
  if (normalizedName.includes("phone")) {
    return $(faker).attr("phone").attr("number").call();
  }
  if (normalizedName.includes("url") || normalizedName.includes("website")) {
    return $(faker).attr("internet").attr("url").call();
  }

  // Default to lorem word
  return $(faker).attr("lorem").attr("word").call();
}

/**
 * Generate faker expression for number fields
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateNumberExpression(
  propSchema: {
    type?: string;
    minimum?: number;
    maximum?: number;
    [key: string]: unknown;
  },
  faker: any,
): unknown {
  const isInteger = propSchema.type === "integer";
  const min = propSchema.minimum;
  const max = propSchema.maximum;

  if (min !== undefined || max !== undefined) {
    let args = $.object();
    if (min !== undefined) args = args.prop("min", $.literal(min));
    if (max !== undefined) args = args.prop("max", $.literal(max));

    return $(faker)
      .attr("number")
      .attr(isInteger ? "int" : "float")
      .call(args);
  }

  return $(faker)
    .attr("number")
    .attr(isInteger ? "int" : "float")
    .call();
}

/**
 * Generate batch creator functions
 */
function generateBatchCreators({
  plugin,
  outputFile,
  schemaNames,
  faker,
}: {
  plugin: unknown;
  outputFile: string;
  schemaNames: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Build: faker.helpers.multiple(createMockUser, { count })
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
