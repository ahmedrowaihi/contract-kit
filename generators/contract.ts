import { operationResponsesMap } from "@hey-api/shared";

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

  plugin.forEach("operation", (event) => {
    const { operation } = event;
    if (!operation.id) return;

    const operationId = operation.id;
    const method = operation.method.toUpperCase();
    const path = operation.path as string;
    const zodSchemaName = operationIdToZodSchemaName(operationId);
    const contractName = `${zodSchemaName}Contract`;

    const hasInput = !!operation.body || !!operation.parameters;
    const hasOutput = !!operation.responses;

    let successStatus: undefined | number;
    let successDescription: undefined | string;

    // Extract success status and description
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
              const resolved = plugin.context.resolveRef(response.$ref) as any;
              successDescription = resolved?.description;
            } else if (response && "description" in response) {
              successDescription = response.description;
            }
          }
        }
      }
    }

    // Compute group key early so we can use it for file placement
    const groupMode = plugin.config.group;
    const groupKey = getGroupKey(operation, groupMode);
    const contractFilePath =
      groupMode === "flat"
        ? contractFile
        : `${plugin.name}/${groupKey}/contract`;

    // Register contract symbol
    const symbol = plugin.symbol(contractName, {
      getFilePath: () => contractFilePath,
      meta: {
        category: "contract",
        resource: "operation",
        resourceId: operationId,
        tool: "orpc",
      },
    });

    // Build route metadata
    let routeObj = $.object()
      .pretty()
      .prop("method", $.literal(method))
      .prop("path", $.literal(path));

    if (operation.operationId) {
      routeObj = routeObj.prop("operationId", $.literal(operation.operationId));
    }

    if (operation.summary) {
      routeObj = routeObj.prop("summary", $.literal(operation.summary));
    }

    if (operation.description) {
      routeObj = routeObj.prop("description", $.literal(operation.description));
    }

    if (operation.deprecated) {
      routeObj = routeObj.prop("deprecated", $.literal(true));
    }

    if (operation.tags) {
      const uniqueTags = [...new Set(operation.tags)];
      routeObj = routeObj.prop("tags", $.fromValue(uniqueTags));
    }

    if (successStatus !== undefined) {
      routeObj = routeObj.prop("successStatus", $.literal(successStatus));
    }

    if (successDescription) {
      routeObj = routeObj.prop(
        "successDescription",
        $.literal(successDescription),
      );
    }

    // Build input schema first to determine if we need detailed mode
    const mode = plugin.config.mode;
    let useDetailedMode = mode === "detailed";
    let contractExpr: any;

    // Build input schema
    if (hasInput) {
      const inputSchema = plugin.querySymbol({
        resource: "operation",
        resourceId: operationId,
        role: "data",
        tool: "zod",
      });

      if (inputSchema) {
        if (mode === "detailed") {
          // Detailed mode: { params, query, headers, body }
          contractExpr = $(inputSchema);
        } else {
          // Compact mode: merge path + body (POST/PUT/PATCH) or path + query (GET/DELETE)
          // Headers are NOT included in compact mode

          // Helper to check if any parameter in a location is required
          const hasRequiredParam = (
            params: Record<string, any> | undefined,
          ) => {
            if (!params) return false;
            return Object.values(params).some((p: any) => p.required);
          };

          const isGetOrDelete =
            operation.method === "get" || operation.method === "delete";
          const hasPathParams =
            operation.parameters?.path &&
            Object.keys(operation.parameters.path).length > 0;
          const hasQueryParams =
            operation.parameters?.query &&
            Object.keys(operation.parameters.query).length > 0;
          const hasBody = operation.body && !isGetOrDelete;

          // Check if body is an object schema that can be merged
          // If body exists but is NOT application/json or has no schema property, it's likely a file/string
          const bodyIsObject =
            hasBody && operation.body?.mediaType === "application/json";

          // Determine if we can use compact mode (merge all parts)
          const canMerge =
            bodyIsObject ||
            (!hasBody && hasPathParams && !hasQueryParams) ||
            (!hasBody && !hasPathParams && hasQueryParams && isGetOrDelete) ||
            (!hasBody && hasPathParams && hasQueryParams && isGetOrDelete);

          if (canMerge) {
            // Compact mode: merge all input parts into a flat object
            const parts = [];

            // Add body if it's an object
            if (bodyIsObject) {
              const bodyExpr = $(inputSchema).attr("shape").attr("body");
              parts.push(
                operation.body!.required
                  ? bodyExpr
                  : bodyExpr.attr("unwrap").call(),
              );
            }

            // Add path params
            if (hasPathParams) {
              const pathExpr = $(inputSchema).attr("shape").attr("path");
              parts.push(
                hasRequiredParam(operation.parameters!.path)
                  ? pathExpr
                  : pathExpr.attr("unwrap").call(),
              );
            }

            // Add query params for GET/DELETE
            if (hasQueryParams && isGetOrDelete) {
              const queryExpr = $(inputSchema).attr("shape").attr("query");
              parts.push(
                hasRequiredParam(operation.parameters!.query)
                  ? queryExpr
                  : queryExpr.attr("unwrap").call(),
              );
            }

            // Merge all parts or use single part directly
            contractExpr =
              parts.length === 1
                ? parts[0]
                : parts
                    .slice(1)
                    .reduce<any>(
                      (acc, part) => acc.attr("merge").call(part),
                      parts[0]!,
                    );
          } else if (
            hasBody ||
            hasPathParams ||
            (hasQueryParams && isGetOrDelete)
          ) {
            // Detailed mode: use full structured schema for non-JSON bodies or mixed inputs
            contractExpr = $(inputSchema);
            useDetailedMode = true;
          }
        }
      }
    }

    // Add inputStructure to route config if using detailed mode
    if (useDetailedMode && hasInput) {
      routeObj = routeObj.prop("inputStructure", $.literal("detailed"));
    }

    let finalContractExpr = $(oc).attr("route").call(routeObj);

    // Add input schema if we have one
    if (contractExpr) {
      finalContractExpr = finalContractExpr.attr("input").call(contractExpr);
    }

    contractExpr = finalContractExpr;

    // Build output schema
    if (hasOutput) {
      const outputSchema = plugin.querySymbol({
        resource: "operation",
        resourceId: operationId,
        role: "responses",
        tool: "zod",
      });

      if (outputSchema) {
        contractExpr = contractExpr.attr("output").call($(outputSchema));
      }
    }

    // Build oRPC error map: { status: { data: schema } }
    const { errors: errorsSchema } = operationResponsesMap(operation);

    if (errorsSchema && errorsSchema.properties) {
      let errorMapObj = $.object().pretty();
      let hasErrors = false;

      for (const statusCode in errorsSchema.properties) {
        const errorResponseSchema = errorsSchema.properties[statusCode];

        if (!errorResponseSchema?.$ref) continue;

        // Query the zod schema for this error response
        const zodErrorSchema = plugin.querySymbol({
          resource: "definition",
          resourceId: errorResponseSchema.$ref,
          tool: "zod",
        });

        if (zodErrorSchema) {
          // Wrap in oRPC ErrorMapItem format: { data: schema }
          const errorMapItem = $.object().prop("data", $(zodErrorSchema));
          errorMapObj = errorMapObj.prop(statusCode, errorMapItem);
          hasErrors = true;
        }
      }

      // Only add errors if we actually have error schemas
      if (hasErrors) {
        contractExpr = contractExpr.attr("errors").call(errorMapObj);
      }
    }

    // Generate the contract statement
    const statement = $.const(symbol).export().assign(contractExpr);
    plugin.node(statement);

    // Add to router structure
    const operationName = operation.operationId || operationId;

    if (!routerStructure.has(groupKey)) {
      routerStructure.set(groupKey, []);
    }
    routerStructure.get(groupKey)!.push({
      contractName,
      contractSymbol: symbol,
      operation,
      operationName,
    });
  });

  return { routerStructure };
};
