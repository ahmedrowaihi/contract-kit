#!/usr/bin/env jiti
/**
 * Regenerates `src/shared/typia-tags.generated.ts` from `@typia/interface`.
 * Run via `pnpm sync-tags` after bumping typia. Output is committed.
 */

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const interfacePkgJson = require.resolve("@typia/interface/package.json");
const interfaceRoot = path.dirname(interfacePkgJson);
const tagsDir = path.join(interfaceRoot, "lib", "tags");

const outputPath = path.resolve(
  __dirname,
  "..",
  "src",
  "shared",
  "typia-tags.generated.ts",
);

interface TagMetadata {
  kind: string | null;
  targets: ReadonlyArray<string>;
}

function parseFile(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}

/** Tag names come from the barrel's `export * from './<TagName>'` filenames. */
function readTagNames(): ReadonlyArray<string> {
  const src = parseFile(path.join(tagsDir, "index.d.ts"));
  const names: Array<string> = [];
  for (const stmt of src.statements) {
    if (!ts.isExportDeclaration(stmt) || !stmt.moduleSpecifier) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const basename = path.basename(stmt.moduleSpecifier.text);
    if (basename === "index") continue;
    names.push(basename);
  }
  return names.sort();
}

/** Extracts `{ kind, targets }` from `TagBase<{...}>`; empty when shape doesn't match. */
function readTagMetadata(tagName: string): TagMetadata {
  const src = parseFile(path.join(tagsDir, `${tagName}.d.ts`));

  let tagTypeBody: ts.TypeLiteralNode | null = null;
  for (const stmt of src.statements) {
    if (!ts.isTypeAliasDeclaration(stmt) || stmt.name.text !== tagName)
      continue;
    const body = extractTagBaseArgument(stmt.type);
    if (body) tagTypeBody = body;
    break;
  }

  if (!tagTypeBody) return { kind: null, targets: [] };

  const kind = extractPropertyLiteral(tagTypeBody, "kind");
  const targetMember = findPropertyType(tagTypeBody, "target");
  const targets = targetMember ? extractTargetMembers(targetMember) : [];

  return { kind, targets };
}

function extractTagBaseArgument(node: ts.TypeNode): ts.TypeLiteralNode | null {
  if (!ts.isTypeReferenceNode(node)) return null;
  if (!ts.isIdentifier(node.typeName) || node.typeName.text !== "TagBase")
    return null;
  const arg = node.typeArguments?.[0];
  if (!arg || !ts.isTypeLiteralNode(arg)) return null;
  return arg;
}

