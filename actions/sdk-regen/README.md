# sdk-regen GitHub Action

Regenerate a Go / Kotlin / Swift client SDK from an OpenAPI 3.x spec on every push or PR — and either commit the result back or open a PR with the diff. Drops in next to a committed SDK to keep it in sync with its source spec without manual `pnpm gen` invocations.

Powered by [`@ahmedrowaihi/openapi-go`](https://www.npmjs.com/package/@ahmedrowaihi/openapi-go) / [`-kotlin`](https://www.npmjs.com/package/@ahmedrowaihi/openapi-kotlin) / [`-swift`](https://www.npmjs.com/package/@ahmedrowaihi/openapi-swift). Part of [contract-kit](https://github.com/ahmedrowaihi/contract-kit).

## Usage

### Open a PR when the spec changes

```yaml
name: SDK regen
on:
  push:
    branches: [main]
    paths: ['openapi.yaml']

permissions:
  contents: write
  pull-requests: write

jobs:
  go:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ahmedrowaihi/contract-kit/actions/sdk-regen@v1
        with:
          target: go
          input: openapi.yaml
          output: sdk/go
          package-name: petstore
```

### Multiple targets in one workflow (matrix)

```yaml
jobs:
  regen:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        target: [go, kotlin, swift]
    steps:
      - uses: actions/checkout@v4
      - uses: ahmedrowaihi/contract-kit/actions/sdk-regen@v1
        with:
          target: ${{ matrix.target }}
          input: openapi.yaml
          output: sdk/${{ matrix.target }}
          pr-branch: sdk-regen/${{ matrix.target }}
```

### Commit directly back to the triggering branch

Skips the PR step. The default `GITHUB_TOKEN` cannot trigger downstream workflows on the push it creates — pass a PAT or App token via `token:` if you need that.

```yaml
- uses: ahmedrowaihi/contract-kit/actions/sdk-regen@v1
  with:
    target: go
    input: openapi.yaml
    output: sdk/go
    commit-strategy: commit-back
```

### Just regenerate, leave the diff for following steps

`commit-strategy: none` runs the generator and exits. Useful if you want to bundle the regen into a larger PR your own workflow opens, or to fail CI when the committed SDK is stale:

```yaml
- uses: ahmedrowaihi/contract-kit/actions/sdk-regen@v1
  id: regen
  with:
    target: go
    input: openapi.yaml
    output: sdk/go
    commit-strategy: none
- name: Fail if SDK is stale
  if: steps.regen.outputs.changed == 'true'
  run: |
    echo "::error::SDK in sdk/go is out of sync with openapi.yaml — re-run \`pnpm gen:go\` and commit."
    exit 1
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `target` | yes | — | `go`, `kotlin`, or `swift` |
| `input` | yes | — | Path or URL to the OpenAPI 3.x spec |
| `output` | yes | — | Directory the SDK is written to |
| `package-name` | no | `''` | Override the generated package / module name (Go `package`, Kotlin package path; ignored for Swift) |
| `generator-version` | no | `latest` | Pinned semver of `@ahmedrowaihi/openapi-<target>` |
| `commit-strategy` | no | `pull-request` | `pull-request` \| `commit-back` \| `none` |
| `commit-message` | no | `chore: regenerate ${target} SDK` | Commit message (`${target}` is substituted in `commit-back`) |
| `pr-title` | no | `chore: regenerate ${target} SDK` | PR title (only `pull-request`) |
| `pr-branch` | no | `sdk-regen/${target}` | PR branch name (only `pull-request`) |
| `token` | no | `${{ github.token }}` | Token used for commits / PRs |

## Outputs

| Output | Description |
| --- | --- |
| `changed` | `true` when the regen produced a diff under `output`, `false` otherwise |
| `files-changed` | Number of files added / modified / deleted under `output` |

## Permissions

- `contents: write` — required for `commit-back`, and for `pull-request` so the action can push the regen branch.
- `pull-requests: write` — required for `pull-request` to open / update the PR.

## How it works

The action is a [composite step](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action):

1. Sets up Node 20.
2. Installs `@ahmedrowaihi/openapi-<target>` into a temp directory under `$RUNNER_TEMP` so it doesn't pollute the consumer's `node_modules`.
3. Imports the package's `generate()` and runs it against the spec.
4. Diffs the output directory via `git status --porcelain`.
5. Either commits back, opens a PR via [`peter-evans/create-pull-request@v7`](https://github.com/peter-evans/create-pull-request), or exits with the diff in place.

No bundling required, so any version of the generator package on npm is callable without releasing a new version of the action.
