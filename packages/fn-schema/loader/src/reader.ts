import {
  type Bundle,
  type BundleSignature,
  DEFAULT_IDENTITY_KEY,
  DEFINITIONS_PREFIX,
  type DefinitionName,
  type Match,
  type SignatureId,
} from "./types.js";

export interface Reader<T extends Bundle> {
  readonly bundle: T;
  get<K extends SignatureId<T>>(id: K): T["signatures"][K] | undefined;
  has<K extends string>(id: K): id is K & SignatureId<T>;
  resolve<K extends DefinitionName<T>>(
    name: K,
  ): T["definitions"][K] | undefined;
  resolveRef(ref: string): Record<string, unknown> | undefined;
  inputOf<K extends SignatureId<T>>(id: K): unknown;
  outputOf<K extends SignatureId<T>>(id: K): unknown;
  findByIdentity(name: string, identityKey?: string): Match[];
  listSignatures(): SignatureId<T>[];
  listDefinitions(): DefinitionName<T>[];
}

export function createReader<T extends Bundle>(bundle: T): Reader<T> {
  const signatures = bundle.signatures as Record<string, BundleSignature>;
  const definitions = bundle.definitions;
  const hasOwn = (obj: object, key: string): boolean =>
    Object.prototype.hasOwnProperty.call(obj, key);

  const resolveRef = (ref: string): Record<string, unknown> | undefined => {
    if (!ref.startsWith(DEFINITIONS_PREFIX)) return undefined;
    const name = ref.slice(DEFINITIONS_PREFIX.length);
    return hasOwn(definitions, name) ? definitions[name] : undefined;
  };

  const followRef = (schema: unknown): unknown => {
    if (!schema || typeof schema !== "object") return schema;
    const ref = (schema as { $ref?: unknown }).$ref;
    if (typeof ref === "string") {
      const resolved = resolveRef(ref);
      if (resolved !== undefined) return resolved;
    }
    return schema;
  };

  return {
    bundle,
    get(id) {
      return hasOwn(signatures, id)
        ? (signatures[id] as T["signatures"][typeof id])
        : undefined;
    },
    has(id): id is typeof id & SignatureId<T> {
      return hasOwn(signatures, id);
    },
    resolve(name) {
      return hasOwn(definitions, name)
        ? (definitions[name] as T["definitions"][typeof name])
        : undefined;
    },
    resolveRef,
    inputOf(id) {
      if (!hasOwn(signatures, id)) return undefined;
      const sig = signatures[id]!;
      if (Array.isArray(sig.input)) return sig.input.map(followRef);
      return followRef(sig.input);
    },
    outputOf(id) {
      if (!hasOwn(signatures, id)) return undefined;
      const sig = signatures[id]!;
      return followRef(sig.output);
    },
    findByIdentity(name, identityKey = DEFAULT_IDENTITY_KEY) {
      const out: Match[] = [];
      const matchesIdentity = (schema: unknown): boolean => {
        if (!schema || typeof schema !== "object") return false;
        const direct =
          (schema as Record<string, unknown>)[identityKey] === name;
        if (direct) return true;
        const ref = (schema as { $ref?: unknown }).$ref;
        if (typeof ref === "string") {
          const resolved = resolveRef(ref);
          if (
            resolved &&
            (resolved as Record<string, unknown>)[identityKey] === name
          ) {
            return true;
          }
        }
        return false;
      };
      for (const [id, sig] of Object.entries(signatures)) {
        if (Array.isArray(sig.input)) {
          for (const part of sig.input) {
            if (matchesIdentity(part)) {
              out.push({ signatureId: id, position: "input", schema: part });
            }
          }
        } else if (matchesIdentity(sig.input)) {
          out.push({ signatureId: id, position: "input", schema: sig.input });
        }
        if (matchesIdentity(sig.output)) {
          out.push({ signatureId: id, position: "output", schema: sig.output });
        }
      }
      return out;
    },
    listSignatures() {
      return Object.keys(signatures) as SignatureId<T>[];
    },
    listDefinitions() {
      return Object.keys(definitions) as DefinitionName<T>[];
    },
  };
}
