/**
 * Stellar RPC client helpers.
 * Fetches contract events from the Soroban RPC endpoint.
 */

import { rpc, xdr } from "@stellar/stellar-sdk";
import { config } from "./config.js";
import type { IndexedEvent } from "./types.js";

export const server = new rpc.Server(config.STELLAR_RPC_URL, {
  allowHttp: false,
});

/**
 * Fetch Soroban contract events for a given contract between two ledgers.
 * Returns parsed IndexedEvent objects ready to be stored.
 */
export async function fetchEvents(
  contractId: string,
  startLedger: number,
  endLedger?: number
): Promise<Omit<IndexedEvent, "id">[]> {
  const response = await server.getEvents({
    startLedger,
    filters: [
      {
        type: "contract",
        contractIds: [contractId],
      },
    ],
    limit: 100,
  });

  const events: Omit<IndexedEvent, "id">[] = [];

  for (const event of response.events) {
    const topics = event.topic.map((t: xdr.ScVal) => scValToString(t));

    events.push({
      contract_id: contractId,
      ledger: event.ledger,
      ledger_closed_at: event.ledgerClosedAt,
      tx_hash: event.txHash,
      event_type: topics[0] ?? "unknown",
      topic_0: topics[0] ?? "",
      topic_1: topics[1] ?? null,
      topic_2: topics[2] ?? null,
      topic_3: topics[3] ?? null,
      value: scValToString(event.value),
      indexed_at: new Date().toISOString(),
    });
  }

  return events;
}

/**
 * Get the latest ledger sequence number from the RPC.
 */
export async function getLatestLedger(): Promise<number> {
  const response = await server.getLatestLedger();
  return response.sequence;
}

/**
 * Convert an ScVal to a human-readable string for storage.
 */
function scValToString(val: xdr.ScVal): string {
  try {
    switch (val.switch().name) {
      case "scvSymbol":
        return val.sym().toString();
      case "scvString":
        return val.str().toString();
      case "scvU64":
        return val.u64().toString();
      case "scvI128": {
        const i128 = val.i128();
        return `${i128.hi()},${i128.lo()}`;
      }
      case "scvAddress":
        return val.address().accountId()?.ed25519()?.toString("hex") ?? "contract";
      case "scvVec": {
        const vec = val.vec();
        return vec ? `[${vec.map(scValToString).join(",")}]` : "[]";
      }
      default:
        return val.switch().name;
    }
  } catch {
    return "unknown";
  }
}
