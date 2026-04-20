import { $ } from '@hey-api/openapi-ts';
import { applyNaming, type Casing, type IR, type NameTransformer } from '@hey-api/shared';
import {
  emitBulkJsonSchemas,
  emitJsonSchemaTwin,
  emitValidator,
  registerTypiaSymbol,
} from '../shared/emit';
import {
  buildRequestInputType,
  queryDataTypeSymbol,
  queryErrorsTypeSymbol,
  queryResponseTypeSymbol,
  type RequestInputType,
} from '../shared/operation';
import type { TypiaPlugin } from '../types';

type SlotRole = 'data' | 'response' | `error-${number}`;

type CollectedSlot = {
  comment?: ReadonlyArray<string>;
  operationId: string;
  role: SlotRole;
  tags?: ReadonlyArray<string>;
  typeExpr: RequestInputType;
};

export const handlerV1: TypiaPlugin['Handler'] = ({ plugin }) => {
  plugin.symbol('createValidate', { external: 'typia' });
  plugin.symbol('json', { external: 'typia' });
  plugin.symbol('IValidation', { external: 'typia', kind: 'type' });
  plugin.symbol('StandardSchemaV1', { external: '@standard-schema/spec', kind: 'type' });

  const slots: Array<CollectedSlot> = [];

  plugin.forEach('operation', (event) => {
    const { operation, tags } = event;

    if (plugin.config.requests.enabled) {
      const dataSymbol = queryDataTypeSymbol(plugin, operation);
      if (dataSymbol) {
        slots.push({
          comment: buildOperationComment(operation),
          operationId: operation.id,
          role: 'data',
          tags,
          typeExpr: buildRequestInputType(dataSymbol),
        });
      }
    }

    if (plugin.config.responses.enabled) {
      const responseSymbol = queryResponseTypeSymbol(plugin, operation);
      if (responseSymbol) {
        slots.push({
          operationId: operation.id,
          role: 'response',
          tags,
          typeExpr: $.type(responseSymbol),
        });
      }

      const errorsSymbol = queryErrorsTypeSymbol(plugin, operation);
      if (errorsSymbol) {
        for (const status of collectErrorStatuses(operation)) {
          slots.push({
            operationId: operation.id,
            role: `error-${status}`,
            tags,
            typeExpr: $.type(errorsSymbol).idx($.type.literal(status)),
          });
        }
      }
    }
  });

  if (!slots.length) return;

  const bulkSymbol = plugin.config.jsonSchema
    ? emitBulkJsonSchemas({
        plugin,
        typeExprs: slots.map((slot) => slot.typeExpr),
      })
    : undefined;

  slots.forEach((slot, index) => {
    const naming = namingForRole(plugin, slot.role);

    const validatorSymbol = registerTypiaSymbol({
      meta: {
        resource: 'operation',
        resourceId: slot.operationId,
        role: slot.role,
        tags: slot.tags,
      },
      naming,
      namingAnchor: slot.operationId,
      plugin,
    });
    emitValidator({
      comment: slot.comment,
      plugin,
      symbol: validatorSymbol,
      typeExpr: slot.typeExpr,
    });

    if (bulkSymbol) {
      const jsonSymbol = registerTypiaSymbol({
        meta: {
          resource: 'operation',
          resourceId: slot.operationId,
          role: `${slot.role}-json-schema`,
          tags: slot.tags,
        },
        naming: { case: naming.case, name: naming.jsonName },
        namingAnchor: slot.operationId,
        plugin,
      });
      emitJsonSchemaTwin({ bulkSymbol, index, plugin, symbol: jsonSymbol });
    }
  });
};

function collectErrorStatuses(operation: IR.OperationObject): ReadonlyArray<number> {
  const out: Array<number> = [];
  const responses = operation.responses;
  if (!responses) return out;
  for (const code in responses) {
    const status = Number.parseInt(code, 10);
    if (!Number.isFinite(status)) continue;
    if (status < 400 || status > 599) continue;
    if (!responses[code]?.schema) continue;
    out.push(status);
  }
  return out;
}

function namingForRole(
  plugin: TypiaPlugin['Instance'],
  role: SlotRole,
): { case: Casing; jsonName: NameTransformer; name: NameTransformer } {
  if (role === 'data') return plugin.config.requests;
  if (role === 'response') return plugin.config.responses;
  // Errors derive naming from responses config but append `Error<code>` suffix.
  const status = role.slice('error-'.length);
  const base = plugin.config.responses;
  return {
    case: base.case,
    jsonName: (input: string) =>
      `${applyNaming(input, { case: base.case, name: base.name })}Error${status}JsonSchema`,
    name: (input: string) =>
      `${applyNaming(input, { case: base.case, name: base.name })}Error${status}`,
  };
}

function buildOperationComment(operation: IR.OperationObject): ReadonlyArray<string> | undefined {
  if (!operation.summary && !operation.description && !operation.deprecated) return;

  const parts: Array<string> = [];
  if (operation.summary) parts.push(operation.summary);
  if (operation.description) {
    if (parts.length) parts.push('');
    parts.push(operation.description);
  }
  if (operation.deprecated) {
    if (parts.length) parts.push('');
    parts.push('@deprecated');
  }
  return parts;
}
