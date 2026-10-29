/**
 * REST API routes for querying indexed events.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { queryEvents, getLastLedger } from "../db.js";
import { config } from "../config.js";

export const eventsRouter: ReturnType<typeof Router> = Router();

const QuerySchema = z.object({
  contract_id: z.string().optional(),
  event_type: z.string().optional(),
  from_ledger: z.coerce.number().optional(),
  to_ledger: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

/** GET /events — query indexed events with filters */
eventsRouter.get("/", (req: Request, res: Response): void => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const events = queryEvents(parsed.data);
  res.json({
    count: events.length,
    offset: parsed.data.offset,
    limit: parsed.data.limit,
    events,
  });
});

/** GET /events/status — indexer health and last indexed ledger per contract */
eventsRouter.get("/status", (_req: Request, res: Response): void => {
  const status = config.contractIds.map((id) => ({
    contract_id: id,
    last_ledger: getLastLedger(id),
  }));

  res.json({
    network: config.STELLAR_NETWORK,
    rpc_url: config.STELLAR_RPC_URL,
    poll_interval_ms: config.POLL_INTERVAL_MS,
    contracts: status,
  });
});

/** GET /events/:contractId — get events for a specific contract */
eventsRouter.get("/:contractId", (req: Request, res: Response): void => {
  const contractId = typeof req.params.contractId === "string" ? req.params.contractId : undefined;
  if (contractId === undefined) {
    res.status(400).json({ error: "contractId must be a string" });
    return;
  }
  const parsed = QuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const events = queryEvents({ ...parsed.data, contract_id: contractId });
  res.json({
    contract_id: contractId,
    last_ledger: getLastLedger(contractId),
    count: events.length,
    events,
  });
});
