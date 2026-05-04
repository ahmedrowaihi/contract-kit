import { describe, expect, it } from "vitest";
import { type Bundle, createReader } from "../src/index.js";

const bundle: Bundle = {
  signatures: {
    createUser: {
      input: { $ref: "#/definitions/CreateUserInput" },
      output: { $ref: "#/definitions/User" },
    },
    listUsers: {
      input: [{ type: "string" }, { $ref: "#/definitions/Page" }],
      output: { $ref: "#/definitions/UserPage" },
    },
    ping: {
      input: { type: "string" },
      output: { type: "string" },
    },
  },
  definitions: {
    User: {
      type: "object",
      "x-fn-schema-ts": "User",
      properties: { id: { type: "string" }, email: { type: "string" } },
      required: ["id", "email"],
    },
    CreateUserInput: {
      type: "object",
      "x-fn-schema-ts": "CreateUserInput",
      properties: { email: { type: "string" } },
    },
    Page: { type: "object", properties: { cursor: { type: "string" } } },
    UserPage: {
      type: "object",
      "x-fn-schema-ts": "UserPage",
      properties: {
        items: {
          type: "array",
          items: { $ref: "#/definitions/User" },
        },
      },
    },
  },
};

describe("createReader", () => {
  it("looks up signatures by id", () => {
    const reader = createReader(bundle);
    expect(reader.has("createUser")).toBe(true);
    expect(reader.has("nope")).toBe(false);
    expect(reader.get("createUser")?.output).toEqual({
      $ref: "#/definitions/User",
    });
  });

  it("resolves $ref via inputOf / outputOf", () => {
    const reader = createReader(bundle);
    const inputResolved = reader.inputOf("createUser") as Record<
      string,
      unknown
    >;
    expect(inputResolved.type).toBe("object");
    expect(inputResolved["x-fn-schema-ts"]).toBe("CreateUserInput");

    const outputResolved = reader.outputOf("createUser") as Record<
      string,
      unknown
    >;
    expect(outputResolved["x-fn-schema-ts"]).toBe("User");
  });

  it("maps array inputs element-by-element through $ref", () => {
    const reader = createReader(bundle);
    const arr = reader.inputOf("listUsers") as unknown[];
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(2);
    const second = arr[1] as Record<string, unknown>;
    expect(second.type).toBe("object");
  });

  it("findByIdentity returns canvas-style matches across signatures", () => {
    const reader = createReader(bundle);
    const matches = reader.findByIdentity("User");
    const ids = matches.map((m) => `${m.signatureId}:${m.position}`).sort();
    // `createUser` output → User; `listUsers` output → UserPage (no match)
    expect(ids).toContain("createUser:output");
  });

  it("resolveRef returns undefined for unknown refs", () => {
    const reader = createReader(bundle);
    expect(reader.resolveRef("#/definitions/NotThere")).toBeUndefined();
    expect(reader.resolveRef("not-a-ref")).toBeUndefined();
  });
});
