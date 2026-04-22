"use client";

import { useQuery } from "@tanstack/react-query";

import { createOpenApiClient } from "@/generated/@ahmedrowaihi/orpc/client.gen";
import { createOrpcUtils } from "@/generated/@ahmedrowaihi/orpc/tanstack.gen";

import { Providers } from "./providers";

// Absolute URL on the server (SSR), relative in the browser.
const client = createOpenApiClient({
  url: typeof window === "undefined" ? "http://localhost:3000/api/openapi" : "/api/openapi",
});

const orpc = createOrpcUtils(client);

function PetsList() {
  const {
    data: pets,
    error,
    isLoading,
  } = useQuery(
    orpc.pet.findPetsByStatus.queryOptions({
      input: {
        body: undefined,
        headers: undefined,
        params: undefined,
        query: { status: "available" },
      },
    }),
  );

  if (isLoading) {
    return <div className="text-gray-600">Loading pets...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Available Pets</h2>
      <div className="grid gap-4">
        {pets?.map((pet) => (
          <div
            key={pet.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <h3 className="text-xl font-semibold">{pet.name}</h3>
            <p className="text-gray-600">Category: {pet.category?.name}</p>
            <p className="text-gray-600">Status: {pet.status}</p>
            <div className="mt-2">
              {pet.tags?.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">oRPC + Next.js Example</h1>
        <p className="text-gray-600">
          Demonstrating type-safe fullstack development with oRPC plugin for
          OpenAPI
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <p className="text-sm">
            <strong>Server:</strong> Type-safe handlers with{" "}
            <code className="bg-white dark:bg-black px-1 py-0.5 rounded">
              os.pet.*.handler()
            </code>
          </p>
          <p className="text-sm mt-1">
            <strong>Client:</strong> TanStack Query hooks with full type safety
          </p>
        </div>
      </header>

      <div className="space-y-8">
        <PetsList />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}
