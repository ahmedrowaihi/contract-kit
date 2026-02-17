import type { IR } from "@hey-api/shared";
import type {
  FakerMethodResult,
  FieldContext,
  FieldNameHints,
  FormatMapping,
} from "../types";

/**
 * Detects the appropriate faker method for a field based on multiple heuristics
 */
export class FieldDetector {
  constructor(
    private fieldNameHints: FieldNameHints,
    private formatMapping: FormatMapping,
    private respectConstraints: boolean,
  ) {}

  /**
   * Main detection method - tries multiple strategies in order of specificity
   */
  detect(context: FieldContext): FakerMethodResult {
    // Strategy 1: Check for OpenAPI format
    if (context.schema.format) {
      const formatMethod = this.detectByFormat(context.schema.format);
      if (formatMethod) return formatMethod;
    }

    // Strategy 2: Check field name hints
    if (context.fieldName) {
      const hintMethod = this.detectByFieldName(context.fieldName);
      if (hintMethod) return hintMethod;
    }

    // Strategy 3: Check for enum
    // TODO: Re-enable enum detection after confirming IR.SchemaObject has enum property
    // if (context.schema.enum && context.schema.enum.length > 0) {
    //   return this.detectEnum(context.schema.enum);
    // }

    // Strategy 4: Check by type and constraints
    return this.detectByType(context.schema);
  }

  /**
   * Detect by OpenAPI format
   */
  private detectByFormat(format: string): FakerMethodResult | null {
    const method = this.formatMapping[format];
    return method ? { method } : null;
  }

  /**
   * Detect by field name using hints
   */
  private detectByFieldName(fieldName: string): FakerMethodResult | null {
    // Normalize field name (lowercase, remove underscores/dashes)
    const normalized = fieldName.toLowerCase().replace(/[_-]/g, "");

    // Try exact match first
    if (this.fieldNameHints[normalized]) {
      return { method: this.fieldNameHints[normalized]! };
    }

    // Try partial matches (e.g., "user_email" should match "email")
    for (const [hint, method] of Object.entries(this.fieldNameHints)) {
      if (normalized.includes(hint) || hint.includes(normalized)) {
        return { method };
      }
    }

    return null;
  }

  /**
   * Detect enum values
   * TODO: Re-enable after confirming IR.SchemaObject has enum property
   */
  // private detectEnum(values: readonly unknown[]): FakerMethodResult {
  //   return {
  //     method: "helpers.arrayElement",
  //     args: { values },
  //   };
  // }

  /**
   * Detect by OpenAPI type and constraints
   */
  private detectByType(schema: IR.SchemaObject): FakerMethodResult {
    const type = schema.type;

    switch (type) {
      case "string":
        return this.detectString(schema);
      case "number":
      case "integer":
        return this.detectNumber(schema);
      case "boolean":
        return { method: "datatype.boolean" };
      case "array":
        return this.detectArray(schema);
      case "object":
        return { method: "helpers.objectValue" };
      default:
        return { method: "lorem.word", fallback: "string.sample" };
    }
  }

  /**
   * Detect string type with constraints
   */
  private detectString(schema: IR.SchemaObject): FakerMethodResult {
    const minLength = schema.minLength;
    const maxLength = schema.maxLength;
    const pattern = schema.pattern;

    // Check for specific patterns
    if (pattern) {
      // URL pattern
      if (pattern.includes("http") || pattern.includes("://")) {
        return { method: "internet.url" };
      }
      // Email pattern
      if (pattern.includes("@") || pattern.includes("email")) {
        return { method: "internet.email" };
      }
      // UUID pattern
      if (
        pattern.includes("uuid") ||
        pattern.includes("[a-f0-9]{8}-[a-f0-9]{4}")
      ) {
        return { method: "string.uuid" };
      }
    }

    // Use constraints if respecting them
    if (this.respectConstraints && (minLength || maxLength)) {
      const length = maxLength ?? minLength ?? 10;
      return {
        method: "string.alpha",
        args: { length },
      };
    }

    // Default string
    return { method: "lorem.word" };
  }

  /**
   * Detect number/integer type with constraints
   */
  private detectNumber(schema: IR.SchemaObject): FakerMethodResult {
    const isInteger = schema.type === "integer";
    const min = schema.minimum;
    const max = schema.maximum;

    if (this.respectConstraints && (min !== undefined || max !== undefined)) {
      const args: Record<string, any> = {};
      if (min !== undefined) args.min = min;
      if (max !== undefined) args.max = max;

      return {
        method: isInteger ? "number.int" : "number.float",
        args,
      };
    }

    return {
      method: isInteger ? "number.int" : "number.float",
    };
  }

  /**
   * Detect array type
   */
  private detectArray(schema: IR.SchemaObject): FakerMethodResult {
    const minItems = schema.minItems ?? 1;
    const maxItems = schema.maxItems ?? 5;

    return {
      method: "helpers.multiple",
      args: { count: { min: minItems, max: maxItems } },
    };
  }
}

/**
 * Create a field detector instance
 */
export const createFieldDetector = (
  fieldNameHints: FieldNameHints,
  formatMapping: FormatMapping,
  respectConstraints: boolean,
): FieldDetector => {
  return new FieldDetector(fieldNameHints, formatMapping, respectConstraints);
};
