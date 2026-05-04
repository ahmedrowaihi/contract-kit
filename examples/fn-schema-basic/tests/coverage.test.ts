import path from "node:path";
import { fileURLToPath } from "node:url";
import { extract } from "@ahmedrowaihi/fn-schema-typescript";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const coverageFile = path.resolve(here, "../src/coverage.ts");
const tsConfig = path.resolve(here, "../tsconfig.json");

function resolve(
  schema: Record<string, unknown>,
  definitions: Record<string, unknown>,
): Record<string, unknown> {
  const ref = schema.$ref;
  if (typeof ref !== "string") return schema;
  const name = ref.replace(/^#\/definitions\//, "");
  const target = definitions[name];
  if (!target) throw new Error(`Unresolved $ref: ${ref}`);
  return target as Record<string, unknown>;
}

async function runCoverage(opts?: Parameters<typeof extract>[0]) {
  return extract({
    files: [coverageFile],
    tsConfigPath: tsConfig,
    signature: { parameters: "first-only" },
    ...(opts ?? {}),
  });
}

describe("type-mapper coverage", () => {
  it("maps Date to canonical date-time string", async () => {
    const result = await runCoverage();
    const sig = result.signatures.find((s) => s.id === "takeDate")!;
    expect(sig.output).toEqual({ type: "string", format: "date-time" });
    const input = resolve(
      sig.input as Record<string, unknown>,
      result.definitions,
    );
    const props = input.properties as Record<string, Record<string, unknown>>;
    expect(props.when).toEqual({ type: "string", format: "date-time" });
    expect(props.until).toEqual({ type: "string", format: "date-time" });
  });

  it("maps URL, RegExp to format strings", async () => {
    const result = await runCoverage();
    const url = result.signatures.find((s) => s.id === "takeUrl")!;
    expect(url.input).toEqual({ type: "string", format: "uri" });
    expect(url.output).toEqual({ type: "string", format: "uri" });

    const re = result.signatures.find((s) => s.id === "takeRegExp")!;
    expect(re.input).toEqual({ type: "string", format: "regex" });
  });

  it("maps Buffer / Uint8Array / ArrayBuffer to base64-encoded strings", async () => {
    const result = await runCoverage();
    const buf = result.signatures.find((s) => s.id === "takeBuffer")!;
    expect(buf.input).toEqual({ type: "string", contentEncoding: "base64" });
    expect(buf.output).toEqual({ type: "string", contentEncoding: "base64" });

    const file = result.signatures.find((s) => s.id === "takeFileLike")!;
    const fileInput = file.input as Record<string, unknown>;
    const props = fileInput.properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(props.data).toEqual({ type: "string", contentEncoding: "base64" });
    const fileOutput = file.output as Record<string, unknown>;
    const outProps = fileOutput.properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(outProps.stored).toEqual({
      type: "string",
      contentEncoding: "base64",
    });
  });

  it("maps bigint to integer with a lossy diagnostic", async () => {
    const result = await runCoverage();
    const bn = result.signatures.find((s) => s.id === "takeBigInt")!;
    expect(bn.input).toEqual({ type: "integer" });
    expect(bn.output).toEqual({ type: "integer" });
    const lossy = result.diagnostics.find(
      (d) => d.code === "LOSSY_MAPPING" && d.function === "takeBigInt",
    );
    expect(lossy).toBeDefined();
  });

  it("strips brand phantom and emits TYPE_MAPPED for the brand name", async () => {
    const result = await runCoverage();
    const branded = result.signatures.find((s) => s.id === "takeBranded")!;
    // Brand stripped — base type is `string`, but the mapper returns the
    // canonical form for that brand name (or falls back to plain string).
    const input = branded.input as Record<string, unknown>;
    expect(input.type).toBe("string");
    const mapped = result.diagnostics.find(
      (d) => d.code === "TYPE_MAPPED" && d.function === "takeBranded",
    );
    expect(mapped).toBeDefined();
  });

  it("user typeMappers override built-in mappings", async () => {
    const result = await runCoverage({
      files: [coverageFile],
      tsConfigPath: tsConfig,
      signature: { parameters: "first-only" },
      schema: {
        typeMappers: {
          Date: { type: "string", format: "date" },
          UserId: { type: "string", format: "uuid" },
        },
      },
    });
    const date = result.signatures.find((s) => s.id === "takeDate")!;
    expect(date.output).toEqual({ type: "string", format: "date" });
    const branded = result.signatures.find((s) => s.id === "takeBranded")!;
    expect(branded.input).toEqual({ type: "string", format: "uuid" });
    expect(branded.output).toEqual({ type: "string", format: "uuid" });
  });

  it("CoverageReport carries per-occurrence context (side, paramIndex, paramName)", async () => {
    const result = await extract({
      files: [coverageFile],
      tsConfigPath: tsConfig,
      // No `parameters: "first-only"` here — we want both array slots and the return slot
      // visible so a single type appearing in input AND output produces two occurrences.
    });

    type CoverageEntry = {
      name: string;
      count: number;
      occurrences: {
        side: "input" | "output";
        overloadIndex: number;
        paramIndex?: number;
        paramName?: string;
      }[];
    };

    // takeDate(input: DateInput): Date — Date appears as the return; DateInput input is its own slot
    const dateSig = result.signatures.find((s) => s.id === "takeDate");
    expect(dateSig).toBeDefined();
    type Coverage = { mapped: CoverageEntry[] };
    const dateCoverage = (dateSig as unknown as { coverage: Coverage })
      .coverage;
    const dateEntry = dateCoverage.mapped.find((m) => m.name === "Date");
    expect(dateEntry).toBeDefined();
    expect(dateEntry?.count).toBe(1);
    expect(dateEntry?.occurrences[0]).toMatchObject({
      side: "output",
      overloadIndex: 0,
    });

    // takeBuffer(b: Buffer): Uint8Array — Buffer is a single input occurrence with paramIndex=0
    const bufSig = result.signatures.find((s) => s.id === "takeBuffer");
    const bufCoverage = (bufSig as unknown as { coverage: Coverage }).coverage;
    const bufEntry = bufCoverage.mapped.find((m) => m.name === "Buffer");
    expect(bufEntry?.occurrences[0]).toMatchObject({
      side: "input",
      overloadIndex: 0,
      paramIndex: 0,
      paramName: "b",
    });
  });

  it("emits TYPE_MAPPED diagnostics for every mapped reference", async () => {
    const result = await runCoverage();
    const mapped = result.diagnostics.filter((d) => d.code === "TYPE_MAPPED");
    const names = new Set(
      mapped
        .map((d) => d.message.match(/^"([^"]+)"/)?.[1])
        .filter((x): x is string => Boolean(x)),
    );
    expect(names).toContain("Date");
    expect(names).toContain("URL");
    expect(names).toContain("RegExp");
    expect(names).toContain("Buffer");
  });
});

describe("identity, transport, source-location keywords", () => {
  it("identity attaches x-fn-schema-ts to mapped + named definitions", async () => {
    const result = await runCoverage({
      files: [coverageFile],
      tsConfigPath: tsConfig,
      signature: { parameters: "first-only" },
      schema: { identity: "x-fn-schema-ts" },
    });

    const date = result.signatures.find((s) => s.id === "takeDate")!;
    expect(date.output).toMatchObject({
      type: "string",
      format: "date-time",
      "x-fn-schema-ts": "Date",
    });

    const branded = result.signatures.find((s) => s.id === "takeBranded")!;
    expect(branded.input).toMatchObject({
      type: "string",
      "x-fn-schema-ts": "UserId",
    });

    const def = result.definitions.DateInput as Record<string, unknown>;
    expect(def?.["x-fn-schema-ts"]).toBe("DateInput");
  });

  it("transport hint maps File/Blob → multipart, Buffer → base64", async () => {
    const result = await runCoverage({
      files: [coverageFile],
      tsConfigPath: tsConfig,
      signature: { parameters: "first-only" },
      schema: { transport: "x-fn-schema-transport" },
    });
    const buf = result.signatures.find((s) => s.id === "takeBuffer")!;
    expect(buf.input).toMatchObject({
      type: "string",
      contentEncoding: "base64",
      "x-fn-schema-transport": "base64",
    });
    expect(buf.output).toMatchObject({
      "x-fn-schema-transport": "base64",
    });
  });

  it("sourceLocations attaches x-fn-schema-source to named definitions", async () => {
    const result = await runCoverage({
      files: [coverageFile],
      tsConfigPath: tsConfig,
      signature: { parameters: "first-only" },
      schema: { sourceLocations: "x-fn-schema-source" },
    });
    const def = result.definitions.DateInput as Record<string, unknown>;
    const src = def?.["x-fn-schema-source"];
    expect(typeof src).toBe("string");
    expect(src as string).toMatch(/coverage\.ts:\d+:\d+$/);
  });

  it("does NOT rewrite well-known names inside string-literal types", async () => {
    const result = await runCoverage();
    const sig = result.signatures.find((s) => s.id === "takeLiteralUnion")!;
    const input = sig.input as Record<string, unknown>;
    // Must remain a string-literal union, not a sentinel-replaced object
    expect(input.type).toBe("string");
    expect(input.enum).toEqual(["Date", "URL", "RegExp"]);
  });

  it("all three keywords default off when not requested", async () => {
    const result = await runCoverage();
    const date = result.signatures.find((s) => s.id === "takeDate")!;
    expect(
      (date.output as Record<string, unknown>)["x-fn-schema-ts"],
    ).toBeUndefined();
    expect(
      (date.output as Record<string, unknown>)["x-fn-schema-transport"],
    ).toBeUndefined();
    const def = result.definitions.DateInput as Record<string, unknown>;
    expect(def?.["x-fn-schema-source"]).toBeUndefined();
    expect(def?.["x-fn-schema-ts"]).toBeUndefined();
  });
});
