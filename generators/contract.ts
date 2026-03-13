import { operationResponsesMap } from "@hey-api/shared";
import type { IR } from "@hey-api/shared";
import { $ } from "@hey-api/openapi-ts";

import type { RouterNode } from "../router-organizer";
import { getGroupKey } from "../router-organizer";
import { operationIdToZodSchemaName } from "../utils";
import type { ContractGeneratorInput, ContractGeneratorOutput } from "./types";

/**
 * Generates oRPC contracts from OpenAPI operations.
 * Iterates through all operations and creates contract definitions.
 */
export const generateContracts = ({
  contractFile,
  plugin,
}: ContractGeneratorInput): ContractGeneratorOutput => {
  const routerStructure = new Map<string, RouterNode[]>();
  const oc = plugin.external("@orpc/contract.oc");
  const createValidateSym =
    plugin.config.validation === "typia"
      ? plugin.external("typia.createValidate")
      : null;

  plugin.forEach("operation", (event) => {
    const { operation } = event;
    if (!operation.id) return;

    const operationId = operation.id;
    const method = operation.method.toUpperCase();
    const path = operation.path as string;
    const contractName = `${operationIdToZodSchemaName(operationId)}Contract`;

    const hasInput = !!operation.body || !!operation.parameters;
    const hasOutput = !!operation.responses;

    let successStatus: number | undefined;
    let successDescription: string | undefined;

    if (operation.responses) {
      const pathItem = plugin.context.spec.paths?.[operation.path];
      const openApiOperation = pathItem?.[operation.method];
      const responses = openApiOperation?.responses;

      for (const statusCode in operation.responses) {
        const numericStatus = Number.parseInt(statusCode, 10);
        if (numericStatus >= 200 && numericStatus < 300) {
          successStatus = numericStatus;
          if (responses) {
            const response = responses[statusCode];
            if (response && "$ref" in response) {
              const resolved = plugin.context.resolveRef(response.$ref) as {
                description?: string;
              };
              successDescription = resolved?.description;
            } else if (response && "description" in response) {
              successDescription = response.description;
            }
          }
        }
      }
    }

    const groupMode = plugin.config.group;
    const groupKey = getGroupKey(operation, groupMode);
    const contractFilePath =
      groupMode === "flat"
        ? contractFile
        : `${plugin.name}/${groupKey}/contract`;

    const symbol = plugin.symbol(contractName, {
      getFilePath: () => contractFilePath,
      meta: {
        category: "contract",
        resource: "operation",
        resourceId: operationId,
        tool: "orpc",
      },
    });

    let routeObj = $.object()
      .pretty()
      .prop("method", $.literal(method))
      .prop("path", $.literal(path));
    if (operation.operationId)
      routeObj = routeObj.prop("operationId", $.literal(operation.operationId));
    if (operation.summary)
      routeObj = routeObj.prop("summary", $.literal(operation.summary));
    if (operation.description)
      routeObj = routeObj.prop("description", $.literal(operation.description));
    if (operation.deprecated)
      routeObj = routeObj.prop("deprecated", $.literal(true));
    if (operation.tags)
      routeObj = routeObj.prop(
        "tags",
        $.fromValue([...new Set(operation.tags)]),
      );
    if (successStatus !== undefined)
      routeObj = routeObj.prop("successStatus", $.literal(successStatus));
    if (successDescription)
      routeObj = routeObj.prop(
        "successDescription",
        $.literal(successDescription),
      );

    const validation = plugin.config.validation;
    const mode = plugin.config.mode;

    const isGetOrDelete =
      operation.method === "get" || operation.method === "delete";
    const hasPathParams =
      !!operation.parameters?.path &&
      Object.keys(operation.parameters.path).length > 0;
    const hasQueryParams =
      !!operation.parameters?.query &&
      Object.keys(operation.parameters.query).length > 0;
    const hasBody = !!(operation.body && !isGetOrDelete);
    const bodyIsObject =
      hasBody && operation.body?.mediaType === "application/json";

    let useDetailedMode = mode === "detailed";
    let inputExpr: any;

    if (hasInput) {
      const result =
        validation === "typia" && createValidateSym
          ? buildTypiaInput(
              plugin,
              operationId,
              mode,
              createValidateSym,
              isGetOrDelete,
              hasPathParams,
              hasQueryParams,
              bodyIsObject,
              !!operation.body?.required,
            )
          : buildZodInput(
              plugin,
              operationId,
              mode,
              operation,
              isGetOrDelete,
              hasBody,
              hasPathParams,
              hasQueryParams,
              bodyIsObject,
            );

      if (result) {
        inputExpr = result.expr;
        useDetailedMode = result.useDetailedMode;
      }
    }

    if (useDetailedMode && hasInput) {
      routeObj = routeObj.prop("inputStructure", $.literal("detailed"));
    }

    let contractExpr: any = $(oc).attr("route").call(routeObj);

    if (inputExpr) contractExpr = contractExpr.attr("input").call(inputExpr);

    if (hasOutput) {
      const outputExpr =
        validation === "typia" && createValidateSym
          ? buildTypiaOutput(plugin, operationId, createValidateSym)
          : buildZodOutput(plugin, operationId);

      if (outputExpr)
        contractExpr = contractExpr.attr("output").call(outputExpr);
    }

    if (validation === "zod") {
      const errorMap = buildZodErrorMap(plugin, operation);
      if (errorMap) contractExpr = contractExpr.attr("errors").call(errorMap);
    }

    plugin.node($.const(symbol).export().assign(contractExpr));

    const operationName = operation.operationId || operationId;
    if (!routerStructure.has(groupKey)) routerStructure.set(groupKey, []);
    routerStructure
      .get(groupKey)!
      .push({ contractName, contractSymbol: symbol, operation, operationName });
  });

  return { routerStructure };
};

