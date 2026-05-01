import { $ } from "@hey-api/openapi-ts";
import type { GeneratorContext } from "./types";

/**
 * Generates TanStack Query utilities for oRPC.
 * Creates a factory function that wraps the oRPC TanStack Query integration.
 */
export const generateTanstack = (context: GeneratorContext): void => {
  const { plugin, routerSymbol, tanstackFile } = context;

  const contractRouterClientSymbol = plugin.external(
    "@orpc/contract.ContractRouterClient",
  );
  const createTanstackQueryUtilsSymbol = plugin.external(
    "@orpc/tanstack-query.createTanstackQueryUtils",
  );

  const createOrpcUtilsSymbol = plugin.symbol("createOrpcUtils", {
    getFilePath: () => tanstackFile,
    meta: {
      category: "tanstack",
      resource: "createOrpcUtils",
      tool: "orpc",
    },
  });

  const createOrpcUtilsFunc = $.const(createOrpcUtilsSymbol)
    .export()
    .assign(
      $.func()
        .param("client", (p) =>
          p.type(
            $.type
              .expr(contractRouterClientSymbol)
              .generic($.type.query($(routerSymbol))),
          ),
        )
        .do($.return($.call(createTanstackQueryUtilsSymbol, $.id("client")))),
    );

  plugin.node(createOrpcUtilsFunc);
};
