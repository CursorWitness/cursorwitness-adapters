# soroban-indexer-ts

A TypeScript indexer for Soroban smart contract events on Stellar.

Polls the Soroban RPC, parses contract events, stores them in SQLite,
and exposes a REST API for querying. Drop-in indexing infrastructure
for any Soroban contract — no blockchain expertise required to use it.

---

## Why This Exists

Soroban contracts emit events but there's no standard way to index and
query them off-chain. This project fills that gap with:

- A polling indexer that continuously fetches new events
- SQLite storage — zero infra, runs anywhere Node.js runs
- A REST API for querying events by contract, type, or ledger range
- TypeScript — fully typed, easy to extend

---

## Architecture

```
soroban-indexer-ts/
├── src/
│   ├── config.ts       # Zod-validated environment config
│   ├── types.ts        # IndexedEvent, IndexerState types
│   ├── db.ts           # SQLite layer (better-sqlite3)
│   ├── stellar.ts      # Soroban RPC event fetcher
│   ├── indexer.ts      # Polling loop — fetch → parse → store
│   ├── index.ts        # Express server entry point
│   ├── routes/
│   │   └── events.ts   # GET /events REST API
│   └── tests/
│       └── db.test.ts  # Database tests
└── .env.example        # Configuration reference
```

---

## REST API

| Endpoint | Description |
|---|---|
| `GET /health` | Health check + version |
| `GET /events` | Query all events (filterable) |
| `GET /events/status` | Indexer status + last ledger per contract |
| `GET /events/:contractId` | Events for a specific contract |

### Query Parameters

| Param | Type | Description |
|---|---|---|
| `contract_id` | string | Filter by contract ID |
| `event_type` | string | Filter by event type (e.g. `CREATED`) |
| `from_ledger` | number | Start ledger (inclusive) |
| `to_ledger` | number | End ledger (inclusive) |
| `limit` | number | Max results (default 100, max 500) |
| `offset` | number | Pagination offset |

### Example

```bash
# Get last 10 events for a contract
curl "http://localhost:3002/events/CABC...?limit=10"

# Get all APPROVED events since ledger 1000000
curl "http://localhost:3002/events?event_type=APPROVED&from_ledger=1000000"
```

---

## Setup

```bash
npm install
cp .env.example .env
# Edit .env — set CONTRACT_IDS to your contract IDs
npm run dev
```

---

## Configuration

| Variable | Description | Default |
|---|---|---|
| `CONTRACT_IDS` | Comma-separated contract IDs to index | required |
| `STELLAR_RPC_URL` | Soroban RPC endpoint | testnet |
| `POLL_INTERVAL_MS` | Polling frequency | 5000 |
| `START_LEDGER` | Starting ledger (0 = auto) | 0 |
| `DB_PATH` | SQLite file path | `./data/index.db` |
| `PORT` | REST API port | 3002 |

---

## Running Tests

```bash
npm test
```

---

## Open Issues for Contributors

1. Add PostgreSQL adapter as alternative to SQLite
2. Add WebSocket endpoint for real-time event streaming
3. Add contract ABI parsing — decode raw ScVal to human-readable JSON
4. Build a web UI dashboard for browsing indexed events
5. Add Docker and docker-compose setup
6. Add Prometheus metrics endpoint for monitoring
7. Support multiple RPC endpoints with failover
8. Add event deduplication — prevent double-indexing on restart
9. Write integration tests against a local Soroban sandbox
10. Add support for indexing Stellar Classic operations alongside Soroban events

---

## Contributing

This project participates in the Stellar Wave Program on Drips.
Pick an open issue, apply at [drips.network/wave](https://drips.network/wave), and submit a PR.

---

## License

Apache 2.0
