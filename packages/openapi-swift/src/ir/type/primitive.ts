import type { IR } from "@hey-api/shared";

import {
  type SwType,
  swBool,
  swDouble,
  swFloat,
  swInt,
  swInt32,
  swInt64,
  swString,
} from "../../sw-dsl/type/index.js";

/**
 * Map a primitive `IR.SchemaObject.type` (with optional `format`) to the
 * matching Swift primitive. Returns `undefined` for non-primitive types
 * so the dispatcher can fall through.
 */
export function typeForPrimitive(s: IR.SchemaObject): SwType | undefined {
  switch (s.type) {
    case "string":
      return swString;
    case "integer":
      if (s.format === "int64") return swInt64;
      if (s.format === "int32") return swInt32;
      return swInt;
    case "number":
      return s.format === "float" ? swFloat : swDouble;
    case "boolean":
      return swBool;
    default:
      return undefined;
  }
}