function buildTypiaSchemaExpr(typeExpr: any, createValidateSym: any) {
  return $(createValidateSym).call().generic(typeExpr);
}

function nonNullable(typeExpr: any) {
  return $.type("NonNullable").generic(typeExpr);
}

function typeIdx(sym: any, key: string) {
  return $.type.idx($.type(sym), $.type.literal(key));
}

function buildTypiaInput(
  plugin: any,
  operationId: string,
  mode: string,
  createValidateSym: any,
  isGetOrDelete: boolean,
  hasPathParams: boolean,
  hasQueryParams: boolean,
  bodyIsObject: boolean,
  bodyRequired: boolean,
): { expr: any; useDetailedMode: boolean } | null {
  const dataTypeSym = plugin.querySymbol({
    resource: "operation",
    resourceId: operationId,
    role: "data",
    tool: "typescript",
  });
  if (!dataTypeSym) return null;

  if (mode === "detailed") {
    const omitType = $.type("Omit")
      .generic($.type(dataTypeSym))
      .generic($.type.literal("url"));
    return {
      expr: buildTypiaSchemaExpr(omitType, createValidateSym),
      useDetailedMode: true,
    };
  }

  const typeParts: any[] = [];
  if (bodyIsObject) {
    const bodyType = typeIdx(dataTypeSym, "body");
    typeParts.push(bodyRequired ? bodyType : nonNullable(bodyType));
  }
  if (hasPathParams) typeParts.push(typeIdx(dataTypeSym, "path"));
  if (hasQueryParams && isGetOrDelete)
    typeParts.push(nonNullable(typeIdx(dataTypeSym, "query")));

  if (typeParts.length > 0) {
    const combined =
      typeParts.length === 1 ? typeParts[0] : $.type.and(...typeParts);
    return {
      expr: buildTypiaSchemaExpr(combined, createValidateSym),
      useDetailedMode: false,
    };
  }

  const omitType = $.type("Omit")
    .generic($.type(dataTypeSym))
    .generic($.type.literal("url"));
  return {
    expr: buildTypiaSchemaExpr(omitType, createValidateSym),
    useDetailedMode: true,
  };
}

