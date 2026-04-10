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
  bodyIsFile = false,
): { expr: any; useDetailedMode: boolean } | null {
  const { input } = plugin.config.validator;
  if (!input || input === "typia") return null;

  const validatorPlugin = getValidatorPlugin(plugin, input);
  const validatorApi = validatorPlugin?.api as
    | Record<string, Function>
    | undefined;
  const hasCreateRequestSchema =
    !!validatorApi && "createRequestSchema" in validatorApi;

  /**
   * oRPC detailed mode expects "params" for path parameters, not "path".
   * hey-api's createRequestSchema uses "path" as the layer key by default.
   * Use the `as` option to rename the output key to match oRPC's convention.
   *
   * For binary/multipart bodies, skip the body layer — hey-api's zod plugin
   * generates z.string() for binary fields, which prevents oRPC from
   * recognising file uploads. We replace it with oz.file() below.
   */
  const requestSchema = hasCreateRequestSchema
    ? validatorApi!.createRequestSchema({
        layers: {
          body: bodyIsFile ? false : { whenEmpty: "omit" },
          headers: { whenEmpty: "omit" },
          path: { whenEmpty: "omit", as: "params" },
          query: { whenEmpty: "omit" },
        },
        operation,
        plugin: validatorPlugin,
      })
    : null;

  if (bodyIsFile) {
    return buildFileInput(plugin, operation, input, requestSchema);
  }

  if (!requestSchema) return null;

  return { expr: requestSchema, useDetailedMode: true };
}

/**
 * Return the validator-specific file schema expression that oRPC can
 * recognise at the transport layer to enable automatic FormData
 * serialisation (client) and multipart parsing (server).
 *
 * Each validator uses its own file primitive:
 *   zod v4  → z.file()   from zod          (native)
 *   zod v3  → oz.file()  from @orpc/zod
 *   valibot → v.file()   from valibot       (native)
 *
 * Returns `null` when the validator has no known file schema so the
 * caller can skip input generation rather than emit broken code.
 */
function fileSchemaExpr(
  plugin: ORPCPlugin["Instance"],
  validatorName: string,
): any | null {
  switch (validatorName) {
    case "zod": {
      const zodPlugin = getValidatorPlugin(plugin, "zod");
      const compat = (
        zodPlugin?.config as
          | { compatibilityVersion?: 3 | 4 | "mini" }
          | undefined
      )?.compatibilityVersion;

      if (compat === 4) {
        // Zod v4 has native z.file()
        const z = plugin.external("zod.z");
        return $(z).attr("file").call();
      }
      // Zod v3 / mini — use oz.file() from @orpc/zod
      const oz = plugin.external("@orpc/zod.oz");
      return $(oz).attr("file").call();
    }
    case "valibot": {
      const v = plugin.external("valibot.*");
      return $(v).attr("file").call();
    }
    default:
      return null;
  }
}

/**
 * Build input schema for file/binary body operations.
 *
 * When `createRequestSchema` is available the non-body layers
 * (params, query, headers) come from it and we extend with the
 * file schema; otherwise we emit the file schema in compact mode —
 * path/query params are still handled by oRPC's route matching.
 */
function buildFileInput(
  plugin: ORPCPlugin["Instance"],
  operation: IR.OperationObject,
  validatorName: string,
  requestSchema: any | null,
): { expr: any; useDetailedMode: boolean } | null {
  const fileExpr = fileSchemaExpr(plugin, validatorName);
  if (!fileExpr) return null;

  const bodyExpr = operation.body?.required
    ? fileExpr
    : fileExpr.attr("optional").call();

  if (requestSchema) {
    // createRequestSchema gave us params/query/headers — extend with file body
    return {
      expr: $(requestSchema)
        .attr("extend")
        .call($.object().prop("body", bodyExpr)),
      useDetailedMode: true,
    };
  }

  // createRequestSchema not available — use file schema directly.
  // Path/query params are still enforced by oRPC's route definition.
  return { expr: bodyExpr, useDetailedMode: false };
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
