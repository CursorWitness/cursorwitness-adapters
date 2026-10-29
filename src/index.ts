/**
 * Soroban Indexer TS — Entry Point
 *
 * Starts the indexer polling loop and REST API server.
 */

import express from "express";
import { config } from "./config.js";
import { eventsRouter } from "./routes/events.js";
import { startIndexer } from "./indexer.js";

const app: express.Express = express();
app.use(express.json());

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// Routes
app.use("/events", eventsRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "soroban-indexer-ts",
    version: "0.1.0",
    network: config.STELLAR_NETWORK,
    timestamp: new Date().toISOString(),
  });
});

// Start REST API
const server = app.listen(config.PORT, () => {
  console.log("╔═══════════════════════════════════════╗");
  console.log("║       Soroban Indexer TS              ║");
  console.log("╚═══════════════════════════════════════╝");
  console.log(`▶ API listening on port ${config.PORT}`);
  console.log(`▶ Network: ${config.STELLAR_NETWORK}`);
  console.log(`▶ DB: ${config.DB_PATH}`);
  console.log("");
  console.log("Endpoints:");
  console.log("  GET /health               — health check");
  console.log("  GET /events               — query all events");
  console.log("  GET /events/status        — indexer status");
  console.log("  GET /events/:contractId   — events by contract");
});

// Start indexer
startIndexer();

// Graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

export default app;
