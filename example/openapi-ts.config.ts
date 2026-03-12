import { defineConfig as defineORPCConfig } from "@ahmedrowaihi/openapi-ts-orpc";
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input:
    "https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml",
  logs: {
    path: "./logs",
  },
  output: {
    path: "./src/generated",
    postProcess: ["oxfmt", "eslint"],
  },
  plugins: [
    "@hey-api/typescript",
    {
      name: "zod",
      "~hooks": {
        symbols: {
          getFilePath: (symbol) => {
            const tag = symbol.meta?.tags?.[0];
            if (tag) return `zod/${tag}/schemas`;
          },
        },
      },
    },
    defineORPCConfig({
      group: "tags",
      mode: "compact",
      server: { implementation: true },
      client: { rpc: true, openapi: true, tanstack: true },
    }),
  ],
});
