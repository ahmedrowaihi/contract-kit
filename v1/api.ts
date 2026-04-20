import type { Symbol } from '@hey-api/codegen-core';
import { $ } from '@hey-api/openapi-ts';
import type { IR, RequestSchemaContext } from '@hey-api/shared';

import type { ValidatorArgs } from '../api';
import type { TypiaPlugin } from '../types';

export function createRequestSchemaV1(
  ctx: RequestSchemaContext<TypiaPlugin['Instance']>,
): Symbol | undefined {
  return ctx.plugin.querySymbol({
    category: 'schema',
    resource: 'operation',
    resourceId: ctx.operation.id,
    role: 'data',
    tool: '@ahmedrowaihi/openapi-ts-typia',
  });
}

export function createRequestValidatorV1(
  ctx: RequestSchemaContext<TypiaPlugin['Instance']>,
): ReturnType<typeof $.func> | undefined {
  const symbol = createRequestSchemaV1(ctx);
  if (!symbol) return;
  return standardValidatorFunc(symbol);
}

export function createResponseValidatorV1({
  operation,
  plugin,
}: ValidatorArgs): ReturnType<typeof $.func> | undefined {
  const symbol = plugin.querySymbol({
    category: 'schema',
    resource: 'operation',
    resourceId: operation.id,
    role: 'response',
    tool: '@ahmedrowaihi/openapi-ts-typia',
  });
  if (!symbol) return;
  return standardValidatorFunc(symbol);
}

export function getJsonSchemaSymbolV1(
  plugin: TypiaPlugin['Instance'],
  operation: IR.OperationObject,
  role: 'data' | 'response',
): Symbol | undefined {
  return plugin.querySymbol({
    category: 'schema',
    resource: 'operation',
    resourceId: operation.id,
    role: `${role}-json-schema`,
    tool: '@ahmedrowaihi/openapi-ts-typia',
  });
}

function standardValidatorFunc(schema: Symbol): ReturnType<typeof $.func> {
  const result = $.const('result').assign(
    $(schema).attr('~standard').attr('validate').call('data').await(),
  );

  const issuesCheck = $.if($('result').attr('issues')).do(
    $.throw(
      $.new('Error').args($('JSON').attr('stringify').call($('result').attr('issues'))),
    ),
  );

  return $.func()
    .async()
    .param('data')
    .do(result, issuesCheck, $.return($('result').attr('value')));
}
