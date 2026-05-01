# @ahmedrowaihi/openapi-ts-faker

Faker.js mock-data factories from an OpenAPI spec. Plugin for [`@hey-api/openapi-ts`](https://heyapi.dev).

## Install

```bash
npm install -D @ahmedrowaihi/openapi-ts-faker @hey-api/openapi-ts
npm install @faker-js/faker
```

## Use

```ts
import { defineConfig } from "@hey-api/openapi-ts";
import { defineConfig as defineFakerConfig } from "@ahmedrowaihi/openapi-ts-faker";

export default defineConfig({
  input: "openapi.yaml",
  output: { path: "./generated" },
  plugins: [
    "@hey-api/typescript",
    defineFakerConfig({
      fieldNameHints: { email: "internet.email", firstName: "person.firstName" },
    }),
  ],
});
```

## Resolution order (per property)

1. OpenAPI `format` → `formatMapping`
2. `fieldNameHints` exact match (keys are case/separator-insensitive: `email`, `Email`, `user_email` all normalize the same)
3. `enum` → `helpers.arrayElement([...])`
4. Type fallback (`integer` → `number.int`, etc.)

No default field hints. `formatMapping` ships with sensible defaults you can override.

## Mapping

| OpenAPI | Output |
| --- | --- |
| `type: object` | `() => ({ ...props })` |
| `allOf` | merged object |
| `oneOf` / `anyOf` | `helpers.arrayElement([() => v1, () => v2])()` |
| `enum` | `helpers.arrayElement([...])` |
| `type: array` | `helpers.multiple(() => item, { count: { min, max } })` |
| `$ref` | call to sibling factory: `createMockX()` |
| cyclic `$ref` | `null` (broken at codegen to avoid runtime recursion) |

## Type safety

`fieldNameHints` and `formatMapping` values are typed against `FakerMethodPath` — every Faker method callable with zero args. Typos and arg-required methods (e.g. `helpers.arrayElement`) fail at compile time.

## Options

```ts
defineFakerConfig({
  output: "factories.gen",          // filename
  fieldNameHints: {},               // field → faker method
  formatMapping: {},                // format → faker method (merged with defaults)
  respectConstraints: true,         // honor minimum/maximum, minLength/maxLength, minItems/maxItems
  generateBatchCreators: true,      // emit createMockXs(count?)
  defaultBatchCount: 10,            // default count when caller omits arg
  include: ["User", "Order"],       // only these schemas
  exclude: ["Internal"],            // skip these schemas
  filter: (s) => Boolean(s.title),  // custom predicate
});
```

When `respectConstraints` is on:
- `{ minimum: 18, maximum: 99 }` → `number.int({ min: 18, max: 99 })`
- `{ maxLength: 8 }` → `string.alpha({ length: 8 })`
- `{ minItems: 2, maxItems: 5 }` → `helpers.multiple(..., { count: { min: 2, max: 5 } })`

## License

MIT
