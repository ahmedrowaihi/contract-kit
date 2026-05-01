import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { extractSecuritySchemeNames, securityKey } from "../dist/security.js";

describe("securityKey", () => {
  it("joins path and method with a pipe", () => {
    assert.equal(securityKey("/users/{id}", "get"), "/users/{id}|get");
  });
});

describe("extractSecuritySchemeNames", () => {
  it("walks paths/method/security and collects scheme names", () => {
    const map = extractSecuritySchemeNames({
      paths: {
        "/me": {
          get: { security: [{ bearerAuth: [] }] },
        },
        "/admin": {
          post: { security: [{ bearerAuth: [], apiKeyAuth: [] }] },
        },
      },
    });
    assert.deepEqual(map.get("/me|get"), ["bearerAuth"]);
    assert.deepEqual([...(map.get("/admin|post") ?? [])].sort(), [
      "apiKeyAuth",
      "bearerAuth",
    ]);
  });

  it("skips operations without a security array", () => {
    const map = extractSecuritySchemeNames({
      paths: { "/public": { get: {} } },
    });
    assert.equal(map.size, 0);
  });

  it("ignores non-object pathItem / op entries", () => {
    const map = extractSecuritySchemeNames({
      paths: { "/x": null, "/y": { get: null } },
    });
    assert.equal(map.size, 0);
  });

  it("dedupes scheme names across multiple security entries (OR/AND collapse)", () => {
    const map = extractSecuritySchemeNames({
      paths: {
        "/either": {
          get: { security: [{ bearerAuth: [] }, { bearerAuth: ["scope"] }] },
        },
      },
    });
    assert.deepEqual(map.get("/either|get"), ["bearerAuth"]);
  });
});
