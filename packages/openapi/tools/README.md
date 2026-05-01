# @ahmedrowaihi/openapi-tools

OpenAPI utilities built on top of [`@hey-api/codegen-core`](https://github.com/hey-api/openapi-ts) and `@hey-api/shared`. Spec diffing, parsing, and helpers — usable on their own without `@hey-api/openapi-ts` plugins.

Part of [contract-kit](https://github.com/ahmedrowaihi/contract-kit).

## Install

```bash
pnpm add @ahmedrowaihi/openapi-tools @hey-api/codegen-core @hey-api/shared
```

## Usage

### Diff two OpenAPI specs

```ts
import { diffSpecs, parseSpec } from "@ahmedrowaihi/openapi-tools";

const before = parseSpec(beforeJson);
const after = parseSpec(afterJson);

const report = diffSpecs(before, after, {
  filter: (method, path) => path.startsWith("/v1"),
  compare: { request: true, response: true, params: true },
});
```

### Parse a spec into hey-api's IR

```ts
import { parseSpec } from "@ahmedrowaihi/openapi-tools";

const ir = parseSpec(openApiSpecJson);
```

## API

| Export | Description |
| --- | --- |
| `diffSpecs(before, after, options?)` | Compare two parsed specs, return endpoint-level diff |
| `parseSpec(spec)` | Parse OpenAPI 2.0 / 3.0 / 3.1 into the shared IR |
| `DiffOptions` / `DiffReport` / `EndpointDiff` / `ShapeDiff` / `TypeChange` / `RequiredChange` | Public types |
| `IR` (re-export) | hey-api shared IR namespace |

## Origin

Previously shipped as `@ahmedrowaihi/openapi-ts-orpc/tools` subpath. Extracted into its own package since the utilities are spec-host-agnostic — they don't depend on oRPC.
