import type { SwDecl, SwExpr, SwType } from "../../sw-dsl/index.js";
import {
  swArg,
  swArray,
  swArrayLit,
  swBool,
  swCall,
  swCase,
  swClosure,
  swDotCase,
  swEnum,
  swEnumCase,
  swFun,
  swFunParam,
  swGenericParam,
  swGuardLet,
  swIdent,
  swIf,
  swInterp,
  swLet,
  swMember,
  swRef,
  swReturn,
  swStr,
  swString,
  swSwitch,
} from "../../sw-dsl/index.js";

const URL_QUERY_ITEM_ARRAY: SwType = swArray(swRef("URLQueryItem"));

/**
 * Emit the runtime types impl methods rely on for query-string
 * serialization.
 *
 *  - `QueryStyle` enum (`.form`, `.spaceDelimited`, `.pipeDelimited`).
 *  - `URLEncoding` namespace (`final class` with private init + static
 *    helpers — Swift's idiomatic stateless-helper shape).
 *
 * `URLEncoding.query` has two overloads, both accepting Optional inputs
 * so required and optional params share the same call site:
 *
 *   - `query(_ name: String, value: T?) -> [URLQueryItem]`
 *   - `query(_ name: String, values: [T]?, style:explode:) -> [URLQueryItem]`
 *
 * The array overload follows OpenAPI's `style` + `explode` rules.
 */
export function urlEncodingDecls(): ReadonlyArray<SwDecl> {
  return [queryStyleEnum(), urlEncodingNamespace()];
}

function queryStyleEnum(): SwDecl {
  return swEnum({
    name: "QueryStyle",
    access: "public",
    runtime: true,
    cases: [
      swEnumCase("form"),
      swEnumCase("spaceDelimited"),
      swEnumCase("pipeDelimited"),
    ],
  });
}

function urlEncodingNamespace(): SwDecl {
  return {
    kind: "class",
    name: "URLEncoding",
    access: "public",
    modifiers: ["final"],
    conforms: [],
    properties: [],
    inits: [{ kind: "init", access: "private", params: [], body: [] }],
    funs: [scalarQueryFn(), arrayQueryFn()],
    runtime: true,
  };
}

function scalarQueryFn() {
  const t = swRef("T");
  return swFun({
    name: "query",
    access: "public",
    isStatic: true,
    generics: [swGenericParam("T")],
    params: [
      swFunParam({ name: "name", label: "_", type: swString }),
      swFunParam({ name: "value", type: { kind: "optional", inner: t } }),
    ],
    returnType: URL_QUERY_ITEM_ARRAY,
    body: [
      swGuardLet("value", swIdent("value"), [swReturn(swArrayLit([]))]),
      swReturn(
        swArrayLit([
          swCall(swIdent("URLQueryItem"), [
            swArg(swIdent("name"), "name"),
            swArg(swInterp([swIdent("value")]), "value"),
          ]),
        ]),
      ),
    ],
  });
}

function arrayQueryFn() {
  const t = swRef("T");
  return swFun({
    name: "query",
    access: "public",
    isStatic: true,
    generics: [swGenericParam("T")],
    params: [
      swFunParam({ name: "name", label: "_", type: swString }),
      swFunParam({
        name: "values",
        type: { kind: "optional", inner: swArray(t) },
      }),
      swFunParam({
        name: "style",
        type: swRef("QueryStyle"),
        default: ".form",
      }),
      swFunParam({ name: "explode", type: swBool, default: "true" }),
    ],
    returnType: URL_QUERY_ITEM_ARRAY,
    body: [
      swGuardLet("values", swIdent("values"), [swReturn(swArrayLit([]))]),
      swIf(swIdent("explode"), [
        swReturn(
          swCall(
            swMember(swIdent("values"), "map"),
            [],
            swClosure(
              [],
              [
                swReturn(
                  swCall(swIdent("URLQueryItem"), [
                    swArg(swIdent("name"), "name"),
                    swArg(swInterp([swIdent("$0")]), "value"),
                  ]),
                ),
              ],
            ),
          ),
        ),
      ]),
      swLet("separator", separatorForStyle()),
      swLet(
        "joined",
        swCall(swMember(stringifiedValues(), "joined"), [
          swArg(swIdent("separator"), "separator"),
        ]),
      ),
      swReturn(
        swArrayLit([
          swCall(swIdent("URLQueryItem"), [
            swArg(swIdent("name"), "name"),
            swArg(swIdent("joined"), "value"),
          ]),
        ]),
      ),
    ],
  });
}

/**
 * `{ switch style { case .form: ","; case .spaceDelimited: " "; case .pipeDelimited: "|" } }()`
 *
 * Swift's `switch` is a statement, so we wrap it in an immediately-
 * invoked closure to get an expression that returns the chosen string.
 */
function separatorForStyle(): SwExpr {
  return swCall(
    swClosure(
      [],
      [
        swSwitch(swIdent("style"), [
          swCase([swDotCase("form")], [swReturn(swStr(","))]),
          swCase([swDotCase("spaceDelimited")], [swReturn(swStr(" "))]),
          swCase([swDotCase("pipeDelimited")], [swReturn(swStr("|"))]),
        ]),
      ],
    ),
    [],
  );
}

/** `values.map { "\($0)" }` */
function stringifiedValues(): SwExpr {
  return swCall(
    swMember(swIdent("values"), "map"),
    [],
    swClosure([], [swReturn(swInterp([swIdent("$0")]))]),
  );
}
