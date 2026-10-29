# Contributing to CursorWitness Adapters

This repository contains consumer-specific integration seams. Keep provider-neutral contracts and oracle behavior in
[`cursorwitness-core`](https://github.com/CursorWitness/cursorwitness-core), and keep command parsing and report
presentation in [`cursorwitness-cli`](https://github.com/CursorWitness/cursorwitness-cli).

## Before opening a pull request

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run build
pnpm run package:check
pnpm run cursorwitness:check
```

Every adapter change must identify the consumer revision, license/provenance status, observable lifecycle boundary,
known `unverified` boundaries, and exact verification command. Do not include credentials, private source, or claims of
universal consumer correctness.

See [`CURSORWITNESS_ADAPTER.md`](CURSORWITNESS_ADAPTER.md) and [`SECURITY.md`](SECURITY.md).
