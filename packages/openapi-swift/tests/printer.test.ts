import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  printFile,
  swArray,
  swEnum,
  swEnumCase,
  swFile,
  swFun,
  swFunParam,
  swInt,
  swOptional,
  swProp,
  swProtocol,
  swRef,
  swString,
  swStruct,
} from "../dist/index.js";

describe("printer", () => {
  it("emits a public Codable struct with required + optional props", () => {
    const file = swFile({
      imports: ["Foundation"],
      decls: [
        swStruct({
          name: "User",
          conforms: ["Codable"],
          properties: [
            swProp({ name: "id", type: swString }),
            swProp({ name: "name", type: swOptional(swString) }),
          ],
        }),
      ],
    });

    assert.equal(
      printFile(file),
      `import Foundation

public struct User: Codable {
    public let id: String
    public let name: String?
}
`,
    );
  });

  it("emits a String-raw Codable enum", () => {
    const file = swFile({
      decls: [
        swEnum({
          name: "Status",
          rawType: swString,
          conforms: ["Codable"],
          cases: [
            swEnumCase("active", "active"),
            swEnumCase("pending", "pending"),
          ],
        }),
      ],
    });
    assert.equal(
      printFile(file),
      `public enum Status: String, Codable {
    case active = "active"
    case pending = "pending"
}
`,
    );
  });

  it("emits a protocol with async-throws funcs", () => {
    const file = swFile({
      decls: [
        swProtocol({
          name: "UsersAPI",
          funs: [
            swFun({
              name: "getUser",
              params: [swFunParam({ name: "id", type: swString })],
              returnType: swRef("User"),
              effects: ["async", "throws"],
              doc: "GET /users/{id}",
            }),
          ],
        }),
      ],
    });
    assert.equal(
      printFile(file),
      `public protocol UsersAPI {
    /// GET /users/{id}
    func getUser(
        id: String
    ) async throws -> User
}
`,
    );
  });

  it("composes array, optional, ref types", () => {
    const file = swFile({
      decls: [
        swStruct({
          name: "Page",
          conforms: ["Codable"],
          properties: [
            swProp({ name: "items", type: swArray(swRef("User")) }),
            swProp({ name: "total", type: swInt }),
            swProp({ name: "next", type: swOptional(swString) }),
          ],
        }),
      ],
    });
    assert.match(printFile(file), /public let items: \[User\]/);
    assert.match(printFile(file), /public let next: String\?/);
  });
});
