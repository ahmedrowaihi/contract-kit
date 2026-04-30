import {
  type KtClass,
  type KtClassModifier,
  type KtFun,
  type KtStmt,
  ktArg,
  ktAssign,
  ktCall,
  ktClass,
  ktElvis,
  ktExprStmt,
  ktForIn,
  ktFun,
  ktIdent,
  ktIndex,
  ktLambda,
  ktListLit,
  ktMember,
  ktProp,
  ktRef,
  ktSafeMember,
  ktStr,
  ktVal,
  ktVar,
} from "../../kt-dsl/index.js";
import type { OperationSignature } from "../operation/signature.js";
import { buildBodyStmts } from "./body.js";
import { buildSendAndDecodeStmts } from "./decode.js";
import { buildHeaderStmts } from "./headers.js";
import { buildRequestStmts } from "./request.js";
import { buildUrlStmts } from "./url.js";

interface BuiltMethod {
  fun: KtFun;
  needsMultipart: boolean;
}

/**
 * Compose statement-level builders into the full body of a single impl
 * method. Order:
 *  1. Resolve per-call overrides — `client = options.client ?: this.client`
 *     and `baseUrl = options.baseUrl ?: client.baseUrl`. Subsequent
 *     statements reference the locals.
 *  2. URL via `HttpUrl.Builder` (path segments + query items).
 *  3. Initial request: `Request.Builder().url(url).method(verb, null)`.
 *  4. Header param `builder.header(...)` calls.
 *  5. Body wire encoding (JSON / multipart / form / binary) — also
 *     re-sets the method with the body.
 *  6. Apply security: walk scheme names, run `Auth.apply(builder,
 *     currentUrl)`, re-attach the rewritten URL onto the builder.
 *  7. Apply `options.headers` (last-write-wins so callers can override).
 *  8. Delegate to `client.execute(...)` with timeout + interceptors +
 *     validator + transformer.
 */
function buildImplFun(sig: OperationSignature): BuiltMethod {
  const stmts: KtStmt[] = [];
  stmts.push(...resolveOverrideStmts());
  stmts.push(...buildUrlStmts(sig.pathStr, sig.locatedParams));
  stmts.push(...buildRequestStmts(sig.method));
  stmts.push(...buildHeaderStmts(sig.locatedParams));

  let needsMultipart = false;
  if (sig.op.body) {
    const bodyParam = sig.params.find((p) => p.name === "body");
    const bodyType = bodyParam?.type ?? ktRef("ByteArray");
    const result = buildBodyStmts(sig.op.body, sig.method, bodyType);
    stmts.push(...result.stmts);
    needsMultipart = result.needsMultipart;
  }

  if (sig.securitySchemeNames.length > 0) {
    stmts.push(...applyAuthStmts(sig.securitySchemeNames));
  }
  stmts.push(applyOptionsHeadersStmt());
  stmts.push(...buildSendAndDecodeStmts(sig));

  // Kotlin forbids defaults on `override` methods (the interface
  // signature carries them via the convenience extension fun).
  const overrideParams = sig.params.map((p) =>
    p.default === undefined ? p : { ...p, default: undefined },
  );
  return {
    fun: ktFun({
      name: sig.name,
      params: overrideParams,
      returnType: sig.returnType,
      modifiers: ["override", "suspend"],
      doc: sig.doc,
      body: stmts,
    }),
    needsMultipart,
  };
}

/** `val client = options.client ?: this.client`; same shape for `baseUrl`. */
function resolveOverrideStmts(): ReadonlyArray<KtStmt> {
  return [
    ktVal(
      "client",
      ktElvis(
        ktMember(ktIdent("options"), "client"),
        ktMember(ktIdent("this"), "client"),
      ),
    ),
    ktVal(
      "baseUrl",
      ktElvis(
        ktMember(ktIdent("options"), "baseUrl"),
        ktMember(ktIdent("client"), "baseUrl"),
      ),
    ),
  ];
}

/**
 * `for (header in options.headers) builder.header(header.key, header.value)`
 * — per-call header overrides, applied last so they can replace any
 * Content-Type / auth header the impl already set.
 */
function applyOptionsHeadersStmt(): KtStmt {
  return ktForIn("header", ktMember(ktIdent("options"), "headers"), [
    ktExprStmt(
      ktCall(ktMember(ktIdent("builder"), "header"), [
        ktArg(ktMember(ktIdent("header"), "key")),
        ktArg(ktMember(ktIdent("header"), "value")),
      ]),
    ),
  ]);
}

/**
 * Walk the spec-defined security-scheme names for this op; if the
 * consumer has any of them configured on `client.auth`, apply it to
 * the in-flight request. `Auth.apply(builder, url)` mutates the
 * builder for header / cookie auth and returns the rewritten URL for
 * query auth — we re-attach it via `builder.url(currentUrl)` after
 * the loop.
 *
 * @example
 * ```kotlin
 * var currentUrl = url
 * for (schemeName in listOf("petstore_auth", "api_key")) {
 *     client.auth[schemeName]?.let { auth ->
 *         currentUrl = auth.apply(builder, currentUrl)
 *     }
 * }
 * builder.url(currentUrl)
 * ```
 */
function applyAuthStmts(
  schemeNames: ReadonlyArray<string>,
): ReadonlyArray<KtStmt> {
  const lookupSubscript = ktIndex(
    ktMember(ktIdent("client"), "auth"),
    ktIdent("schemeName"),
  );
  return [
    ktVar("currentUrl", ktIdent("url")),
    ktForIn("schemeName", ktListLit(schemeNames.map((n) => ktStr(n))), [
      ktExprStmt(
        ktCall(
          ktSafeMember(lookupSubscript, "let"),
          [],
          ktLambda(
            ["auth"],
            [
              ktAssign(
                ktIdent("currentUrl"),
                ktCall(ktMember(ktIdent("auth"), "apply"), [
                  ktArg(ktIdent("builder")),
                  ktArg(ktIdent("currentUrl")),
                ]),
              ),
            ],
          ),
        ),
      ),
    ]),
    ktExprStmt(
      ktCall(ktMember(ktIdent("builder"), "url"), [
        ktArg(ktIdent("currentUrl")),
      ]),
    ),
  ];
}

export interface ClientClassResult {
  /** The impl class itself. */
  class: KtClass;
  /** True when at least one method uses the `MultipartFormBody` helper,
   *  so the orchestrator should ship it. */
  needsMultipart: boolean;
}

export interface ClientClassOptions {
  /** When true, the class is `open` (subclassable) instead of final.
   *  Default: `false`. */
  open?: boolean;
}

/**
 * Convert a list of `OperationSignature`s for a tag into a class that
 * implements the matching interface and contains a working OkHttp +
 * kotlinx-serialization impl for each operation. The class holds a
 * single `client: APIClient` primary-ctor prop and delegates
 * send/dispatch/decode to it.
 */
export function buildClientClass(
  className: string,
  interfaceName: string,
  signatures: ReadonlyArray<OperationSignature>,
  opts: ClientClassOptions = {},
): ClientClassResult {
  const built = signatures.map(buildImplFun);
  const modifiers: ReadonlyArray<KtClassModifier> = opts.open ? ["open"] : [];
  return {
    class: ktClass({
      name: className,
      superTypes: [interfaceName],
      modifiers,
      properties: [
        ktProp({
          name: "client",
          type: ktRef("APIClient"),
          inPrimary: true,
        }),
      ],
      funs: built.map((b) => b.fun),
    }),
    needsMultipart: built.some((b) => b.needsMultipart),
  };
}
