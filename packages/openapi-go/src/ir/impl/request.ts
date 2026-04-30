import { HTTP_METHOD_LITERAL, type HttpMethod } from "@ahmedrowaihi/oas-core";

import {
  type GoStmt,
  goCall,
  goIdent,
  goNil,
  goSelector,
  goShort,
  goStr,
} from "../../go-dsl/index.js";
import type { ErrCheckFn } from "./errors.js";

/**
 * `req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)`
 * + an err check. Body is initially nil; the body builder re-sets
 * `req.Body` / `req.ContentLength` / Content-Type after this runs.
 *
 * The `ctx` parameter is the function's context.Context arg —
 * idiomatic Go cancellation/timeout channel.
 */
export function buildRequestStmts(
  method: HttpMethod,
  errCheck: ErrCheckFn,
): ReadonlyArray<GoStmt> {
  return [
    goShort(
      ["req", "err"],
      [
        goCall(goSelector(goIdent("http"), "NewRequestWithContext"), [
          { expr: goIdent("ctx") },
          { expr: goStr(HTTP_METHOD_LITERAL[method]) },
          { expr: goCall(goSelector(goIdent("u"), "String"), []) },
          { expr: goNil },
        ]),
      ],
    ),
    errCheck("transport"),
  ];
}
