import { parseSpec } from "@ahmedrowaihi/asyncapi-core";
import type { AsyncAPIDocumentInterface } from "@asyncapi/parser";

/**
 * Resolve a `GenerateOptions['input']` to a parsed AsyncAPI document.
 * Strings are dispatched as URL or filesystem path; pre-parsed documents
 * are returned as-is.
 */
export async function loadDocument(
  input: string | AsyncAPIDocumentInterface,
): Promise<AsyncAPIDocumentInterface> {
  if (typeof input !== "string") return input;
  const looksLikeUrl = /^https?:\/\//i.test(input);
  const result = await parseSpec(
    looksLikeUrl ? { kind: "url", url: input } : { kind: "file", path: input },
  );
  if (!result.document) {
    const errors = result.diagnostics
      .filter((d) => d.severity === 0)
      .map((d) => `  - ${d.message}`)
      .join("\n");
    throw new Error(`AsyncAPI spec failed validation:\n${errors}`);
  }
  return result.document;
}
