import { readFile } from "node:fs/promises";
import path from "node:path";
import { defineCommand } from "citty";
import consola from "consola";

interface BundleSignature {
  name: string;
  file: string;
  input: unknown;
  output: unknown;
}

interface Bundle {
  signatures: Record<string, BundleSignature>;
  definitions: Record<string, unknown>;
}

export const diffCommand = defineCommand({
  meta: {
    name: "diff",
    description:
      "Compare two fn-schema bundles. Reports added/removed/changed signatures and definitions.",
  },
  args: {
    from: {
      type: "positional",
      required: true,
      description: "Baseline bundle (JSON path).",
    },
    to: {
      type: "positional",
      required: true,
      description: "New bundle (JSON path).",
    },
    json: {
      type: "boolean",
      default: false,
      description: "Emit machine-readable JSON.",
    },
    "breaking-only": {
      type: "boolean",
      default: false,
      description:
        "Exit non-zero only when changes are non-additive (removed signatures, changed input/output shape).",
    },
  },
  async run({ args }) {
    const from = await loadBundle(args.from);
    const to = await loadBundle(args.to);

    const report = computeDiff(from, to);

    if (args.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      renderReport(report);
    }

    const hasBreaking =
      report.signatures.removed.length > 0 ||
      report.signatures.changed.length > 0 ||
      report.definitions.removed.length > 0 ||
      report.definitions.changed.length > 0;
    const hasAny =
      hasBreaking ||
      report.signatures.added.length > 0 ||
      report.definitions.added.length > 0 ||
      report.definitions.changed.length > 0;

    if (args["breaking-only"] ? hasBreaking : hasAny) {
      process.exitCode = 1;
    }
  },
});

async function loadBundle(p: string): Promise<Bundle> {
  const abs = path.resolve(process.cwd(), p);
  try {
    const raw = await readFile(abs, "utf8");
    const parsed = JSON.parse(raw) as Bundle;
    if (!parsed?.signatures || !parsed?.definitions) {
      throw new Error(`Not a fn-schema bundle: ${abs}`);
    }
    return parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    consola.error(`Failed to read ${abs}: ${msg}`);
    process.exit(1);
  }
}

interface DiffReport {
  signatures: {
    added: string[];
    removed: string[];
    changed: { id: string; input: boolean; output: boolean }[];
  };
  definitions: {
    added: string[];
    removed: string[];
    changed: string[];
  };
}

function computeDiff(from: Bundle, to: Bundle): DiffReport {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: { id: string; input: boolean; output: boolean }[] = [];

  for (const id of Object.keys(to.signatures))
    if (!(id in from.signatures)) added.push(id);
  for (const [id, sig] of Object.entries(from.signatures)) {
    const next = to.signatures[id];
    if (!next) {
      removed.push(id);
      continue;
    }
    const inputChanged = !deepEqual(sig.input, next.input);
    const outputChanged = !deepEqual(sig.output, next.output);
    if (inputChanged || outputChanged) {
      changed.push({ id, input: inputChanged, output: outputChanged });
    }
  }

  const fromDefs = new Set(Object.keys(from.definitions));
  const toDefs = new Set(Object.keys(to.definitions));
  const defAdded: string[] = [];
  const defRemoved: string[] = [];
  const defChanged: string[] = [];
  for (const k of toDefs) if (!fromDefs.has(k)) defAdded.push(k);
  for (const k of fromDefs) {
    if (!toDefs.has(k)) defRemoved.push(k);
    else if (!deepEqual(from.definitions[k], to.definitions[k]))
      defChanged.push(k);
  }

  return {
    signatures: {
      added: added.sort(),
      removed: removed.sort(),
      changed: changed.sort((a, b) => a.id.localeCompare(b.id)),
    },
    definitions: {
      added: defAdded.sort(),
      removed: defRemoved.sort(),
      changed: defChanged.sort(),
    },
  };
}

function renderReport(r: DiffReport): void {
  const sig = r.signatures;
  const def = r.definitions;
  const total =
    sig.added.length +
    sig.removed.length +
    sig.changed.length +
    def.added.length +
    def.removed.length +
    def.changed.length;

  if (total === 0) {
    consola.success("No changes.");
    return;
  }

  if (sig.added.length) {
    process.stdout.write("\nsignatures added:\n");
    for (const id of sig.added) process.stdout.write(`  + ${id}\n`);
  }
  if (sig.removed.length) {
    process.stdout.write("\nsignatures removed:\n");
    for (const id of sig.removed) process.stdout.write(`  - ${id}\n`);
  }
  if (sig.changed.length) {
    process.stdout.write("\nsignatures changed:\n");
    for (const c of sig.changed) {
      const parts = [c.input ? "input" : "", c.output ? "output" : ""]
        .filter(Boolean)
        .join(" + ");
      process.stdout.write(`  ~ ${c.id}  (${parts})\n`);
    }
  }
  if (def.added.length) {
    process.stdout.write("\ndefinitions added:\n");
    for (const k of def.added) process.stdout.write(`  + ${k}\n`);
  }
  if (def.removed.length) {
    process.stdout.write("\ndefinitions removed:\n");
    for (const k of def.removed) process.stdout.write(`  - ${k}\n`);
  }
  if (def.changed.length) {
    process.stdout.write("\ndefinitions changed:\n");
    for (const k of def.changed) process.stdout.write(`  ~ ${k}\n`);
  }
  process.stdout.write("\n");
  consola.box(
    `signatures: +${sig.added.length} −${sig.removed.length} ~${sig.changed.length}   ` +
      `definitions: +${def.added.length} −${def.removed.length} ~${def.changed.length}`,
  );
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (!deepEqual(ao[k], bo[k])) return false;
  return true;
}
