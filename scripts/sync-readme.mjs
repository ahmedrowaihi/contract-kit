#!/usr/bin/env node
/**
 * Regenerates the package list section in the root README.md from
 * workspace package.json metadata. Replaces content between
 * `<!-- @packages-start -->` and `<!-- @packages-end -->` markers.
 *
 * Categories are explicit (`CATEGORY_BY_NAME`), not prefix-bucketed —
 * the `openapi-*` namespace now covers four distinct shapes (runtime
 * utilities, SDK generators, spec discovery), so a flat prefix split
 * would lump them together.
 *
 * Run via lefthook pre-commit; restages README if changed.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const README = join(ROOT, "README.md");
const START = "<!-- @packages-start -->";
const END = "<!-- @packages-end -->";

/**
 * Section headings + display order. Each package opts in to a
 * category by full npm name; unknown packages fall back to "Other"
 * so they're at least surfaced (with a warning in stderr) until they
 * get categorized explicitly.
 */
const CATEGORIES = [
  "`@hey-api/openapi-ts` plugins",
  "OpenAPI runtime utilities",
  "Codegen primitives",
  "Native client SDK generators",
  "Spec discovery from traffic",
  "Apps",
  "Other",
];

const CATEGORY_BY_NAME = {
  "@ahmedrowaihi/openapi-ts-orpc": "`@hey-api/openapi-ts` plugins",
  "@ahmedrowaihi/openapi-ts-faker": "`@hey-api/openapi-ts` plugins",
  "@ahmedrowaihi/openapi-ts-paths": "`@hey-api/openapi-ts` plugins",
  "@ahmedrowaihi/openapi-ts-typia": "`@hey-api/openapi-ts` plugins",
  "@ahmedrowaihi/openapi-tools": "OpenAPI runtime utilities",
  "@ahmedrowaihi/codegen-core": "Codegen primitives",
  "@ahmedrowaihi/oas-core": "Native client SDK generators",
  "@ahmedrowaihi/openapi-kotlin": "Native client SDK generators",
  "@ahmedrowaihi/openapi-swift": "Native client SDK generators",
  "@ahmedrowaihi/openapi-go": "Native client SDK generators",
  "@ahmedrowaihi/openapi-typescript": "Native client SDK generators",
  "@ahmedrowaihi/openapi-recon": "Spec discovery from traffic",
  "@ahmedrowaihi/glean": "Apps",
};

/**
 * Walk a directory tree looking for `package.json` files. Returns
 * one entry per package. `includePrivate` is true for `apps/` —
 * apps are user-facing but distributed outside npm so the
 * `private: true` flag isn't a signal to hide them from the README.
 */
function collectPackagesUnder(root, { includePrivate }) {
  const out = [];
  const visit = (dir) => {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (!pkg.name) return;
      if (pkg.private && !includePrivate) return;
      out.push({
        name: pkg.name,
        description: pkg.description || "",
        dir: relative(ROOT, dir),
      });
      return;
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== "node_modules") {
        visit(join(dir, entry.name));
      }
    }
  };
  if (existsSync(root)) visit(root);
  return out;
}

function collectAll() {
  const all = [
    ...collectPackagesUnder(join(ROOT, "packages"), { includePrivate: false }),
    ...collectPackagesUnder(join(ROOT, "apps"), { includePrivate: true }),
  ];
  all.sort((a, b) => a.name.localeCompare(b.name));
  return all;
}

function bucketize(pkgs) {
  const buckets = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  for (const pkg of pkgs) {
    const category = CATEGORY_BY_NAME[pkg.name] ?? "Other";
    if (category === "Other") {
      console.warn(
        `[sync-readme] no category mapped for ${pkg.name} — falling back to "Other". Add it to CATEGORY_BY_NAME.`,
      );
    }
    buckets[category].push(pkg);
  }
  return buckets;
}

function renderTable(pkgs) {
  const rows = pkgs.map(
    (p) => `| [\`${p.name}\`](./${p.dir}) | ${p.description} |`,
  );
  return ["| Package | Description |", "| --- | --- |", ...rows].join("\n");
}

function renderSection(buckets) {
  const parts = [];
  for (const heading of CATEGORIES) {
    const list = buckets[heading];
    if (!list || list.length === 0) continue;
    parts.push(`### ${heading}`, "", renderTable(list), "");
  }
  return parts.join("\n").trimEnd();
}

function main() {
  const pkgs = collectAll();
  const buckets = bucketize(pkgs);
  const generated = renderSection(buckets);

  const readme = readFileSync(README, "utf8");
  const startIdx = readme.indexOf(START);
  const endIdx = readme.indexOf(END);
  if (startIdx === -1 || endIdx === -1) {
    console.error(
      `[sync-readme] Missing markers in README.md. Add:\n${START}\n${END}`,
    );
    process.exit(1);
  }

  const before = readme.slice(0, startIdx + START.length);
  const after = readme.slice(endIdx);
  const next = `${before}\n\n${generated}\n\n${after}`;

  if (next !== readme) {
    writeFileSync(README, next);
    console.log("[sync-readme] README.md package list updated");
  } else {
    console.log("[sync-readme] README.md is up to date");
  }
}

main();
