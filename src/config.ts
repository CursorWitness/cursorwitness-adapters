import { z } from "zod";
import { config as loadDotenv } from "dotenv";

loadDotenv();

const schema = z.object({
  STELLAR_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  STELLAR_RPC_URL: z.string().url().default("https://soroban-testnet.stellar.org"),
  NETWORK_PASSPHRASE: z.string().default("Test SDF Network ; September 2015"),
  CONTRACT_IDS: z.string().min(1, "At least one contract ID required"),
  POLL_INTERVAL_MS: z.coerce.number().default(5000),
  START_LEDGER: z.coerce.number().default(0),
  DB_PATH: z.string().default("./data/index.db"),
  PORT: z.coerce.number().default(3002),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid config:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  contractIds: parsed.data.CONTRACT_IDS.split(",").map((id) => id.trim()),
};
