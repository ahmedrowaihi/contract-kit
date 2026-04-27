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
      defaultBatchCount: 5,
      respectConstraints: true,
      fieldNameHints: {
        email: "internet.email",
        firstName: "person.firstName",
        last_name: "person.lastName",
        phone: "phone.number",
      },
    }),
  ],
});
