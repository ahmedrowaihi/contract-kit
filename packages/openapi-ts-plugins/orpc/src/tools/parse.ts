import { Logger, Project } from "@hey-api/codegen-core";
import { Context, getParser, type IR, parseOpenApiSpec } from "@hey-api/shared";

/**
 * Parse an OpenAPI spec (2.0, 3.0, or 3.1) into hey-api's normalized IR.
 */
export function parseSpec(spec: Record<string, unknown>): IR.Model {
  const context = new Context({
    config: {
      dryRun: true,
      parser: getParser({}),
      plugins: {},
      pluginOrder: [],
    } as unknown as ConstructorParameters<typeof Context>[0]["config"],
    dependencies: {},
    logger: new Logger(),
    project: new Project({ root: "" }),
    spec,
  });
  parseOpenApiSpec(context);
  return context.ir;
}

export type { IR };
