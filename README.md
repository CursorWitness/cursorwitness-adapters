# CursorWitness adapters

Optional integrations for testing real Stellar/Soroban event consumers with
CursorWitness. The repository currently contains a local integration boundary
for the `Marvelg256/soroban-indexer-ts` fork.

## What this repository owns

- consumer-specific adapter seams and finite test entry points;
- source revision, dependency, and license records;
- delivery, effect, and checkpoint observation hooks;
- integration evidence evaluated by the independent
  [`@cursorwitness/core`](https://github.com/CursorWitness/cursorwitness-core)
  oracle.

It does not reimplement the CursorWitness core and does not claim universal
consumer correctness, database durability, cursor completeness, or exactly-once
business processing.

## Local verification

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm run package:check
pnpm run cursorwitness:check
```

`cursorwitness:check` injects a deterministic crash after an effect commit and
before checkpoint persistence. The restart trace is evaluated by the core
oracle and must report the duplicate committed-effect invariant.

## Current limitations

- the upstream fork's SQLite tests require a working `better-sqlite3` native
  binding;
- the current fetch path does not yet expose cursor continuation;
- the fork's license must be confirmed before distributing this adapter;
- durability evidence remains `unverified` unless the real persistence boundary
  is observed.

## Contributing

Keep adapter-specific behavior here. Extend the core only for provider-neutral
contracts. Every adapter change must identify the consumer revision, license,
failure boundary, and exact verification command.
