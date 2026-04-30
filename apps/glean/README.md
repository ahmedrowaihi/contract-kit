# Glean

Chrome / Firefox DevTools extension that reverse-engineers an OpenAPI 3.1 spec from the network traffic of whatever site you're inspecting. Open DevTools → Glean panel → browse around → copy out a spec.

Built on [`@ahmedrowaihi/openapi-recon`](../../packages/openapi-recon) for the inference engine, [`@scalar/api-reference-react`](https://github.com/scalar/scalar) for the rendered spec view, and [WXT](https://wxt.dev) for the cross-browser extension shell.

Not published to npm — install from source or grab the packaged `.zip` from the GitHub releases when one's posted.

## What it does

- Listens to `webRequest` events, captures every fetch/XHR alongside its response body.
- Pipes each pair into `openapi-recon`, which folds them into a JSON Schema 2020-12 OpenAPI document.
- Renders the live spec in a side-by-side panel via Scalar.
- Templates paths (`/pets/42` + `/pets/8` → `/pets/{petId}`), detects auth schemes (`Authorization: Bearer`, `X-API-Key`, basic), groups by origin so one panel covers traffic to several backends.
- One-click copy to clipboard or download as YAML / JSON.

The current limit is one panel state per inspected page — multi-tab capture is on the [polish list](../../IDEAS.md).

## Install (from source)

```bash
pnpm install
pnpm --filter @ahmedrowaihi/glean dev          # Chrome dev build
pnpm --filter @ahmedrowaihi/glean dev:firefox  # Firefox dev build
```

WXT prints the unpacked extension dir; load it as an unpacked extension in `chrome://extensions` (or `about:debugging` in Firefox).

## Build a release

```bash
pnpm --filter @ahmedrowaihi/glean build         # Chrome
pnpm --filter @ahmedrowaihi/glean build:firefox # Firefox
pnpm --filter @ahmedrowaihi/glean zip           # zipped artifact
```

## Permissions

- `storage`, `unlimitedStorage` — persists the working spec across DevTools reloads.
- The DevTools `webRequest` API gives access to bodies for the inspected page only — Glean never touches traffic outside the page you have open.

## License

MIT
