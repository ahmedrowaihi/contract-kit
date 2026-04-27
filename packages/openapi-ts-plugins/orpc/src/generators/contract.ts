/**
 * Generates oRPC contracts from OpenAPI operations.
 * Input/output schemas come from the configured validator plugin via its
 * standard `createRequestSchema` / symbol-lookup API — identical code path
 * for zod, valibot, arktype, and typia.
 */

import { $ } from "@hey-api/openapi-ts";
import type { IR } from "@hey-api/shared";
import { escapeComment } from "@hey-api/shared";

import type { RouterNode } from "../router-organizer";
import { getGroupKey } from "../router-organizer";
import { contractName as toContractName } from "../utils";
import {
  buildValidatorErrorMap,
  buildValidatorInput,
  buildValidatorOutput,
  classifyBody,
} from "./contract-validator";
import type { ContractGeneratorInput, ContractGeneratorOutput } from "./types";

export const generateContracts = ({
  contractFile,
  plugin,
}: ContractGeneratorInput): ContractGeneratorOutput => {
  const routerStructure = new Map<string, RouterNode[]>();
  const oc = plugin.external("@orpc/contract.oc");
  const { input: inputValidator, output: outputValidator } =
    plugin.config.validator;

  plugin.forEach(
    "operation",
    (event) => {
      const { operation } = event;
      if (!operation.id) return;

      const operationId = operation.id;
      const method = operation.method.toUpperCase();
      const path = operation.path as string;
      const contractName = `${toContractName(operationId, plugin.config.naming.contract)}Contract`;

      const hasInput = !!operation.body || !!operation.parameters;
      let hasOutput = false;
      if (operation.responses) {
        for (const [statusCode, response] of Object.entries(
          operation.responses,
        )) {
          const code = Number.parseInt(statusCode, 10);
          if (
            code >= 200 &&
            code <= 399 &&
            response?.mediaType &&
            response?.schema
          ) {
            hasOutput = true;
            break;
          }
        }
      }

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
        routeObj = routeObj.prop(
          "operationId",
          $.literal(operation.operationId),
        );
      if (operation.summary)
        routeObj = routeObj.prop("summary", $.literal(operation.summary));
      if (operation.description)
        routeObj = routeObj.prop(
          "description",
          $.literal(operation.description),
        );
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

      const mode = plugin.config.mode;

      const isGetOrDelete =
        operation.method === "get" || operation.method === "delete";
      const hasBody = !!(operation.body && !isGetOrDelete);
      const bodyKind = hasBody
        ? classifyBody(operation.body?.mediaType)
        : ("other" as const);

      let useDetailedMode = mode === "detailed";
      let inputExpr: any;

      if (hasInput && inputValidator) {
        const result = buildValidatorInput(plugin, operation, bodyKind);
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

      if (hasOutput && outputValidator) {
        const outputExpr = buildValidatorOutput(plugin, operationId);
        if (outputExpr) contractExpr = contractExpr.attr("output").call(outputExpr);
      }

      if (inputValidator) {
        const errorMap = buildValidatorErrorMap(plugin, operation);
        if (errorMap) contractExpr = contractExpr.attr("errors").call(errorMap);
      }

      const comment = plugin.config.comments
        ? createOperationComment(operation)
        : undefined;
      plugin.node(
        $.const(symbol)
          .export()
          .$if(comment, (n, v) => n.doc(v))
          .assign(contractExpr),
      );

      const operationName = operation.operationId || operationId;
      if (!routerStructure.has(groupKey)) routerStructure.set(groupKey, []);
      routerStructure.get(groupKey)!.push({
        contractName,
        contractSymbol: symbol,
        operation,
        operationName,
      });
    },
    { order: "declarations" },
  );

  return { routerStructure };
};

function createOperationComment(
  operation: IR.OperationObject,
): string[] | undefined {
  const comments: string[] = [];
  if (operation.summary) comments.push(escapeComment(operation.summary));
  if (operation.description) {
    if (comments.length) comments.push("");
    comments.push(escapeComment(operation.description));
  }
  if (operation.deprecated) {
    if (comments.length) comments.push("");
    comments.push("@deprecated");
  }
  return comments.length ? comments : undefined;
}
