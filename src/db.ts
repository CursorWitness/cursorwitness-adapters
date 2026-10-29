/**
 * SQLite database layer.
 * All indexed events and indexer state are stored here.
 * Using better-sqlite3 for synchronous, zero-config persistence.
 */

import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import { config } from "./config.js";
import type { IndexedEvent, IndexerState } from "./types.js";

// Ensure data directory exists
mkdirSync(dirname(config.DB_PATH), { recursive: true });

export const db: Database.Database = new Database(config.DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ─────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id      TEXT    NOT NULL,
    ledger           INTEGER NOT NULL,
    ledger_closed_at TEXT    NOT NULL,
    tx_hash          TEXT    NOT NULL,
    event_type       TEXT    NOT NULL,
    topic_0          TEXT    NOT NULL,
    topic_1          TEXT,
    topic_2          TEXT,
    topic_3          TEXT,
    value            TEXT    NOT NULL,
    indexed_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_events_contract ON events(contract_id);
  CREATE INDEX IF NOT EXISTS idx_events_ledger   ON events(ledger);
  CREATE INDEX IF NOT EXISTS idx_events_type     ON events(event_type);

  CREATE TABLE IF NOT EXISTS indexer_state (
    contract_id  TEXT PRIMARY KEY,
    last_ledger  INTEGER NOT NULL DEFAULT 0,
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Events ──────────────────────────────────────────────────────────────────

const insertEvent = db.prepare(`
  INSERT INTO events
    (contract_id, ledger, ledger_closed_at, tx_hash, event_type,
     topic_0, topic_1, topic_2, topic_3, value, indexed_at)
  VALUES
    (@contract_id, @ledger, @ledger_closed_at, @tx_hash, @event_type,
     @topic_0, @topic_1, @topic_2, @topic_3, @value, @indexed_at)
`);

export function saveEvent(event: Omit<IndexedEvent, "id">): void {
  insertEvent.run({ ...event, indexed_at: new Date().toISOString() });
}

export function saveEvents(events: Omit<IndexedEvent, "id">[]): void {
  const saveMany = db.transaction((evts: Omit<IndexedEvent, "id">[]) => {
    for (const e of evts) saveEvent(e);
  });
  saveMany(events);
}

export function queryEvents(params: {
  contract_id?: string;
  event_type?: string;
  from_ledger?: number;
  to_ledger?: number;
  limit?: number;
  offset?: number;
}): IndexedEvent[] {
  const conditions: string[] = [];
  const values: Record<string, unknown> = {};

  if (params.contract_id) {
    conditions.push("contract_id = @contract_id");
    values.contract_id = params.contract_id;
  }
  if (params.event_type) {
    conditions.push("event_type = @event_type");
    values.event_type = params.event_type;
  }
  if (params.from_ledger !== undefined) {
    conditions.push("ledger >= @from_ledger");
    values.from_ledger = params.from_ledger;
  }
  if (params.to_ledger !== undefined) {
    conditions.push("ledger <= @to_ledger");
    values.to_ledger = params.to_ledger;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;

  return db
    .prepare(`SELECT * FROM events ${where} ORDER BY ledger DESC LIMIT @limit OFFSET @offset`)
    .all({ ...values, limit, offset }) as IndexedEvent[];
}

// ── Indexer state ─────────────────────────────────────────────────────────

export function getLastLedger(contractId: string): number {
  const row = db
    .prepare("SELECT last_ledger FROM indexer_state WHERE contract_id = ?")
    .get(contractId) as { last_ledger: number } | undefined;
  return row?.last_ledger ?? 0;
}

export function setLastLedger(contractId: string, ledger: number): void {
  db.prepare(`
    INSERT INTO indexer_state (contract_id, last_ledger, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(contract_id) DO UPDATE SET
      last_ledger = excluded.last_ledger,
      updated_at  = excluded.updated_at
  `).run(contractId, ledger);
}
