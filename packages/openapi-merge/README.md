# @ahmedrowaihi/openapi-merge

Fold multiple OpenAPI 3.x specs into one with policy-driven conflict resolution. Renames and `$ref` rewriting stay consistent — the output is a self-contained, valid OpenAPI 3.1 document.

## Install

```sh
pnpm add @ahmedrowaihi/openapi-merge
```

## Usage

```ts
import { merge } from "@ahmedrowaihi/openapi-merge";

const out = merge(
  [
    { label: "pets", spec: petsSpec },
    { label: "store", spec: storeSpec },
  ],
  {
    paths: { onConflict: "prefix" },
    components: { onConflict: "namespace" },
  },
);
// → { openapi: "3.1.0", paths: { "/pets/pets": …, "/store/pets": … }, components: { schemas: { pets_Pet, store_Pet } } }
```

## Conflict policies

### `paths.onConflict`

| value         | behavior                                                              |
| ------------- | --------------------------------------------------------------------- |
| `error`       | throw `MergeConflictError` on collision (default)                     |
| `first-wins`  | keep the first occurrence                                             |
| `last-wins`   | keep the last occurrence                                              |
| `prefix`      | prefix every path with `paths.prefix(label)` (default `/{label}`)     |

### `components.onConflict`

| value         | behavior                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `namespace`   | rename **every** component as `components.namespace(label, name)` (default `{label}_{name}`) — no clashes |
| `error`       | throw on collision                                                                                        |
| `first-wins`  | keep the first occurrence                                                                                 |
| `last-wins`   | keep the last occurrence                                                                                  |

When a component is renamed, every internal `$ref` pointing at it (including deep pointers like `#/components/schemas/Pet/properties/name`) is rewritten so the output stays valid. External refs (`other.yaml#/Foo`) are left untouched.

### `operationIds.onConflict`

| value         | behavior                                                              |
| ------------- | --------------------------------------------------------------------- |
| `namespace`   | rename every `operationId` as `{label}_{id}` (default)                |
| `error`       | throw on collision                                                    |
| `first-wins`  | first source keeps the id; later sources lose it                      |
| `last-wins`   | last writer wins                                                      |

### `tags.strategy`

`union` (default) deduplicates by name; `namespace` prefixes each tag with the source label.

### `servers.strategy`

`union` (default), `first`, or `last`.

## What gets merged

| Section                     | Behavior                                                                       |
| --------------------------- | ------------------------------------------------------------------------------ |
| `paths`                     | per `paths` policy                                                             |
| `components.*` (10 sections) | per `components` policy; refs rewritten consistently                          |
| `webhooks` (3.1)            | union by name; first-wins on collision                                         |
| `tags`                      | per `tags` policy                                                              |
| `servers`                   | per `servers` policy                                                           |
| `security`                  | union (deduped by exact-equal requirement object)                              |
| `info`                      | first source's info, with `merge.info` overrides applied field-by-field        |
| `operationId`               | per `operationIds` policy                                                      |

## Why not `redocly bundle` or `openapi-merge`?

Both exist; both treat conflict resolution as an afterthought. This package is conflict-policy first — you tell it how to resolve, it does the rewrites consistently.
