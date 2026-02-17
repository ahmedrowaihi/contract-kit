import { defineConfig as defineFakerConfig } from "@ahmedrowaihi/openapi-ts-faker";
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input:
    "https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml",
  output: {
    path: "./generated",
  },
  plugins: [
    "@hey-api/typescript",
    defineFakerConfig({
      output: "factories.gen",
      generateBatchCreators: true,
      defaultBatchCount: 10,
      respectConstraints: true,
      generateDocs: true,
    }),
  ],
});
