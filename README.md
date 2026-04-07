# @ahmedrowaihi/openapi-ts-orpc

Generates type-safe [oRPC](https://orpc.unnoq.com/) contracts, routers, server skeletons, clients, and mock factories from OpenAPI specifications. Plugin for [@hey-api/openapi-ts](https://heyapi.dev/).

## Installation

```bash
bun add -d @ahmedrowaihi/openapi-ts-orpc @hey-api/openapi-ts
bun add @orpc/contract @orpc/server @orpc/client zod
```

## What it generates

| File                    | Description                                              | Required              |
| ----------------------- | -------------------------------------------------------- | --------------------- |
| `contract.gen.ts`       | Type-safe oRPC contracts with input/output schemas       | Always                |
| `router.gen.ts`         | Organized router structure                               | Always                |
| `server.gen.ts`         | `os = implement(router)` helper                          | Optional              |
| `client.gen.ts`         | Client factory functions (RPC, WebSocket, OpenAPI, etc.) | Optional              |
| `tanstack.gen.ts`       | TanStack Query utilities                                 | Optional              |
| `faker.gen.ts`          | Mock data factory functions per tag                      | Optional (faker mode) |
| `src/handlers/<tag>.ts` | Handler files with three modes                           | Optional              |

---

## Basic Usage

```typescript
import { defineConfig } from "@hey-api/openapi-ts";
import { defineConfig as defineORPCConfig } from "@ahmedrowaihi/openapi-ts-orpc";

export default defineConfig({
  input: "openapi.json",
  output: { path: "./src/generated" },
  plugins: [
    "@hey-api/typescript",
    "zod",
    defineORPCConfig(), // contracts + router only (default)
  ],
});
```

---

## Server (Backend)

```typescript
defineORPCConfig({
  server: {
    implementation: true,
    handlers: {
      dir: "src/handlers",
      importAlias: "#/",
      mode: "stub", // 'stub' | 'faker' | 'proxy'
    },
  },
});
```

### Handler modes

**`stub`** (default) — throws `ORPCError('NOT_IMPLEMENTED')`:

```typescript
getUser: os.users.getUser.handler(async () => {
  throw new ORPCError("NOT_IMPLEMENTED");
}),
```

**`faker`** — returns mock data from generated `faker.gen.ts` factories:

```typescript
getUser: os.users.getUser.handler(async () => mockGetUser()),
```

Requires `@faker-js/faker` as a dependency. Generates type-safe factories with:

- Field name heuristics (email, phone, url, etc.)
- Enum support via `faker.helpers.arrayElement()`
- Nested objects and arrays from schema
- Date `.toISOString()` chaining

**`proxy`** — forwards requests through the generated OpenAPI client:

```typescript
getUser: os.users.getUser.handler(async ({ input }) => apiClient.users.getUser(input)),
```

Configure the client import:

```typescript
handlers: {
  mode: 'proxy',
  proxy: { clientImport: { name: 'apiClient', from: '#/lib/client' } },
}
```

### Handler file management

- **New tags** create new handler files
- **Existing files** only get missing procedures appended (never overwritten)
- **`override: true`** rewrites files completely on each run

---

## Client (Frontend)

```typescript
defineORPCConfig({
  client: {
    rpc: true, // HTTP client (native oRPC RPC protocol)
    openapi: true, // REST client (OpenAPI protocol)
    tanstack: true, // TanStack Query utilities
  },
});
```

| Option        | Description                               |
| ------------- | ----------------------------------------- |
| `rpc`         | HTTP/Fetch client (native RPC protocol)   |
| `websocket`   | WebSocket client                          |
| `messageport` | MessagePort client (Web Workers, iframes) |
| `openapi`     | REST client (OpenAPI protocol)            |
| `tanstack`    | TanStack Query utilities                  |

---

## Full Configuration Reference

```typescript
defineORPCConfig({
  // Server-side generation
  server: {
    implementation: false,
    handlers: {
      dir: "src/handlers",
      importAlias: "#/",
      implementer: { name: "publicOs", from: "#/procedures" },
      mode: "stub", // 'stub' | 'faker' | 'proxy'
      override: false, // rewrite files on each run
      proxy: { clientImport: { name: "apiClient", from: "#/lib/client" } },
    },
  },

  // Client-side generation
  client: {
    rpc: false,
    websocket: false,
    messageport: false,
    openapi: false,
    tanstack: false,
  },

  // Router grouping
  group: "tags", // 'tags' | 'paths' | 'flat' | 'operationId'

  // JSDoc comments on contracts
  comments: true,

  // Naming rules (uses hey-api's applyNaming)
  naming: {
    contract: { casing: "PascalCase" }, // contract constant names
    operation: { casing: "camelCase" }, // router/procedure keys
  },

  // Validator configuration
  validator: "zod", // string | false | { input: string | false, output: string | false }
});
```

### `group` — Router grouping

| Mode             | Description                 | Example                      |
| ---------------- | --------------------------- | ---------------------------- |
| `tags` (default) | Group by OpenAPI tag        | `router.users.getById()`     |
| `paths`          | Group by URL structure      | `router.api.users.getById()` |
| `flat`           | No grouping                 | `router.getUserById()`       |
| `operationId`    | Group by operationId prefix | `router.auth.login()`        |

### `validator` — Validation configuration

Works with any hey-api validator plugin (zod, valibot, arktype):

```typescript
// Single validator for both input and output (default)
validator: 'zod'

// Separate input/output validators
validator: { input: 'zod', output: false }

// Disable validation entirely
validator: false
```

### `naming` — Name customization

Uses `applyNaming` from `@hey-api/shared`:

```typescript
naming: {
  contract: { casing: 'PascalCase' },   // GetUserContract
  operation: { casing: 'camelCase' },    // getUser
}
```

Supports `'camelCase'`, `'PascalCase'`, `'snake_case'`, `'SCREAMING_SNAKE_CASE'`, `'preserve'`, or a custom transform function.

---

## Requirements

- `@hey-api/openapi-ts` >= 0.95.0
- `@hey-api/typescript` plugin (auto-included as dependency)
- A validator plugin (`zod`, `valibot`, `arktype`) configured in your plugins

---

## Typia Integration

Want compile-time validators instead of Zod? See [docs/typia.md](docs/typia.md).

Set `validator: { input: 'typia', output: 'typia' }` to use Typia's Standard Schema validators.
