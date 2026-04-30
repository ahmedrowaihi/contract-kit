import {
  type KtExpr,
  type KtType,
  ktArg,
  ktCall,
  ktIdent,
  ktMember,
} from "../../kt-dsl/index.js";

/**
 * Build the kotlinx-serialization `KSerializer<T>` expression for a
 * `KtType`. Used wherever the impl needs to feed a serializer to
 * `Json.encodeToString(...)` / `client.execute(..., deserializer)` /
 * `Json.decodeFromString(...)`.
 *
 *  - `String`/`Int`/`Long`/…   → `String.serializer()` etc. (built-in shortcuts)
 *  - `List<T>`                 → `ListSerializer(<inner>)`
 *  - `Map<K, V>`               → `MapSerializer(<keySer>, <valSer>)`
 *  - nullable `T?`             → `<inner>.nullable`
 *  - user type `T`             → `T.serializer()` (always present on
 *                                `@Serializable` data classes / enums)
 *  - `Any`                     → `JsonElement.serializer()` (best-effort)
 *
 * The orchestrator tracks which builtin imports are needed and emits
 * the right `import kotlinx.serialization.builtins.*` line.
 */
export function serializerFor(t: KtType): KtExpr {
  switch (t.kind) {
    case "primitive":
      return primitiveSerializer(t.name);
    case "nullable":
      return ktMember(serializerFor(t.inner), "nullable");
    case "list":
      return ktCall(ktIdent("ListSerializer"), [
        ktArg(serializerFor(t.element)),
      ]);
    case "map":
      return ktCall(ktIdent("MapSerializer"), [
        ktArg(serializerFor(t.key)),
        ktArg(serializerFor(t.value)),
      ]);
    case "ref":
      return ktCall(ktMember(ktIdent(t.name), "serializer"), []);
    case "func":
      // No good serializer for closure types; falls back to JsonElement.
      return ktCall(ktMember(ktIdent("JsonElement"), "serializer"), []);
  }
}

function primitiveSerializer(name: string): KtExpr {
  switch (name) {
    case "String":
    case "Int":
    case "Long":
    case "Short":
    case "Byte":
    case "Double":
    case "Float":
    case "Boolean":
      return ktCall(ktMember(ktIdent(name), "serializer"), []);
    case "ByteArray":
      // ByteArraySerializer is a top-level value, not a fun.
      return ktIdent("ByteArraySerializer()");
    case "Unit":
    case "Any":
    case "Nothing":
    default:
      return ktCall(ktMember(ktIdent("JsonElement"), "serializer"), []);
  }
}
