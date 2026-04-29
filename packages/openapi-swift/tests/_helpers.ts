import { parseSpec } from "@ahmedrowaihi/openapi-tools/parse";
import type { IR } from "@hey-api/shared";

type Fragment = {
  components?: Record<string, unknown>;
  paths?: Record<string, unknown>;
};

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
