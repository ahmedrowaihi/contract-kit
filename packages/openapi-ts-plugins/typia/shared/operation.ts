import type { Symbol } from '@hey-api/codegen-core';
import { $, type MaybeTsDsl, TsDsl, type TypeTsDsl } from '@hey-api/openapi-ts';
import type { IR } from '@hey-api/shared';
import ts from 'typescript';

import type { TypiaPlugin } from '../types';

export type RequestInputType = MaybeTsDsl<TypeTsDsl<ts.TypeNode>>;

/**
 * Emits `Data extends { [K]: infer V } ? [V] extends [undefined] ? unknown : V : unknown`.
 * Widens absent keys and `?: never` sections so HTTP adapters can pass `{}` / header bags
 * without tripping strict checks. Declared schemas fall through unchanged.
 */
class HttpSectionFallbackTsDsl extends TsDsl<ts.ConditionalTypeNode> {
  readonly '~dsl' = 'HttpSectionFallbackTsDsl';

  constructor(
    private readonly _data: MaybeTsDsl<ts.TypeNode>,
    private readonly _key: string,
  ) {
    super();
  }

  override toAst(): ts.ConditionalTypeNode {
    const dataNode = this._data instanceof TsDsl ? this._data.toAst() : this._data;
    const inferVar = ts.factory.createTypeParameterDeclaration(undefined, 'V');
    const inferType = ts.factory.createInferTypeNode(inferVar);
    const unknownNode = ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    const undefinedTuple = ts.factory.createTupleTypeNode([
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
    ]);

    const presenceShape = ts.factory.createTypeLiteralNode([
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createStringLiteral(this._key),
        undefined,
        inferType,
      ),
    ]);

    const vRef = ts.factory.createTypeReferenceNode('V');
    const innerConditional = ts.factory.createConditionalTypeNode(
      ts.factory.createTupleTypeNode([vRef]),
      undefinedTuple,
      unknownNode,
      vRef,
    );

    return ts.factory.createConditionalTypeNode(
      dataNode,
      presenceShape,
      innerConditional,
      unknownNode,
    );
  }
}

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

export function buildRequestInputType(dataSymbol: Symbol): RequestInputType {
  const omitKeys = $.type.or(
    $.type.literal('url'),
    $.type.literal('path'),
    $.type.literal('body'),
    $.type.literal('query'),
    $.type.literal('headers'),
  );
  const stripped = $.type('Omit').generic($.type(dataSymbol)).generic(omitKeys);

  const sectionFallback = (key: string): HttpSectionFallbackTsDsl =>
    new HttpSectionFallbackTsDsl($.type(dataSymbol), key);

  const overrides = $.type
    .object()
    .prop('params', (p) => p.type($.type(dataSymbol).idx($.type.literal('path'))))
    .prop('body', (p) => p.type(sectionFallback('body')))
    .prop('query', (p) => p.type(sectionFallback('query')))
    .prop('headers', (p) => p.type(sectionFallback('headers')));

  return $.type.and(stripped, overrides);
}
