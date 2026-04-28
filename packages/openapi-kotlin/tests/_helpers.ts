import { parseSpec } from "@ahmedrowaihi/openapi-tools/parse";
import type { IR } from "@hey-api/shared";

type Fragment = {
  components?: Record<string, unknown>;
  paths?: Record<string, unknown>;
};

/**
 * Wrap a partial OpenAPI doc into a full doc and run it through the IR
 * parser. Tests stay readable in raw 3.x while exercising the same IR
 * pipeline production uses. Pass `version: "3.0"` to test legacy 3.0
 * features like `nullable: true`.
 */
export function ir(
  fragment: Fragment,
  version: "3.0" | "3.1" = "3.1",
): IR.Model {
  return parseSpec({
    openapi: version === "3.0" ? "3.0.4" : "3.1.0",
    info: { title: "test", version: "0" },
    paths: {},
    ...fragment,
  });
}
