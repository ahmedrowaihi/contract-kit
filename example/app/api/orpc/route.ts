import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import { createOpenApiClient } from "@/generated/orpc/client.gen";
import { os } from "@/generated/orpc/server.gen";

/**
 * oRPC Server Implementation Example
 *
 * This demonstrates using the generated server implementation (os)
 * to create type-safe handlers and expose them via Next.js API routes.
 */

// Implement handlers using the generated 'os' implementer
const appRouter = {
  pet: {
    findPetsByStatus: os.pet.findPetsByStatus.handler(async ({ input }) => [
      {
        category: { id: 1n, name: "Dogs" },
        id: 1n,
        name: "Buddy",
        photoUrls: ["https://example.com/buddy.jpg"],
        status: input.status,
        tags: [{ id: 1n, name: "friendly" }],
      },
      {
        category: { id: 1n, name: "Dogs" },
        id: 2n,
        name: "Max",
        photoUrls: ["https://example.com/max.jpg"],
        status: input.status,
        tags: [{ id: BigInt(2), name: "playful" }],
      },
    ]),
    getPetById: os.pet.getPetById.handler(async ({ input }) => {
      const client = createOpenApiClient({
        url: "https://petstore3.swagger.io/api/v3",
      });
      const pet = await client.pet.getPetById(input);
      return pet;
    }),
  },
};

// Create RPCHandler to expose the router as Next.js route handlers
const handler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error("RPC Error:", error);
    }),
  ],
});

// Next.js route handler
async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    context: {},
    prefix: "/api/orpc",
  });

  return response ?? new Response("Not found", { status: 404 });
}

// Export HTTP methods for Next.js App Router
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const HEAD = handleRequest;
