#!/usr/bin/env node
/**
 * Regenerates the package list section in the root README.md from
 * workspace package.json metadata. Replaces content between
 * `<!-- @packages-start -->` and `<!-- @packages-end -->` markers.
 *
 * Run via lefthook pre-commit; restages README if changed.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const README = join(ROOT, "README.md");
const START = "<!-- @packages-start -->";
const END = "<!-- @packages-end -->";

/** Collect published packages (not private, under packages/) */
function collectPackages() {
  const out = [];
  const visit = (dir) => {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (!pkg.private && pkg.name) {
        out.push({
          name: pkg.name,
          description: pkg.description || "",
          dir: relative(ROOT, dir),
        });
      }
      return;
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== "node_modules") {
        visit(join(dir, entry.name));
      }
    }
  };
  visit(join(ROOT, "packages"));
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Group packages by their npm-name prefix family */
function groupPackages(pkgs) {
  const groups = {
    "openapi-ts-": "`@hey-api/openapi-ts` plugins",
    "openapi-": "Standalone OpenAPI tools",
    "asyncapi-": "AsyncAPI family",
    "sdk-": "Client SDK generators",
  };
  const buckets = {};
  for (const pkg of pkgs) {
    const localName = pkg.name.replace(/^@[^/]+\//, "");
    const key = Object.keys(groups).find((p) => localName.startsWith(p));
    const heading = groups[key] || "Other";
    (buckets[heading] ||= []).push(pkg);
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
  const order = [
    "`@hey-api/openapi-ts` plugins",
    "Standalone OpenAPI tools",
    "AsyncAPI family",
    "Client SDK generators",
    "Other",
  ];
  const parts = [];
  for (const heading of order) {
    if (!buckets[heading]) continue;
    parts.push(`### ${heading}`, "", renderTable(buckets[heading]), "");
  }
  return parts.join("\n").trimEnd();
}

function main() {
  const pkgs = collectPackages();
  const buckets = groupPackages(pkgs);
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
