import { $ } from "@hey-api/openapi-ts";

import { DATE_METHODS } from "./hints";
import { resolveFakerMethod } from "./resolve";
import type { PropertyInfo } from "./types";

export function buildFakerCall(faker: any, method: string): any {
  if (method === "__null__") return $.literal(null);
  const [mod, fn] = method.split(".");
  const call = $(faker).attr(mod!).attr(fn!).call();
  if (DATE_METHODS.has(method)) {
    return call.attr("toISOString").call();
  }
  return call;
}

export function buildFakerExpression(faker: any, info: PropertyInfo): any {
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
    return $.object();
  }

  if (info.type === "array") {
    if (info.items) {
      return $.array(buildFakerExpression(faker, info.items));
    }
    return $.array();
  }

  return buildFakerCall(faker, resolveFakerMethod(info.name, info.type, info.format));
}
