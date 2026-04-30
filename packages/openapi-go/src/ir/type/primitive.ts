import type { IR } from "@hey-api/shared";
import {
  type GoType,
  goBool,
  goFloat32,
  goFloat64,
  goInt,
  goInt32,
  goInt64,
  goRef,
  goSlice,
  goString,
} from "../../go-dsl/index.js";

/**
 * OpenAPI string `format` → Go type. Unknown formats fall back to
 * `string`.
 *
 *  - `date-time` / `date`  → `time.Time` (stdlib `time` — JSON-marshals
 *                            as RFC 3339).
 *  - `uuid`                → `string`. stdlib has no `uuid` type;
 *                            consumers using `github.com/google/uuid`
 *                            can wrap it themselves.
 *  - `binary` / `byte`     → `[]byte` (matches multipart binary fields
 *                            and raw octet-stream bodies).
 *  - `uri` / `url`         → `string`. stdlib `net/url.URL` is rarely
 *                            put into JSON DTOs in practice.
 */
function typeForStringFormat(format: string | undefined): GoType {
  switch (format) {
    case "date-time":
    case "date":
      return goRef("time.Time");
    case "binary":
    case "byte":
      return goSlice(goRef("byte"));
    default:
      return goString;
  }
}

/**
 * Map a primitive `IR.SchemaObject.type` (with optional `format`) to
 * the matching Go type. Returns `undefined` for non-primitive types so
 * the dispatcher can fall through.
 */
export function typeForPrimitive(s: IR.SchemaObject): GoType | undefined {
  switch (s.type) {
    case "string":
      return typeForStringFormat(s.format);
    case "integer":
      if (s.format === "int64") return goInt64;
      if (s.format === "int32") return goInt32;
      return goInt;
    case "number":
      return s.format === "float" ? goFloat32 : goFloat64;
    case "boolean":
      return goBool;
    default:
      return undefined;
  }
}
