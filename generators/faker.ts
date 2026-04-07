import { $ } from "@hey-api/openapi-ts";

import type { RouterNode } from "../router-organizer";
import { operationName } from "../utils";
import type { PropertyInfo, ResponseSchemaInfo } from "./handlers";
import type { GeneratorContext } from "./types";

// ============================================================================
// Field name → faker method heuristics
// ============================================================================

/**
 * Maps faker method → the JS type it returns at runtime.
 * Used to ensure field hints only apply when the return type
 * matches the OpenAPI schema type.
 */
const FAKER_RETURN_TYPE: Record<string, "string" | "number" | "boolean"> = {
  "number.int": "number",
  "number.float": "number",
  "datatype.boolean": "boolean",
  "string.uuid": "string",
  "string.alpha": "string",
  "string.alphanumeric": "string",
  "person.fullName": "string",
  "person.firstName": "string",
  "person.lastName": "string",
  "internet.userName": "string",
  "internet.displayName": "string",
  "internet.email": "string",
  "internet.url": "string",
  "internet.domainName": "string",
  "internet.ip": "string",
  "internet.ipv4": "string",
  "internet.ipv6": "string",
  "phone.number": "string",
  "location.streetAddress": "string",
  "location.street": "string",
  "location.city": "string",
  "location.country": "string",
  "location.zipCode": "string",
  "location.latitude": "number",
  "location.longitude": "number",
  "image.avatar": "string",
  "image.url": "string",
  "lorem.word": "string",
  "lorem.sentence": "string",
  "lorem.paragraph": "string",
  "lorem.paragraphs": "string",
  "lorem.text": "string",
  "company.name": "string",
  "commerce.price": "string",
  "finance.currencyCode": "string",
  "date.past": "string",
  "date.recent": "string",
  "date.birthdate": "string",
  "system.fileName": "string",
  "color.human": "string",
};

