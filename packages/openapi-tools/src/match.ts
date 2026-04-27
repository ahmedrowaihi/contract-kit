import { URLPattern } from "urlpattern-polyfill";

import type { Route } from "./route";

/** Extract `{paramName}` placeholders from a path template. URL params are always strings at runtime. */
export type ExtractParams<P extends string> =
  P extends `${string}{${infer Key}}${infer Rest}`
    ? { [K in Key | keyof ExtractParams<Rest>]: string }
    : Record<string, never>;

/**
 * Discriminated union derived from the routes array. Each route in the array
 * contributes one variant. Narrow on `result.spec` + `result.method` to access
 * the per-route param shape.
 */
export type MatchResult<TRoute extends Route = Route> = TRoute extends Route
  ? {
      spec: TRoute["spec"];
      method: TRoute["method"];
      params: ExtractParams<TRoute["spec"]>;
      operationId: TRoute extends { operationId: infer O } ? O : undefined;
    }
  : never;

interface CompiledRoute extends Route {
  compiled: URLPattern;
  score: number;
}

/** Higher = more specific. Literal segments outweigh parameterized ones. */
function scorePath(spec: string): number {
  let score = 0;
  for (const segment of spec.split("/").filter(Boolean)) {
    score += segment.startsWith("{") ? 1 : 100;
  }
  return score;
}

const cache = new WeakMap<readonly Route[], CompiledRoute[]>();

function compile(routes: readonly Route[]): CompiledRoute[] {
  const hit = cache.get(routes);
  if (hit) return hit;
  const compiled: CompiledRoute[] = routes.map((r) => ({
    ...r,
    compiled: new URLPattern({ pathname: r.pattern }),
    score: scorePath(r.spec),
  }));
  compiled.sort((a, b) => b.score - a.score);
  cache.set(routes, compiled);
  return compiled;
}

/**
 * Match an inbound `Request` against a list of routes. Returns the matched
 * route's spec, method, extracted path params (always strings — URL truth),
 * and operationId. Returns `null` if no route matches.
 *
 * The result type is a discriminated union derived from the routes array —
 * narrow on `result.spec` + `result.method` to access typed `params`.
 *
 * @example
 * ```ts
 * import { match } from "@ahmedrowaihi/openapi-tools/match";
 * import { getPetByIdRoute } from "./generated/paths.gen";
 *
 * const r = match([getPetByIdRoute], request);
 * if (r?.spec === "/pet/{petId}") r.params.petId; // typed as string
 * ```
 */
export function match<R extends Route>(
  routes: readonly R[],
  request: Request,
): MatchResult<R> | null {
  const url = new URL(request.url);
  const lower = request.method.toLowerCase();
  for (const route of compile(routes)) {
    if (route.method !== lower) continue;
    const m = route.compiled.exec({ pathname: url.pathname });
    if (!m) continue;
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(m.pathname.groups ?? {})) {
      if (typeof v === "string") params[k] = v;
    }
    return {
      spec: route.spec,
      method: route.method,
      params,
      operationId: route.operationId,
    } as MatchResult<R>;
  }
  return null;
}

/**
 * Boolean check — does this request hit any route in the spec? Useful for
 * "is this URL part of my API surface" filters in interceptors and gateways.
 */
export function isInSpec(routes: readonly Route[], request: Request): boolean {
  const url = new URL(request.url);
  const lower = request.method.toLowerCase();
  for (const route of compile(routes)) {
    if (route.method !== lower) continue;
    if (route.compiled.test({ pathname: url.pathname })) return true;
  }
  return false;
}

export type { Route };
