import { $ } from "@hey-api/openapi-ts";
import { buildFakerExpression } from "@ahmedrowaihi/openapi-ts-faker/core";
import type { ResponseSchemaInfo } from "@ahmedrowaihi/openapi-ts-faker/core";

import type { RouterNode } from "../router-organizer";
import { operationName } from "../utils";
import type { GeneratorContext } from "./types";

export interface FakerGeneratorInput {
  plugin: GeneratorContext["plugin"];
  routerStructure: Map<string, RouterNode[]>;
  responseSchemas: Map<string, ResponseSchemaInfo>;
}

export interface FakerGeneratorOutput {
  factoryNames: Map<string, string>;
}

export const generateFakerFactories = ({
  plugin,
  routerStructure,
  responseSchemas,
}: FakerGeneratorInput): FakerGeneratorOutput => {
  const faker = plugin.external("@faker-js/faker.faker");
  const factoryNames = new Map<string, string>();

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
          obj = obj.prop(key, buildFakerExpression(faker, info));
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