/** Maps a schema type to the expected JS return type for faker methods. */
function schemaTypeToJs(type: string): "string" | "number" | "boolean" {
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

/** Returns true if a faker method's return type is compatible with the schema type. */
function isCompatible(method: string, schemaType: string): boolean {
  const returnType = FAKER_RETURN_TYPE[method];
  if (!returnType) return true; // unknown method — allow it
  return returnType === schemaTypeToJs(schemaType);
}

const FIELD_HINTS: Record<string, string> = {
  id: "number.int",
  uuid: "string.uuid",
  guid: "string.uuid",
  name: "person.fullName",
  firstname: "person.firstName",
  lastname: "person.lastName",
  username: "internet.userName",
  displayname: "person.fullName",
  nickname: "internet.displayName",
  email: "internet.email",
  phone: "phone.number",
  phonenumber: "phone.number",
  address: "location.streetAddress",
  street: "location.street",
  city: "location.city",
  country: "location.country",
  zipcode: "location.zipCode",
  latitude: "location.latitude",
  longitude: "location.longitude",
  url: "internet.url",
  website: "internet.url",
  domain: "internet.domainName",
  ip: "internet.ip",
  avatar: "image.avatar",
  description: "lorem.paragraph",
  bio: "lorem.paragraph",
  summary: "lorem.sentence",
  content: "lorem.paragraphs",
  comment: "lorem.sentence",
  message: "lorem.sentence",
  company: "company.name",
  organization: "company.name",
  price: "commerce.price",
  amount: "number.float",
  currency: "finance.currencyCode",
  createdat: "date.past",
  updatedat: "date.recent",
  date: "date.past",
  timestamp: "date.past",
  image: "image.url",
  imageurl: "image.url",
  photo: "image.url",
  thumbnail: "image.url",
  filename: "system.fileName",
  color: "color.human",
  status: "lorem.word",
  title: "lorem.sentence",
};

const FORMAT_HINTS: Record<string, string> = {
  email: "internet.email",
  uri: "internet.url",
  url: "internet.url",
  uuid: "string.uuid",
  "date-time": "date.recent",
  date: "date.past",
  ipv4: "internet.ipv4",
  ipv6: "internet.ipv6",
  float: "number.float",
  double: "number.float",
  int32: "number.int",
  int64: "number.int",
};

/**
 * Resolves a faker method for a field. Schema type always wins —
 * field name hints are only applied when their return type is
 * compatible with the schema's declared type.
 */
function resolveFakerMethod(
  fieldName: string,
  type: string,
  format?: string,
): string {
  // 1. Format hints (only if compatible with schema type)
  if (
    format &&
    FORMAT_HINTS[format] &&
    isCompatible(FORMAT_HINTS[format], type)
  ) {
    return FORMAT_HINTS[format];
  }

  // 2. Field name hints (only if compatible with schema type)
  const normalized = fieldName.toLowerCase().replace(/[_-]/g, "");
  if (FIELD_HINTS[normalized] && isCompatible(FIELD_HINTS[normalized], type)) {
    return FIELD_HINTS[normalized];
  }
  for (const [hint, method] of Object.entries(FIELD_HINTS)) {
    if (normalized.includes(hint) && isCompatible(method, type)) return method;
  }

  // 3. Fall back to type-correct defaults
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

// ============================================================================
// AST builders using $ codegen API
// ============================================================================

/** Faker methods that return Date objects — need `.toISOString()` to produce strings. */
const DATE_METHODS = new Set(["date.past", "date.recent", "date.birthdate"]);

/**
 * Build a faker call expression: `faker.module.method()`
 * Date methods are chained with `.toISOString()` to return strings.
 */
function buildFakerCall(faker: any, method: string): any {
  if (method === "__null__") return $.literal(null);
  const [mod, fn] = method.split(".");
  const call = $(faker).attr(mod!).attr(fn!).call();
  if (DATE_METHODS.has(method)) {
    return call.attr("toISOString").call();
  }
  return call;
}

/**
 * Recursively build a faker expression for a property.
 */
function buildFakerExpression(faker: any, info: PropertyInfo): any {
  // Enum values: use faker.helpers.arrayElement([...values])
  if (info.enum && info.enum.length > 0) {
    const literals = $.array(...info.enum.map((v) => $.literal(v)));
    return $(faker).attr("helpers").attr("arrayElement").call(literals);
  }

  if (info.type === "object") {
    if (info.children && Object.keys(info.children).length > 0) {
      let obj = $.object().pretty();
      for (const [key, child] of Object.entries(info.children)) {
        obj = obj.prop(key, buildFakerExpression(faker, child));
      }
      return obj;
    }
    // Schemaless object (no properties) — return empty object
    return $.object();
  }
  if (info.type === "array") {
    if (info.items) {
      return $.array(buildFakerExpression(faker, info.items));
    }
    return $.array();
  }
  return buildFakerCall(
    faker,
    resolveFakerMethod(info.name, info.type, info.format),
  );
}

// ============================================================================
// Public API
// ============================================================================

export interface FakerGeneratorInput {
  plugin: GeneratorContext["plugin"];
  routerStructure: Map<string, RouterNode[]>;
  responseSchemas: Map<string, ResponseSchemaInfo>;
}

export interface FakerGeneratorOutput {
  /** Map of normalized operation name → factory function name (e.g. "mockGetUserSettings") */
  factoryNames: Map<string, string>;
}

/**
 * Generates `faker.gen` files per tag group using the plugin's codegen pipeline.
 * Each file exports factory functions like `mockGetUserSettings()`.
 */
export const generateFakerFactories = ({
  plugin,
  routerStructure,
  responseSchemas,
}: FakerGeneratorInput): FakerGeneratorOutput => {
  const faker = plugin.external("@faker-js/faker.faker");
  const factoryNames = new Map<string, string>();

  for (const [group, nodes] of routerStructure) {
    // Use original group key for the file path (preserves casing from OpenAPI tags)
    const fakerFile = `${plugin.name}/${group}/faker.gen`;

    for (const node of nodes) {
      const opName = operationName(node.operationName);
      const schema = responseSchemas.get(opName);
      const factoryName = `mock${opName.charAt(0).toUpperCase()}${opName.slice(1)}`;

      const symbol = plugin.symbol(factoryName, {
        getFilePath: () => fakerFile,
        meta: {
          category: "faker",
          resource: "factory",
          resourceId: opName,
          tool: "orpc",
        },
      });

      factoryNames.set(opName, factoryName);

      // Build the factory body
      let bodyExpr: any;
      if (schema && Object.keys(schema.properties).length > 0) {
        let obj = $.object().pretty();
        for (const [key, info] of Object.entries(schema.properties)) {
          obj = obj.prop(key, buildFakerExpression(faker, info));
        }
        bodyExpr = obj;
      } else {
        // No schema — return empty object
        bodyExpr = $.object();
      }

      const factoryFn = $.func().do($.return(bodyExpr));
      const statement = $.const(symbol).export().assign(factoryFn);
      plugin.node(statement);
    }
  }

  return { factoryNames };
};
