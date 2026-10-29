/**
 * Tests for the database layer.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { saveEvent, saveEvents, queryEvents, getLastLedger, setLastLedger } from "../db.js";

const mockEvent = {
  contract_id: "CABC123",
  ledger: 1000,
  ledger_closed_at: "2026-01-01T00:00:00Z",
  tx_hash: "abc123",
  event_type: "CREATED",
  topic_0: "CREATED",
  topic_1: null,
  topic_2: null,
  topic_3: null,
  value: "100",
  indexed_at: new Date().toISOString(),
};

describe("database", () => {
  it("saves and retrieves an event", () => {
    saveEvent(mockEvent);
    const events = queryEvents({ contract_id: "CABC123" });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].contract_id).toBe("CABC123");
  });

  it("filters by event_type", () => {
    saveEvent({ ...mockEvent, contract_id: "CXYZ", event_type: "APPROVED", topic_0: "APPROVED" });
    const events = queryEvents({ contract_id: "CXYZ", event_type: "APPROVED" });
    expect(events.every((e) => e.event_type === "APPROVED")).toBe(true);
  });

  it("filters by ledger range", () => {
    saveEvent({ ...mockEvent, contract_id: "CRANGE", ledger: 500 });
    saveEvent({ ...mockEvent, contract_id: "CRANGE", ledger: 1500 });
    const events = queryEvents({ contract_id: "CRANGE", from_ledger: 400, to_ledger: 600 });
    expect(events.every((e) => e.ledger >= 400 && e.ledger <= 600)).toBe(true);
  });

  it("tracks and updates last ledger", () => {
    setLastLedger("CSTATE", 999);
    expect(getLastLedger("CSTATE")).toBe(999);
    setLastLedger("CSTATE", 1500);
    expect(getLastLedger("CSTATE")).toBe(1500);
  });

  it("returns 0 for unknown contract", () => {
    expect(getLastLedger("CUNKNOWN_XYZ")).toBe(0);
  });

  it("saves multiple events in a transaction", () => {
    const batch = Array.from({ length: 5 }, (_, i) => ({
      ...mockEvent,
      contract_id: "CBATCH",
      ledger: 2000 + i,
      tx_hash: `tx${i}`,
    }));
    saveEvents(batch);
    const events = queryEvents({ contract_id: "CBATCH" });
    expect(events.length).toBe(5);
  });

  it("respects limit and offset", () => {
    const events = queryEvents({ limit: 2, offset: 0 });
    expect(events.length).toBeLessThanOrEqual(2);
  });
});
