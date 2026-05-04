import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const RUNTIME_FNS = new Set(["schemaOf", "inputSchemaOf", "outputSchemaOf"]);

export interface TransformerOptions {
  /**
   * Path to a bundle JSON produced by `fn-schema --bundle ...`. Resolved
   * relative to `cwd` (default: process.cwd()) when not absolute.
   */
  bundlePath: string;
  cwd?: string;
}

interface BundleSig {
  input: unknown;
  output: unknown;
}

interface Bundle {
  signatures: Record<string, BundleSig>;
}

/**
 * TypeScript transformer that inlines pre-extracted JSON Schemas at compile
 * time. Replaces every `schemaOf(fn)` / `inputSchemaOf(fn)` / `outputSchemaOf(fn)`
 * call with the literal schema object pulled from the bundle, so consuming code
 * pays zero runtime cost and ships zero ts-morph dependency.
 *
 * Usage with ts-patch:
 * ```jsonc
 * // tsconfig.json
 * {
 *   "compilerOptions": {
 *     "plugins": [
 *       {
 *         "transform": "@ahmedrowaihi/fn-schema-transformer",
 *         "bundlePath": "./generated/schemas.json"
 *       }
 *     ]
 *   }
 * }
 * ```
 */
export default function transformer(
  _program: ts.Program,
  options: TransformerOptions,
): ts.TransformerFactory<ts.SourceFile> {
  if (!options?.bundlePath) {
    throw new Error(
      'fn-schema-transformer: `bundlePath` is required. Run `fn-schema --bundle <path>` to produce one, then point the plugin at it via { "bundlePath": "..." }.',
    );
  }
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const abs = path.isAbsolute(options.bundlePath)
    ? options.bundlePath
    : path.resolve(cwd, options.bundlePath);

  let bundle: Bundle | null = null;
  const loadBundle = (): Bundle => {
    if (bundle) return bundle;
    const raw = readFileSync(abs, "utf-8");
    bundle = JSON.parse(raw) as Bundle;
    return bundle;
  };

  return (context) => (sourceFile) => {
    const visit: ts.Visitor = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        RUNTIME_FNS.has(node.expression.text)
      ) {
        const arg = node.arguments[0];
        if (arg && ts.isIdentifier(arg)) {
          const sig = loadBundle().signatures[arg.text];
          if (sig) {
            switch (node.expression.text) {
              case "schemaOf":
                return jsonToLiteral({ input: sig.input, output: sig.output });
              case "inputSchemaOf":
                return jsonToLiteral(sig.input);
              case "outputSchemaOf":
                return jsonToLiteral(sig.output);
            }
          }
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(sourceFile, visit) as ts.SourceFile;
  };
}

function jsonToLiteral(value: unknown): ts.Expression {
  if (value === null) return ts.factory.createNull();
  if (value === undefined) return ts.factory.createIdentifier("undefined");
  if (typeof value === "string") return ts.factory.createStringLiteral(value);
  if (typeof value === "number")
    return value < 0
      ? ts.factory.createPrefixUnaryExpression(
          ts.SyntaxKind.MinusToken,
          ts.factory.createNumericLiteral(-value),
        )
      : ts.factory.createNumericLiteral(value);
  if (typeof value === "boolean")
    return value ? ts.factory.createTrue() : ts.factory.createFalse();
  if (Array.isArray(value)) {
    return ts.factory.createArrayLiteralExpression(value.map(jsonToLiteral));
  }
  if (typeof value === "object") {
    return ts.factory.createObjectLiteralExpression(
      Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        ts.factory.createPropertyAssignment(
          /^[A-Za-z_$][\w$]*$/.test(k)
            ? ts.factory.createIdentifier(k)
            : ts.factory.createStringLiteral(k),
          jsonToLiteral(v),
        ),
      ),
      true,
    );
  }
  return ts.factory.createIdentifier("undefined");
}
