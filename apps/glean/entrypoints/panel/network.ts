/**
 * Adapter: turn a `chrome.devtools.network` HAR entry into the standard
 * `Request` / `Response` pair that `@ahmedrowaihi/openapi-recon` accepts.
 *
 * HAR response bodies arrive asynchronously via `entry.getContent(cb)`,
 * so this is a Promise.
 */

type HARHeader = { name: string; value: string };
type HAREntry = chrome.devtools.network.Request;

export interface ObservedPair {
  request: Request;
  response: Response;
}

export function harToObservation(entry: HAREntry): Promise<ObservedPair> {
  return new Promise((resolve) => {
    entry.getContent((body, encoding) => {
      const responseBody = decodeBody(body, encoding);
      const response = new Response(responseBody, {
        status: entry.response.status,
        headers: harHeaders(entry.response.headers),
      });
      const request = new Request(entry.request.url, {
        method: entry.request.method,
        headers: harHeaders(entry.request.headers),
        body: requestBody(entry),
      });
      resolve({ request, response });
    });
  });
}

function harHeaders(headers: HARHeader[]): Headers {
  const h = new Headers();
  for (const { name, value } of headers) {
    try {
      h.append(name, value);
    } catch {
      // Forbidden header names (e.g. `cookie`) — drop silently.
    }
  }
  return h;
}

function decodeBody(content: string, encoding: string): string | null {
  if (!content) return null;
  if (encoding === "base64") {
    try {
      return atob(content);
    } catch {
      return null;
    }
  }
  return content;
}

function requestBody(entry: HAREntry): BodyInit | null {
  if (entry.request.method === "GET" || entry.request.method === "HEAD") {
    return null;
  }
  const text = entry.request.postData?.text;
  return text ?? null;
}
