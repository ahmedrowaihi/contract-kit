import type { Symbol } from '@hey-api/codegen-core';
import type { $ } from '@hey-api/openapi-ts';
import type { IR, RequestSchemaContext } from '@hey-api/shared';

import type { TypiaPlugin } from './types';
import {
  createRequestSchemaV1,
  createRequestValidatorV1,
  createResponseValidatorV1,
  getJsonSchemaSymbolV1,
} from './v1/api';

export interface ValidatorArgs {
  operation: IR.OperationObject;
  plugin: TypiaPlugin['Instance'];
}

export type IApi = {
  createRequestSchema: (
    ctx: RequestSchemaContext<TypiaPlugin['Instance']>,
  ) => Symbol | undefined;
  createRequestValidator: (
    args: RequestSchemaContext<TypiaPlugin['Instance']>,
  ) => ReturnType<typeof $.func> | undefined;
  createResponseValidator: (args: ValidatorArgs) => ReturnType<typeof $.func> | undefined;
  /** Returns the JSON Schema companion symbol for an operation (twin of the validator). */
  getJsonSchemaSymbol: (
    plugin: TypiaPlugin['Instance'],
    operation: IR.OperationObject,
    role: 'data' | 'response',
  ) => Symbol | undefined;
};

export class Api implements IApi {
  createRequestSchema(ctx: RequestSchemaContext<TypiaPlugin['Instance']>): Symbol | undefined {
    if (!ctx.plugin.config.requests.enabled) return;
    return createRequestSchemaV1(ctx);
  }

  createRequestValidator(
    args: RequestSchemaContext<TypiaPlugin['Instance']>,
  ): ReturnType<typeof $.func> | undefined {
    if (!args.plugin.config.requests.enabled) return;
    return createRequestValidatorV1(args);
  }

  createResponseValidator(args: ValidatorArgs): ReturnType<typeof $.func> | undefined {
    if (!args.plugin.config.responses.enabled) return;
    return createResponseValidatorV1(args);
  }

  getJsonSchemaSymbol(
    plugin: TypiaPlugin['Instance'],
    operation: IR.OperationObject,
    role: 'data' | 'response',
  ): Symbol | undefined {
    if (!plugin.config.jsonSchema) return;
    return getJsonSchemaSymbolV1(plugin, operation, role);
  }
}