function buildTypiaOutput(
  plugin: any,
  operationId: string,
  createValidateSym: any,
): any | null {
  const responseTypeSym = plugin.querySymbol({
    resource: "operation",
    resourceId: operationId,
    role: "responses",
    tool: "typescript",
  });
  if (!responseTypeSym) return null;
  const flattenedType = $.type(responseTypeSym).idx(
    $.type(responseTypeSym).keyof(),
  );
  return buildTypiaSchemaExpr(flattenedType, createValidateSym);
}

function buildZodInput(
  plugin: any,
  operationId: string,
  mode: string,
  operation: IR.OperationObject,
  isGetOrDelete: boolean,
  hasBody: boolean,
  hasPathParams: boolean,
  hasQueryParams: boolean,
  bodyIsObject: boolean,
): { expr: any; useDetailedMode: boolean } | null {
  const inputSchema = plugin.querySymbol({
    resource: "operation",
    resourceId: operationId,
    role: "data",
    tool: "zod",
  });
  if (!inputSchema) return null;

  if (mode === "detailed")
    return { expr: $(inputSchema), useDetailedMode: true };

  const hasRequiredParam = (
    params: Record<string, IR.ParameterObject> | undefined,
  ) => (params ? Object.values(params).some((p) => p.required) : false);

  const canMerge =
    bodyIsObject ||
    (!hasBody && hasPathParams && !hasQueryParams) ||
    (!hasBody && !hasPathParams && hasQueryParams && isGetOrDelete) ||
    (!hasBody && hasPathParams && hasQueryParams && isGetOrDelete);

  if (!canMerge) {
    if (hasBody || hasPathParams || (hasQueryParams && isGetOrDelete)) {
      return { expr: $(inputSchema), useDetailedMode: true };
    }
    return null;
  }

  const parts: any[] = [];
  if (bodyIsObject) {
    const bodyExpr = $(inputSchema).attr("shape").attr("body");
    parts.push(
      operation.body!.required ? bodyExpr : bodyExpr.attr("unwrap").call(),
    );
  }
  if (hasPathParams) {
    const pathExpr = $(inputSchema).attr("shape").attr("path");
    parts.push(
      hasRequiredParam(operation.parameters!.path)
        ? pathExpr
        : pathExpr.attr("unwrap").call(),
    );
  }
  if (hasQueryParams && isGetOrDelete) {
    const queryExpr = $(inputSchema).attr("shape").attr("query");
    parts.push(
      hasRequiredParam(operation.parameters!.query)
        ? queryExpr
        : queryExpr.attr("unwrap").call(),
    );
  }

  const expr =
    parts.length === 1
      ? parts[0]
      : parts
          .slice(1)
          .reduce((acc, part) => acc.attr("merge").call(part), parts[0]);

  return { expr, useDetailedMode: false };
}

function buildZodOutput(plugin: any, operationId: string): any | null {
  const outputSchema = plugin.querySymbol({
    resource: "operation",
    resourceId: operationId,
    role: "responses",
    tool: "zod",
  });
  return outputSchema ? $(outputSchema) : null;
}

function buildZodErrorMap(
  plugin: any,
  operation: IR.OperationObject,
): any | null {
  const { errors: errorsSchema } = operationResponsesMap(operation);
  if (!errorsSchema?.properties) return null;

  let errorMapObj = $.object().pretty();
  let hasErrors = false;

  for (const statusCode in errorsSchema.properties) {
    const errorResponseSchema = errorsSchema.properties[statusCode];
    if (!errorResponseSchema?.$ref) continue;

    const zodErrorSchema = plugin.querySymbol({
      resource: "definition",
      resourceId: errorResponseSchema.$ref,
      tool: "zod",
    });
    if (zodErrorSchema) {
      errorMapObj = errorMapObj.prop(
        statusCode,
        $.object().prop("data", $(zodErrorSchema)),
      );
      hasErrors = true;
    }
  }

  return hasErrors ? errorMapObj : null;
}
