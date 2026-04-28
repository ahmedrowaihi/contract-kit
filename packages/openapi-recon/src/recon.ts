import { assembleDocument } from "./assemble";
import { type DetectedAuth, detectAuthScheme } from "./infer/auth";
import { sanitizeHeaders } from "./sanitize";
import { Store } from "./store";
import type { HttpMethod, ReconConfig, Sample } from "./types";

const HTTP_METHODS = new Set<HttpMethod>([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);

const JSON_RE = /^application\/(.*\+)?json(;.*)?$/i;

export interface Recon {
  /**
   * Feed an observation. Accepts standard Web Fetch `Request` + `Response`.
   * Bodies must already be readable (call `.clone()` upstream if you also
   * need to forward the response). Non-JSON bodies are skipped silently.
   */
  observe(request: Request, response: Response): Promise<void>;
  /** Number of samples folded so far (across all groups). */
  sampleCount(): number;
  /** Build the current OpenAPI 3.1 document from accumulated observations. */
  toOpenAPI(): import("@hey-api/spec-types").OpenAPIV3_1.Document;
  /** Drop everything. */
  clear(): void;
}

/** Create a new reconnaissance session. Pure — no global state. */
export function createRecon(config: ReconConfig = {}): Recon {
  const store = new Store();
  const detectedAuthSchemes = new Map<string, DetectedAuth | null>();
  const redact = config.redactHeaders;
  const title = config.title ?? "Reverse-engineered API";
  const version = config.version ?? "0.0.0";

  return {
    async observe(request, response) {
      const method = request.method.toLowerCase();
      if (!isHttpMethod(method)) return;

      const url = new URL(request.url);
      const rawRequestHeaders = headersToObject(request);
      const auth = detectAuthScheme(rawRequestHeaders);
      if (auth) detectedAuthSchemes.set(auth.id, auth);

      const requestHeaders = sanitizeHeaders(rawRequestHeaders, redact);
      const responseHeaders = sanitizeHeaders(
        headersToObject(response),
        redact,
      );

      const requestBody = await maybeJson(request, requestHeaders);
      const responseBody = await maybeJson(response, responseHeaders);

      const sample: Sample = {
        method,
        origin: url.origin,
        pathname: url.pathname,
        query: queryToObject(url.searchParams),
        requestHeaders,
        requestBody,
        authSchemeId: auth?.id ?? null,
        status: response.status,
        responseHeaders,
        responseBody,
      };

      store.add(sample);
    },
    sampleCount() {
      return store.size();
    },
    toOpenAPI() {
      return assembleDocument(store.snapshot(), {
        pathTemplating: config.pathTemplating ?? true,
        title,
        version,
        detectedAuthSchemes,
      });
    },
    clear() {
      store.clear();
      detectedAuthSchemes.clear();
    },
  };
}

function isHttpMethod(s: string): s is HttpMethod {
  return HTTP_METHODS.has(s as HttpMethod);
}

function headersToObject(r: Request | Response): Record<string, string> {
  const out: Record<string, string> = {};
  r.headers.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function queryToObject(p: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  p.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

/** Parse a Request/Response body as JSON if its content-type matches. Otherwise null. */
async function maybeJson(
  r: Request | Response,
  headers: Record<string, string>,
): Promise<unknown> {
  const ct = headers["content-type"];
  if (!ct || !JSON_RE.test(ct)) return null;
  try {
    return await r.clone().json();
  } catch {
    return null;
  }
}
