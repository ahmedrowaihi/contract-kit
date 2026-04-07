import { DEFAULT_FIELD_HINTS, DEFAULT_FORMAT_MAPPING, FAKER_RETURN_TYPE } from "./hints";

export function schemaTypeToJs(type: string): "string" | "number" | "boolean" {
  switch (type) {
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return "string";
  }
}

export function isCompatible(method: string, schemaType: string): boolean {
  const returnType = FAKER_RETURN_TYPE[method];
  if (!returnType) return true;
  return returnType === schemaTypeToJs(schemaType);
}

export function resolveFakerMethod(
  fieldName: string,
  type: string,
  format?: string,
  fieldHints: Record<string, string> = DEFAULT_FIELD_HINTS,
  formatHints: Record<string, string> = DEFAULT_FORMAT_MAPPING,
): string {
  if (format && formatHints[format] && isCompatible(formatHints[format], type)) {
    return formatHints[format];
  }

  const normalized = fieldName.toLowerCase().replace(/[_-]/g, "");
  if (fieldHints[normalized] && isCompatible(fieldHints[normalized], type)) {
    return fieldHints[normalized];
  }
  for (const [hint, method] of Object.entries(fieldHints)) {
    if (normalized.includes(hint) && isCompatible(method, type)) return method;
  }

  switch (type) {
    case "integer":
      return "number.int";
    case "number":
      return "number.float";
    case "boolean":
      return "datatype.boolean";
    case "null":
      return "__null__";
    default:
      return "lorem.word";
  }
}
