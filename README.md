# @ahmedrowaihi/openapi-ts-orpc

Generates type-safe [oRPC](https://orpc.unnoq.com/) contracts, routers, server skeletons, and clients from OpenAPI specifications. Plugin for [@hey-api/openapi-ts](https://heyapi.dev/).

## Installation

```bash
bun add -d @ahmedrowaihi/openapi-ts-orpc @hey-api/openapi-ts
bun add @orpc/contract @orpc/server @orpc/client zod
```

## What it generates

- **`contract.gen.ts`** — Type-safe oRPC contracts with Zod input/output schemas
- **`router.gen.ts`** — Organized router structure (by tags, paths, or flat)
- **`server.gen.ts`** — `os = implement(router)` helper for type-safe backend implementation _(optional)_
- **`src/handlers/<tag>.ts`** — Scaffolded handler stubs, patched progressively _(optional)_
- **`client.gen.ts`** — Ready-to-use client functions _(optional)_

Contracts and router are always generated. Everything else is opt-in.

---

## Basic Usage

```typescript
import { defineConfig } from '@hey-api/openapi-ts';
import { defineConfig as defineORPCConfig } from '@ahmedrowaihi/openapi-ts-orpc';

export default defineConfig({
  input: 'openapi.json',
  output: { path: './src/generated' },
  plugins: [
    '@hey-api/typescript',
    'zod',
    defineORPCConfig(), // contracts + router only (default)
  ],
});
```

---

## Server (Backend)

Enable `server.implementation` to generate `server.gen.ts` (the `os` builder). Enable `server.handlers` to scaffold handler files under `src/handlers/`.

```typescript
defineORPCConfig({
  server: {
    implementation: true,   // generate server.gen.ts
    handlers: {
      dir: 'src/handlers',  // scaffold handler stubs here (default: 'src/handlers')
      importAlias: '#/',    // use path alias in generated imports (e.g. '#/generated/...')
    },
  },
  group: 'tags',
  mode: 'compact',
})
```

### Handler scaffolding

When `handlers` is enabled:
- **New tags** → creates `src/handlers/<tag>.ts` with `throw new ORPCError('NOT_IMPLEMENTED')` stubs
- **Existing files** → only appends procedures that are missing; never overwrites existing code
- **Reserved JS keywords** as tag names (e.g. `protected`, `class`) → safe variable names via `<tag>Handlers` suffix

---

## Client (Frontend)

Enable individual client transports as needed:

```typescript
defineORPCConfig({
  client: {
    rpc: true,       // HTTP client (native oRPC RPC protocol)
    tanstack: true,  // TanStack Query utilities (useQuery, useMutation, etc.)
  },
})
```

Available client options:

| Option | Description |
|---|---|
| `rpc` | HTTP/Fetch client (native RPC protocol) |
| `websocket` | WebSocket client (native RPC protocol) |
| `messageport` | MessagePort client (Web Workers, iframes) |
| `openapi` | REST client (OpenAPI/REST protocol) |
| `tanstack` | TanStack Query utilities |

---

## Full Configuration Reference

```typescript
defineORPCConfig({
  // Server-side generation
  server: {
    implementation: false,  // generate server.gen.ts
    handlers: false,        // true | false | { dir?, importAlias? }
  },

  // Client-side generation (all off by default)
  client: {
    rpc: false,
    websocket: false,
    messageport: false,
    openapi: false,
    tanstack: false,
  },

  // Router grouping: 'tags' (default) | 'paths' | 'flat'
  group: 'tags',

  // Input schema shape: 'compact' (default) | 'detailed'
  mode: 'compact',

  // Optional: rename operations in the generated router
  transformOperationName: (operation) => operation.id.replace(/Controller_/i, ''),
})
```

### `group` — Router grouping

**`tags`** (default) — group by OpenAPI tag:
```typescript
router.users.getById({ id: 123 });
```

**`paths`** — group by URL structure:
```typescript
router.users.id.get({ id: 123 });
```

**`flat`** — no grouping:
```typescript
router.usersGetById({ id: 123 });
```

### `mode` — Input schema shape

**`compact`** (default) — flat merged schema:
```typescript
// GET: path + query merged
{ id: number, search?: string }

// POST/PUT: path + body merged
{ id: number, username: string }
```

**`detailed`** — explicit structure:
```typescript
{ path: { id: number }, query: { search?: string }, body: { username: string } }
```

---

## Requirements

- `@hey-api/typescript` plugin (auto-included as dependency)
- `zod` plugin (auto-included as dependency)
