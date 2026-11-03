import { resolve } from "node:path";

// Keep production config validation strict while giving database tests an
// isolated, deterministic local configuration before modules are imported.
process.env.CONTRACT_IDS ??= "CABC123";
process.env.NODE_ENV ??= "test";
process.env.DB_PATH ??= resolve(".tmp", "vitest-adapter.db");
