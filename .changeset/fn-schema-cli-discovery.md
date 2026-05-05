---
"@ahmedrowaihi/fn-schema-cli": minor
---

Adds `scan`, `inspect`, `browse`, `diff` subcommands. Bare `fn-schema <patterns>` now routes through `extract`.

```bash
# list functions without generating schemas
fn-schema scan 'src/**/*.ts'

# resolved input/output schema for one function
fn-schema inspect createUser 'src/api/**/*.ts'

# interactive picker → print / bundle / files / openapi
fn-schema browse 'src/**/*.ts'

# bundle-vs-bundle diff (CI-friendly via --breaking-only)
fn-schema diff old/schemas.json new/schemas.json --breaking-only

# extract is now an explicit subcommand (still the default)
fn-schema extract 'src/**/*.ts' --bundle generated/schemas.json --pretty
```
