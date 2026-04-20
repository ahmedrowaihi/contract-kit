import type { Symbol } from '@hey-api/codegen-core';
import { $, type MaybeTsDsl, type TypeTsDsl } from '@hey-api/openapi-ts';
import type { IR } from '@hey-api/shared';
import type ts from 'typescript';

import type { TypiaPlugin } from '../types';

export type RequestInputType = MaybeTsDsl<TypeTsDsl<ts.TypeNode>>;

export function queryDataTypeSymbol(
  plugin: TypiaPlugin['Instance'],
  operation: IR.OperationObject,
): Symbol | undefined {
  return plugin.querySymbol({
    category: 'type',
    resource: 'operation',
    resourceId: operation.id,
    role: 'data',
    tool: 'typescript',
  });
}

export function queryResponseTypeSymbol(
  plugin: TypiaPlugin['Instance'],
  operation: IR.OperationObject,
): Symbol | undefined {
  return plugin.querySymbol({
    category: 'type',
    resource: 'operation',
    resourceId: operation.id,
    role: 'response',
    tool: 'typescript',
  });
}

export function queryErrorsTypeSymbol(
  plugin: TypiaPlugin['Instance'],
  operation: IR.OperationObject,
): Symbol | undefined {
  return plugin.querySymbol({
    category: 'type',
    resource: 'operation',
    resourceId: operation.id,
    role: 'errors',
    tool: 'typescript',
  });
}

/**
 * Builds `Omit<Data, 'url' | 'path'> & { params: Data['path'] }` — strips
 * the path-assembly `url` literal and renames `path` → `params` to match
 * the standard validator API's default layer mapping.
 */
export function buildRequestInputType(dataSymbol: Symbol): RequestInputType {
  const stripped = $.type('Omit')
    .generic($.type(dataSymbol))
    .generic($.type.or($.type.literal('url'), $.type.literal('path')));

  const paramsAlias = $.type.object().prop('params', (p) =>
    p.type($.type(dataSymbol).idx($.type.literal('path'))),
  );

  return $.type.and(stripped, paramsAlias);
}