function findPropertyType(
  literal: ts.TypeLiteralNode,
  name: string,
): ts.TypeNode | null {
  for (const member of literal.members) {
    if (!ts.isPropertySignature(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    if (member.name.text !== name) continue;
    return member.type ?? null;
  }
  return null;
}

function extractPropertyLiteral(
  literal: ts.TypeLiteralNode,
  name: string,
): string | null {
  const type = findPropertyType(literal, name);
  if (!type) return null;
  if (!ts.isLiteralTypeNode(type) || !ts.isStringLiteral(type.literal))
    return null;
  return type.literal.text;
}

function extractTargetMembers(node: ts.TypeNode): ReadonlyArray<string> {
  const out = new Set<string>();
  collectLiteralLeaves(node, out);
  return [...out];
}

/** Collects string-literal leaves from literal/union/conditional type nodes. */
function collectLiteralLeaves(node: ts.TypeNode, out: Set<string>): void {
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) {
    out.add(node.literal.text);
    return;
  }
  if (ts.isUnionTypeNode(node)) {
    for (const member of node.types) collectLiteralLeaves(member, out);
    return;
  }
  if (ts.isConditionalTypeNode(node)) {
    collectLiteralLeaves(node.trueType, out);
    collectLiteralLeaves(node.falseType, out);
    return;
  }
}

function readFormatValues(): ReadonlyArray<string> {
  return readLiteralUnionFromNamespaceTypeAlias({
    file: path.join(tagsDir, "Format.d.ts"),
    namespace: "Format",
    typeAlias: "Value",
  });
}

function readIntegerFormats(): ReadonlyArray<string> {
  const src = parseFile(path.join(tagsDir, "Type.d.ts"));
  for (const stmt of src.statements) {
    if (!ts.isTypeAliasDeclaration(stmt) || stmt.name.text !== "Type") continue;
    const constraint = stmt.typeParameters?.[0]?.constraint;
    if (!constraint) continue;
    return extractLiteralUnion(constraint);
  }
  throw new Error("Could not extract Type<V> constraint");
}

function readLiteralUnionFromNamespaceTypeAlias({
  file,
  namespace,
  typeAlias,
}: {
  file: string;
  namespace: string;
  typeAlias: string;
}): ReadonlyArray<string> {
  const src = parseFile(file);
  for (const stmt of src.statements) {
    if (!ts.isModuleDeclaration(stmt) || stmt.name.text !== namespace) continue;
    const body = stmt.body;
    if (!body || !ts.isModuleBlock(body)) continue;
    for (const inner of body.statements) {
      if (!ts.isTypeAliasDeclaration(inner) || inner.name.text !== typeAlias) {
        continue;
      }
      return extractLiteralUnion(inner.type);
    }
  }
  throw new Error(`Could not extract ${namespace}.${typeAlias} from ${file}`);
}

function extractLiteralUnion(node: ts.TypeNode): ReadonlyArray<string> {
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) {
    return [node.literal.text];
  }
  if (!ts.isUnionTypeNode(node)) {
    throw new Error(
      `Expected literal or union, got ${ts.SyntaxKind[node.kind]}`,
    );
  }
  const out: Array<string> = [];
  for (const member of node.types) {
    if (!ts.isLiteralTypeNode(member) || !ts.isStringLiteral(member.literal)) {
      throw new Error(`Non-literal member: ${ts.SyntaxKind[member.kind]}`);
    }
    out.push(member.literal.text);
  }
  return out;
}

function emitArray(name: string, values: ReadonlyArray<string>): string {
  const body = values.map((v) => `  ${JSON.stringify(v)},`).join("\n");
  return `export const ${name} = [\n${body}\n] as const;`;
}

function emitTagMetadata(
  entries: ReadonlyArray<[string, TagMetadata]>,
): string {
  const lines = entries.map(([name, meta]) => {
    const kind = meta.kind === null ? "null" : JSON.stringify(meta.kind);
    const targets = meta.targets.map((t) => JSON.stringify(t)).join(", ");
    return `  ${name}: { kind: ${kind}, targets: [${targets}] as const },`;
  });
  return `export const TYPIA_TAG_META = {\n${lines.join("\n")}\n} as const;`;
}

function readTypiaVersion(): string {
  const typiaPkgJson = require.resolve("typia/package.json");
  return (
    JSON.parse(fs.readFileSync(typiaPkgJson, "utf8")) as { version: string }
  ).version;
}

function run(): void {
  const tagNames = readTagNames();
  const tagEntries: Array<[string, TagMetadata]> = tagNames.map((name) => [
    name,
    readTagMetadata(name),
  ]);
  const formatValues = readFormatValues();
  const integerFormats = readIntegerFormats();
  const typiaVersion = readTypiaVersion();

  const content = `/**
 * AUTO-GENERATED — do not edit.
 * Regenerate via \`pnpm sync-tags\` after bumping typia.
 *
 * Source: @typia/interface v${typiaVersion}
 */

${emitArray("TYPIA_TAGS", tagNames)}

${emitTagMetadata(tagEntries)}

${emitArray("TYPIA_FORMAT_VALUES", formatValues)}

${emitArray("TYPIA_INTEGER_FORMATS", integerFormats)}

export type TypiaTagName = (typeof TYPIA_TAGS)[number];
export type TypiaFormatValue = (typeof TYPIA_FORMAT_VALUES)[number];
export type TypiaIntegerFormat = (typeof TYPIA_INTEGER_FORMATS)[number];
`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);

  console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
  console.log(`  tags: ${tagNames.length}`);
  console.log(`  formats: ${formatValues.length}`);
  console.log(`  integer formats: ${integerFormats.length}`);
}

run();
