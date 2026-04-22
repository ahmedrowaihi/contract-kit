import { defineConfig as defineORPCConfig } from "@ahmedrowaihi/openapi-ts-orpc";
import {
  defineConfig as defineTypiaConfig,
  typiaTypeTransformer,
} from "@ahmedrowaihi/openapi-ts-typia";
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./petstore.yaml",
  logs: {
    path: "./logs",
  },
  output: {
    path: "./src/generated",
    postProcess: ["oxfmt", "eslint"],
  },
  plugins: [
    {
      name: "@hey-api/typescript",
      "~resolvers": {
        number(ctx) {
          const { $, schema } = ctx;
          // Force int64/uint64 to `number` (instead of `bigint`) so
          // `typia.json.schemas<T>()` can serialise them — JSON Schema
          // has no bigint representation.
          if (schema.format === "int64" || schema.format === "uint64") {
            return $.type("number");
          }
        },
      },
    },
    {
      name: "@hey-api/transformers",
      typeTransformers: [typiaTypeTransformer],
    },
    defineTypiaConfig(),
    defineORPCConfig({
      group: "tags",
      comments: true,
      validator: "@ahmedrowaihi/openapi-ts-typia",
      server: {
        implementation: true,
        handlers: {
          mode: "stub",
        },
      },
      client: { rpc: true, openapi: true, tanstack: true },
    }),
  ],
});
