import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { InMemoryObservationRecorder, evaluateOracle } from "@cursorwitness/core";

process.env.CONTRACT_IDS = "CABC123";
process.env.NODE_ENV = "test";
process.env.DB_PATH = resolve(".tmp", "fork-adapter-proof.db");

const fork = await import(pathToFileURL(resolve("dist", "indexer-core.js")));
const event = {
  contract_id: "CABC123", ledger: 101, ledger_closed_at: "2026-01-01T00:00:00Z",
  tx_hash: "tx-101", event_type: "CREATED", topic_0: "CREATED", topic_1: null,
  topic_2: null, topic_3: null, value: "value", indexed_at: "2026-01-01T00:00:00Z",
};
const effectKey = `event:${event.tx_hash}`;
const recorder = new InMemoryObservationRecorder();
const state = { lastLedger: 0, savedEvents: [], crashBeforeCheckpoint: true };
const attempts = new Map();
const ports = {
  getLastLedger: () => state.lastLedger,
  getLatestLedger: async () => 101,
  fetchEvents: async () => [event],
  saveEvents: (events) => { state.savedEvents.push(...events); },
  setLastLedger: (_contractId, ledger) => {
    if (state.crashBeforeCheckpoint) { state.crashBeforeCheckpoint = false; throw new Error("controlled crash before checkpoint persistence"); }
    state.lastLedger = ledger;
  },
};
const hooks = {
  onDelivery: (observed) => { const attempt = (attempts.get(observed.tx_hash) ?? 0) + 1; attempts.set(observed.tx_hash, attempt); recorder.delivery({ eventId: observed.tx_hash, attempt }); },
  onEffectAttempt: (observed) => recorder.effectAttempt({ effectKey, eventId: observed.tx_hash, attempt: attempts.get(observed.tx_hash) }),
  onEffectCommit: (observed) => recorder.effectCommit({ effectKey, eventId: observed.tx_hash, attempt: attempts.get(observed.tx_hash), persistence: "test-double" }),
  onCheckpointSave: (_contractId, ledger) => recorder.checkpoint({ operation: "save", outcome: "saved", evidence: { availability: "observed", value: { lastLedger: ledger } }, persistence: "test-double" }),
};

await assert.rejects(() => fork.indexContractOnce("CABC123", ports, hooks), /controlled crash/);
await fork.indexContractOnce("CABC123", ports, hooks);
const result = evaluateOracle({ scenarioId: "fork-adapter-crash-replay", expectedEventIds: [event.tx_hash], expectedHandlerEventIds: [], expectedEffectAttemptKeys: [effectKey], expectedEffectKeys: [effectKey] }, recorder.snapshot());
assert.equal(result.status, "fail");
assert.equal(result.counts.deliveryCount, 2);
assert.equal(result.counts.committedEffectCount, 2);
assert.equal(result.assertions.some((item) => item.id === "unique-effect-committed-once" && item.status === "fail"), true);
assert.equal(state.lastLedger, 101);
console.log("adapterCursorWitnessVerification: true (local fork cycle and core oracle agree on crash replay evidence)");
