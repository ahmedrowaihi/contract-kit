import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isMeaningless, refName } from "../dist/ref.js";

describe("refName", () => {
  it("strips the components/schemas prefix", () => {
    assert.equal(refName("#/components/schemas/Pet"), "Pet");
  });
  it("passes non-schema refs through unchanged", () => {
    assert.equal(
      refName("#/components/parameters/Limit"),
      "#/components/parameters/Limit",
    );
  });
});

describe("isMeaningless", () => {
  it("treats schemas with no payload-shape as meaningless", () => {
    assert.equal(isMeaningless({} as never), true);
    assert.equal(isMeaningless({ type: "void" } as never), true);
    assert.equal(isMeaningless({ type: "unknown" } as never), true);
    assert.equal(isMeaningless({ type: "never" } as never), true);
  });
  it("rejects schemas with a $ref / const / properties / items", () => {
    assert.equal(isMeaningless({ $ref: "#/x" } as never), false);
    assert.equal(isMeaningless({ const: "x" } as never), false);
    assert.equal(isMeaningless({ properties: { id: {} } } as never), false);
    assert.equal(isMeaningless({ items: [{}] } as never), false);
  });
  it("rejects scalar-typed schemas", () => {
    assert.equal(isMeaningless({ type: "string" } as never), false);
    assert.equal(isMeaningless({ type: "integer" } as never), false);
  });
});
