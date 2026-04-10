/**
 * Standard validator API contract builders.
 * Works with any hey-api validator plugin (zod, valibot, arktype)
 * that exposes the `createRequestSchema` API.
 */

import { $ } from "@hey-api/openapi-ts";
import type { IR } from "@hey-api/shared";
import { operationResponsesMap } from "@hey-api/shared";

import type { ORPCPlugin } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Plugin = ORPCPlugin["Instance"];
type InputResult = { expr: any; useDetailedMode: boolean };

export type BodyKind = "json" | "raw-file" | "multipart" | "other";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Classify the body media-type so callers don't pass loose booleans. */
export function classifyBody(mediaType: string | undefined): BodyKind {
  switch (mediaType) {
    case "application/json":
      return "json";
    case "application/octet-stream":
      return "raw-file";
    case "multipart/form-data":
      return "multipart";
    default:
      return "other";
  }
}

/** Build a validator-backed `.input()` expression for a contract. */
export function buildValidatorInput(
  plugin: Plugin,
  operation: IR.OperationObject,
  bodyKind: BodyKind,
): InputResult | null {
  const validatorName = plugin.config.validator.input;
  if (!validatorName || validatorName === "typia") return null;

  const requestSchema = callCreateRequestSchema(
    plugin,
    validatorName,
    operation,
    bodyKind,
  );

  switch (bodyKind) {
    case "raw-file":
      return patchRawFileBody(plugin, validatorName, operation, requestSchema);
    case "multipart":
      return patchMultipartBody(
        plugin,
        validatorName,
        operation,
        requestSchema,
      );
    default:
      return requestSchema
        ? { expr: requestSchema, useDetailedMode: true }
        : null;
  }
}

export function buildValidatorOutput(
  plugin: Plugin,
  operationId: string,
): any | null {
  const validatorName = plugin.config.validator.output;
  if (!validatorName || validatorName === "typia") return null;

  return plugin.referenceSymbol({
    category: "schema",
    resource: "operation",
    resourceId: operationId,
    role: "responses",
    tool: validatorName,
  });
}

export function buildValidatorErrorMap(
  plugin: Plugin,
  operation: IR.OperationObject,
): any | null {
  const validatorName = plugin.config.validator.input;
  if (!validatorName || validatorName === "typia") return null;

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
      tool: validatorName,
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

// ---------------------------------------------------------------------------
// createRequestSchema wrapper
// ---------------------------------------------------------------------------

/**
 * Call the validator plugin's `createRequestSchema` API when available.
 * For raw-file bodies the body layer is skipped (replaced later with z.file()).
 * For multipart the body layer is kept so field names are preserved.
 */
function callCreateRequestSchema(
  plugin: Plugin,
  validatorName: string,
  operation: IR.OperationObject,
  bodyKind: BodyKind,
): any | null {
  const validatorPlugin = plugin.getPlugin(validatorName as any);
  const api = validatorPlugin?.api as Record<string, Function> | undefined;
  if (!api || !("createRequestSchema" in api)) return null;

  return api.createRequestSchema({
    layers: {
      body: bodyKind === "raw-file" ? false : { whenEmpty: "omit" },
      headers: { whenEmpty: "omit" },
      path: { whenEmpty: "omit", as: "params" },
      query: { whenEmpty: "omit" },
    },
    operation,
    plugin: validatorPlugin,
  });
}

// ---------------------------------------------------------------------------
// File schema helpers
// ---------------------------------------------------------------------------

/**
 * Produce the validator-native file schema expression oRPC can detect.
 *
 *   zod v4  → z.file()          (native)
 *   zod v3  → oz.file()         (@orpc/zod)
 *   valibot → v.file()          (native)
 *
 * Returns null for unknown validators.
 */
function fileSchemaExpr(plugin: Plugin, validatorName: string): any | null {
  if (validatorName === "zod") {
    const zodPlugin = plugin.getPlugin("zod" as any);
    const compat = (
      zodPlugin?.config as { compatibilityVersion?: 3 | 4 | "mini" } | undefined
    )?.compatibilityVersion;

    if (compat === 4) {
      return $(plugin.external("zod.z")).attr("file").call();
    }
    return $(plugin.external("@orpc/zod.oz")).attr("file").call();
  }

  if (validatorName === "valibot") {
    return $(plugin.external("valibot.*")).attr("file").call();
  }

  return null;
}

/** Wrap a file expression with `.optional()` when the field isn't required. */
function optionalFile(fileExpr: any, required: boolean): any {
  return required ? fileExpr : fileExpr.attr("optional").call();
}

// ---------------------------------------------------------------------------
// Body patching strategies
// ---------------------------------------------------------------------------

/**
 * application/octet-stream — body IS the file.
 * Replace the entire body layer with z.file() / oz.file().
 */
function patchRawFileBody(
  plugin: Plugin,
  validatorName: string,
  operation: IR.OperationObject,
  requestSchema: any | null,
): InputResult | null {
  const file = fileSchemaExpr(plugin, validatorName);
  if (!file) return null;

  const body = optionalFile(file, !!operation.body?.required);

  if (requestSchema) {
    return {
      expr: $(requestSchema).attr("extend").call($.object().prop("body", body)),
      useDetailedMode: true,
    };
  }

  // createRequestSchema unavailable — compact mode with just the file.
  return { expr: body, useDetailedMode: false };
}

/**
 * multipart/form-data — body is an object with named fields.
 * Only the `format: "binary"` properties are patched to z.file();
 * every other field and the object wrapper are preserved.
 */
function patchMultipartBody(
  plugin: Plugin,
  validatorName: string,
  operation: IR.OperationObject,
  requestSchema: any | null,
): InputResult | null {
  if (!requestSchema) return null;

  const bodyProps = operation.body?.schema?.properties;
  if (!bodyProps) return { expr: requestSchema, useDetailedMode: true };

  const file = fileSchemaExpr(plugin, validatorName);
  if (!file) return { expr: requestSchema, useDetailedMode: true };

  // Build an .extend() object with only the binary fields replaced.
  const requiredFields = operation.body?.schema?.required;
  let overrides = $.object();
  let count = 0;

  for (const [name, schema] of Object.entries(bodyProps)) {
    if (schema.format !== "binary") continue;
    const isRequired =
      Array.isArray(requiredFields) && requiredFields.includes(name);
    overrides = overrides.prop(name, optionalFile(file, isRequired));
    count++;
  }

  if (count === 0) return { expr: requestSchema, useDetailedMode: true };

  // Reference the body schema symbol, then .extend() only the binary fields.
  const bodySym = plugin.referenceSymbol({
    category: "schema",
    resource: "operation",
    resourceId: operation.id!,
    role: "request-body",
    tool: validatorName,
  });

  if (!bodySym) return { expr: requestSchema, useDetailedMode: true };

  const patchedBody = $(bodySym).attr("extend").call(overrides);
  return {
    expr: $(requestSchema)
      .attr("extend")
      .call($.object().prop("body", patchedBody)),
    useDetailedMode: true,
  };
}
