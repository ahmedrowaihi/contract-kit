interface HARHeader {
  name: string;
  value: string;
}

interface HAREntry {
  request: {
    method: string;
    url: string;
    headers: HARHeader[];
    postData?: { text?: string };
  };
  response: {
    status: number;
    headers: HARHeader[];
  };
  getContent(callback: (content: string, encoding: string) => void): void;
}

export interface SerializedObservation {
  request: {
    method: string;
    url: string;
    headers: Array<[string, string]>;
    body: string | null;
  };
  response: {
    status: number;
    headers: Array<[string, string]>;
    body: string | null;
  };
}

export function harToSerialized(
  entry: HAREntry,
): Promise<SerializedObservation> {
  return new Promise((resolve) => {
    entry.getContent((body, encoding) => {
      resolve({
        request: {
          method: entry.request.method,
          url: entry.request.url,
          headers: entry.request.headers.map(toTuple),
          body: requestBody(entry),
        },
        response: {
          status: entry.response.status,
          headers: entry.response.headers.map(toTuple),
          body: decodeBody(body, encoding),
        },
      });
    });
  });
}

function toTuple(h: HARHeader): [string, string] {
  return [h.name, h.value];
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

function requestBody(entry: HAREntry): string | null {
  if (entry.request.method === "GET" || entry.request.method === "HEAD") {
    return null;
  }
  return entry.request.postData?.text ?? null;
}
