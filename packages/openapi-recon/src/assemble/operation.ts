import type { OpenAPIV3_1 } from "@hey-api/spec-types";

import { mergeSchema } from "../infer/schema";
import type { OperationObservation, Schema } from "../types";
import { describeStatus } from "./status";

/**
 * Accumulator for one OpenAPI operation, merged from multiple observations
 * that share `(origin, templated path, method)`. Holds path/query parameter
 * shapes, body/response schemas, and detected auth schemes; converts to a
 * fully-formed `OperationObject` on demand.
 */
export class OperationBuilder {
  private pathParams: Record<string, "string" | "integer"> = {};
  private queryParams: Record<string, "string" | "integer" | "boolean"> = {};
  private requestBodySchema: Schema | null = null;
  private responseSchemas = new Map<number, Schema>();
  private authSchemes = new Set<string>();

  static fromObservation(
    obs: OperationObservation,
    pathParams: Record<string, "string" | "integer">,
  ): OperationBuilder {
    const op = new OperationBuilder();
    op.pathParams = pathParams;
    op.queryParams = { ...obs.queryParams };
    op.requestBodySchema = obs.requestBodySchema;
    op.responseSchemas = new Map(obs.responseSchemas);
    op.authSchemes = new Set(obs.authSchemes);
    return op;
  }

  merge(other: OperationBuilder): this {
    Object.assign(this.pathParams, other.pathParams);
    Object.assign(this.queryParams, other.queryParams);
    this.requestBodySchema =
      this.requestBodySchema && other.requestBodySchema
        ? mergeSchema(this.requestBodySchema, other.requestBodySchema)
        : (other.requestBodySchema ?? this.requestBodySchema);
    for (const [status, schema] of other.responseSchemas) {
      const existing = this.responseSchemas.get(status);
      this.responseSchemas.set(
        status,
        existing ? mergeSchema(existing, schema) : schema,
      );
    }
    for (const id of other.authSchemes) this.authSchemes.add(id);
    return this;
  }

  toOpenApi(method: string): OpenAPIV3_1.OperationObject {
    const op: OpenAPIV3_1.OperationObject = {
      responses: this.buildResponses(),
    };
    const parameters = this.buildParameters();
    if (parameters.length > 0) op.parameters = parameters;

    const body = this.buildRequestBody(method);
    if (body) op.requestBody = body;

    if (this.authSchemes.size > 0) {
      op.security = [...this.authSchemes].map((id) => ({ [id]: [] }));
    }
    return op;
  }

  private buildParameters(): OpenAPIV3_1.ParameterObject[] {
    const out: OpenAPIV3_1.ParameterObject[] = [];
    for (const [name, type] of Object.entries(this.pathParams)) {
      out.push({
        name,
        in: "path",
        required: true,
        schema: { type },
      } as OpenAPIV3_1.ParameterObject);
    }
    for (const [name, type] of Object.entries(this.queryParams)) {
      out.push({
        name,
        in: "query",
        schema: { type },
      } as OpenAPIV3_1.ParameterObject);
    }
    return out;
  }

  /**
   * Emit the request body content. PATCH bodies drop the top-level `required`
   * array — partial-update semantics mean fields aren't all required.
   */
  private buildRequestBody(
    method: string,
  ): OpenAPIV3_1.RequestBodyObject | undefined {
    if (!this.requestBodySchema) return undefined;
    const schema =
      method === "patch"
        ? stripTopLevelRequired(this.requestBodySchema)
        : this.requestBodySchema;
    return {
      content: {
        "application/json": { schema: schema as OpenAPIV3_1.SchemaObject },
      },
    };
  }

  private buildResponses(): Record<string, OpenAPIV3_1.ResponseObject> {
    const out: Record<string, OpenAPIV3_1.ResponseObject> = {};
    for (const [status, schema] of this.responseSchemas) {
      out[String(status)] = {
        description: describeStatus(status),
        content: {
          "application/json": { schema: schema as OpenAPIV3_1.SchemaObject },
        },
      };
    }
    if (Object.keys(out).length === 0) {
      out.default = { description: "Default response" };
    }
    return out;
  }
}

function stripTopLevelRequired(s: Schema): Schema {
  if (s.type !== "object" || !("required" in s)) return s;
  const { required: _required, ...rest } = s as Schema & {
    required?: string[];
  };
  return rest as Schema;
}
