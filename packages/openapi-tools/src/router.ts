import type { ExtractParams } from "./match";
import { match } from "./match";
import type { Route } from "./route";

type RouteHandler<R extends Route, TResult = unknown> = (
  request: Request,
  params: ExtractParams<R["spec"]>,
) => TResult | Promise<TResult>;

export interface Router {
  /** Register a handler for a route. Handler's `params` is typed from the route's `spec`. */
  on<R extends Route>(route: R, handler: RouteHandler<R>): Router;
  /** Match + dispatch. Returns handler's return value, or `undefined` if unmatched. */
  handle(request: Request): Promise<unknown> | undefined;
}

function key(method: string, spec: string): string {
  return `${method.toLowerCase()} ${spec}`;
}

/**
 * Create a router that dispatches matched requests to typed handlers.
 *
 * @example
 * ```ts
 * createRouter()
 *   .on(getPetByIdRoute, (req, { petId }) => fetchPet(petId))
 *   .handle(request);
 * ```
 */
export function createRouter(): Router {
  // Reassign (not push) so the array identity changes and `match()`'s WeakMap cache busts.
  let routes: readonly Route[] = [];
  // biome-ignore lint/suspicious/noExplicitAny: handler stored generically
  const handlers = new Map<string, RouteHandler<Route, any>>();

  const router: Router = {
    on(route, handler) {
      routes = [...routes, route];
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
