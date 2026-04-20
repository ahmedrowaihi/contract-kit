import type { Symbol } from '@hey-api/codegen-core';
import { $ } from '@hey-api/openapi-ts';
import { buildSymbolIn, type Casing, type NameTransformer } from '@hey-api/shared';

import type { RequestInputType } from './operation';
import type { TypiaPlugin } from '../types';

const BULK_SCHEMAS_NAME = '__typiaSchemas';

interface RegisterSymbolArgs {
  meta: {
    resource: 'definition' | 'operation';
    resourceId: string;
    role: string;
    tags?: ReadonlyArray<string>;
  };
  naming: { case: Casing; name: NameTransformer };
  namingAnchor: string;
  plugin: TypiaPlugin['Instance'];
}

/** Registers a symbol; caller owns node emission (bulk JSON index correlation). */
export function registerTypiaSymbol({
  meta,
  naming,
  namingAnchor,
  plugin,
}: RegisterSymbolArgs): Symbol {
  return plugin.registerSymbol(
    buildSymbolIn({
      meta: { category: 'schema', tool: '@ahmedrowaihi/openapi-ts-typia', ...meta },
      name: namingAnchor,
      naming,
      plugin,
      schema: {},
    }),
  );
}

interface EmitValidatorArgs {
  comment?: ReadonlyArray<string>;
  plugin: TypiaPlugin['Instance'];
  symbol: Symbol;
  typeExpr: RequestInputType;
}

/**
 * Emits `export const <name>: StandardSchemaV1<T, T> & ((input) => IValidation<T>) = createValidate<T>()`.
 * Explicit annotation keeps `tsc --declaration` from leaking transitive types.
 */
export function emitValidator({
  comment,
  plugin,
  symbol,
  typeExpr,
}: EmitValidatorArgs): void {
  const createValidate = plugin.external('typia.createValidate');
  const iValidation = plugin.external('typia.IValidation');
  const standardSchema = plugin.external('@standard-schema/spec.StandardSchemaV1');

  const callable = $.type
    .func()
    .param('input', (p) => p.type($.type('unknown')))
    .returns($.type(iValidation).generic(typeExpr));

  const annotation = $.type.and(
    $.type(standardSchema).generic(typeExpr).generic(typeExpr),
    callable,
  );

  plugin.node(
    $.const(symbol)
      .export()
      .$if(comment, (c, v) => c.doc(v))
      .type(annotation)
      .assign($(createValidate).call().generic(typeExpr)),
  );
}

interface EmitBulkJsonSchemasArgs {
  plugin: TypiaPlugin['Instance'];
  typeExprs: ReadonlyArray<RequestInputType>;
}

/** Emits `const __typiaSchemas = typia.json.schemas<[...]>()`; tuple order drives twin indexing. */
export function emitBulkJsonSchemas({ plugin, typeExprs }: EmitBulkJsonSchemasArgs): Symbol {
  const json = plugin.external('typia.json');
  const symbol = plugin.registerSymbol(
    buildSymbolIn({
      meta: {
        category: 'schema',
        resource: 'definition',
        resourceId: BULK_SCHEMAS_NAME,
        role: 'bulk-json',
        tool: '@ahmedrowaihi/openapi-ts-typia',
      },
      name: BULK_SCHEMAS_NAME,
      naming: { case: 'camelCase', name: BULK_SCHEMAS_NAME },
      plugin,
      schema: {},
    }),
  );

  const value = $(json)
    .attr('schemas')
    .call()
    .generic($.type.tuple(...typeExprs));

  plugin.node($.const(symbol).assign(value));
  return symbol;
}

interface EmitJsonSchemaTwinArgs {
  bulkSymbol: Symbol;
  index: number;
  plugin: TypiaPlugin['Instance'];
  symbol: Symbol;
}

/**
 * Emits `export const <name> = __typiaSchemas.schemas[i]`.
 */
export function emitJsonSchemaTwin({
  bulkSymbol,
  index,
  plugin,
  symbol,
}: EmitJsonSchemaTwinArgs): void {
  const value = $(bulkSymbol).attr('schemas').attr(index).computed();
  plugin.node($.const(symbol).export().assign(value));
}
