import { $ } from "@hey-api/openapi-ts";
import {
  buildFakerExpression,
  type ResponseSchemaInfo,
  type BuildFakerOptions,
  type FieldNameHints,
} from "@ahmedrowaihi/openapi-ts-faker/core";

import type { RouterNode } from "../router-organizer";
import type { FakerHandlerConfig } from "../types";
import { operationName } from "../utils";
import type { GeneratorContext } from "./types";

export interface FakerGeneratorInput {
  plugin: GeneratorContext["plugin"];
  routerStructure: Map<string, RouterNode[]>;
  responseSchemas: Map<string, ResponseSchemaInfo>;
  config?: FakerHandlerConfig;
}

export interface FakerGeneratorOutput {
  factoryNames: Map<string, string>;
}

/**
 * Match the faker plugin's hint-key normalization (case- and separator-
 * insensitive) so users can write `firstName`, `first_name`, `FirstName`, etc.
 * The faker plugin does this in its `resolveConfig` hook; we apply it here
 * because we feed the lib directly without going through that hook.
 */
const normalizeFieldNameHints = (
  hints: FieldNameHints | undefined,
): FieldNameHints | undefined => {
  if (!hints) return undefined;
  const out: FieldNameHints = {};
  for (const [key, value] of Object.entries(hints)) {
    out[key.toLowerCase().replace(/[_-]/g, "")] = value;
  }
  return out;
};

export const generateFakerFactories = ({
  plugin,
  routerStructure,
  responseSchemas,
  config,
}: FakerGeneratorInput): FakerGeneratorOutput => {
  const faker = plugin.external("@faker-js/faker.faker");
  const factoryNames = new Map<string, string>();

  const buildOpts: BuildFakerOptions = {
    fieldHints: normalizeFieldNameHints(config?.fieldNameHints),
    formatHints: config?.formatMapping,
    respectConstraints: config?.respectConstraints ?? true,
  };

  for (const [group, nodes] of routerStructure) {
    const fakerFile = `${plugin.name}/${group}/faker.gen`;

    for (const node of nodes) {
      const opName = operationName(node.operationName);
      const schema = responseSchemas.get(opName);
      const factoryName = `mock${opName.charAt(0).toUpperCase()}${opName.slice(1)}`;

      const symbol = plugin.symbol(factoryName, {
        getFilePath: () => fakerFile,
        meta: {
          category: "faker",
          resource: "factory",
          resourceId: opName,
          tool: "orpc",
        },
      });

      factoryNames.set(opName, factoryName);

      let bodyExpr: any;
      if (schema && Object.keys(schema.properties).length > 0) {
        let obj = $.object().pretty();
        for (const [key, info] of Object.entries(schema.properties)) {
          obj = obj.prop(key, buildFakerExpression(faker, info, buildOpts));
        }
        bodyExpr = obj;
      } else {
        bodyExpr = $.object();
      }

      const factoryFn = $.func().do($.return(bodyExpr));
      const statement = $.const(symbol).export().assign(factoryFn);
      plugin.node(statement);
    }
  }

  return { factoryNames };
};
