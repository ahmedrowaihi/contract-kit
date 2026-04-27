import type { $ } from "@hey-api/openapi-ts";
import type { IR } from "@hey-api/shared";
import ts from "typescript";

import {
  TYPIA_FORMAT_VALUES,
  TYPIA_INTEGER_FORMATS,
  TYPIA_TAG_META,
  type TypiaTagName,
} from "./typia-tags.generated";

type OpenApiTarget = "array" | "number" | "string";

/** Tags we emit from OpenAPI constraints. `(kind, targets)` comes from `TYPIA_TAG_META`. */
const HANDLED_TAGS = [
  "ExclusiveMaximum",
  "ExclusiveMinimum",
  "Format",
  "MaxItems",
  "MaxLength",
  "Maximum",
  "MinItems",
  "MinLength",
  "Minimum",
  "MultipleOf",
  "Pattern",
  "Type",
  "UniqueItems",
] as const satisfies ReadonlyArray<TypiaTagName>;

const SKIPPED_TAGS = [
  "Constant",
  "ContentMediaType",
  "Default",
  "Example",
  "Examples",
  "JsonSchemaPlugin",
  "Sequence",
  "TagBase",
] as const satisfies ReadonlyArray<TypiaTagName>;

/** Every typia tag must be handled or skipped; regen + this gate catches new tags. */
type _Unaccounted = Exclude<
  TypiaTagName,
  (typeof HANDLED_TAGS)[number] | (typeof SKIPPED_TAGS)[number]
>;
const _tagCoverage: [_Unaccounted] extends [never]
  ? true
  : { readonly unaccountedTypiaTag: _Unaccounted } = true;
void _tagCoverage;

const TYPIA_TO_OPENAPI_TARGET: Readonly<
  Record<string, ReadonlyArray<OpenApiTarget>>
> = {
  array: ["array"],
  bigint: ["number"],
  number: ["number"],
  string: ["string"],
};

const INTEGER_FORMATS: ReadonlySet<string> = new Set(TYPIA_INTEGER_FORMATS);
const TYPIA_FORMATS: ReadonlySet<string> = new Set(TYPIA_FORMAT_VALUES);

/** Emission plan: for each OpenAPI target, the tags that apply + their schema fields. */
const TAG_PLAN: Readonly<
  Record<OpenApiTarget, ReadonlyArray<{ field: string; name: TypiaTagName }>>
> = (() => {
  const plan: Record<
    OpenApiTarget,
    Array<{ field: string; name: TypiaTagName }>
  > = {
    array: [],
    number: [],
    string: [],
  };
  for (const name of HANDLED_TAGS) {
    const meta = TYPIA_TAG_META[name];
    if (!meta.kind) continue;
    const apiTargets = new Set<OpenApiTarget>();
    for (const typiaTarget of meta.targets) {
      for (const mapped of TYPIA_TO_OPENAPI_TARGET[typiaTarget] ?? []) {
        apiTargets.add(mapped);
      }
    }
    for (const apiTarget of apiTargets) {
      plan[apiTarget].push({ field: meta.kind, name });
    }
  }
  return plan;
})();

/**
 * Annotates a schema's generated TypeScript type with typia constraint
 * tag intersections. Register on `@hey-api/transformers.typeTransformers`.
 */
export function typiaTypeTransformer(ctx: {
  $: typeof $;
  schema: IR.SchemaObject;
}): ts.TypeNode | undefined {
  const { schema } = ctx;

  if (schema.type === "string") {
    const tagNodes = collectTags(schema, "string");
    return tagNodes.length
      ? ts.factory.createIntersectionTypeNode([stringKeyword(), ...tagNodes])
      : undefined;
  }

  if (schema.type === "integer" || schema.type === "number") {
    const tagNodes = collectTags(schema, "number");
    return tagNodes.length
      ? ts.factory.createIntersectionTypeNode([numberKeyword(), ...tagNodes])
      : undefined;
  }

  if (schema.type === "array") {
    const tagNodes = collectTags(schema, "array");
    if (!tagNodes.length) return;

    const itemTypeNode = buildArrayItemType(ctx);
    if (!itemTypeNode) return;

    return ts.factory.createIntersectionTypeNode([
      ts.factory.createTypeReferenceNode("Array", [itemTypeNode]),
      ...tagNodes,
    ]);
  }

  return;
}

function collectTags(
  schema: IR.SchemaObject,
  target: OpenApiTarget,
): Array<ts.TypeNode> {
  const out: Array<ts.TypeNode> = [];
  for (const { field, name } of TAG_PLAN[target]) {
    const value = (schema as Record<string, unknown>)[field];
    if (value == null) continue;

    if (name === "Type") {
      if (
        schema.type !== "integer" ||
        typeof value !== "string" ||
        !INTEGER_FORMATS.has(value)
      ) {
        continue;
      }
    } else if (name === "Format") {
      if (typeof value !== "string") continue;
      if (INTEGER_FORMATS.has(value)) continue;
      if (!TYPIA_FORMATS.has(value)) continue;
    } else if (name === "UniqueItems") {
      if (value !== true) continue;
      out.push(buildTagNode("UniqueItems", null));
      continue;
    }

    out.push(buildTagNode(name, value as number | string));
  }
  return out;
}

function buildArrayItemType(ctx: {
  $: typeof $;
  schema: IR.SchemaObject;
}): ts.TypeNode | null {
  const items = ctx.schema.items;
  if (!items || items.length === 0) {
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
  }
  if (items.length === 1) {
    return (
      typiaTypeTransformer({ ...ctx, schema: items[0]! }) ??
      primitiveToTypeNode(items[0]!)
    );
  }
  const mapped = items.map(
    (item) =>
      typiaTypeTransformer({ ...ctx, schema: item }) ??
      primitiveToTypeNode(item),
  );
  return mapped.every((n) => n !== null)
    ? ts.factory.createUnionTypeNode(mapped as Array<ts.TypeNode>)
    : null;
}

function buildTagNode(
  tagName: TypiaTagName,
  value: number | string | null,
): ts.TypeNode {
  const typeArgs =
    value === null
      ? undefined
      : [
          ts.factory.createLiteralTypeNode(
            typeof value === "number"
              ? ts.factory.createNumericLiteral(value)
              : ts.factory.createStringLiteral(value),
          ),
        ];
  return ts.factory.createImportTypeNode(
    ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("typia")),
    undefined,
    ts.factory.createQualifiedName(
      ts.factory.createIdentifier("tags"),
      ts.factory.createIdentifier(tagName),
    ),
    typeArgs,
  );
}

function primitiveToTypeNode(schema: IR.SchemaObject): ts.TypeNode | null {
  switch (schema.type) {
    case "boolean":
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    case "integer":
    case "number":
      return numberKeyword();
    case "string":
      return stringKeyword();
    default:
      return null;
  }
}

function stringKeyword(): ts.KeywordTypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
}

function numberKeyword(): ts.KeywordTypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
}
