import type { ExtractParams } from "./match";
import { match } from "./match";
import type { Route } from "./route";

type RouteHandler<R extends Route, TResult = unknown> = (
  request: Request,
  params: ExtractParams<R["spec"]>,
) => TResult | Promise<TResult>;

export interface Router {
  /**
   * Register a handler for a route. Pass the route const directly — its
   * `spec` literal types the `params` argument of the handler.
   *
   * @example
   * ```ts
   * router.on(getPetByIdRoute, (req, { petId }) => fetchPet(petId));
   * ```
   */
  on<R extends Route>(route: R, handler: RouteHandler<R>): Router;
  /**
   * Match the request against accumulated routes, dispatch to the registered
   * handler. Returns the handler's return value, or `undefined` if no match
   * or no handler.
   */
  handle(request: Request): Promise<unknown> | undefined;
}

function key(method: string, spec: string): string {
  return `${method.toLowerCase()} ${spec}`;
}

/**
 * Create a router that dispatches matched requests to typed handlers. Routes
 * are accumulated as `.on()` is called — no need to pre-list them. Each route
 * appears only where it's actually handled, so unused routes drop from the
 * bundle.
 *
 * @example
 * ```ts
 * import { createRouter } from "@ahmedrowaihi/openapi-tools/router";
 * import { getPetByIdRoute, addPetRoute } from "./generated/paths.gen";
 *
 * const router = createRouter()
 *   .on(getPetByIdRoute, (req, { petId }) => ({ id: petId, name: "Fluffy" }))
 *   .on(addPetRoute,     (req, params)   => ({ ok: true }));
 *
 * await router.handle(request);
 * ```
 */
export function createRouter(): Router {
  const routes: Route[] = [];
  // biome-ignore lint/suspicious/noExplicitAny: handler stored generically
  const handlers = new Map<string, RouteHandler<Route, any>>();

  const router: Router = {
    on(route, handler) {
      routes.push(route);
      handlers.set(key(route.method, route.spec), handler as never);
      return router;
    },
    handle(request) {
      const m = match(routes, request);
      if (!m) return undefined;
      const handler = handlers.get(key(m.method, m.spec));
      if (!handler) return undefined;
      return Promise.resolve(
        // biome-ignore lint/suspicious/noExplicitAny: erasure at boundary
        handler(request, m.params as any),
      );
    },
  };
  return router;
}
