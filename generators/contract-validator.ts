/**
 * Standard validator API contract builders.
 * Works with any hey-api validator plugin (zod, valibot, arktype)
 * that exposes the `createRequestSchema` API.
 */

import { $ } from "@hey-api/openapi-ts";
import type { IR } from "@hey-api/shared";
import { operationResponsesMap } from "@hey-api/shared";

import type { ORPCPlugin } from "../types";

function getValidatorPlugin(
  plugin: ORPCPlugin["Instance"],
  validatorName: string,
): ReturnType<ORPCPlugin["Instance"]["getPlugin"]> {
  return plugin.getPlugin(validatorName as any);
}

export function buildValidatorInput(
  plugin: ORPCPlugin["Instance"],
  operation: IR.OperationObject,
): { expr: any; useDetailedMode: boolean } | null {
  const { input } = plugin.config.validator;
  if (!input || input === "typia") return null;

  const validatorPlugin = getValidatorPlugin(plugin, input);
  const validatorApi = validatorPlugin?.api as
    | Record<string, Function>
    | undefined;
  if (!validatorApi || !("createRequestSchema" in validatorApi)) return null;

  /**
   * oRPC detailed mode expects "params" for path parameters, not "path".
   * hey-api's createRequestSchema uses "path" as the layer key by default.
   * Use the `as` option to rename the output key to match oRPC's convention.
   */
  const requestSchema = validatorApi.createRequestSchema({
    layers: {
      body: { whenEmpty: "omit" },
      headers: { whenEmpty: "omit" },
      path: { whenEmpty: "omit", as: "params" },
      query: { whenEmpty: "omit" },
    },
    operation,
    plugin: validatorPlugin,
  });
  if (!requestSchema) return null;

  return { expr: requestSchema, useDetailedMode: true };
}

export function buildValidatorOutput(
  plugin: ORPCPlugin["Instance"],
  operationId: string,
): any | null {
  const { output } = plugin.config.validator;
  if (!output || output === "typia") return null;

  return plugin.referenceSymbol({
    category: "schema",
    resource: "operation",
    resourceId: operationId,
    role: "responses",
    tool: output,
  });
}

export function buildValidatorErrorMap(
  plugin: ORPCPlugin["Instance"],
  operation: IR.OperationObject,
): any | null {
  const { input } = plugin.config.validator;
  if (!input || input === "typia") return null;

  const { errors: errorsSchema } = operationResponsesMap(operation);
  if (!errorsSchema?.properties) return null;

  let errorMapObj = $.object().pretty();
  let hasErrors = false;

  for (const statusCode in errorsSchema.properties) {
    const errorResponseSchema = errorsSchema.properties[statusCode];
    if (!errorResponseSchema?.$ref) continue;

    const errorSchema = plugin.querySymbol({
      resource: "definition",
      resourceId: errorResponseSchema.$ref,
      tool: input,
    });
    if (errorSchema) {
      errorMapObj = errorMapObj.prop(
        statusCode,
        $.object().prop("data", $(errorSchema)),
      );
      hasErrors = true;
    }
  }

  return hasErrors ? errorMapObj : null;
}
