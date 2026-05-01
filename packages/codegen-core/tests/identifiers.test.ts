import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  camel,
  pascal,
  safeCaseName,
  safeIdent,
  synthName,
} from "../src/identifiers.ts";

describe("pascal", () => {
  it("upper-cases first letter", () => {
    assert.equal(pascal("user"), "User");
  });
  it("collapses separators and capitalizes following letter", () => {
    assert.equal(pascal("user_name"), "UserName");
    assert.equal(pascal("user-name"), "UserName");
    assert.equal(pascal("user name"), "UserName");
  });
  it("strips leading/trailing non-alphanumeric runs (PHP-style brackets)", () => {
    assert.equal(pascal("timeframe[]"), "Timeframe");
    assert.equal(pascal("[]timeframe"), "Timeframe");
  });
  it("keeps interior digits", () => {
    assert.equal(pascal("v2_pet"), "V2Pet");
  });
});

describe("camel", () => {
  it("lower-cases pascal output's first letter", () => {
    assert.equal(camel("user_name"), "userName");
    assert.equal(camel("UserName"), "userName");
  });
});

describe("safeIdent", () => {
  it("prefixes leading-digit results with an underscore", () => {
    assert.equal(safeIdent("2024_release"), "_2024Release");
  });
  it("leaves alphabetic results alone", () => {
    assert.equal(safeIdent("user_name"), "UserName");
  });
});

describe("safeCaseName", () => {
  it("camel-cases and prefixes leading-digit results with an underscore", () => {
    assert.equal(safeCaseName("90_degrees"), "_90Degrees");
    assert.equal(safeCaseName("first_value"), "firstValue");
  });
});

describe("synthName", () => {
  it("joins owner + pascal'd path with underscores", () => {
    assert.equal(
      synthName("User", ["address", "city_name"]),
      "User_Address_CityName",
    );
  });
  it("preserves owner verbatim (already-PascalCase typename)", () => {
    assert.equal(synthName("OrderItem", ["sku"]), "OrderItem_Sku");
  });
});
