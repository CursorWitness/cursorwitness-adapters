# CursorWitness adapter status

This repository is the local working copy of the user-owned fork
`https://github.com/Marvelg256/soroban-indexer-ts`.

The local fork adds an injectable finite cycle in `src/indexer-core.ts` with
ports for RPC fetch, event storage, and ledger checkpoint state, plus hooks for
delivery, effect attempt, effect commit, and checkpoint save. The default
long-running indexer entry point remains available in `src/indexer.ts`.

The extracted adapter proof is now runnable from this repository:

```text
pnpm run cursorwitness:check
```

It uses the packed local `@cursorwitness/core` artifact and the independent
core oracle. The same proof remains available from the umbrella repository as:

```text
pnpm run adapter:fork:check
```

The proof uses the actual compiled fork cycle and the independent CursorWitness
oracle. It injects a crash after effect commit and before checkpoint save; the
restart produces duplicate delivery and a named duplicate committed-effect
failure.

Current limits:

- the fork's existing SQLite tests require a locally available
  `better-sqlite3` native binding;
- the current fetch path does not expose cursor continuation;
- the fork license file must be clarified before distribution;
- local changes are uncommitted and unpushed;
- this is a local integration repository, not a public release.
