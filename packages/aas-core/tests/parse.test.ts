import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseSpec, parseSpecOrThrow } from "../src/parse.ts";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, "../../../fixtures/user-events.yaml");

describe("parseSpec", () => {
  it("loads a valid AsyncAPI 3.0 file and exposes intent API", async () => {
    const { document, diagnostics } = await parseSpec({
      kind: "file",
      path: FIXTURE,
    });

    expect(document).toBeDefined();
    expect(diagnostics.every((d) => d.severity > 0)).toBe(true);

    if (!document) return;
    expect(document.version()).toBe("3.0.0");
    expect(document.info().title()).toBe("User Events");

    const channels = document.channels().all();
    expect(channels.map((c) => c.id()).sort()).toEqual([
      "userAccountCreated",
      "userAccountDeleted",
    ]);

    const operations = document.operations().all();
    expect(operations).toHaveLength(2);
    expect(operations.every((op) => op.action() === "send")).toBe(true);

    const messages = document.allMessages().all();
    expect(messages.map((m) => m.id()).sort()).toContain("UserAccountCreated");
  });

  it("parses the same content from a string", async () => {
    const { readFile } = await import("node:fs/promises");
    const yaml = await readFile(FIXTURE, "utf8");
    const { document } = await parseSpec({ kind: "string", spec: yaml });
    expect(document?.info().title()).toBe("User Events");
  });

  it("returns diagnostics + undefined document for invalid spec", async () => {
    const { document, diagnostics } = await parseSpec({
      kind: "string",
      spec: "asyncapi: 3.0.0\ninfo:\n  title: missing version",
    });
    expect(document).toBeUndefined();
    expect(diagnostics.length).toBeGreaterThan(0);
  });
});

describe("parseSpecOrThrow", () => {
  it("returns the document on success", async () => {
    const document = await parseSpecOrThrow({ kind: "file", path: FIXTURE });
    expect(document.info().title()).toBe("User Events");
  });

  it("throws with a formatted diagnostic summary on failure", async () => {
    await expect(
      parseSpecOrThrow({
        kind: "string",
        spec: "asyncapi: 3.0.0\ninfo:\n  title: missing version",
      }),
    ).rejects.toThrow(/AsyncAPI spec failed validation/);
  });
});
