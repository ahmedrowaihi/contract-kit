import type { IR } from "@hey-api/shared";
import type { SwType } from "../../sw-dsl/index.js";
import {
  swBool,
  swData,
  swDouble,
  swFloat,
  swInt,
  swInt32,
  swInt64,
  swRef,
  swString,
} from "../../sw-dsl/index.js";

/**
 * OpenAPI string `format` → Swift Foundation type. Unknown formats fall
 * back to `String`.
 *
 *  - `date-time` / `date` → `Date` (consumer must configure
 *    `JSONDecoder.dateDecodingStrategy` to match server conventions).
 *  - `uuid`               → `UUID`.
 *  - `uri` / `url`        → `URL`.
 *  - `binary` / `byte`    → `Data` (matches multipart field handling).
 */
function typeForStringFormat(format: string | undefined): SwType {
  switch (format) {
    case "date-time":
    case "date":
      return swRef("Date");
    case "uuid":
      return swRef("UUID");
    case "uri":
    case "url":
      return swRef("URL");
    case "binary":
    case "byte":
      return swData;
    default:
      return swString;
  }
}

/**
 * Map a primitive `IR.SchemaObject.type` (with optional `format`) to the
 * matching Swift type. Returns `undefined` for non-primitive types so
 * the dispatcher can fall through.
 */
export function typeForPrimitive(s: IR.SchemaObject): SwType | undefined {
  switch (s.type) {
    case "string":
      return typeForStringFormat(s.format);
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
