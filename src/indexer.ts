/**
 * Core indexer loop.
 *
 * For each configured contract:
 * 1. Read the last indexed ledger from the database
 * 2. Fetch new events from the Soroban RPC
 * 3. Store them in SQLite
 * 4. Update the last indexed ledger
 *
 * Runs on a configurable polling interval.
 */

import { config } from "./config.js";
import { fetchEvents, getLatestLedger } from "./stellar.js";
import { getLastLedger, setLastLedger, saveEvents } from "./db.js";
import type { IndexedEvent } from "./types.js";

let isRunning = false;

export interface IndexerPorts {
  readonly getLastLedger: (contractId: string) => number;
  readonly setLastLedger: (contractId: string, ledger: number) => void;
  readonly saveEvents: (events: Omit<IndexedEvent, "id">[]) => void;
  readonly fetchEvents: (contractId: string, startLedger: number, endLedger?: number) => Promise<Omit<IndexedEvent, "id">[]>;
  readonly getLatestLedger: () => Promise<number>;
}

export interface IndexerHooks {
  readonly onDelivery?: (event: Omit<IndexedEvent, "id">) => void;
  readonly onEffectAttempt?: (event: Omit<IndexedEvent, "id">) => void;
  readonly onEffectCommit?: (event: Omit<IndexedEvent, "id">) => void;
  readonly onCheckpointSave?: (contractId: string, ledger: number) => void;
}

const defaultPorts: IndexerPorts = {
  getLastLedger,
  setLastLedger,
  saveEvents,
  fetchEvents,
  getLatestLedger,
};

/**
 * Index one contract — fetch and store new events since last run.
 */
export async function indexContractOnce(
  contractId: string,
  ports: IndexerPorts = defaultPorts,
  hooks: IndexerHooks = {},
): Promise<{ readonly contractId: string; readonly startLedger: number; readonly latestLedger: number; readonly eventCount: number }> {
  const lastLedger = ports.getLastLedger(contractId);

  // Determine starting ledger
  let startLedger = lastLedger > 0 ? lastLedger + 1 : config.START_LEDGER;

  // If START_LEDGER is 0, start from current ledger - 1000 (safe lookback)
  if (startLedger === 0) {
    const latest = await ports.getLatestLedger();
    startLedger = Math.max(1, latest - 1000);
  }

  const latestLedger = await ports.getLatestLedger();

  if (startLedger > latestLedger) {
    // Already up to date
    return { contractId, startLedger, latestLedger, eventCount: 0 };
  }

  console.log(
    `📦 [${contractId.slice(0, 8)}...] Indexing ledgers ${startLedger} → ${latestLedger}`
  );

  const events = await ports.fetchEvents(contractId, startLedger);

  for (const event of events) hooks.onDelivery?.(event);

  if (events.length > 0) {
    for (const event of events) hooks.onEffectAttempt?.(event);
    ports.saveEvents(events);
    for (const event of events) hooks.onEffectCommit?.(event);
    console.log(`✅ [${contractId.slice(0, 8)}...] Stored ${events.length} event(s)`);
  }

  ports.setLastLedger(contractId, latestLedger);
  hooks.onCheckpointSave?.(contractId, latestLedger);
  return { contractId, startLedger, latestLedger, eventCount: events.length };
}

/**
 * Run one full indexing cycle across all configured contracts.
 */
export async function runCycleOnce(
  ports: IndexerPorts = defaultPorts,
  hooks: IndexerHooks = {},
): Promise<readonly { readonly contractId: string; readonly startLedger: number; readonly latestLedger: number; readonly eventCount: number }[]> {
  const results: Array<{ readonly contractId: string; readonly startLedger: number; readonly latestLedger: number; readonly eventCount: number }> = [];
  for (const contractId of config.contractIds) results.push(await indexContractOnce(contractId, ports, hooks));
  return results;
}

async function runCycle(): Promise<void> {
  if (isRunning) {
    console.log("⚠️  Previous cycle still running — skipping");
    return;
  }

  isRunning = true;

  try {
    await runCycleOnce();
  } catch (err) {
    console.error(
      "❌ Indexer error:",
      err instanceof Error ? err.message : String(err)
    );
  } finally {
    isRunning = false;
  }
}

/**
 * Start the indexer polling loop.
 */
export function startIndexer(): void {
  console.log(`🚀 Indexer started — polling every ${config.POLL_INTERVAL_MS}ms`);
  console.log(`📋 Watching contracts: ${config.contractIds.join(", ")}`);

  // Run immediately, then on interval
  runCycle();
  setInterval(runCycle, config.POLL_INTERVAL_MS);
}
