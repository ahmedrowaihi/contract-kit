import { describe, expect, it } from "vitest";

import { compileRoutingKey, matchRoutingKey } from "../src/match.ts";

describe("matchRoutingKey", () => {
  it("matches exact patterns", () => {
    expect(matchRoutingKey("foo.bar", "foo.bar")).toBe(true);
    expect(matchRoutingKey("foo.bar", "foo.baz")).toBe(false);
    expect(matchRoutingKey("foo.bar", "foo.bar.baz")).toBe(false);
  });

  it("treats `*` as exactly one word", () => {
    expect(matchRoutingKey("user.account.*", "user.account.created")).toBe(
      true,
    );
    expect(matchRoutingKey("user.account.*", "user.account.created.v1")).toBe(
      false,
    );
    expect(matchRoutingKey("user.account.*", "user.account")).toBe(false);
    expect(matchRoutingKey("*.bar", "foo.bar")).toBe(true);
    expect(matchRoutingKey("*.bar", "bar")).toBe(false);
  });

  it("treats `#` as zero or more words", () => {
    expect(matchRoutingKey("user.#", "user")).toBe(true);
    expect(matchRoutingKey("user.#", "user.account")).toBe(true);
    expect(matchRoutingKey("user.#", "user.account.created.v1")).toBe(true);
    expect(matchRoutingKey("#", "anything.at.all")).toBe(true);
    expect(matchRoutingKey("#", "")).toBe(true); // empty key, single-segment empty array
  });

  it("matches mixed wildcards", () => {
    expect(matchRoutingKey("*.foo.#", "a.foo")).toBe(true);
    expect(matchRoutingKey("*.foo.#", "a.foo.b.c")).toBe(true);
    expect(matchRoutingKey("*.foo.#", "foo")).toBe(false);
    expect(matchRoutingKey("a.#.z", "a.z")).toBe(true);
    expect(matchRoutingKey("a.#.z", "a.x.y.z")).toBe(true);
    expect(matchRoutingKey("a.#.z", "a.z.extra")).toBe(false);
  });

  it("matches a realistic Thmanyah pattern", () => {
    expect(
      matchRoutingKey("user.account.created.*", "user.account.created.v1"),
    ).toBe(true);
    expect(
      matchRoutingKey("user.account.created.*", "user.account.deleted.v1"),
    ).toBe(false);
    expect(
      matchRoutingKey("content.episode.#", "content.episode.published.v1"),
    ).toBe(true);
  });
});

describe("compileRoutingKey", () => {
  it("returns a reusable matcher equivalent to matchRoutingKey", () => {
    const match = compileRoutingKey("user.account.*.v1");
    expect(match("user.account.created.v1")).toBe(true);
    expect(match("user.account.deleted.v1")).toBe(true);
    expect(match("user.account.created.v2")).toBe(false);
    expect(match("user.account.created.deleted.v1")).toBe(false);
  });
});
