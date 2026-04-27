# oRPC + Next.js Fullstack Example

This example demonstrates the **oRPC plugin** for `@hey-api/openapi-ts`, showcasing a complete type-safe fullstack
workflow with Next.js.

## What This Demonstrates

### Backend (API Routes)

- ✅ Type-safe server handlers using `os.pet.*.handler()`
- ✅ Full input/output validation from OpenAPI spec
- ✅ Contract-first API development

### Frontend (React)

- ✅ Type-safe oRPC client
- ✅ TanStack Query hooks with automatic type inference
- ✅ End-to-end type safety from server to client

## Project Structure

```
app/
├── api/
│   └── orpc/
│       └── route.ts          # Server handlers using os.*.handler()
├── layout.tsx                # Root layout
├── page.tsx                  # Main page with client usage
└── providers.tsx             # React Query provider

src/
└── generated/
    └── orpc/
        ├── contract.gen.ts   # Generated oRPC contracts
        ├── router.gen.ts     # Generated router structure
        ├── server.gen.ts     # Generated server skeleton (os)
        ├── client.gen.ts     # Generated client factory
        └── tanstack.gen.ts   # Generated TanStack Query hooks
```

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Generate oRPC Code

```bash
pnpm openapi-ts
```

This generates type-safe oRPC code from the Swagger Petstore OpenAPI spec.

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the example in action.

## Code Walkthrough

### Server Implementation

```typescript
// app/api/orpc/route.ts
import { os } from '@/generated/orpc/server.gen';

// Implement handlers with full type safety
const getPetById = os.pet.getPetById.handler(async ({ input }) => {
  // input.petId is fully typed
  return {
    id: input.petId,
    name: `Pet ${input.petId}`,
    // ... return type validated against OpenAPI response schema
  };
});
```

### Client Usage

```typescript
// app/page.tsx
import { createRpcLinkClient } from '@/generated/orpc/client.gen';
import { createOrpcUtils } from '@/generated/orpc/tanstack.gen';

const client = createRpcLinkClient({ url: '/api/orpc' });
const orpc = createOrpcUtils(client);

// Use TanStack Query hooks with full type safety
function MyComponent() {
  const { data, isLoading } = orpc.pet.getPetById.useQuery({
    petId: 1, // Fully typed!
  });

  // data is fully typed from OpenAPI response schema
}
```

## Configuration

The oRPC plugin is configured in `openapi-ts.config.ts`:

```typescript
export default defineConfig({
  input: 'https://raw.githubusercontent.com/.../openapi.yaml',
  output: { path: './src/client' },
  plugins: [
    '@hey-api/typescript',
    'zod',
    {
      name: 'orpc',
      preset: 'fullstack', // Generates server + client + tanstack
      group: 'tags', // Group by OpenAPI tags
      mode: 'compact', // Compact input schema
    },
  ],
});
```

## Key Features

### 🎯 End-to-End Type Safety

From OpenAPI spec → Server handlers → Client calls, everything is fully typed.

### 🚀 Contract-First Development

Define your API once in OpenAPI, get type-safe server and client code.

### ⚡ Developer Experience

- Autocomplete everywhere
- Compile-time errors for invalid API calls
- Refactor with confidence

### 🔄 TanStack Query Integration

Automatic React Query hooks for caching, loading states, and error handling.

## Learn More

- [oRPC Documentation](https://orpc.unnoq.com/)
- [oRPC Plugin README](../../packages/openapi-ts/src/plugins/orpc/README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query/latest)
