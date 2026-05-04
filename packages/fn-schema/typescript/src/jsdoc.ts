import type { JSDocInfo } from "@ahmedrowaihi/fn-schema-core";
import type { JSDoc } from "ts-morph";

export function parseJsDoc(docs: JSDoc[]): JSDocInfo | undefined {
  if (docs.length === 0) return undefined;
  const tags: Record<string, string | true> = {};
  const descriptionParts: string[] = [];

  for (const doc of docs) {
    const desc = doc.getDescription().trim();
    if (desc) descriptionParts.push(desc);
    for (const tag of doc.getTags()) {
      const name = tag.getTagName();
      const value = tag.getCommentText()?.trim();
      tags[name] = value && value.length > 0 ? value : true;
    }
  }

  const description = descriptionParts.join("\n").trim();
  return {
    description: description.length > 0 ? description : undefined,
    tags,
  };
}
