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
 * `string`. `date-time` maps to `time.Time` (RFC 3339); `date` stays
 * on `string` since date-only values are outside RFC 3339 and
 * `time.Time` can't unmarshal them.
 */
function typeForStringFormat(format: string | undefined): GoType {
  switch (format) {
    case "date-time":
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
