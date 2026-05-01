# @ahmedrowaihi/openapi-recon

Reverse-engineer an OpenAPI 3.1 document from observed HTTP traffic. Feed it standard Web Fetch `Request` / `Response` pairs and it folds them into a JSON Schema 2020-12 document with templated paths, per-status response schemas, detected auth schemes, and per-origin grouping.

Runtime-agnostic: works in browsers, Node, Deno, Bun, Cloudflare Workers — anywhere `Request` / `Response` exist. Pure functions, no global state, tree-shakable.

Powers [`@ahmedrowaihi/glean`](../../apps/glean), the Chrome DevTools extension that emits live specs from browsing.

## Install

```bash
pnpm add @ahmedrowaihi/openapi-recon
```

## Use

```ts
import { createRecon } from "@ahmedrowaihi/openapi-recon";

const recon = createRecon({
  title: "Petstore",
  version: "0.1.0",
});

// Anywhere you observe traffic — e.g. a fetch wrapper, a service-worker, a proxy:
await recon.observe(request, response);

// Whenever you want a snapshot:
const document = recon.toOpenAPI();
// → OpenAPIV3_1.Document with paths, components.schemas, components.securitySchemes
```

`request` / `response` are standard Web Fetch types. Bodies must already be readable — call `.clone()` upstream if you also need to forward the response. Non-JSON bodies are skipped silently.

## What it infers

- **Path templating**: `/pets/42` and `/pets/8` collapse into `/pets/{petId}` with `{ petId: "string" }`. Pure-numeric segments become `integer`. Disable via `pathTemplating: false`.
- **JSON Schema 2020-12** for every observed JSON request and response body, merged across samples (union types, optional fields, enum candidates).
- **Per-status response schemas**: `200` and `404` keep distinct shapes.
- **Auth schemes**: `Authorization: Bearer ...` → `bearerAuth`; `X-API-Key: ...` → `apiKeyAuth`; basic auth too. Detected per-operation, deduped at the components level.
- **Per-origin grouping**: feed traffic from many backends and snapshot one origin at a time:

```ts
const justBackend = recon.toOpenAPI({ origin: "https://api.example.com" });
```

## Options

```ts
createRecon({
  redactHeaders: ["authorization", "cookie", "x-api-key"], // sensible defaults built in
  pathTemplating: true,
  title: "Reverse-engineered API",
  version: "0.0.0",
});
```

## API surface

| Export | Purpose |
| --- | --- |
| `createRecon(config?)` | Returns a `Recon` session. |
| `Recon.observe(req, res)` | Fold one request/response into the running spec. |
| `Recon.toOpenAPI(opts?)` | Snapshot the current spec (optionally filtered by origin). |
| `Recon.sampleCount()` / `originStats()` | Telemetry on what's been folded. |
| `Recon.clear()` / `clearOrigin(origin)` | Reset all state, or just one origin. |
| `inferSchema(value)` / `mergeSchema(a, b)` | Lower-level building blocks. |
| `templatePaths(paths)` / `templateSinglePath(...)` | Path templating in isolation. |
| `sanitizeHeaders(headers, redact?)` / `DEFAULT_REDACTED_HEADERS` | Header redaction helpers. |

## Pairing

- **[`@ahmedrowaihi/glean`](../../apps/glean)** — Chrome DevTools panel that wires this up to the network panel and emits a live, click-to-copy spec.
- **[`@ahmedrowaihi/openapi-tools/diff`](../openapi-tools)** — diff a freshly recon'd spec against a committed one to spot drift between docs and reality.

## License

MIT
