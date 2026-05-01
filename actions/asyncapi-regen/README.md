# asyncapi-regen GitHub Action

Regenerate a TypeScript event SDK from an AsyncAPI 3.0 spec on every push or PR — and either commit the result back or open a PR with the diff. Drops in next to a committed SDK to keep it in sync with its source spec without manual `pnpm gen` invocations.

Powered by [`@ahmedrowaihi/asyncapi-typescript`](https://www.npmjs.com/package/@ahmedrowaihi/asyncapi-typescript). Plugin-compose: pick which plugins emit (types, events const, event-map, dispatcher runtime, amqplib helpers, barrel).

Sister to [`actions/sdk-regen`](../sdk-regen) (the OpenAPI version) — same overall shape, different generator.

## Usage

### Open a PR when the spec changes

```yaml
name: Regenerate event SDK
on:
  push:
    branches: [main]
    paths: ['asyncapi.yaml']

permissions:
  contents: write
  pull-requests: write

jobs:
  regen:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ahmedrowaihi/contract-kit/actions/asyncapi-regen@asyncapi-regen-v1
        with:
          input: asyncapi.yaml
          output: generated/events
```

### Pick plugin subset

Default emits the full set (`typescript,events,event-map,dispatch,amqplib,index`). To emit just types + events const (no dispatcher, no amqplib helpers):

```yaml
- uses: ahmedrowaihi/contract-kit/actions/asyncapi-regen@asyncapi-regen-v1
  with:
    input: asyncapi.yaml
    output: generated/events
    plugins: 'typescript,events,index'
```

### Commit directly back

```yaml
- uses: ahmedrowaihi/contract-kit/actions/asyncapi-regen@asyncapi-regen-v1
  with:
    input: asyncapi.yaml
    output: generated/events
    commit-strategy: commit-back
```

### Just regen, leave the diff for following steps

```yaml
- uses: ahmedrowaihi/contract-kit/actions/asyncapi-regen@asyncapi-regen-v1
  id: regen
  with:
    input: asyncapi.yaml
    output: generated/events
    commit-strategy: none
- name: Fail if SDK is stale
  if: steps.regen.outputs.changed == 'true'
  run: |
    echo "::error::SDK in generated/events is out of sync with asyncapi.yaml"
    exit 1
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `input` | yes | — | Path or URL to the AsyncAPI 3.0 spec |
| `output` | yes | — | Directory the generated SDK is written to |
| `plugins` | no | all | Comma-separated plugin list. `typescript`, `events`, `event-map`, `dispatch`, `amqplib`, `index` |
| `generator-version` | no | `latest` | Pinned semver of `@ahmedrowaihi/asyncapi-typescript` |
| `commit-strategy` | no | `pull-request` | `pull-request` \| `commit-back` \| `none` |
| `commit-message` | no | `chore: regenerate AsyncAPI SDK` | |
| `pr-title` | no | `chore: regenerate AsyncAPI SDK` | only `pull-request` |
| `pr-branch` | no | `asyncapi-regen` | only `pull-request` |
| `token` | no | `${{ github.token }}` | for commits / PRs |

## Outputs

| Output | Description |
| --- | --- |
| `changed` | `true` when the regen produced a diff under `output` |
| `files-changed` | Number of files added / modified / deleted |

## Permissions

- `contents: write` — required for `commit-back`, and for `pull-request` so the action can push the regen branch.
- `pull-requests: write` — required for `pull-request` to open / update the PR.
- "Allow GitHub Actions to create and approve pull requests" must be enabled in repo settings.
