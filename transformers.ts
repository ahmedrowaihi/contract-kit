import ts from "typescript";

function typiaTag(tagName: string, value: number | string): ts.TypeNode {
  return ts.factory.createImportTypeNode(
    ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("typia")),
    undefined,
    ts.factory.createQualifiedName(
      ts.factory.createIdentifier("tags"),
      ts.factory.createIdentifier(tagName),
    ),
    [
      ts.factory.createLiteralTypeNode(
        typeof value === "number"
          ? ts.factory.createNumericLiteral(value)
          : ts.factory.createStringLiteral(value),
      ),
    ],
  );
}

function primitiveToTypeNode(schema: any): ts.TypeNode | null {
  switch (schema?.type) {
    case "string":
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    case "number":
    case "integer":
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case "boolean":
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    default:
      return null;
  }
}

export function typiaTypeTransformer({
  schema,
}: {
  schema: any;
}): ts.TypeNode | undefined {
  const tagNodes: ts.TypeNode[] = [];

  if (schema.type === "string") {
    if (schema.minLength != null)
      tagNodes.push(typiaTag("MinLength", schema.minLength));
    if (schema.maxLength != null)
      tagNodes.push(typiaTag("MaxLength", schema.maxLength));
    if (schema.pattern != null)
      tagNodes.push(typiaTag("Pattern", schema.pattern));
    if (schema.format != null) tagNodes.push(typiaTag("Format", schema.format));
    if (tagNodes.length > 0)
      return ts.factory.createIntersectionTypeNode([
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ...tagNodes,
      ]);
  }

  if (schema.type === "integer" || schema.type === "number") {
    if (schema.minimum != null)
      tagNodes.push(typiaTag("Minimum", schema.minimum));
    if (schema.exclusiveMinimum != null)
      tagNodes.push(typiaTag("ExclusiveMinimum", schema.exclusiveMinimum));
    if (schema.maximum != null)
      tagNodes.push(typiaTag("Maximum", schema.maximum));
    if (schema.exclusiveMaximum != null)
      tagNodes.push(typiaTag("ExclusiveMaximum", schema.exclusiveMaximum));
    if (schema.type === "integer") {
      const fmt = schema.format as string | undefined;
      if (
        fmt === "int32" ||
        fmt === "int64" ||
        fmt === "uint32" ||
        fmt === "uint64" ||
        fmt === "float" ||
        fmt === "double"
      )
        tagNodes.push(typiaTag("Type", fmt));
    }
    if (tagNodes.length > 0)
      return ts.factory.createIntersectionTypeNode([
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
        ...tagNodes,
      ]);
  }

  if (schema.type === "array") {
    if (schema.minItems != null)
      tagNodes.push(typiaTag("MinItems", schema.minItems));
    if (schema.maxItems != null)
      tagNodes.push(typiaTag("MaxItems", schema.maxItems));
    if (tagNodes.length > 0) {
      const items: any[] | undefined = schema.items;
      let itemTypeNode: ts.TypeNode | null = null;

      if (!items || items.length === 0) {
        itemTypeNode = ts.factory.createKeywordTypeNode(
          ts.SyntaxKind.UnknownKeyword,
        );
      } else if (items.length === 1) {
        itemTypeNode =
          typiaTypeTransformer({ schema: items[0] }) ??
          primitiveToTypeNode(items[0]);
      } else {
        const mapped = items.map(
          (item) =>
            typiaTypeTransformer({ schema: item }) ?? primitiveToTypeNode(item),
        );
        if (mapped.every((n) => n !== null))
          itemTypeNode = ts.factory.createUnionTypeNode(
            mapped as ts.TypeNode[],
          );
      }

      if (itemTypeNode !== null) {
        const arrayType = ts.factory.createTypeReferenceNode("Array", [
          itemTypeNode,
        ]);
        return ts.factory.createIntersectionTypeNode([arrayType, ...tagNodes]);
      }
    }
  }

  return undefined;
}
