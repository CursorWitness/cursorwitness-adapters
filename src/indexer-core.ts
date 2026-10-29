import { config } from "./config.js";
import type { IndexedEvent } from "./types.js";

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

export interface IndexCycleResult {
  readonly contractId: string;
  readonly startLedger: number;
  readonly latestLedger: number;
  readonly eventCount: number;
}

export async function indexContractOnce(contractId: string, ports: IndexerPorts, hooks: IndexerHooks = {}): Promise<IndexCycleResult> {
  const lastLedger = ports.getLastLedger(contractId);
  let startLedger = lastLedger > 0 ? lastLedger + 1 : config.START_LEDGER;
  if (startLedger === 0) {
    const latest = await ports.getLatestLedger();
    startLedger = Math.max(1, latest - 1000);
  }
  const latestLedger = await ports.getLatestLedger();
  if (startLedger > latestLedger) return { contractId, startLedger, latestLedger, eventCount: 0 };
  const events = await ports.fetchEvents(contractId, startLedger);
  for (const event of events) hooks.onDelivery?.(event);
  if (events.length > 0) {
    for (const event of events) hooks.onEffectAttempt?.(event);
    ports.saveEvents(events);
    for (const event of events) hooks.onEffectCommit?.(event);
  }
  ports.setLastLedger(contractId, latestLedger);
  hooks.onCheckpointSave?.(contractId, latestLedger);
  return { contractId, startLedger, latestLedger, eventCount: events.length };
}

export async function runCycleOnce(ports: IndexerPorts, hooks: IndexerHooks = {}): Promise<readonly IndexCycleResult[]> {
  const results: IndexCycleResult[] = [];
  for (const contractId of config.contractIds) results.push(await indexContractOnce(contractId, ports, hooks));
  return results;
}
