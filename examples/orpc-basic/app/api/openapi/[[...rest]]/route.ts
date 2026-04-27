import { createTypiaSchemaConverter } from "@ahmedrowaihi/openapi-ts-typia/orpc";
import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";

import * as typiaGen from "@/generated/@ahmedrowaihi/openapi-ts-typia.gen";
import { os } from "@/generated/@ahmedrowaihi/orpc/server.gen";

const appRouter = {
  pet: {
    findPetsByStatus: os.pet.findPetsByStatus.handler(async ({ input }) => [
      {
        category: { id: 1, name: "Dogs" },
        id: 1,
        name: "Buddy",
        photoUrls: ["https://example.com/buddy.jpg"],
        status: input.query.status,
        tags: [{ id: 1, name: "friendly" }],
      },
      {
        category: { id: 1, name: "Dogs" },
        id: 2,
        name: "Max",
        photoUrls: ["https://example.com/max.jpg"],
        status: input.query.status,
        tags: [{ id: 2, name: "playful" }],
      },
    ]),
    getPetById: os.pet.getPetById.handler(async ({ input }) => ({
      category: { id: 1, name: "Dogs" },
      id: input.params.petId,
      name: "Rex",
      photoUrls: ["https://example.com/rex.jpg"],
      status: "available" as const,
      tags: [{ id: 1, name: "friendly" }],
    })),
    addPet: os.pet.addPet.handler(async ({ input }) => ({
      category: input.body.category,
      id: 999,
      name: input.body.name,
      photoUrls: input.body.photoUrls,
      status: input.body.status,
      tags: input.body.tags,
    })),
  },
};

const handler = new OpenAPIHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error("OpenAPI handler error:", error);
    }),
  ],
  plugins: [
    new SmartCoercionPlugin({
      schemaConverters: [createTypiaSchemaConverter(typiaGen)],
    }),
  ],
});

async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    context: {},
    prefix: "/api/openapi",
  });

  return response ?? new Response("Not found", { status: 404 });
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const HEAD = handleRequest;
