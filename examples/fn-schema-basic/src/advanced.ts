/* Exercises: this-param skip, default-export arrow, object-literal methods,
   function/method overloads, and named/default/namespace imports. */

import type Telemetry from "./imports.js";
import * as M from "./imports.js";
import { type Audit, type Tag } from "./imports.js";

export interface Article {
  id: string;
  title: string;
  tags: Tag[];
  audit: Audit;
}

/* ─── this-parameter ─── */
/** @schema articles.label */
export function labelArticle(this: Article, label: string): string {
  void this;
  return label;
}

/* ─── default-export arrow ─── */
export default async (input: { telemetry: Telemetry }): Promise<Article> => {
  void input;
  return {
    id: "a_1",
    title: "",
    tags: [],
    audit: { createdBy: "system", createdAt: "" },
  };
};

/* ─── object-literal API surface ─── */
export const articles = {
  /** @schema articles.create */
  async create(input: { title: string; tags: Tag[] }): Promise<Article> {
    void input;
    return {
      id: "a_2",
      title: input.title,
      tags: input.tags,
      audit: { createdBy: "u", createdAt: "" },
    };
  },
  tag: (input: { article: Article; tag: M.Tag }): M.Tag => input.tag,
};

/* ─── function overloads ─── */
/** @schema articles.find */
export function findArticle(id: string): Article | null;
export function findArticle(filter: { tag: string }): Article[];
export function findArticle(
  arg: string | { tag: string },
): Article | Article[] | null {
  void arg;
  return null;
}
