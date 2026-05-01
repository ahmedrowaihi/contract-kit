import type { OpenAPIV3_1 } from "@hey-api/spec-types";

/** Stable id for emitted security scheme entries. */
export type AuthSchemeId = "bearerAuth" | "basicAuth" | "apiKeyAuth";

export interface DetectedAuth {
  id: AuthSchemeId;
  scheme: OpenAPIV3_1.SecuritySchemeObject;
}

/**
 * Inspect request headers for known auth shapes. Returns scheme metadata
 * suitable for `components.securitySchemes` + the corresponding `security`
 * requirement on the operation. Returns `null` if no auth is observed.
 *
 * Detection order: Bearer → Basic → API key (X-API-Key / X-Auth-Token).
 */
export function detectAuthScheme(
  headers: Record<string, string>,
): DetectedAuth | null {
  const auth = headers.authorization;
  if (auth) {
    const lower = auth.trim().toLowerCase();
    if (lower.startsWith("bearer ")) {
      return {
        id: "bearerAuth",
        scheme: { type: "http", scheme: "bearer" },
      };
    }
    if (lower.startsWith("basic ")) {
      return {
        id: "basicAuth",
        scheme: { type: "http", scheme: "basic" },
      };
    }
  }
  const apiKey = ["x-api-key", "x-auth-token"].find((h) => headers[h]);
  if (apiKey) {
    return {
      id: "apiKeyAuth",
      scheme: { type: "apiKey", in: "header", name: apiKey },
    };
  }
  return null;
}
