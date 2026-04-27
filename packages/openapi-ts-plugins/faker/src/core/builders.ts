import type { Symbol as CodegenSymbol } from "@hey-api/codegen-core";
import { $, type TsDsl } from "@hey-api/openapi-ts";
import type ts from "typescript";

import { DATE_METHODS } from "./hints";
import {
  type FakerCallSpec,
  type ResolveOptions,
  resolveFakerCall,
} from "./resolve";
import type { PropertyInfo } from "./types";

export type FakerSymbol = CodegenSymbol;
export type FakerExpr = TsDsl<ts.Expression>;

export interface BuildFakerOptions extends ResolveOptions {
  /**
   * Called when `info.$ref` is set. Return an expression (typically a call to
   * a sibling factory) or `null` to skip ref handling. When `null` is returned
   * or no resolver is provided, the builder falls through to inline generation
   * if `info.children` / `info.items` / `info.type` are present, otherwise
   * defaults to `lorem.word`.
   */
  resolveRef?: (ref: string) => FakerExpr | null;
}

export function buildFakerCall(
  faker: FakerSymbol,
  spec: FakerCallSpec,
): FakerExpr {
  if (spec.method === "__null__") return $.literal(null);

  const [mod, fn] = spec.method.split(".");
  const args: FakerExpr[] = [];
  if (spec.args && Object.keys(spec.args).length > 0) {
    let argObj = $.object();
    for (const [key, value] of Object.entries(spec.args)) {
      argObj = argObj.prop(key, $.literal(value));
    }
    args.push(argObj);
  }

  const call = $(faker)
    .attr(mod!)
    .attr(fn!)
    .call(...args);
  if (DATE_METHODS.has(spec.method)) {
    return call.attr("toISOString").call();
  }
  return call;
}

export function buildFakerExpression(
  faker: FakerSymbol,
  info: PropertyInfo,
  opts: BuildFakerOptions = {},
): FakerExpr {
  if (info.$ref && opts.resolveRef) {
    const refExpr = opts.resolveRef(info.$ref);
    if (refExpr) return refExpr;
  }

  if (info.variants && info.variants.length > 0) {
    const arrowFns = info.variants.map((v) =>
      $.func().do($.return(buildFakerExpression(faker, v, opts))),
    );
    return $(faker)
      .attr("helpers")
      .attr("arrayElement")
      .call($.array(...arrowFns))
      .call();
  }

  if (info.enum && info.enum.length > 0) {
    const literals = $.array(...info.enum.map((v) => $.literal(v)));
    return $(faker).attr("helpers").attr("arrayElement").call(literals);
  }

  if (info.type === "object") {
    if (info.children && Object.keys(info.children).length > 0) {
      let obj = $.object().pretty();
      for (const [key, child] of Object.entries(info.children)) {
        obj = obj.prop(key, buildFakerExpression(faker, child, opts));
      }
      return obj;
    }
    return $.object();
  }

  if (info.type === "array") {
    if (!info.items) return $.array();
    const itemExpr = buildFakerExpression(faker, info.items, opts);
    const itemFn = $.func().do($.return(itemExpr));
    const respect = opts.respectConstraints ?? false;
    const min = respect ? (info.minItems ?? 1) : 1;
    const max = respect ? (info.maxItems ?? Math.max(min, 3)) : 3;
    const countArg = $.object()
      .prop("min", $.literal(min))
      .prop("max", $.literal(max));
    return $(faker)
      .attr("helpers")
      .attr("multiple")
      .call(itemFn, $.object().prop("count", countArg));
  }

  return buildFakerCall(faker, resolveFakerCall(info, opts));
}
